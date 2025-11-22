import React, { useState, useMemo, useEffect } from 'react';
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
import { WriteOffReason, WastageSubReason, Role, InventoryItem, ItemMaster, WriteOffLog, FacilityStatus, StorageLocation, PhysicalCountStatus, ConsignmentConsumptionLog, Facility } from '../types';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { logAuditEvent } from '../services/audit';
import { TablePagination } from '../components/ui/TablePagination';
import { useConfirmation } from '../hooks/useConfirmation';
import { DatePicker } from '../components/ui/DatePicker';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { downloadStringAsFile } from '../../utils/download';
import SearchableSelect, { SearchableSelectOption } from '../components/ui/SearchableSelect';
import { Spinner } from '../components/ui/Spinner';
import { useInfoModal } from '../hooks/useInfoModal';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const ScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;

type WriteOffItemRow = { id: string; inventoryItemId: string; quantity: string };

const WriteOffs: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { settings } = useSettings();
    const { inventoryItems, itemMasters, storageLocations, users, facilities, writeOffLogs, fundSources, suppliers } = data;
    const navigate = useNavigate();
    const isRestrictedUser = user?.role === Role.Encoder;
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const confirm = useConfirmation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess, showError } = useInfoModal();

    const initialItemState: WriteOffItemRow = { id: crypto.randomUUID(), inventoryItemId: '', quantity: '' };

    const [controlNumber, setControlNumber] = useState('');
    const [items, setItems] = useState<WriteOffItemRow[]>([initialItemState]);
    const [rowFilters, setRowFilters] = useState<Record<number, string>>({}); // For barcode scanning
    const [reason, setReason] = useState<WriteOffReason | ''>('');
    const [subReason, setSubReason] = useState<WastageSubReason | ''>('');
    const [notes, setNotes] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [historyFilters, setHistoryFilters] = useState({
        searchTerm: '',
        facilityId: isRestrictedUser ? user?.facilityId || '' : '',
        reason: '',
        categoryId: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
    
    const generateControlNumber = (logCount: number) => {
        const date = new Date();
        const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
        const sequence = (logCount + 1).toString().padStart(4, '0');
        return `WO-${yyyymmdd}-${sequence}`;
    };

    useEffect(() => {
        setControlNumber(generateControlNumber(writeOffLogs.length));
    }, [writeOffLogs.length]);

    const accessibleItems = useMemo(() => {
        const activeCountStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
        const frozenItemIds = new Set<string>();
        data.physicalCounts
            .filter(count => activeCountStatuses.includes(count.status))
            .forEach(count => {
                count.items?.forEach(item => {
                    if (item) frozenItemIds.add(item.inventoryItemId);
                });
            });

        const storageLocationMap = new Map<string, string>();
        storageLocations.forEach(sl => storageLocationMap.set(sl.id, sl.facilityId));
        
        const activeFacilityIds = new Set(facilities.filter(f => f.status === FacilityStatus.Active).map(f => f.id));
        
        const allItemsWithFacility = inventoryItems.map(item => ({...item, facilityId: storageLocationMap.get(item.storageLocationId)}));
        
        const itemsInActiveFacilities = allItemsWithFacility.filter(item => item.facilityId && activeFacilityIds.has(item.facilityId));

        if (isRestrictedUser) {
            return itemsInActiveFacilities.filter(item => 
                item.facilityId === user?.facilityId && 
                item.quantity > 0 &&
                !item.isConsignment &&
                !frozenItemIds.has(item.id)
            );
        }
        return itemsInActiveFacilities.filter(item => item.quantity > 0 && !item.isConsignment && !frozenItemIds.has(item.id));
    }, [user, isRestrictedUser, inventoryItems, storageLocations, facilities, data.physicalCounts]);
    
    const storageLocationMap = useMemo(() => new Map(storageLocations.map(sl => [sl.id, sl.facilityId])), [storageLocations]);
    const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f.name])), [facilities]);
    
    const inventoryOptions = useMemo(() => {
        const groupedByMaster = accessibleItems.reduce((acc, item) => {
            const masterId = item.itemMasterId;
            if (!acc[masterId]) {
                acc[masterId] = [];
            }
            acc[masterId].push(item);
            return acc;
        }, {} as Record<string, typeof accessibleItems>);
    
        const sortedAndMarkedItems = Object.values(groupedByMaster).flatMap(group => {
            const sortedGroup = group.sort((a, b) => {
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
            const fundSource = fundSources.find(fs => fs.id === item.fundSourceId);
            const supplier = suppliers.find(s => s.id === item.supplierId);
            const facilityId = storageLocationMap.get(item.storageLocationId);
            const facilityName = facilityId ? facilityMap.get(facilityId) : 'N/A';
            return {
                value: item.id,
                label: master?.name || 'Unknown Item',
                ...item,
                master,
                fundSourceName: fundSource?.name || 'N/A',
                supplierName: supplier?.name || 'N/A',
                facilityName,
                isFefoPick: (item as any).isFefoPick || false,
            }
        })
    }, [accessibleItems, itemMasters, fundSources, suppliers, storageLocationMap, facilityMap]);

    const getDetailsForItem = (inventoryItemId: string) => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : null;
        return { item, master };
    };

    const handleItemChange = (id: string, field: keyof WriteOffItemRow, value: string | null) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value || '' };
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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || items.some(i => !i.inventoryItemId || !i.quantity || parseInt(i.quantity) <= 0)) {
            showError({ title: "Validation Error", message: "Please fill out the reason and ensure all items have a valid quantity." });
            return;
        }
        if (!user) {
            showError({ title: "Authentication Error", message: "Cannot determine user." });
            return;
        }

        const storageLocationMap = new Map<string, string>();
        storageLocations.forEach(sl => storageLocationMap.set(sl.id, sl.facilityId));

        let transactionFacilityId: string | undefined;
        for (const [index, itemRow] of items.entries()) {
            const { item, master } = getDetailsForItem(itemRow.inventoryItemId);
            if (!item || parseInt(itemRow.quantity) > item.quantity) {
                showError({ title: "Validation Error", message: `Write-off quantity for ${master?.name || 'an item'} cannot exceed available stock.` });
                return;
            }

            const currentItemFacilityId = storageLocationMap.get(item.storageLocationId);
            if (!currentItemFacilityId) {
                showError({ title: "Validation Error", message: `Could not determine facility for item: ${master?.name}.` });
                return;
            }

            if (index === 0) {
                transactionFacilityId = currentItemFacilityId;
            } else if (currentItemFacilityId !== transactionFacilityId) {
                showError({ title: "Validation Error", message: 'All items in a single write-off transaction must be from the same facility.' });
                return;
            }
        }
        
        if (!transactionFacilityId) {
            showError({ title: "Validation Error", message: 'Could not determine the transaction facility.' });
            return;
        }

        if (reason === WriteOffReason.Wastage && !subReason) {
             showError({ title: "Validation Error", message: 'Please select a sub-reason for wastage.' });
             return;
        }
        if (reason === WriteOffReason.Stolen && !notes) {
             showError({ title: "Validation Error", message: 'Please provide an incident report ID or notes for stolen items.' });
             return;
        }

        const summaryItems = items.map(itemRow => {
            const { master } = getDetailsForItem(itemRow.inventoryItemId);
            return { name: master?.name || 'Unknown Item', quantity: `${itemRow.quantity} ${master?.unit || ''}` };
        });

        const isConfirmed = await confirm({
            title: "Confirm Write-Off",
            message: (
                <div>
                    <p className="mb-4">Please review the details below. This action is irreversible and will remove the items from inventory.</p>
                    <div className="bg-secondary-50 p-3 rounded-md mb-4 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-secondary-600">Reason:</span><span className="font-medium text-secondary-900">{reason}{subReason ? ` (${subReason})` : ''}</span></div>
                    </div>
                    <h4 className="font-semibold text-secondary-700 mb-2">Items to Write-Off:</h4>
                    <ul className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-secondary-50/50">
                        {summaryItems.map((item, index) => (
                            <li key={index} className="text-sm flex justify-between">
                                <span className="font-medium text-secondary-800">{item.name}</span>
                                <span className="font-bold text-primary-700">{item.quantity}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ),
            confirmText: "Record Write-Off",
            variant: "danger"
        });

        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            const newLogRef = db.ref('writeOffLogs').push();
            const logId = newLogRef.key!;

            const newLogData: Omit<WriteOffLog, 'id'> = {
                controlNumber,
                items: items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: parseInt(i.quantity) })),
                reason,
                ...(subReason && { subReason }),
                ...(notes && { notes }),
                userId: user.uid,
                facilityId: transactionFacilityId,
                timestamp: new Date().toISOString(),
            };

            const updates: Record<string, any> = {
                [`/writeOffLogs/${logId}`]: newLogData
            };
            
            newLogData.items.forEach(logItem => {
                const sourceItem = inventoryItems.find(i => i.id === logItem.inventoryItemId);
                if(sourceItem) {
                    updates[`/inventoryItems/${sourceItem.id}/quantity`] = sourceItem.quantity - logItem.quantity;
                }
            });

            await db.ref().update(updates);

            const itemsSummary = newLogData.items.map(i => {
                const { master } = getDetailsForItem(i.inventoryItemId);
                return `${i.quantity} x ${master?.name || 'Unknown'}`;
            }).join(', ');
            
            const facilityName = facilities.find(f => f.id === transactionFacilityId)?.name || 'Unknown Facility';

            await logAuditEvent(user, 'Stock Write-Off', {
                controlNumber,
                reason: newLogData.reason,
                itemsSummary,
                facilityName,
            });

            showSuccess({ title: 'Success', message: 'Write-off recorded successfully!' });
            setItems([initialItemState]);
            setReason('');
            setSubReason('');
            setNotes('');
            setRowFilters({});
        } catch (error) {
            console.error("Failed to record write-off:", error);
            showError({ 
                title: "Write-Off Failed", 
                message: "An error occurred while saving the write-off. Please check your connection and try again." 
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleScan = () => setIsScannerOpen(true);

    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.name || 'Unknown User';
    const getFacilityName = (facilityId: string) => facilities.find(f => f.id === facilityId)?.name || 'Unknown Facility';

    const handleHistoryFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setHistoryFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleHistoryDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
        setHistoryFilters(prev => ({ ...prev, [name]: date }));
    };

    const augmentedLogs = useMemo(() => {
        return writeOffLogs.map(log => ({
            ...log,
            userName: getUserName(log.userId),
            facilityName: getFacilityName(log.facilityId),
        }));
    }, [writeOffLogs, users, facilities]);

    const filteredLogs = useMemo(() => {
        const itemMasterCategoryMap = new Map(itemMasters.map(im => [im.id, im.categoryId]));
        const inventoryItemMasterMap = new Map(inventoryItems.map(ii => [ii.id, ii.itemMasterId]));

        return augmentedLogs.filter(log => {
            if (log.controlNumber.startsWith('C-WO-')) return false;

            const { searchTerm, facilityId, reason, startDate, endDate, categoryId } = historyFilters;
            const logDate = new Date(log.timestamp);
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            const searchMatch = !searchTerm || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const facilityMatch = !facilityId || log.facilityId === facilityId;
            const reasonMatch = !reason || log.reason === reason;
            const dateMatch = (!sDate || logDate >= sDate) && (!eDate || logDate <= eDate);

            const categoryMatch = !categoryId || log.items.some(item => {
                const itemMasterId = inventoryItemMasterMap.get(item.inventoryItemId);
                if (!itemMasterId) return false;
                const itemCategoryId = itemMasterCategoryMap.get(itemMasterId);
                return itemCategoryId === categoryId;
            });

            return searchMatch && facilityMatch && reasonMatch && dateMatch && categoryMatch;
        });
    }, [augmentedLogs, historyFilters, itemMasters, inventoryItems]);

    const { sortedItems: sortedLogs, requestSort, sortConfig } = useSort(filteredLogs, { key: 'timestamp', direction: 'descending' });
    
    useEffect(() => setCurrentPage(1), [historyFilters, itemsPerPage, sortConfig]);

    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedLogs, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedLogs.length);

    const downloadVoucherAsCSV = (log: WriteOffLog & { userName: string; facilityName: string; }) => {
        const headers = ['Item Name', 'Brand', 'Batch #', 'Expiry Date', 'Quantity', 'Unit', 'Unit Cost', 'Subtotal'];
        
        const totalValue = log.items.reduce((acc, currentItem) => {
            const { item, master } = getDetailsForItem(currentItem.inventoryItemId);
            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
            return acc + (currentItem.quantity * cost);
        }, 0);
    
        const csvRows = [
            `"Control #","${log.controlNumber}"`,
            `"Date","${new Date(log.timestamp).toLocaleString()}"`,
            `"Reason","${log.reason}${log.subReason ? ` (${log.subReason})` : ''}"`,
            `"Recorded By","${log.userName}"`,
            `"Facility","${log.facilityName}"`,
            `"Notes","${(log.notes || '').replace(/"/g, '""')}"`,
            '',
            headers.join(','),
            ...log.items.map(writtenOffItem => {
                const { item, master } = getDetailsForItem(writtenOffItem.inventoryItemId);
                const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
                const subtotal = cost * writtenOffItem.quantity;
                return [
                    `"${master?.name || 'Unknown Item'}"`,
                    `"${master?.brand || 'N/A'}"`,
                    `"${item?.batchNumber || 'N/A'}"`,
                    `"${item?.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}"`,
                    writtenOffItem.quantity,
                    `"${master?.unit || ''}"`,
                    cost,
                    subtotal
                ].join(',');
            }),
            '',
            `"","","","","","","Total Value",${totalValue}`
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, `wo_${log.controlNumber}.csv`, 'text/csv;charset=utf-8;');
    };

    const exportHistoryToCSV = () => {
        const headers = ['Date', 'Control #', 'Items Summary', 'Total Qty', 'Reason', 'Sub-Reason', 'Notes', 'User', 'Facility'];
        const csvRows = [
            headers.join(','),
            ...sortedLogs.map(log => {
                const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
                const totalQty = log.items.reduce((sum, item) => sum + item.quantity, 0);
                const itemSummary = log.items.map(item => `${item.quantity} x ${getDetailsForItem(item.inventoryItemId).master?.name || 'N/A'}`).join('; ');
                return [
                    escape(new Date(log.timestamp).toLocaleDateString()),
                    escape(log.controlNumber),
                    escape(itemSummary),
                    totalQty,
                    escape(log.reason),
                    escape(log.subReason),
                    escape(log.notes),
                    escape(log.userName),
                    escape(log.facilityName)
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        const date = new Date().toISOString().split('T')[0];
        downloadStringAsFile(csvContent, `wo_history_${date}.csv`, 'text/csv;charset=utf-8;');
    };
    
    const handlePrintHistory = () => {
        navigate('/print/write-off-history', { state: { items: sortedLogs } });
    };
    
    const renderInventoryOption = (option: SearchableSelectOption, isSelected: boolean) => (
        <div className="flex justify-between items-center w-full">
            <div className="flex flex-col flex-grow min-w-0">
                <span className="font-semibold block truncate">{option.label} ({option.master?.brand || 'N/A'})</span>
                <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-secondary-500'} truncate`}>
                    Batch: {option.batchNumber} | Qty: {option.quantity} | Expires: {option.expiryDate ? new Date(option.expiryDate).toLocaleDateString() : 'N/A'}
                </span>
                {user?.role !== Role.Encoder && (
                    <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-secondary-500'}`}>
                        Facility: {option.facilityName}
                    </span>
                )}
            </div>
            {option.isFefoPick && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-200 rounded-full flex-shrink-0">
                    FEFO Pick
                </span>
            )}
        </div>
    );
    
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-secondary-800">Regular Inventory Write-Offs</h2>
            
            <form onSubmit={handleSubmit}>
              <Card>
                <div className="p-6 space-y-8">
                  {/* Voucher Details Section */}
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-secondary-900">Voucher Details</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Control Number" id="controlNumber" value={controlNumber} readOnly disabled />
                        <Select label="Reason" name="reason" value={reason} onChange={e => setReason(e.target.value as WriteOffReason)} required>
                            <option value="">Select a reason...</option>
                            {Object.values(WriteOffReason).map(r => <option key={r} value={r}>{r}</option>)}
                        </Select>
                    </div>

                    {reason === WriteOffReason.Wastage && (
                        <div className="mt-4">
                            <Select label="Wastage Sub-Reason" name="subReason" value={subReason} onChange={e => setSubReason(e.target.value as WastageSubReason)} required>
                                <option value="">Select sub-reason...</option>
                                {Object.values(WastageSubReason).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                            </Select>
                        </div>
                    )}
                    {(reason === WriteOffReason.Stolen || (reason === WriteOffReason.Wastage && subReason === WastageSubReason.Other)) && (
                         <div className="mt-4">
                            <Textarea label="Notes" name="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} required placeholder="For stolen items, please include an incident report number." />
                        </div>
                    )}
                  </div>
                  
                  {/* Items Section */}
                  <div className="border-t border-secondary-200 pt-8">
                      <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-medium leading-6 text-secondary-900">Items to Write-Off</h3>
                          {settings.enableBarcodeScanner && (
                            <Button type="button" variant="ghost" onClick={() => setIsScannerOpen(true)} leftIcon={<ScanIcon />}>Scan Item</Button>
                          )}
                      </div>
                      
                      <div className="hidden md:grid grid-cols-12 gap-x-4 mb-1 px-2 text-xs font-medium text-secondary-500 uppercase">
                            <div className="col-span-8">Item Name</div>
                            <div className="col-span-2">Available</div>
                            <div className="col-span-2">Quantity</div>
                        </div>

                      <div className="space-y-2">
                        {items.map((itemRow, index) => {
                                const { item, master } = getDetailsForItem(itemRow.inventoryItemId);
                                return (
                                <div key={itemRow.id} className="grid grid-cols-12 gap-x-4 gap-y-3 items-end p-2 rounded-lg even:bg-secondary-50/50">
                                    <div className="col-span-12 md:col-span-8">
                                        <label className="text-xs text-secondary-500 md:hidden">Item Name</label>
                                        <SearchableSelect
                                            options={inventoryOptions}
                                            value={itemRow.inventoryItemId}
                                            onChange={value => handleItemChange(itemRow.id, 'inventoryItemId', value)}
                                            placeholder="Search for an item..."
                                            renderOption={renderInventoryOption}
                                        />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                        <label className="text-xs text-secondary-500 md:hidden">Available</label>
                                        <Input value={item ? `${item.quantity} ${master?.unit}` : '-'} readOnly disabled />
                                    </div>
                                    <div className="col-span-5 md:col-span-2">
                                        <label className="text-xs text-secondary-500 md:hidden">Quantity</label>
                                        <Input name="quantity" type="number" placeholder="0" value={itemRow.quantity} onChange={e => handleItemChange(itemRow.id, 'quantity', e.target.value)} required max={item?.quantity} min="1" />
                                    </div>
                                     <div className="col-span-1 flex items-center justify-end">
                                        {items.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(itemRow.id)} className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 h-auto"><TrashIcon /></Button>}
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                      <div className="mt-4">
                        <Button type="button" variant="secondary" onClick={addItemRow} leftIcon={<PlusIcon />}>Add Another Item</Button>
                      </div>
                  </div>
                </div>

                <div className="bg-secondary-50 px-6 py-4 text-right rounded-b-lg">
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm"/> : 'Record Write-Off'}</Button>
                </div>
              </Card>
            </form>

            <Card
                title="Write-Off History"
                footer={
                     <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={sortedLogs.length}
                        startItemIndex={startItemIndex}
                        endItemIndex={endItemIndex}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                }
                className="mt-6"
            >
                <div className="p-4 border-b space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-secondary-900">History & Filters</h3>
                        <div className="flex gap-2">
                            <Button onClick={handlePrintHistory} variant="secondary" leftIcon={<PrintIcon />}>Print</Button>
                            <Button onClick={exportHistoryToCSV} variant="secondary" leftIcon={<DownloadIcon />}>Export CSV</Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Input name="searchTerm" placeholder="Search Control #" value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} />
                        {!isRestrictedUser && (
                            <Select name="facilityId" value={historyFilters.facilityId} onChange={handleHistoryFilterChange}>
                                <option value="">All Facilities</option>
                                {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </Select>
                        )}
                         <Select name="reason" value={historyFilters.reason} onChange={handleHistoryFilterChange}>
                            <option value="">All Reasons</option>
                            {Object.values(WriteOffReason).map(r => <option key={r} value={r}>{r}</option>)}
                        </Select>
                        <Select name="categoryId" value={historyFilters.categoryId} onChange={handleHistoryFilterChange}>
                            <option value="">All Categories</option>
                            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Total Qty</th>
                                <SortableHeader sortKey="reason" requestSort={requestSort} sortConfig={sortConfig}>Reason</SortableHeader>
                                <SortableHeader sortKey="userName" requestSort={requestSort} sortConfig={sortConfig}>User</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedLogs.map(log => {
                                const totalQty = log.items.reduce((sum, item) => sum + item.quantity, 0);
                                const itemSummary = log.items.length > 1 ? `${log.items.length} items` : (getDetailsForItem(log.items[0]?.inventoryItemId).master?.name || 'N/A');
                                return (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-700">{log.controlNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{itemSummary}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{totalQty}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.reason}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                       <Button variant="ghost" size="sm" onClick={() => window.open(`/#/print/write-off/${log.id}`, '_blank')} aria-label="Print" title="Print Voucher"><PrintIcon /></Button>
                                      <Button variant="ghost" size="sm" onClick={() => downloadVoucherAsCSV(log)} aria-label="Download CSV" title="Download Voucher as CSV"><DownloadIcon /></Button>
                                     </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {paginatedLogs.length === 0 && <p className="text-center p-4">No write-offs have been recorded yet.</p>}
                </div>
            </Card>
            {isScannerOpen && <BarcodeScannerModal onScan={() => {}} onClose={() => setIsScannerOpen(false)} />}
        </div>
    );
};

export default WriteOffs;
