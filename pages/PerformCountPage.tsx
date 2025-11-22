

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhysicalCount, PhysicalCountItem, PhysicalCountStatus, InventoryItem, ItemMaster, StorageLocation, Facility, Role } from '../types';
import { useSettings } from '../hooks/useSettings';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { Spinner } from '../components/ui/Spinner';
import { useDatabase } from '../hooks/useDatabase';
import { db } from '../services/firebase';
import { useConfirmation } from '../hooks/useConfirmation';
import { useInfoModal } from '../hooks/useInfoModal';
import { getStorageLocationPath } from '../utils/locationHelpers';
import { useNotifications } from '../hooks/useNotifications';

const ScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

type ProcessedCountItem = {
    countItem: PhysicalCountItem;
    details: {
        item: InventoryItem;
        master: ItemMaster;
    }
}

const PerformCountPage: React.FC = () => {
    const { countId } = useParams();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { data, loading: dbLoading } = useDatabase();
    const { addNotification } = useNotifications();
    const confirm = useConfirmation();
    const { showSuccess, showError } = useInfoModal();
    const { physicalCounts, inventoryItems, itemMasters, facilities, storageLocations, users } = data;
    
    const count = useMemo(() => physicalCounts.find(c => c.id === countId), [physicalCounts, countId]);
    
    const [countedQuantities, setCountedQuantities] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    useEffect(() => {
        if (count) {
            const initialQuantities: Record<string, string> = {};
            if(count.items){
                count.items.forEach(item => {
                    if (item.countedQuantity !== undefined && item.countedQuantity !== null) {
                        initialQuantities[item.inventoryItemId] = String(item.countedQuantity);
                    }
                });
            }
            setCountedQuantities(initialQuantities);
        }
    }, [count]);

    if (dbLoading || !count) {
        return <div className="p-8 text-center"><Spinner /></div>;
    }

    const processedItems: ProcessedCountItem[] = count.items
        ? count.items.map(countItem => {
            const item = inventoryItems.find(i => i.id === countItem.inventoryItemId);
            const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
            return { countItem, details: { item: item!, master: master! } };
        }).filter(item => item.details.master)
        : [];

    const filteredItems = processedItems.filter(item => 
        item.details.master.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details.item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleQuantityChange = (inventoryItemId: string, value: string) => {
        setCountedQuantities(prev => ({...prev, [inventoryItemId]: value}));
    };
    
    const handleScan = (itemMasterId: string) => {
        const foundItem = processedItems.find(p => p.details.master.id === itemMasterId);
        if (foundItem) {
            setSearchTerm(foundItem.details.master.name);
        } else {
            showError({ title: "Item Not Found", message: "Scanned item is not part of this physical count." });
        }
        setIsScannerOpen(false);
    };

    const handleSaveProgress = async () => {
        if (!count || !count.items) {
            showError({ title: "Error", message: "Count data not found." });
            return;
        }

        const updatedItems = count.items.map(item => ({
            ...item,
            countedQuantity: countedQuantities[item.inventoryItemId] !== undefined 
                ? parseInt(countedQuantities[item.inventoryItemId], 10) 
                : null,
        }));

        const updates: Record<string, any> = {};
        updates[`/physicalCounts/${countId}/items`] = updatedItems;
        if (count.status === PhysicalCountStatus.Pending) {
            updates[`/physicalCounts/${countId}/status`] = PhysicalCountStatus.InProgress;
        }
        
        try {
            await db.ref().update(updates);
            showSuccess({ title: "Progress Saved", message: "Your counted quantities have been saved successfully." });
        } catch (error) {
            console.error("Error saving progress:", error);
            showError({ title: "Save Failed", message: "An error occurred while saving your progress." });
        }
    };
    
    const handleCompleteCount = async () => {
        if (!count || !count.items) {
            showError({ title: "Error", message: "Count data not found." });
            return;
        }

        const allItemsCounted = count.items.every(item => countedQuantities[item.inventoryItemId] !== undefined && countedQuantities[item.inventoryItemId] !== '');
        
        if (!allItemsCounted) {
            const isConfirmed = await confirm({
                title: "Incomplete Count",
                message: "Not all items have been counted. Are you sure you want to mark this count as complete? Uncounted items will be recorded as having a quantity of zero.",
                confirmText: "Complete Anyway",
                variant: "danger"
            });
            if (!isConfirmed) {
                return;
            }
        }

        const newItems = count.items.map(item => ({
            ...item,
            countedQuantity: parseInt(countedQuantities[item.inventoryItemId], 10) || 0,
        }));
        
        const updates: Record<string, any> = {};
        updates[`/physicalCounts/${countId}/items`] = newItems;
        updates[`/physicalCounts/${countId}/status`] = PhysicalCountStatus.PendingReview;
        updates[`/physicalCounts/${countId}/completedTimestamp`] = new Date().toISOString();
        
        try {
            await db.ref().update(updates);
            
            const adminsToNotify = users.filter(u => u.facilityId === count.facilityId && (u.role === Role.Admin || u.role === Role.SystemAdministrator));
            for (const admin of adminsToNotify) {
                await addNotification({
                    userId: admin.uid,
                    message: `Physical count "${count.name}" is ready for review.`,
                    link: `/physical-counts/${count.id}/review`,
                    type: 'physicalCountReview',
                    sourceId: count.id,
                });
            }

            showSuccess({ title: "Count Submitted", message: "The count has been submitted for review." });
            navigate('/physical-counts');
        } catch (error) {
            console.error("Error submitting count:", error);
            showError({ title: "Submission Failed", message: "An error occurred. Please try again." });
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
                    <h2 className="text-3xl font-semibold text-secondary-800">Perform Physical Count</h2>
                    <p className="text-secondary-600 font-semibold mt-1">{count.name}</p>
                    <p className="text-sm text-secondary-500 mt-1">
                        Location: {getStorageLocationPath(count.storageLocationId, storageLocations, facilities)}
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    {settings.enableBarcodeScanner && (
                        <Button variant="secondary" onClick={() => setIsScannerOpen(true)} leftIcon={<ScanIcon />}>
                            Scan Item
                        </Button>
                    )}
                </div>
            </div>
            
            <Card>
                <div className="p-4 border-b">
                    <Input 
                        placeholder="Search for an item or batch number..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Item Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">System Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Counted Quantity</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-secondary-200">
                            {filteredItems.map(({ countItem, details }) => (
                                <tr key={countItem.inventoryItemId} className={countedQuantities[countItem.inventoryItemId] !== undefined ? 'bg-green-50' : ''}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-secondary-900">{details.master.name}</div>
                                        <div className="text-xs text-secondary-500">Batch: {details.item.batchNumber} | Expires: {details.item.expiryDate ? new Date(details.item.expiryDate).toLocaleDateString() : 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{countItem.systemQuantity} {details.master.unit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={countedQuantities[countItem.inventoryItemId] || ''}
                                            onChange={(e) => handleQuantityChange(countItem.inventoryItemId, e.target.value)}
                                            className="max-w-xs bg-secondary-100"
                                        />
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleSaveProgress}>Save Progress</Button>
                    <Button onClick={handleCompleteCount}>Complete & Submit for Review</Button>
                </div>
            </Card>

            {isScannerOpen && <BarcodeScannerModal onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}
        </div>
    );
};

export default PerformCountPage;