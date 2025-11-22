import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PhysicalCount, PhysicalCountItem, PhysicalCountStatus, VarianceReason, InventoryItem, ItemMaster, StorageLocation, Facility, Role, AdjustmentReason } from '../types';
import { useSettings } from '../hooks/useSettings';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { Spinner } from '../components/ui/Spinner';
import { useDatabase } from '../hooks/useDatabase';
import { db } from '../services/firebase';
import { useConfirmation } from '../hooks/useConfirmation';
import { useInfoModal } from '../hooks/useInfoModal';
import { getStorageLocationPath } from '../utils/locationHelpers';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import { logAuditEvent } from '../services/audit';
import { RejectCountModal } from '../components/ui/RejectCountModal';
import { Textarea } from '../components/ui/Textarea';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

type ProcessedCountItem = {
    countItem: PhysicalCountItem;
    details: {
        item: InventoryItem;
        master: ItemMaster;
    }
}

const ReviewCountPage: React.FC = () => {
    const { countId } = useParams();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { data, loading: dbLoading } = useDatabase();
    const { addNotification, removeNotificationsBySource } = useNotifications();
    const confirm = useConfirmation();
    const { showSuccess, showError } = useInfoModal();
    const { physicalCounts, inventoryItems, itemMasters, facilities, storageLocations, users } = data;
    const { user } = useAuth();
    
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const count = useMemo(() => physicalCounts.find(c => c.id === countId), [physicalCounts, countId]);
    
    const [countedQuantities, setCountedQuantities] = useState<Record<string, string>>({});
    const [varianceData, setVarianceData] = useState<Record<string, { reasonCode?: VarianceReason, notes?: string }>>({});

    useEffect(() => {
        if (count) {
            const initialQuantities: Record<string, string> = {};
            const initialVarianceData: Record<string, { reasonCode?: VarianceReason, notes?: string }> = {};
            if (count.items) {
                count.items.forEach(item => {
                    if (item.countedQuantity !== undefined && item.countedQuantity !== null) {
                        initialQuantities[item.inventoryItemId] = String(item.countedQuantity);
                    }
                    initialVarianceData[item.inventoryItemId] = {
                        reasonCode: item.reasonCode,
                        notes: item.notes,
                    };
                });
            }
            setCountedQuantities(initialQuantities);
            setVarianceData(initialVarianceData);
        }
    }, [count]);

    if (dbLoading) {
        return <div className="p-8 text-center"><Spinner /></div>;
    }

    if (!count) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-secondary-800">Count Not Found</h2>
                <p className="text-secondary-600 mt-2">The physical count you are looking for does not exist or has been deleted.</p>
                <Button onClick={() => navigate('/physical-counts')} className="mt-4">Back to Count List</Button>
            </div>
        );
    }
    
    if (count.status === PhysicalCountStatus.Completed || count.status === PhysicalCountStatus.Cancelled) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-secondary-800">Count Already Finalized</h2>
                <p className="text-secondary-600 mt-2">
                    This physical count has already been <span className="font-semibold">{count.status.toLowerCase()}</span> and can no longer be edited.
                </p>
                <Button onClick={() => navigate('/physical-counts')} className="mt-4">Back to Count List</Button>
            </div>
        );
    }

    const processedItems: ProcessedCountItem[] = count.items
        ? count.items.map(countItem => {
            const item = inventoryItems.find(i => i.id === countItem.inventoryItemId);
            const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
            return { countItem, details: { item: item!, master: master! } };
        }).filter(item => item.details.master)
        : [];

    const handleQuantityChange = (inventoryItemId: string, value: string) => {
        setCountedQuantities(prev => ({...prev, [inventoryItemId]: value}));
    };

    const handleVarianceChange = (inventoryItemId: string, field: 'reasonCode' | 'notes', value: string) => {
        setVarianceData(prev => ({
            ...prev,
            [inventoryItemId]: {
                ...prev[inventoryItemId],
                [field]: value,
            },
        }));
    };
    
    const handleReject = async (reason: string) => {
        if (!user) return;
        setIsRejectModalOpen(false);
    
        const updates: Record<string, any> = {};
        updates[`/physicalCounts/${countId}/status`] = PhysicalCountStatus.InProgress;
        updates[`/physicalCounts/${countId}/rejectionNotes`] = reason;
        updates[`/physicalCounts/${countId}/reviewedByUserId`] = user.uid;
        updates[`/physicalCounts/${countId}/reviewedTimestamp`] = new Date().toISOString();
    
        try {
            await db.ref().update(updates);
            await removeNotificationsBySource(countId!);
            
            // Add notification for the user who was assigned the count
            await addNotification({
                userId: count.assignedToUserId,
                message: `Your physical count "${count.name}" was rejected. Reason: ${reason}. A recount is required.`,
                link: `/physical-counts/${count.id}/perform`,
                type: 'physicalCountReview', // Using the same type, seems appropriate
                sourceId: count.id!,
            });
    
            await logAuditEvent(user, 'Physical Count Reject', { countName: count.name, details: reason });
            showSuccess({ title: "Count Rejected", message: "The count has been sent back for recount." });
            navigate('/physical-counts');
        } catch (error) {
            console.error("Error rejecting count:", error);
            showError({ title: "Rejection Failed", message: "An error occurred. Please try again." });
        }
    };

    const handleApproveCount = async () => {
        if (!user || !count || !count.items) {
            showError({ title: "Error", message: "Cannot approve count due to missing data." });
            return;
        }

        const itemsWithVariance = count.items.filter(item => {
            const counted = parseInt(countedQuantities[item.inventoryItemId] || String(item.systemQuantity), 10);
            return counted !== item.systemQuantity;
        });

        const missingReasons = itemsWithVariance.some(item => !varianceData[item.inventoryItemId]?.reasonCode);

        if (missingReasons) {
            showError({ title: "Missing Information", message: "Please provide a reason for every item with a variance." });
            return;
        }
        
        const isConfirmed = await confirm({
            title: "Approve & Finalize Count?",
            message: "This will update your inventory quantities based on the counted values. This action cannot be undone.",
            confirmText: "Approve & Finalize",
            variant: "primary"
        });

        if (!isConfirmed) return;
        
        try {
            const updates: Record<string, any> = {};
            
            const updatedCountItems = count.items.map(item => {
                const countedQuantityStr = countedQuantities[item.inventoryItemId];
                const finalCountedQuantity = countedQuantityStr !== undefined && countedQuantityStr !== '' 
                    ? parseInt(countedQuantityStr, 10) 
                    : item.systemQuantity;
    
                if (isNaN(finalCountedQuantity)) {
                    // This case should ideally not happen if inputs are controlled, but as a safeguard:
                    throw new Error(`Invalid quantity provided for item.`);
                }
    
                const varianceDetails = varianceData[item.inventoryItemId] || {};
                
                const itemForUpdate: PhysicalCountItem = {
                    inventoryItemId: item.inventoryItemId,
                    systemQuantity: item.systemQuantity,
                    countedQuantity: finalCountedQuantity,
                };
    
                if (finalCountedQuantity !== item.systemQuantity) {
                    // The missingReasons check guarantees reasonCode exists and is not an empty string
                    if(varianceDetails.reasonCode) {
                        itemForUpdate.reasonCode = varianceDetails.reasonCode;
                    }
                    
                    // Only add notes if they are not undefined/null/empty string
                    if (varianceDetails.notes) {
                        itemForUpdate.notes = varianceDetails.notes;
                    }
                }
                
                return itemForUpdate;
            });
    
            updates[`/physicalCounts/${countId}/items`] = updatedCountItems;
            updates[`/physicalCounts/${countId}/status`] = PhysicalCountStatus.Completed;
            updates[`/physicalCounts/${countId}/reviewedByUserId`] = user.uid;
            updates[`/physicalCounts/${countId}/reviewedTimestamp`] = new Date().toISOString();
    
            updatedCountItems.forEach(item => {
                if (item.systemQuantity !== item.countedQuantity) {
                    updates[`/inventoryItems/${item.inventoryItemId}/quantity`] = item.countedQuantity;
                }
            });
    
            await db.ref().update(updates);
            await removeNotificationsBySource(countId!);
            await logAuditEvent(user, 'Physical Count Approve', { countName: count.name });
            
            showSuccess({ title: "Count Approved", message: "Inventory has been updated successfully." });
            navigate('/physical-counts');
            
        } catch (error: any) {
            console.error("Failed to approve count:", error);
            showError({ title: "Approval Failed", message: `An error occurred: ${error.message}` });
        }
    };


    return (
        <div>
             <div className="flex justify-between items-start mb-6">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/physical-counts')} className="mb-2 -ml-3 text-secondary-600 hover:text-secondary-900">
                        <BackIcon />
                        <span className="ml-2">Back to Count List</span>
                    </Button>
                    <h2 className="text-3xl font-semibold text-secondary-800">Review Physical Count</h2>
                    <p className="text-secondary-600 font-semibold mt-1">{count.name}</p>
                    <p className="text-sm text-secondary-500 mt-1">
                        Location: {getStorageLocationPath(count.storageLocationId, storageLocations, facilities)}
                    </p>
                </div>
            </div>
            
            <Card>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-2/5">Item Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">System Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Counted Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Variance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-2/5">Reason & Notes</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-secondary-200">
                            {processedItems.map(({ countItem, details }) => {
                                const countedQty = countedQuantities[countItem.inventoryItemId] !== undefined ? parseInt(countedQuantities[countItem.inventoryItemId], 10) : countItem.systemQuantity;
                                const variance = countedQty - countItem.systemQuantity;
                                return (
                                <tr key={countItem.inventoryItemId} className={variance !== 0 ? 'bg-yellow-50' : ''}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-secondary-900">{details.master.name}</div>
                                        <div className="text-xs text-secondary-500">Batch: {details.item.batchNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{countItem.systemQuantity} {details.master.unit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={countedQuantities[countItem.inventoryItemId] || ''}
                                            onChange={(e) => handleQuantityChange(countItem.inventoryItemId, e.target.value)}
                                            className="w-28 bg-secondary-100"
                                        />
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-secondary-500'}`}>
                                        {variance > 0 ? '+' : ''}{variance}
                                    </td>
                                    <td className="px-6 py-4">
                                        {variance !== 0 && (
                                            <div className="space-y-2">
                                                <Select
                                                    value={varianceData[countItem.inventoryItemId]?.reasonCode || ''}
                                                    onChange={e => handleVarianceChange(countItem.inventoryItemId, 'reasonCode', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select a reason...</option>
                                                    {Object.values(VarianceReason).map(reason => <option key={reason} value={reason}>{reason}</option>)}
                                                </Select>
                                                <Textarea
                                                    placeholder="Add optional notes..."
                                                    value={varianceData[countItem.inventoryItemId]?.notes || ''}
                                                    onChange={e => handleVarianceChange(countItem.inventoryItemId, 'notes', e.target.value)}
                                                    rows={1}
                                                    className="text-xs"
                                                />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )})}
                         </tbody>
                    </table>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <Button variant="danger" onClick={() => setIsRejectModalOpen(true)}>Reject Count</Button>
                    <Button onClick={handleApproveCount}>Approve & Finalize Adjustments</Button>
                </div>
            </Card>
            
            <RejectCountModal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                onConfirm={handleReject}
                countName={count.name}
            />
        </div>
    );
};

export default ReviewCountPage;
