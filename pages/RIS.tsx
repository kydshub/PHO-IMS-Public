import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { db } from '../services/firebase';
import { Role, RISLog, InventoryItem, ItemMaster, FacilityStatus, PhysicalCountStatus, ConsignmentConsumptionLog, Facility, Category } from '../types';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { logAuditEvent } from '../services/audit';
import { TablePagination } from '../components/ui/TablePagination';
import { useConfirmation } from '../hooks/useConfirmation';
import { useInfoModal } from '../hooks/useInfoModal';
import { DatePicker } from '../components/ui/DatePicker';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import SearchableSelect, { SearchableSelectOption } from '../components/ui/SearchableSelect';
import { generateControlNumber } from '../utils/helpers';
import { PREFIX_RIS } from '../constants';
import { Spinner } from '../components/ui/Spinner';
import { downloadStringAsFile } from '../../utils/download';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const ScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;

type RISItemRow = { id: string; inventoryItemId: string; quantity: string };

const RIS: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { settings } = useSettings();
    const { risLogs, inventoryItems, itemMasters, storageLocations, users, facilities, physicalCounts, suppliers, categories } = data;
    const confirm = useConfirmation();
    const navigate = useNavigate();
    const { showSuccess, showError } = useInfoModal();
  
    const [controlNumber, setControlNumber] = useState('');
    const initialItemState: RISItemRow = { id: crypto.randomUUID(), inventoryItemId: '', quantity: '' };
    const [items, setItems] = useState<RISItemRow[]>([initialItemState]);
    const [requestedBy, setRequestedBy] = useState('');
    const [purpose, setPurpose] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
  
    const isRestrictedUser = user?.role === Role.Encoder;
  
    const [historyFilters, setHistoryFilters] = useState({
        searchTerm: '',
        facilityId: isRestrictedUser ? user?.facilityId || '' : '',
        categoryId: '',
        userId: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);

    useEffect(() => {
        setControlNumber(generateControlNumber(PREFIX_RIS, risLogs.length));
    }, [risLogs.length]);

    const accessibleItems = useMemo(() => {
        const activeCountStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
        const frozenItemIds = new Set<string>();
        physicalCounts.filter(c => activeCountStatuses.includes(c.status)).forEach(c => c.items?.forEach(i => i && frozenItemIds.add(i.inventoryItemId)));

        const storageLocationMap = new Map<string, string>();
        storageLocations.forEach(sl => storageLocationMap.set(sl.id, sl.facilityId));
        
        const allItems = inventoryItems.filter(item => {
            const facilityId = storageLocationMap.get(item.storageLocationId);
            return facilityId && item.quantity > 0 && !frozenItemIds.has(item.id);
        });
        
        if (isRestrictedUser) {
            return allItems.filter(item => storageLocationMap.get(item.storageLocationId) === user?.facilityId);
        }
        return allItems;
    }, [user, isRestrictedUser, inventoryItems, storageLocations, facilities, physicalCounts]);

    const storageLocationMap = useMemo(() => new Map(storageLocations.map(sl => [sl.id, sl.facilityId])), [storageLocations]);
    const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f.name])), [facilities]);
    
    const inventoryOptions = useMemo(() => {
        const groupedByMaster = accessibleItems.reduce((acc, item) => {
            const masterId = item.itemMasterId;
            if (!acc[masterId]) acc[masterId] = [];
            (acc[masterId] as any[]).push(item);
            return acc;
        }, {} as Record<string, typeof accessibleItems>);
    
        const sortedAndMarkedItems = Object.values(groupedByMaster).flatMap(group => {
            const sortedGroup = (group as any[]).sort((a, b) => {
                if (!a.expiryDate && !b.expiryDate) return 0;
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            });
            if (sortedGroup.length > 0) {
                (sortedGroup[0] as any).isFefoPick = true;
            }
            return sortedGroup;
        });

        return sortedAndMarkedItems.map(item => {
            const master = itemMasters.find(im => im.id === item.itemMasterId);
            const facilityId = storageLocationMap.get(item.storageLocationId);
            const facilityName = facilityId ? facilityMap.get(facilityId) : 'N/A';
            return { value: item.id, label: master?.name || 'Unknown', ...item, master, facilityName, isFefoPick: (item as any).isFefoPick || false }
        })
    }, [accessibleItems, itemMasters, storageLocationMap, facilityMap]);
    
    const getDetailsForItem = (inventoryItemId: string): { item?: InventoryItem, master?: ItemMaster } => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    };

    const handleItemChange = (id: string, field: keyof RISItemRow, value: string | null) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value || '' };
                if (field === 'inventoryItemId') updatedItem.quantity = '';
                return updatedItem;
            }
            return item;
        });
        setItems(newItems);
    };

    const addItemRow = () => setItems([...items, { ...initialItemState, id: crypto.randomUUID() }]);
    const removeItemRow = (id: string) => setItems(items.filter((item) => item.id !== id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestedBy || !purpose || items.some(i => !i.inventoryItemId || !i.quantity || parseInt(i.quantity) <= 0)) {
            showError({title: "Validation Error", message: "Please fill out all required fields and ensure all items have a valid quantity."});
            return;
        }
        if (!user) { showError({title: "Auth Error", message: "Cannot determine user."}); return; }

        let transactionFacilityId: string | undefined;
        for (const [index, itemRow] of items.entries()) {
            const { item, master } = getDetailsForItem(itemRow.inventoryItemId);
            if (!item || parseInt(itemRow.quantity) > item.quantity) {
                showError({title: "Validation Error", message: `Quantity for ${master?.name || 'an item'} cannot exceed available stock.`});
                return;
            }
            const currentItemFacilityId = storageLocationMap.get(item.storageLocationId);
            if (!currentItemFacilityId) {
                showError({title: "Validation Error", message: `Could not determine facility for item: ${master?.name}.`});
                return;
            }
            if (index === 0) transactionFacilityId = currentItemFacilityId;
            else if (currentItemFacilityId !== transactionFacilityId) {
                showError({title: "Validation Error", message: 'All items in a single transaction must be from the same facility.'});
                return;
            }
        }
        if (!transactionFacilityId) {
            showError({title: "Validation Error", message: 'Could not determine the transaction facility.'});
            return;
        }

        const isConfirmed = await confirm({ title: "Confirm Issuance", message: "This will deduct the items from inventory. Please confirm.", confirmText: "Confirm" });
        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            const newLogRef = db.ref('risLogs').push();
            const logId = newLogRef.key!;
            const newLogData: Omit<RISLog, 'id'> = {
                controlNumber,
                items: items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: parseInt(i.quantity) })),
                requestedBy, purpose, notes,
                userId: user.uid,
                facilityId: transactionFacilityId,
                timestamp: new Date().toISOString(),
            };

            const updates: Record<string, any> = { [`/risLogs/${logId}`]: newLogData };

            const consumedConsignmentItems: {inventoryItem: InventoryItem, master: ItemMaster, quantity: number}[] = [];
            newLogData.items.forEach(logItem => {
                const { item: sourceItem, master } = getDetailsForItem(logItem.inventoryItemId);
                if(sourceItem && master) {
                  updates[`/inventoryItems/${sourceItem.id}/quantity`] = sourceItem.quantity - logItem.quantity;
                  if (sourceItem.isConsignment) {
                    consumedConsignmentItems.push({ inventoryItem: sourceItem, master, quantity: logItem.quantity });
                  }
                }
            });

            if (consumedConsignmentItems.length > 0) {
              const itemsBySupplier = new Map<string, typeof consumedConsignmentItems>();
                consumedConsignmentItems.forEach(itemData => {
                    const supplierId = itemData.inventoryItem.supplierId;
                    if (!itemsBySupplier.has(supplierId)) itemsBySupplier.set(supplierId, []);
                    itemsBySupplier.get(supplierId)!.push(itemData);
                });
    
                itemsBySupplier.forEach((supplierItems, supplierId) => {
                    const newConsumptionLogRef = db.ref('consignmentConsumptionLogs').push();
                    const totalValueConsumed = supplierItems.reduce((total, itemData) => {
                        const cost = itemData.inventoryItem.purchaseCost ?? itemData.master.unitCost;
                        return total + (itemData.quantity * cost);
                    }, 0);
                    const newConsumptionLog: Omit<ConsignmentConsumptionLog, 'id'> = {
                        dispenseLogId: `ris-${logId}`,
                        controlNumber: `CONSUME-RIS-${controlNumber}`,
                        supplierId,
                        items: supplierItems.map(itemData => ({
                            inventoryItemId: itemData.inventoryItem.id,
                            quantity: itemData.quantity,
                            unitCost: itemData.inventoryItem.purchaseCost ?? itemData.master.unitCost,
                        })),
                        totalValueConsumed,
                        userId: user.uid,
                        facilityId: transactionFacilityId!,
                        timestamp: new Date().toISOString(),
                    };
                    updates[`/consignmentConsumptionLogs/${newConsumptionLogRef.key}`] = newConsumptionLog;
                });
            }

            await db.ref().update(updates);
            await logAuditEvent(user, 'Stock Issuance (RIS)', { controlNumber, requestedBy, purpose, facilityName: getFacilityName(transactionFacilityId) });
            showSuccess({title: "Success", message: "RIS created successfully!"});
            setItems([initialItemState]);
            setRequestedBy('');
            setPurpose('');
            setNotes('');
        } catch (error) {
            console.error("Failed to create RIS:", error);
            showError({title: "Error", message: "An error occurred."});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.name || 'Unknown User';
    const getFacilityName = (facilityId: string) => facilities.find(f => f.id === facilityId)?.name || 'N/A';

    const augmentedLogs = useMemo(() => risLogs.map(log => ({ ...log, userName: getUserName(log.userId), facilityName: getFacilityName(log.facilityId) })), [risLogs, users, facilities]);
    
    const filteredLogs = useMemo(() => {
        const itemMasterCategoryMap = new Map(itemMasters.map(im => [im.id, im.categoryId]));
        const inventoryItemMasterMap = new Map(inventoryItems.map(ii => [ii.id, ii.itemMasterId]));

        return augmentedLogs.filter(log => {
            const { searchTerm, facilityId, startDate, endDate, categoryId, userId } = historyFilters;
            const logDate = new Date(log.timestamp);
            const sDate = startDate ? new Date(startDate) : null; if(sDate) sDate.setHours(0,0,0,0);
            const eDate = endDate ? new Date(endDate) : null; if(eDate) eDate.setHours(23,59,59,999);
            
            const searchMatch = !searchTerm || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase()) || log.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
            const facilityMatch = !facilityId || log.facilityId === facilityId;
            const dateMatch = (!sDate || logDate >= sDate) && (!eDate || logDate <= eDate);
            const userMatch = !userId || log.userId === userId;
            const categoryMatch = !categoryId || log.items.some(item => {
                const itemMasterId = inventoryItemMasterMap.get(item.inventoryItemId);
                if (!itemMasterId) return false;
                const itemCategoryId = itemMasterCategoryMap.get(itemMasterId);
                return itemCategoryId === categoryId;
            });
            
            return searchMatch && facilityMatch && dateMatch && categoryMatch && userMatch;
        });
    }, [augmentedLogs, historyFilters, itemMasters, inventoryItems]);

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
    
    const handleHistoryFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setHistoryFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleHistoryDateChange = (name: 'startDate' | 'endDate', date: Date | null) => setHistoryFilters(prev => ({ ...prev, [name]: date }));
    
    const exportHistoryToCSV = () => {
        const headers = ['Date', 'Control #', 'Items Summary', 'Requested By', 'Purpose', 'Issued By', 'Facility'];
        const csvRows = [
            headers.join(','),
            ...sortedLogs.map(log => {
                const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
                const itemSummary = log.items.map(item => `${item.quantity} x ${getDetailsForItem(item.inventoryItemId).master?.name || 'N/A'}`).join('; ');
                return [
                    escape(new Date(log.timestamp).toLocaleDateString()),
                    escape(log.controlNumber),
                    escape(itemSummary),
                    escape(log.requestedBy),
                    escape(log.purpose),
                    escape(log.userName),
                    escape(log.facilityName)
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'ris_history.csv', 'text/csv;charset=utf-8;');
    };
    const handlePrintHistory = () => navigate('/print/ris-history', { state: { items: sortedLogs } });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-secondary-800">Requisition and Issuance Slip (RIS)</h2>
      
            <form onSubmit={handleSubmit}>
                <Card>
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">Voucher Details</h3>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Input label="Control Number" value={controlNumber} readOnly disabled />
                                <Input label="Requested By (Dept/Person)" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} required />
                                <Input label="Purpose" value={purpose} onChange={e => setPurpose(e.target.value)} required />
                            </div>
                            <div className="mt-4"><Textarea label="Notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
                        </div>
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium mb-2">Items</h3>
                            <div className="hidden md:grid grid-cols-12 gap-x-4 mb-1 px-2 text-xs font-medium text-secondary-500 uppercase">
                                <div className="col-span-8">Item Batch</div>
                                <div className="col-span-2">Available</div>
                                <div className="col-span-2">Quantity</div>
                            </div>
                            <div className="space-y-2">
                                {items.map(itemRow => {
                                    const { item, master } = getDetailsForItem(itemRow.inventoryItemId);
                                    return (
                                        <div key={itemRow.id} className="grid grid-cols-12 gap-x-4 gap-y-3 items-end p-2 rounded-lg even:bg-secondary-50/50">
                                            <div className="col-span-12 md:col-span-8"><SearchableSelect options={inventoryOptions} value={itemRow.inventoryItemId} onChange={value => handleItemChange(itemRow.id, 'inventoryItemId', value)} placeholder="Search for an item batch..." renderOption={renderInventoryOption}/></div>
                                            <div className="col-span-6 md:col-span-2"><Input value={item ? `${item.quantity} ${master?.unit}` : '-'} readOnly disabled /></div>
                                            <div className="col-span-5 md:col-span-2"><Input type="number" placeholder="0" value={itemRow.quantity} onChange={e => handleItemChange(itemRow.id, 'quantity', e.target.value)} required max={item?.quantity} min="1"/></div>
                                            <div className="col-span-1 flex items-center justify-end">{items.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(itemRow.id)} className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 h-auto"><TrashIcon /></Button>}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4"><Button type="button" variant="secondary" onClick={addItemRow} leftIcon={<PlusIcon />}>Add Item</Button></div>
                        </div>
                    </div>
                     <div className="bg-secondary-50 px-6 py-4 text-right rounded-b-lg">
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : 'Record Issuance'}</Button>
                    </div>
                </Card>
            </form>
            
            <Card title="Recent RIS" footer={<TablePagination currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={sortedLogs.length} startItemIndex={(currentPage - 1) * itemsPerPage} endItemIndex={Math.min(((currentPage - 1) * itemsPerPage) + itemsPerPage, sortedLogs.length)} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />}>
                <div className="p-4 border-b space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-secondary-900">History & Filters</h3>
                        <div className="flex gap-2">
                            <Button onClick={handlePrintHistory} variant="secondary" leftIcon={<PrintIcon />}>Print</Button>
                            <Button onClick={exportHistoryToCSV} variant="secondary" leftIcon={<DownloadIcon />}>Export CSV</Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Input name="searchTerm" placeholder="Search Control # or By..." value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} />
                        <Select name="facilityId" value={historyFilters.facilityId} onChange={handleHistoryFilterChange} disabled={isRestrictedUser}>
                            {!isRestrictedUser && <option value="">All Facilities</option>}
                            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                         <Select name="categoryId" value={historyFilters.categoryId} onChange={handleHistoryFilterChange}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                         <Select name="userId" value={historyFilters.userId} onChange={handleHistoryFilterChange}>
                            <option value="">All Users</option>
                            {users.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Items</th>
                                <SortableHeader sortKey="requestedBy" requestSort={requestSort} sortConfig={sortConfig}>Requested By</SortableHeader>
                                <SortableHeader sortKey="userName" requestSort={requestSort} sortConfig={sortConfig}>Issued By</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedLogs.map(log => {
                                const itemSummary = log.items.length > 1 ? `${log.items.length} items` : (getDetailsForItem(log.items[0]?.inventoryItemId).master?.name || 'N/A');
                                return (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{log.controlNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{itemSummary}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.requestedBy}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.userName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                            <Button variant="ghost" size="sm" onClick={() => window.open(`/#/print/ris/${log.id}`, '_blank')}><PrintIcon /></Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                     {paginatedLogs.length === 0 && <p className="text-center p-4">No RIS have been recorded yet.</p>}
                </div>
            </Card>
            {isScannerOpen && <BarcodeScannerModal onScan={() => {}} onClose={() => setIsScannerOpen(false)} />}
        </div>
    );
};

export default RIS;
