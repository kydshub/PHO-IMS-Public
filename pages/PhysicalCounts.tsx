
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { PhysicalCount, PhysicalCountStatus, Role, StorageLocation, Facility, InventoryItem, FacilityStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import StartCountModal from '../components/StartCountModal';
import { useDatabase } from '../hooks/useDatabase';
import { CancelCountModal } from '../components/ui/CancelCountModal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { TablePagination } from '../components/ui/TablePagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { useSort } from '../hooks/useSort';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';
import { downloadStringAsFile } from '../../utils/download';
import { useInfoModal } from '../hooks/useInfoModal';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const getStorageLocationPath = (locationId: string, allLocations: StorageLocation[], allFacilities: Facility[]): string => {
    const locationMap = new Map(allLocations.map(l => [l.id, l]));
    let path: string[] = [];
    let currentId: string | undefined = locationId;

    while (currentId && locationMap.has(currentId)) {
        const currentLocation = locationMap.get(currentId)!;
        path.unshift(currentLocation.name);
        currentId = currentLocation.parentId;
    }

    const facilityId = locationMap.get(locationId)?.facilityId;
    if (facilityId) {
        const facility = allFacilities.find(f => f.id === facilityId);
        if (facility) {
            path.unshift(facility.name);
        }
    }
    return path.join(' / ');
};


export const PhysicalCounts: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data } = useDatabase();
    const { physicalCounts, facilities, storageLocations, users, inventoryItems } = data;
    const { showSuccess, showError } = useInfoModal();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [countToCancel, setCountToCancel] = useState<PhysicalCount | null>(null);
    const [isDeleteHistoryModalOpen, setIsDeleteHistoryModalOpen] = useState(false);
    const [countToDeleteHistory, setCountToDeleteHistory] = useState<PhysicalCount | null>(null);
    
    const isEncoder = user?.role === Role.Encoder;

    const [historyFilters, setHistoryFilters] = useState({
        searchTerm: '',
        facilityId: isEncoder ? user?.facilityId || '' : '',
        status: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);


    const canInitiateCount = user?.role === Role.Admin || user?.role === Role.SystemAdministrator || user?.role === Role.Encoder;
    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);

    const getUserName = (id: string | undefined) => users.find(u => u.uid === id)?.name || 'N/A';
    
    const getStatusPill = (status: PhysicalCountStatus) => {
        const styles = {
            [PhysicalCountStatus.Pending]: 'bg-gray-200 text-gray-800',
            [PhysicalCountStatus.InProgress]: 'bg-blue-100 text-blue-800',
            [PhysicalCountStatus.PendingReview]: 'bg-yellow-100 text-yellow-800',
            [PhysicalCountStatus.Completed]: 'bg-green-100 text-green-800',
            [PhysicalCountStatus.Cancelled]: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };
    
    const handleSaveCount = async (countData: Partial<PhysicalCount>) => {
        if (!user || !countData.storageLocationId) {
            alert("Could not create count: missing user or location information.");
            return;
        }

        const itemsToCount = inventoryItems.filter(item => item.storageLocationId === countData.storageLocationId);

        if (itemsToCount.length === 0) {
            alert("Cannot start a physical count for an empty storage location.");
            return;
        }
        
        const newCountRef = db.ref('physicalCounts').push();
        const newCountData: Omit<PhysicalCount, 'id'> = {
            name: countData.name!,
            facilityId: countData.facilityId!,
            storageLocationId: countData.storageLocationId!,
            assignedToUserId: countData.assignedToUserId!,
            initiatedByUserId: user.uid,
            initiatedTimestamp: new Date().toISOString(),
            status: PhysicalCountStatus.Pending,
            items: itemsToCount.map(item => ({
                inventoryItemId: item.id,
                systemQuantity: item.quantity,
            })),
        };

        await newCountRef.set(newCountData);
        await logAuditEvent(user, 'Physical Count Initiate', { countName: newCountData.name });
        setIsModalOpen(false);
    };

    const handleActionClick = (count: PhysicalCount) => {
        switch (count.status) {
            case PhysicalCountStatus.Pending:
            case PhysicalCountStatus.InProgress:
                navigate(`/physical-counts/${count.id}/perform`);
                break;
            case PhysicalCountStatus.PendingReview:
                navigate(`/physical-counts/${count.id}/review`);
                break;
            case PhysicalCountStatus.Completed:
            case PhysicalCountStatus.Cancelled:
                window.open(`#/print/physical-count-report/${count.id}`, '_blank');
                break;
        }
    };

    const getActionText = (status: PhysicalCountStatus) => {
        switch (status) {
            case PhysicalCountStatus.Pending: return "Start Count";
            case PhysicalCountStatus.InProgress: return "Continue Count";
            case PhysicalCountStatus.PendingReview: return "Review Count";
            case PhysicalCountStatus.Completed: return "View Report";
            case PhysicalCountStatus.Cancelled: return "View Report";
            default: return "";
        }
    };

    const handleOpenCancelModal = (count: PhysicalCount) => {
        setCountToCancel(count);
        setIsCancelModalOpen(true);
    };

    const confirmCancelCount = async () => {
        if (!countToCancel || !user) return;
        try {
            const updates = {
                status: PhysicalCountStatus.Cancelled,
                cancellationTimestamp: new Date().toISOString(),
                cancelledByUserId: user.uid
            };
            await db.ref(`physicalCounts/${countToCancel.id}`).update(updates);
            await logAuditEvent(user, 'Physical Count Cancel', { countName: countToCancel.name });
            alert('Physical count has been cancelled successfully.');
        } catch (error) {
            console.error('Failed to cancel count:', error);
            alert('An error occurred while cancelling the count.');
        } finally {
            setIsCancelModalOpen(false);
            setCountToCancel(null);
        }
    };

    const handleOpenDeleteHistoryModal = (count: PhysicalCount) => {
        setCountToDeleteHistory(count);
        setIsDeleteHistoryModalOpen(true);
    };
    
    const confirmDeleteHistory = async () => {
        if (!countToDeleteHistory || !user) return;
        try {
            await db.ref(`physicalCounts/${countToDeleteHistory.id}`).remove();
            await logAuditEvent(user, 'Physical Count History Delete', { countName: countToDeleteHistory.name });
            showSuccess({ title: 'Success', message: 'Physical count record has been permanently deleted.' });
        } catch (error) {
            console.error('Failed to delete count history:', error);
            showError({ title: 'Error', message: 'An error occurred while deleting the count record.' });
        } finally {
            setIsDeleteHistoryModalOpen(false);
            setCountToDeleteHistory(null);
        }
    };
    
    const activeCounts = useMemo(() => {
        const activeStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
        return [...physicalCounts]
            .filter(c => {
                const statusMatch = activeStatuses.includes(c.status);
                if (isEncoder && user?.facilityId) {
                    return statusMatch && c.facilityId === user.facilityId;
                }
                return statusMatch;
            })
            .sort((a, b) => new Date(b.initiatedTimestamp).getTime() - new Date(a.initiatedTimestamp).getTime());
    }, [physicalCounts, isEncoder, user]);

    const augmentedHistoryCounts = useMemo(() => {
        const historyStatuses = [PhysicalCountStatus.Completed, PhysicalCountStatus.Cancelled];
        return physicalCounts
            .filter(c => historyStatuses.includes(c.status))
            .map(count => {
                const finalizedTimestamp = count.status === 'Completed'
                    ? count.reviewedTimestamp
                    : count.cancellationTimestamp;
                
                const finalizedByUserId = count.status === 'Completed'
                    ? count.reviewedByUserId
                    : count.cancelledByUserId;

                return {
                    ...count,
                    locationPath: getStorageLocationPath(count.storageLocationId, storageLocations, facilities),
                    finalizedDate: finalizedTimestamp ? new Date(finalizedTimestamp) : null,
                    finalizedBy: getUserName(finalizedByUserId!),
                };
            });
    }, [physicalCounts, storageLocations, facilities, users]);

    const filteredHistoryItems = useMemo(() => {
        return augmentedHistoryCounts.filter(count => {
            const { searchTerm, facilityId, status, startDate, endDate } = historyFilters;
            const searchMatch = !searchTerm || count.name.toLowerCase().includes(searchTerm.toLowerCase()) || count.locationPath.toLowerCase().includes(searchTerm.toLowerCase());
            const facilityMatch = !facilityId || count.facilityId === facilityId;
            const statusMatch = !status || count.status === status;
            
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            
            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);
            
            const dateMatch = count.finalizedDate && (!sDate || count.finalizedDate >= sDate) && (!eDate || count.finalizedDate <= eDate);

            return searchMatch && facilityMatch && statusMatch && (!startDate || !endDate || dateMatch);
        });
    }, [augmentedHistoryCounts, historyFilters]);

    const { sortedItems: sortedHistoryItems, requestSort: requestHistorySort, sortConfig: historySortConfig } = useSort(filteredHistoryItems, { key: 'finalizedDate', direction: 'descending' });

    useEffect(() => {
        setCurrentPage(1);
    }, [historyFilters, itemsPerPage, historySortConfig]);

    const paginatedHistoryItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedHistoryItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedHistoryItems, currentPage, itemsPerPage]);

    const totalHistoryPages = Math.ceil(sortedHistoryItems.length / itemsPerPage);
    const startHistoryItemIndex = (currentPage - 1) * itemsPerPage;
    const endHistoryItemIndex = Math.min(startHistoryItemIndex + itemsPerPage, sortedHistoryItems.length);

    const handleHistoryFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setHistoryFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleHistoryDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
        setHistoryFilters(prev => ({...prev, [name]: date }));
    };

    const exportHistoryToCSV = () => {
        const headers = ['Name', 'Location', 'Status', 'Date Finalized', 'Finalized By'];
        const csvRows = [
            headers.join(','),
            ...sortedHistoryItems.map(count => {
                return [
                    `"${count.name}"`,
                    `"${count.locationPath}"`,
                    `"${count.status}"`,
                    `"${count.finalizedDate ? count.finalizedDate.toLocaleString() : 'N/A'}"`,
                    `"${count.finalizedBy}"`
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'physical_count_history.csv', 'text/csv;charset=utf-8;');
    };

    const handlePrintHistory = () => {
        const params = new URLSearchParams();
        if (historyFilters.searchTerm) params.set('searchTerm', historyFilters.searchTerm);
        if (historyFilters.facilityId) params.set('facilityId', historyFilters.facilityId);
        if (historyFilters.status) params.set('status', historyFilters.status);
        if (historyFilters.startDate) params.set('startDate', historyFilters.startDate.toISOString());
        if (historyFilters.endDate) params.set('endDate', historyFilters.endDate.toISOString());

        window.open(`#/print/count-history?${params.toString()}`, '_blank');
    };

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                    <h2 className="text-3xl font-semibold text-secondary-800">Physical Inventory Counts</h2>
                    {canInitiateCount && (
                        <Button onClick={() => setIsModalOpen(true)} leftIcon={<PlusIcon />} className="w-full md:w-auto">
                            Initiate New Count
                        </Button>
                    )}
                </div>

                <Card title="Active Counts">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Count Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Date Initiated</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {activeCounts.map((count) => (
                                    <tr key={count.id} className="hover:bg-secondary-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{count.name}</td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-secondary-500">
                                            {getStorageLocationPath(count.storageLocationId, storageLocations, facilities)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{getStatusPill(count.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{getUserName(count.assignedToUserId)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(count.initiatedTimestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <Button size="sm" onClick={() => handleActionClick(count)}>
                                                {getActionText(count.status)}
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleOpenCancelModal(count)}>Cancel</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {activeCounts.length === 0 && <div className="text-center py-8 text-secondary-500">No active counts.</div>}
                    </div>
                </Card>
            </div>
            
            <Card footer={
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalHistoryPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={sortedHistoryItems.length}
                    startItemIndex={startHistoryItemIndex}
                    endItemIndex={endHistoryItemIndex}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                 />
            }>
                 <div className="p-4 border-b space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-secondary-900">Count History</h3>
                        <div className="flex justify-end gap-2">
                            <Button onClick={handlePrintHistory} leftIcon={<PrintIcon />} variant="secondary">Print</Button>
                            <Button onClick={exportHistoryToCSV} leftIcon={<DownloadIcon />} variant="secondary">Export CSV</Button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Input
                            name="searchTerm"
                            placeholder="Search by name or location..."
                            value={historyFilters.searchTerm}
                            onChange={handleHistoryFilterChange}
                        />
                         <Select name="facilityId" value={historyFilters.facilityId} onChange={handleHistoryFilterChange} disabled={isEncoder}>
                            {!isEncoder && <option value="">All Facilities</option>}
                            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                         <Select name="status" value={historyFilters.status} onChange={handleHistoryFilterChange}>
                            <option value="">All Statuses</option>
                            <option value={PhysicalCountStatus.Completed}>Completed</option>
                            <option value={PhysicalCountStatus.Cancelled}>Cancelled</option>
                        </Select>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <DatePicker
                            label="Finalized After"
                            selectedDate={historyFilters.startDate}
                            onSelectDate={(date) => handleHistoryDateChange('startDate', date)}
                        />
                         <DatePicker
                            label="Finalized Before"
                            selectedDate={historyFilters.endDate}
                            onSelectDate={(date) => handleHistoryDateChange('endDate', date)}
                        />
                     </div>
                 </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Count Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                                <SortableHeader sortKey="finalizedDate" requestSort={requestHistorySort} sortConfig={historySortConfig}>Date Finalized</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Finalized By</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-secondary-200">
                           {paginatedHistoryItems.map(count => (
                               <tr key={count.id}>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{count.name}</td>
                                   <td className="px-6 py-4 whitespace-normal text-sm text-secondary-500">{count.locationPath}</td>
                                   <td className="px-6 py-4 whitespace-nowrap">{getStatusPill(count.status)}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{count.finalizedDate ? count.finalizedDate.toLocaleString() : 'N/A'}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{count.finalizedBy}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <Button size="sm" onClick={() => handleActionClick(count)}>
                                            {getActionText(count.status)}
                                        </Button>
                                        {user?.role === Role.SystemAdministrator && (
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => handleOpenDeleteHistoryModal(count)} title="Delete Count History"><TrashIcon /></Button>
                                        )}
                                   </td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                     {sortedHistoryItems.length === 0 && <p className="text-center p-4 text-secondary-500">No historical counts found.</p>}
                </div>
            </Card>

            {isModalOpen && (
                <StartCountModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveCount}
                    facilities={facilities}
                    storageLocations={storageLocations}
                    users={users}
                    inventoryItems={inventoryItems}
                />
            )}
             <CancelCountModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={confirmCancelCount}
                countName={countToCancel?.name || ''}
            />
             <DeleteConfirmationModal
                isOpen={isDeleteHistoryModalOpen}
                onClose={() => setIsDeleteHistoryModalOpen(false)}
                onConfirm={confirmDeleteHistory}
                itemName={countToDeleteHistory?.name || ''}
                itemType="physical count history"
            />
        </div>
    );
};
