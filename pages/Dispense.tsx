import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { db } from '../services/firebase';
import { Role, DispenseLog, InventoryItem, ItemMaster, FacilityStatus, PhysicalCountStatus, ConsignmentConsumptionLog, Facility } from '../types';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { logAuditEvent } from '../services/audit';
import { TablePagination } from '../components/ui/TablePagination';
import { useConfirmation } from '../hooks/useConfirmation';
import { formatCurrency } from '../utils/formatters';
import { useInfoModal } from '../hooks/useInfoModal';
import { DatePicker } from '../components/ui/DatePicker';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import SearchableSelect, { SearchableSelectOption } from '../components/ui/SearchableSelect';
import { downloadStringAsFile } from '../../utils/download';
import { EditDispenseLogModal } from '../components/EditDispenseLogModal';
import { Spinner } from '../components/ui/Spinner';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const ScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

type DispenseItemRow = { id: string; inventoryItemId: string; quantity: string };

const Dispense: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { settings } = useSettings();
    const { dispenseLogs, inventoryItems, itemMasters, storageLocations, users, facilities, physicalCounts, suppliers } = data;
    const confirm = useConfirmation();
    const { showSuccess, showError } = useInfoModal();
    
    const initialItemState: DispenseItemRow = { id: crypto.randomUUID(), inventoryItemId: '', quantity: '' };

    const [controlNumber, setControlNumber] = useState('');
    const [items, setItems] = useState<DispenseItemRow[]>([initialItemState]);
    const [dispensedTo, setDispensedTo] = useState('');
    const [notes, setNotes] = useState('');
    const [isFreeOfCharge, setIsFreeOfCharge] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [logToEdit, setLogToEdit] = useState<DispenseLog | null>(null);

    // History state
    const isRestrictedUser = user?.role === Role.Encoder || user?.role === Role.User;
    const canModify = useMemo(() => user && [Role.SystemAdministrator, Role.Admin, Role.Encoder].includes(user.role), [user]);
    const [historyFilters, setHistoryFilters] = useState({
        searchTerm: '',
        facilityId: isRestrictedUser ? user?.facilityId || '' : '',
        categoryId: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
        userId: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);

    const generateControlNumber = (logCount: number) => {
        const date = new Date();
        const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
        const sequence = (logCount + 1).toString().padStart(4, '0');
        return `DISP-${yyyymmdd}-${sequence}`;
    };
    
    useEffect(() => {
        setControlNumber(generateControlNumber(dispenseLogs.length));
    }, [dispenseLogs.length]);

    const accessibleItems = useMemo(() => {
        const activeCountStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
        const frozenItemIds = new Set<string>();
        physicalCounts
            .filter(count => activeCountStatuses.includes(count.status))
            .forEach(count => {
                count.items?.forEach(item => {
                    if (item) frozenItemIds.add(item.inventoryItemId);
                });
            });

        const storageLocationMap = new Map<string, string>();
        storageLocations.forEach(sl => {
            storageLocationMap.set(sl.id, sl.facilityId);
        });

        const activeFacilityIds = new Set(facilities.filter(f => f.status === FacilityStatus.Active).map(f => f.id));

        const allItems = inventoryItems.filter(item => {
            const facilityId = storageLocationMap.get(item.storageLocationId);
            const isInActiveFacility = facilityId && activeFacilityIds.has(facilityId);
            return isInActiveFacility && item.quantity > 0 && !frozenItemIds.has(item.id);
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
        const groupedByMaster = accessibleItems.reduce((acc, item) => {
            const masterId = item.itemMasterId;
            if (!acc[masterId]) {
                acc[masterId] = [];
            }
            (acc as any)[masterId].push(item);
            return acc;
        }, {} as Record<string, typeof accessibleItems>);

        const sortedAndMarkedItems = Object.values(groupedByMaster).flatMap((group: any[]) => {
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
            const supplier = suppliers.find(s => s.id === item.supplierId);
            const facilityId = storageLocationMap.get(item.storageLocationId);
            const facilityName = facilityId ? facilityMap.get(facilityId) : 'N/A';
            return {
                value: item.id,
                label: master?.name || 'Unknown Item',
                ...item,
                master,
                supplierName: supplier?.name || 'N/A',
                facilityName,
                isFefoPick: (item as any).isFefoPick || false,
            }
        })
    }, [accessibleItems, itemMasters, suppliers, storageLocationMap, facilityMap]);
  
    const getDetailsForItem = (inventoryItemId: string): { item?: InventoryItem, master?: ItemMaster } => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    };
    
    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.name || 'Unknown User';
    const getFacilityName = (facilityId: string) => facilities.find(f => f.id === facilityId)?.name || 'N/A';

    const handleItemChange = (id: string, field: keyof DispenseItemRow, value: string | null) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value || '' };
                if (field === 'inventoryItemId') {
                    updatedItem.quantity = '';
                }
                return updatedItem;
            }
            return item;
        });
        setItems(newItems);
    };

    const addItemRow = () => setItems([...items, { ...initialItemState, id: crypto.randomUUID() }]);
    const removeItemRow = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dispensedTo || items.some(i => !i.inventoryItemId || !i.quantity || parseInt(i.quantity) <= 0)) {
            showError({ title: "Validation Error", message: "Please fill out all required fields and ensure all items have a valid quantity." });
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
                showError({ title: 'Validation Error', message: `Dispense quantity for ${master?.name || 'an item'} cannot exceed available stock.` });
                return;
            }
            
            const currentItemFacilityId = storageLocationMap.get(item.storageLocationId);
            if (!currentItemFacilityId) {
                showError({ title: 'Validation Error', message: `Could not determine facility for item: ${master?.name}.` });
                return;
            }

            if (index === 0) {
                transactionFacilityId = currentItemFacilityId;
            } else if (currentItemFacilityId !== transactionFacilityId) {
                showError({ title: 'Validation Error', message: 'All items in a single transaction must be from the same facility.' });
                return;
            }
        }

        if (!transactionFacilityId) {
            showError({ title: 'Validation Error', message: 'Could not determine the transaction facility.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const newLogRef = db.ref('dispenseLogs').push();
            const newLogData: Omit<DispenseLog, 'id'> = {
                controlNumber,
                items: items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: parseInt(i.quantity) })),
                dispensedTo,
                notes,
                userId: user.uid,
                facilityId: transactionFacilityId,
                timestamp: new Date().toISOString(),
                isFreeOfCharge,
            };

            const updates: Record<string, any> = {
                [`/dispenseLogs/${newLogRef.key}`]: newLogData
            };
            
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
                        dispenseLogId: newLogRef.key!,
                        controlNumber: `CONSUME-${controlNumber}`,
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

            const facilityName = facilities.find(f => f.id === transactionFacilityId)?.name || 'Unknown Facility';
            await logAuditEvent(user, 'Stock Dispense', {
                controlNumber,
                dispensedTo,
                facilityName,
            });

            showSuccess({ title: "Success!", message: "Dispensation recorded successfully!" });
            setItems([initialItemState]);
            setDispensedTo('');
            setNotes('');
        } catch (error) {
            console.error("Failed to record dispensation:", error);
            showError({ title: "Error", message: "An error occurred. Could not record dispensation." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleScan = (barcode: string) => {
        const foundMasterItem = itemMasters.find(im => im.barcode === barcode && im.barcode.trim() !== '');
        if (foundMasterItem) {
            const availableBatches = accessibleItems.filter(item => item.itemMasterId === foundMasterItem.id);
            if(availableBatches.length > 0) {
                const fefoBatch = availableBatches.sort((a,b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))[0];
                const lastItemIsEmpty = items.length > 0 && !items[items.length - 1].inventoryItemId;
                if(lastItemIsEmpty) {
                    const newItems = [...items];
                    newItems[items.length - 1].inventoryItemId = fefoBatch.id;
                    setItems(newItems);
                } else {
                     setItems(prev => [...prev, { ...initialItemState, id: crypto.randomUUID(), inventoryItemId: fefoBatch.id }]);
                }
                showSuccess({ title: "Item Found", message: `"${foundMasterItem.name}" (Batch: ${fefoBatch.batchNumber}) selected. Please enter quantity.` });
            } else {
                showError({ title: "Item Out of Stock", message: `"${foundMasterItem.name}" was found, but it is out of stock or frozen in your facility.` });
            }
        } else {
            showError({ title: "Barcode Not Found", message: "No item in your catalog matches the scanned barcode." });
        }
        setIsScannerOpen(false);
    };

    const handleHistoryFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setHistoryFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleHistoryDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
        setHistoryFilters(prev => ({ ...prev, [name]: date }));
    };

    const augmentedLogs: (DispenseLog & { userName: string; facilityName: string; })[] = useMemo(() => {
        return dispenseLogs.map(log => ({
            ...log,
            userName: getUserName(log.userId),
            facilityName: getFacilityName(log.facilityId)
        }));
    }, [dispenseLogs, users, facilities]);

    const filteredLogs: (DispenseLog & { userName: string; facilityName: string; })[] = useMemo(() => {
        const itemMasterCategoryMap = new Map(itemMasters.map(im => [im.id, im.categoryId]));
        const inventoryItemMasterMap = new Map(inventoryItems.map(ii => [ii.id, ii.itemMasterId]));

        return augmentedLogs.filter(log => {
            const { searchTerm, facilityId, startDate, endDate, categoryId, userId } = historyFilters;
            const logDate = new Date(log.timestamp);
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            const searchMatch = !searchTerm || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase()) || log.dispensedTo.toLowerCase().includes(searchTerm.toLowerCase());
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
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedLogs.length);

    const downloadVoucherAsCSV = (log: DispenseLog & { userName: string, facilityName: string }) => {
        const headers = ['Item Name', 'Brand', 'Batch #', 'Expiry Date', 'Quantity', 'Unit', 'Unit Cost', 'Subtotal'];
        
        const totalValue = log.isFreeOfCharge ? 0 : log.items.reduce((acc, currentItem) => {
            const { item, master } = getDetailsForItem(currentItem.inventoryItemId);
            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
            return acc + (currentItem.quantity * cost);
        }, 0);
    
        const csvRows = [
            `"Control #","${log.controlNumber}"`,
            `"Date","${new Date(log.timestamp).toLocaleString()}"`,
            `"Dispensed To","${log.dispensedTo}"`,
            `"Issued By","${log.userName}"`,
            `"Facility","${log.facilityName}"`,
            `"Notes","${(log.notes || '').replace(/"/g, '""')}"`,
            `"Free of Charge?","${log.isFreeOfCharge ? 'Yes' : 'No'}"`,
            '',
            headers.join(','),
            ...log.items.map(dispensedItem => {
                const { item, master } = getDetailsForItem(dispensedItem.inventoryItemId);
                const cost = log.isFreeOfCharge ? 0 : (item?.purchaseCost ?? master?.unitCost ?? 0);
                const subtotal = cost * dispensedItem.quantity;
                return [
                    `"${master?.name || 'Unknown Item'}"`,
                    `"${master?.brand || 'N/A'}"`,
                    `"${item?.batchNumber || 'N/A'}"`,
                    `"${item?.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}"`,
                    dispensedItem.quantity,
                    `"${master?.unit || ''}"`,
                    cost,
                    subtotal
                ].join(',');
            }),
            '',
            `"","","","","","","Total Value",${totalValue}`
        ];
        
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, `disp_${log.controlNumber}.csv`, 'text/csv;charset=utf-8;');
    };

    const exportHistoryToCSV = () => {
        const headers = ['Date', 'Control #', 'Items Summary', 'Total Qty', 'Dispensed To', 'Issued By', 'Facility'];
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
                    escape(log.dispensedTo),
                    escape(log.userName),
                    escape(log.facilityName)
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'dispense_history.csv', 'text/csv;charset=utf-8;');
    };
    
    const handlePrintHistory = () => {
        const params = new URLSearchParams();
        if(historyFilters.searchTerm) params.set('searchTerm', historyFilters.searchTerm);
        if(historyFilters.facilityId) params.set('facilityId', historyFilters.facilityId);
        if(historyFilters.categoryId) params.set('categoryId', historyFilters.categoryId);
        if(historyFilters.startDate) params.set('startDate', historyFilters.startDate.toISOString());
        if(historyFilters.endDate) params.set('endDate', historyFilters.endDate.toISOString());
        if(historyFilters.userId) params.set('userId', historyFilters.userId);

        window.open(`/#/print/dispense-history?${params.toString()}`, '_blank');
    };

    const handleOpenEditModal = (log: DispenseLog) => {
        setLogToEdit(log);
        setIsEditModalOpen(true);
    };
    
    const handleSaveEdit = async (logId: string, newTimestamp: string, newNotes: string) => {
        if (!user) {
            showError({ title: "Error", message: "You are not logged in." });
            return;
        }
        const logToUpdate = dispenseLogs.find(log => log.id === logId);
        if (!logToUpdate) {
            showError({ title: "Error", message: "Log not found." });
            return;
        }
    
        const updates: Record<string, any> = {
            timestamp: newTimestamp,
            notes: newNotes,
        };
        
        await db.ref(`dispenseLogs/${logId}`).update(updates);
    
        await logAuditEvent(user, "Dispense Voucher Update", {
            controlNumber: logToUpdate.controlNumber,
            changes: {
                timestamp: { from: logToUpdate.timestamp, to: newTimestamp },
                notes: { from: logToUpdate.notes, to: newNotes }
            }
        });
        showSuccess({ title: "Success", message: "Voucher updated successfully." });
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
            <h2 className="text-3xl font-semibold text-secondary-800">Dispense Items</h2>
            
            <form onSubmit={handleSubmit}>
              <Card>
                <div className="p-6 space-y-8">
                  {/* Voucher Details Section */}
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-secondary-900">Voucher Details</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Control Number" id="controlNumber" value={controlNumber} readOnly disabled />
                        <Input label="Dispensed To (Patient/Dept Name)" id="dispensedTo" name="dispensedTo" type="text" value={dispensedTo} onChange={e => setDispensedTo(e.target.value)} required />
                    </div>
                     <div className="mt-4">
                        <Textarea label="Notes" id="notes" name="notes" rows={2} placeholder="Add any relevant notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                     <div className="mt-4 flex items-center">
                        <input id="isFreeOfCharge" name="isFreeOfCharge" type="checkbox" checked={isFreeOfCharge} onChange={e => setIsFreeOfCharge(e.target.checked)} className="h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500" />
                        <label htmlFor="isFreeOfCharge" className="ml-2 block text-sm text-secondary-900">Mark as Free of Charge (will not be included in COGD reports)</label>
                    </div>
                  </div>
                  
                  {/* Items Section */}
                  <div className="border-t border-secondary-200 pt-8">
                      <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-medium leading-6 text-secondary-900">Items to Dispense</h3>
                          {settings.enableBarcodeScanner && (
                            <Button type="button" variant="ghost" onClick={() => setIsScannerOpen(true)} leftIcon={<ScanIcon />}>Scan Item</Button>
                          )}
                      </div>
                      
                      <div className="hidden md:grid grid-cols-12 gap-x-4 mb-1 px-2 text-xs font-medium text-secondary-500 uppercase">
                            <div className="col-span-8">Item Batch</div>
                            <div className="col-span-2">Available</div>
                            <div className="col-span-2">Quantity</div>
                        </div>

                      <div className="space-y-2">
                        {items.map((itemRow, index) => {
                                const { item, master } = getDetailsForItem(itemRow.inventoryItemId);
                                return (
                                <div key={itemRow.id} className="grid grid-cols-12 gap-x-4 gap-y-3 items-end p-2 rounded-lg even:bg-secondary-50/50">
                                    <div className="col-span-12 md:col-span-8">
                                        <label className="text-xs text-secondary-500 md:hidden">Item Batch</label>
                                        <SearchableSelect
                                            options={inventoryOptions}
                                            value={itemRow.inventoryItemId}
                                            onChange={value => handleItemChange(itemRow.id, 'inventoryItemId', value)}
                                            placeholder="Search for an item batch..."
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
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm"/> : 'Record Dispensation'}</Button>
                </div>
              </Card>
            </form>
            
            <Card
                title="Recent Dispensations"
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
                        <Input name="searchTerm" placeholder="Search Control # or To..." value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} />
                        <Select name="facilityId" value={historyFilters.facilityId} onChange={handleHistoryFilterChange} disabled={isRestrictedUser}>
                            {!isRestrictedUser && <option value="">All Facilities</option>}
                            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                         <Select name="categoryId" value={historyFilters.categoryId} onChange={handleHistoryFilterChange}>
                            <option value="">All Categories</option>
                            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                                {/* FIX: Added missing 'children' prop to 'SortableHeader' components by wrapping the header text within the component tags. */}
                                <SortableHeader sortKey="timestamp" requestSort={requestSort} sortConfig={sortConfig}>Date</SortableHeader>
                                <SortableHeader sortKey="controlNumber" requestSort={requestSort} sortConfig={sortConfig}>Control #</SortableHeader>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Items</th>
                                <SortableHeader sortKey="dispensedTo" requestSort={requestSort} sortConfig={sortConfig}>Dispensed To</SortableHeader>
                                <SortableHeader sortKey="userName" requestSort={requestSort} sortConfig={sortConfig}>Issued By</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedLogs.map((log, index) => {
                                const itemSummary = log.items.length > 1 ? `${log.items.length} items` : (getDetailsForItem(log.items[0]?.inventoryItemId).master?.name || 'N/A');
                                return (
                                <tr key={log.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50'} hover:bg-primary-50`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-700">{log.controlNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{itemSummary}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.dispensedTo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        {canModify && <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(log)} title="Edit Voucher Notes/Date"><EditIcon /></Button>}
                                        <Button variant="ghost" size="sm" onClick={() => window.open(`/#/print/dispense/${log.id}`, '_blank')} aria-label="Print" title="Print Voucher"><PrintIcon /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => downloadVoucherAsCSV(log)} aria-label="Download CSV" title="Download Voucher as CSV"><DownloadIcon /></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {paginatedLogs.length === 0 && <p className="text-center p-4">No dispensations have been recorded yet.</p>}
                </div>
            </Card>
            {isScannerOpen && <BarcodeScannerModal onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}
            {logToEdit && <EditDispenseLogModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} log={logToEdit} onSave={handleSaveEdit} />}
        </div>
    );
};

export default Dispense;