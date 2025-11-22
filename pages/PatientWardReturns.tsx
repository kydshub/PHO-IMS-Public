import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { db } from '../services/firebase';
import { Role, InternalReturnLog, InventoryItem, ItemMaster, FacilityStatus, PhysicalCountStatus, ReturnFromPatientReason, Facility, DispenseLog } from '../types';
import { logAuditEvent } from '../services/audit';
import { TablePagination } from '../components/ui/TablePagination';
import { useConfirmation } from '../hooks/useConfirmation';
import { DatePicker } from '../components/ui/DatePicker';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import SearchableSelect, { SearchableSelectOption } from '../components/ui/SearchableSelect';
import { generateControlNumber } from '../utils/helpers';
import { PREFIX_INTERNAL_RETURN } from '../constants';
import { Spinner } from '../components/ui/Spinner';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { EditInternalReturnLogModal } from '../components/EditInternalReturnLogModal';
import { useInfoModal } from '../hooks/useInfoModal';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

type ReturnItemRow = {
    id: string;
    inventoryItemId: string;
    quantity: string;
    itemName?: string; // for display when loaded from dispense
    maxQuantity?: number; // for validation when loaded from dispense
};

const PatientWardReturns: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { inventoryItems, itemMasters, storageLocations, users, facilities, physicalCounts, internalReturnLogs, dispenseLogs } = data;
    const confirm = useConfirmation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess, showError } = useInfoModal();

    const initialItemState: ReturnItemRow = { id: crypto.randomUUID(), inventoryItemId: '', quantity: '' };

    const [controlNumber, setControlNumber] = useState('');
    const [items, setItems] = useState<ReturnItemRow[]>([initialItemState]);
    const [returnedBy, setReturnedBy] = useState('');
    const [reason, setReason] = useState<ReturnFromPatientReason | ''>('');
    const [originalDispenseId, setOriginalDispenseId] = useState('');
    const [notes, setNotes] = useState('');

    const [dispenseControlNumber, setDispenseControlNumber] = useState('');
    const [isLoadingDispense, setIsLoadingDispense] = useState(false);
    const [isDispenseLoaded, setIsDispenseLoaded] = useState(false);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [logToEdit, setLogToEdit] = useState<InternalReturnLog | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const isRestrictedUser = user?.role === Role.Encoder;
    const canModify = useMemo(() => user && [Role.SystemAdministrator, Role.Admin, Role.Encoder].includes(user.role), [user]);

    const [historyFilters, setHistoryFilters] = useState({
        searchTerm: '',
        facilityId: isRestrictedUser ? user?.facilityId || '' : '',
        reason: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);

    useEffect(() => {
        setControlNumber(generateControlNumber(PREFIX_INTERNAL_RETURN, internalReturnLogs.length));
    }, [internalReturnLogs.length]);

    const accessibleItems = useMemo(() => {
        const activeCountStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
        const frozenItemIds = new Set<string>();
        physicalCounts.filter(c => activeCountStatuses.includes(c.status)).forEach(c => c.items?.forEach(i => i && frozenItemIds.add(i.inventoryItemId)));

        const storageLocationMap = new Map<string, string>();
        storageLocations.forEach(sl => storageLocationMap.set(sl.id, sl.facilityId));
        const activeFacilityIds = new Set(facilities.filter(f => f.status === FacilityStatus.Active).map(f => f.id));

        const allItems = inventoryItems.filter(item => {
            const facilityId = storageLocationMap.get(item.storageLocationId);
            const isInActiveFacility = facilityId && activeFacilityIds.has(facilityId);
            return isInActiveFacility && !frozenItemIds.has(item.id);
        });
        
        if (isRestrictedUser) {
            return allItems.filter(item => {
                const facilityId = storageLocationMap.get(item.storageLocationId);
                return facilityId === user?.facilityId;
            });
        }
        return allItems;
    }, [user, isRestrictedUser, inventoryItems, storageLocations, facilities, physicalCounts]);
    
    const storageLocationMap = useMemo(() => new Map(storageLocations.map(sl => [sl.id, sl.facilityId])), [storageLocations]);
    const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f.name])), [facilities]);
    const inventoryOptions = useMemo(() => {
        return accessibleItems.map(item => {
            const master = itemMasters.find(im => im.id === item.itemMasterId);
            const facilityId = storageLocationMap.get(item.storageLocationId);
            const facilityName = facilityId ? facilityMap.get(facilityId) : 'N/A';
            return {
                value: item.id,
                label: master?.name || 'Unknown Item',
                ...item,
                master,
                facilityName
            }
        })
    }, [accessibleItems, itemMasters, storageLocationMap, facilityMap]);
    
    const getDetailsForItem = (inventoryItemId: string): { item?: InventoryItem, master?: ItemMaster } => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    };
    
    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.name || 'Unknown';
    const getFacilityName = (facilityId: string) => facilities.find(f => f.id === facilityId)?.name || 'N/A';
    
    const handleItemChange = (id: string, field: keyof ReturnItemRow, value: string | null) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item };
                (updatedItem as any)[field] = value || '';
                if (field === 'inventoryItemId') {
                    updatedItem.quantity = '';
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const addItemRow = () => setItems([...items, { ...initialItemState, id: crypto.randomUUID() }]);
    const removeItemRow = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };
    
    const handleFindAndLoadItems = async () => {
        if (!dispenseControlNumber.trim()) return;
        setIsLoadingDispense(true);
        
        await new Promise(res => setTimeout(res, 300));
        const foundLog = dispenseLogs.find(log => log.controlNumber === dispenseControlNumber.trim());

        if (!foundLog) {
            showError({ title: "Not Found", message: "Dispense voucher not found. Please check the control number." });
            setIsLoadingDispense(false);
            return;
        }
        
        setReturnedBy(foundLog.dispensedTo);
        setOriginalDispenseId(foundLog.id);
        
        const newItems: ReturnItemRow[] = foundLog.items.map(dispensedItem => {
            const { master } = getDetailsForItem(dispensedItem.inventoryItemId);
            return {
                id: crypto.randomUUID(),
                inventoryItemId: dispensedItem.inventoryItemId,
                quantity: String(dispensedItem.quantity),
                itemName: master?.name || 'Unknown Item',
                maxQuantity: dispensedItem.quantity,
            };
        });
        
        setItems(newItems);
        setIsDispenseLoaded(true);
        setIsLoadingDispense(false);
    };

    const handleClearDispense = () => {
        setDispenseControlNumber('');
        setOriginalDispenseId('');
        setReturnedBy('');
        setItems([initialItemState]);
        setIsDispenseLoaded(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!returnedBy || !reason || items.some(i => !i.inventoryItemId || !i.quantity || parseInt(i.quantity) <= 0)) {
            showError({ title: 'Validation Error', message: 'Please fill out all required fields, including returned by, reason, and ensure all items have a valid quantity.' });
            return;
        }
        if (!user) {
            showError({ title: 'Authentication Error', message: 'Cannot determine user.' });
            return;
        }
    
        const storageLocationMap = new Map(storageLocations.map(sl => [sl.id, sl.facilityId]));
        let transactionFacilityId: string | undefined;
    
        for (const [index, itemRow] of items.entries()) {
            const { item, master } = getDetailsForItem(itemRow.inventoryItemId);
            if (!item) {
                showError({ title: 'Validation Error', message: `Details for ${master?.name || 'an item'} could not be found.` });
                return;
            }
             if (isDispenseLoaded && itemRow.maxQuantity && parseInt(itemRow.quantity) > itemRow.maxQuantity) {
                showError({ title: 'Validation Error', message: `Return quantity for ${master?.name} cannot exceed the originally dispensed quantity of ${itemRow.maxQuantity}.` });
                return;
            }
            const currentItemFacilityId = storageLocationMap.get(item.storageLocationId);
            if (index === 0) transactionFacilityId = currentItemFacilityId;
            else if (currentItemFacilityId !== transactionFacilityId) {
                showError({ title: 'Validation Error', message: 'All items in a single return must be from the same facility.' });
                return;
            }
        }
        if (!transactionFacilityId) {
            showError({ title: 'Validation Error', message: 'Could not determine the transaction facility.' });
            return;
        }

        const isConfirmed = await confirm({
            title: "Confirm Internal Return",
            message: "This will add the returned items back into stock. Please confirm the details are correct.",
            confirmText: "Confirm Return"
        });

        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            const newLogRef = db.ref('internalReturnLogs').push();
            const newLogData: Omit<InternalReturnLog, 'id'> = {
                controlNumber,
                items: items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: parseInt(i.quantity) })),
                returnedBy,
                reason,
                ...(originalDispenseId && { originalDispenseId }),
                notes,
                userId: user.uid,
                facilityId: transactionFacilityId,
                timestamp: new Date().toISOString()
            };

            const updates: Record<string, any> = { [`/internalReturnLogs/${newLogRef.key}`]: newLogData };
            
            newLogData.items.forEach(logItem => {
                updates[`/inventoryItems/${logItem.inventoryItemId}/quantity`] = firebase.database.ServerValue.increment(logItem.quantity);
            });

            await db.ref().update(updates);
            await logAuditEvent(user, 'Internal Return', { controlNumber, returnedBy, facilityName: getFacilityName(transactionFacilityId as string) });
            showSuccess({ title: 'Success', message: 'Return processed successfully!' });
            handleClearDispense();
            setReason('');
            setNotes('');
        } catch (error) {
            console.error("Failed to process return:", error);
            showError({ title: 'Error', message: 'An error occurred while processing the return.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // History section logic
    const handleHistoryFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setHistoryFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleHistoryDateChange = (name: 'startDate' | 'endDate', date: Date | null) => setHistoryFilters(prev => ({ ...prev, [name]: date }));

    const augmentedLogs: (InternalReturnLog & { userName: string; facilityName: string; })[] = useMemo(() => (internalReturnLogs as InternalReturnLog[] || []).map((log: InternalReturnLog) => ({...log, userName: getUserName(log.userId), facilityName: getFacilityName(log.facilityId)})), [internalReturnLogs, users, facilities]);

    const filteredLogs: (InternalReturnLog & { userName: string; facilityName: string; })[] = useMemo(() => {
        return augmentedLogs.filter(log => {
            const { searchTerm, facilityId, reason, startDate, endDate } = historyFilters;
            const logDate = new Date(log.timestamp);
            const sDate = startDate ? new Date(startDate) : null; if(sDate) sDate.setHours(0,0,0,0);
            const eDate = endDate ? new Date(endDate) : null; if(eDate) eDate.setHours(23,59,59,999);
            
            return (!searchTerm || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase()) || log.returnedBy.toLowerCase().includes(searchTerm.toLowerCase())) &&
                   (!facilityId || log.facilityId === facilityId) &&
                   (!reason || log.reason === reason) &&
                   (!sDate || logDate >= sDate) &&
                   (!eDate || logDate <= eDate);
        });
    }, [augmentedLogs, historyFilters]);

    const { sortedItems: sortedLogs, requestSort, sortConfig } = useSort(filteredLogs, { key: 'timestamp', direction: 'descending' });
    useEffect(() => setCurrentPage(1), [historyFilters, itemsPerPage, sortConfig]);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedLogs, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
    
    const renderInventoryOption = (option: SearchableSelectOption, isSelected: boolean) => (
        <div>
            <span className="font-semibold block truncate">{option.label}</span>
            <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-secondary-500'}`}>
                Batch: {option.batchNumber} | Qty: {option.quantity} | Expires: {option.expiryDate ? new Date(option.expiryDate).toLocaleDateString() : 'N/A'}
            </span>
        </div>
    );

    const handleOpenEditModal = (log: InternalReturnLog) => {
        setLogToEdit(log);
        setIsEditModalOpen(true);
    };
    
    const handleSaveEdit = async (logId: string, newTimestamp: string, newNotes: string) => {
        if (!user) {
            showError({ title: "Error", message: "You are not logged in." });
            return;
        }
        const logToUpdate = internalReturnLogs.find(log => log.id === logId);
        if (!logToUpdate) {
            showError({ title: "Error", message: "Log not found." });
            return;
        }
    
        const updates: Record<string, any> = {
            timestamp: newTimestamp,
            notes: newNotes,
        };
        
        await db.ref(`internalReturnLogs/${logId}`).update(updates);
    
        await logAuditEvent(user, "Internal Return Voucher Update", {
            controlNumber: logToUpdate.controlNumber,
            changes: {
                timestamp: { from: logToUpdate.timestamp, to: newTimestamp },
                notes: { from: logToUpdate.notes, to: newNotes }
            }
        });
        showSuccess({ title: "Success", message: "Voucher updated successfully." });
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-secondary-800">Patient & Ward Returns</h2>
            <Card>
                <div className="p-4 space-y-3">
                    <h4 className="font-medium text-secondary-800">Match Against Dispense Voucher (Optional)</h4>
                    <p className="text-sm text-secondary-600">Enter a dispense control number to automatically load the items from that transaction.</p>
                    <div className="flex items-end gap-2">
                        <Input label="Original Dispense Control #" value={dispenseControlNumber} onChange={e => setDispenseControlNumber(e.target.value)} disabled={isDispenseLoaded}/>
                        <Button type="button" onClick={handleFindAndLoadItems} disabled={isLoadingDispense || isDispenseLoaded}>
                            {isLoadingDispense ? <Spinner size="sm"/> : 'Find & Load Items'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={handleClearDispense} disabled={!isDispenseLoaded}>Clear</Button>
                    </div>
                </div>
            </Card>

            <form onSubmit={handleSubmit}>
                <Card>
                    <div className="p-6 space-y-8">
                        <div>
                            <h3 className="text-lg font-medium">Return Voucher Details</h3>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Input label="Control Number" value={controlNumber} readOnly disabled />
                                <Input label="Returned By (Patient/Dept)" value={returnedBy} onChange={e => setReturnedBy(e.target.value)} required disabled={isDispenseLoaded} />
                                <Select label="Reason for Return" value={reason} onChange={e => setReason(e.target.value as ReturnFromPatientReason)} required>
                                    <option value="">Select a reason...</option>
                                    {Object.values(ReturnFromPatientReason).map(r => <option key={r} value={r}>{r}</option>)}
                                </Select>
                            </div>
                            <div className="mt-4"><Textarea label="Notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
                        </div>

                        <div className="border-t pt-8">
                            <h3 className="text-lg font-medium mb-2">Items Returned</h3>
                            <div className="hidden md:grid grid-cols-12 gap-x-4 mb-1 px-2 text-xs font-medium text-secondary-500 uppercase">
                                <div className="col-span-8">Item Batch</div>
                                <div className="col-span-2">Current Stock</div>
                                <div className="col-span-2">Return Qty</div>
                            </div>
                            <div className="space-y-2">
                                {items.map(itemRow => {
                                    const { item, master } = getDetailsForItem(itemRow.inventoryItemId);
                                    return (
                                        <div key={itemRow.id} className="grid grid-cols-12 gap-x-4 gap-y-3 items-end p-2 rounded-lg even:bg-secondary-50/50">
                                            <div className="col-span-12 md:col-span-8">
                                                {isDispenseLoaded ? (
                                                     <Input value={itemRow.itemName || ''} disabled />
                                                ) : (
                                                    <SearchableSelect options={inventoryOptions} value={itemRow.inventoryItemId} onChange={value => handleItemChange(itemRow.id, 'inventoryItemId', value)} placeholder="Search for an item batch..." renderOption={renderInventoryOption} />
                                                )}
                                            </div>
                                            <div className="col-span-6 md:col-span-2"><Input value={item ? `${item.quantity} ${master?.unit}` : '-'} readOnly disabled /></div>
                                            <div className="col-span-5 md:col-span-2"><Input type="number" placeholder="0" value={itemRow.quantity} onChange={e => handleItemChange(itemRow.id, 'quantity', e.target.value)} required min="1" max={itemRow.maxQuantity} title={itemRow.maxQuantity ? `Max return: ${itemRow.maxQuantity}` : ''} /></div>
                                            <div className="col-span-1 flex items-center justify-end">{items.length > 1 && !isDispenseLoaded && <Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(itemRow.id)} className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 h-auto"><TrashIcon /></Button>}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4">{!isDispenseLoaded && <Button type="button" variant="secondary" onClick={addItemRow} leftIcon={<PlusIcon />}>Add Another Item</Button>}</div>
                        </div>
                    </div>
                
                    <div className="bg-secondary-50 px-6 py-4 text-right rounded-b-lg">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="sm" /> : 'Confirm Return'}
                        </Button>
                    </div>
                </Card>
            </form>

            <Card
                title="Return History"
                footer={
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={sortedLogs.length}
                        startItemIndex={(currentPage - 1) * itemsPerPage}
                        endItemIndex={Math.min(((currentPage - 1) * itemsPerPage) + itemsPerPage, sortedLogs.length)}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                }
            >
                 <div className="p-4 border-b space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-secondary-900">History & Filters</h3>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Input name="searchTerm" placeholder="Search Control # or By..." value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} />
                        <Select name="facilityId" value={historyFilters.facilityId} onChange={handleHistoryFilterChange} disabled={isRestrictedUser}>
                            {!isRestrictedUser && <option value="">All Facilities</option>}
                            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                         <Select name="reason" value={historyFilters.reason} onChange={handleHistoryFilterChange}>
                            <option value="">All Reasons</option>
                            {Object.values(ReturnFromPatientReason).map(r => <option key={r} value={r}>{r}</option>)}
                        </Select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <DatePicker
                            label="Start Date"
                            selectedDate={historyFilters.startDate}
                            onSelectDate={(date) => handleHistoryDateChange('startDate', date)}
                        />
                         <DatePicker
                            label="End Date"
                            selectedDate={historyFilters.endDate}
                            onSelectDate={(date) => handleHistoryDateChange('endDate', date)}
                        />
                     </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <SortableHeader sortKey="timestamp" requestSort={requestSort} sortConfig={sortConfig}>Date</SortableHeader>
                                <SortableHeader sortKey="controlNumber" requestSort={requestSort} sortConfig={sortConfig}>Control #</SortableHeader>
                                <SortableHeader sortKey="returnedBy" requestSort={requestSort} sortConfig={sortConfig}>Returned By</SortableHeader>
                                <SortableHeader sortKey="reason" requestSort={requestSort} sortConfig={sortConfig}>Reason</SortableHeader>
                                <SortableHeader sortKey="userName" requestSort={requestSort} sortConfig={sortConfig}>Recorded By</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-700">{log.controlNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">{log.returnedBy}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.reason}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        {canModify && <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(log)} title="Edit Voucher Notes/Date"><EditIcon /></Button>}
                                        <Button variant="ghost" size="sm" onClick={() => window.open(`/#/print/return-internal/${log.id}`, '_blank')} title="Print Voucher"><PrintIcon /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paginatedLogs.length === 0 && <p className="text-center p-4">No returns have been recorded.</p>}
                </div>
            </Card>
            {logToEdit && <EditInternalReturnLogModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} log={logToEdit} onSave={handleSaveEdit} />}
        </div>
    );
};
export default PatientWardReturns;