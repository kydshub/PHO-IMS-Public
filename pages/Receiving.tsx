import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { Facility, FacilityStatus, SupplierStatus, ReceiveLog, InventoryItem, ItemMaster, Program, StorageLocation, Role, FundSource, NewInventoryItemInfo, PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { TablePagination } from '../components/ui/TablePagination';
import { buildIndentedLocationOptions } from '../utils/locationHelpers';
import { DatePicker } from '../components/ui/DatePicker';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import SearchableSelect from '../components/ui/SearchableSelect';
import { getUserName, getItemMasterName, getSupplierName, getFacilityName } from '../utils/dataGetters';
import { Spinner } from '../components/ui/Spinner';
import { useInfoModal } from '../hooks/useInfoModal';
import { generateControlNumber } from '../utils/helpers';
import { PREFIX_RECEIVE } from '../constants';
import { useConfirmation } from '../hooks/useConfirmation';
import { downloadStringAsFile } from '../../utils/download';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const ScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>;
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;

type ReceiveItemRow = { 
    id: string;
    itemMasterId: string;
    quantity: string;
    unitCost: string;
    expiryDate: string;
    batchNumber: string;
    noExpiry?: boolean;
    programId?: string;
    fundSourceId?: string;
    icsNumber?: string;
    selectedBatchId: string; // 'CREATE_NEW' or an inventoryItemId
    poItemId?: string; // Links back to the PO item for quantity tracking
};

const Receiving: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { settings } = useSettings();
    const { suppliers, facilities, storageLocations, itemMasters, receiveLogs, programs, users, fundSources, inventoryItems, purchaseOrders } = data;
    const navigate = useNavigate();
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess, showError } = useInfoModal();
    const confirm = useConfirmation();

    const isEncoder = user?.role === Role.Encoder;

    const initialItemState: ReceiveItemRow = { id: crypto.randomUUID(), itemMasterId: '', quantity: '', unitCost: '', expiryDate: '', batchNumber: '', noExpiry: false, programId: '', fundSourceId: '', icsNumber: '', selectedBatchId: 'CREATE_NEW' };
    
    const [controlNumber, setControlNumber] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [purchaseOrderId, setPurchaseOrderId] = useState('');
    const [facilityId, setFacilityId] = useState(isEncoder ? user?.facilityId || '' : '');
    const [storageLocationId, setStorageLocationId] = useState('');
    const [items, setItems] = useState<ReceiveItemRow[]>([initialItemState]);
    const [existingBatchesByItem, setExistingBatchesByItem] = useState<Record<string, InventoryItem[]>>({});

    const [historyFilters, setHistoryFilters] = useState({
        searchTerm: '',
        facilityId: isEncoder ? user?.facilityId || '' : '',
        supplierId: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const selectedPO = useMemo(() => purchaseOrders.find(po => po.id === purchaseOrderId), [purchaseOrderId, purchaseOrders]);

    useEffect(() => {
        setControlNumber(generateControlNumber(PREFIX_RECEIVE, receiveLogs.length));
    }, [receiveLogs.length]);
    
    useEffect(() => {
        if (!facilityId) {
            setExistingBatchesByItem({});
            return;
        }
        const storageFacilityMap = new Map<string, string>();
        storageLocations.forEach(sl => storageFacilityMap.set(sl.id, sl.facilityId));

        const itemMasterIdsInForm = new Set(items.map(i => i.itemMasterId).filter(Boolean));
        const newBatches: Record<string, InventoryItem[]> = {};

        itemMasterIdsInForm.forEach(imId => {
            newBatches[imId] = inventoryItems.filter(invItem =>
                invItem.itemMasterId === imId &&
                storageFacilityMap.get(invItem.storageLocationId) === facilityId &&
                !invItem.isConsignment
            ).sort((a,b) => a.batchNumber.localeCompare(b.batchNumber));
        });

        setExistingBatchesByItem(newBatches);
    }, [facilityId, items, inventoryItems, storageLocations]);


    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
    const activeSuppliers = useMemo(() => suppliers.filter(s => s.status === SupplierStatus.Active), [suppliers]);
  
    const availableStorageLocationOptions = useMemo(() => {
        if (!facilityId) return [];
        const locationsForFacility = storageLocations.filter(sl => sl.facilityId === facilityId);
        return buildIndentedLocationOptions(locationsForFacility).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>);
    }, [facilityId, storageLocations]);
    
    const availablePOs = useMemo(() => {
        const pos = purchaseOrders.filter(po => po.status === PurchaseOrderStatus.Pending || po.status === PurchaseOrderStatus.PartiallyReceived);
        if (isEncoder && user?.facilityId) {
            return pos.filter(po => po.facilityId === user.facilityId);
        }
        return pos;
    }, [purchaseOrders, isEncoder, user?.facilityId]);

    const handlePOChange = (poId: string | null) => {
        setPurchaseOrderId(poId || '');
        if (poId) {
            const po = purchaseOrders.find(p => p.id === poId);
            if(po) {
                setFacilityId(po.facilityId);
                setSupplierId(po.supplierId);
                setItems(po.items
                    .filter(item => item.orderedQuantity > item.receivedQuantity)
                    .map(item => ({
                        ...initialItemState,
                        id: crypto.randomUUID(),
                        itemMasterId: item.itemMasterId,
                        unitCost: String(item.unitCost),
                        quantity: String(item.orderedQuantity - item.receivedQuantity),
                        poItemId: item.itemMasterId, // Use itemMasterId to link back
                    }))
                );
            }
        } else {
            // Reset form when PO is cleared
            setFacilityId(isEncoder ? user?.facilityId || '' : '');
            setSupplierId('');
            setItems([initialItemState]);
        }
    };


    const handleItemChange = (id: string, field: keyof ReceiveItemRow, value: string | boolean | null) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== id) {
                return item;
            }
    
            let updatedItem = { ...item };
    
            if (field === 'noExpiry') {
                updatedItem.noExpiry = value as boolean;
            } else {
                (updatedItem as Record<string, any>)[field] = value as string;
            }
    
            if (field === 'selectedBatchId') {
                const isNew = value === 'CREATE_NEW';
                const selectedBatch = isNew ? null : (existingBatchesByItem[item.itemMasterId] || []).find(b => b.id === value);
                updatedItem.expiryDate = selectedBatch ? (selectedBatch.expiryDate ? selectedBatch.expiryDate.split('T')[0] : '') : '';
                updatedItem.batchNumber = selectedBatch ? selectedBatch.batchNumber : '';
                updatedItem.noExpiry = selectedBatch ? !selectedBatch.expiryDate : false;
                updatedItem.unitCost = selectedBatch?.purchaseCost?.toString() ?? itemMasters.find(im => im.id === item.itemMasterId)?.unitCost.toString() ?? '0';
            }
    
            return updatedItem;
        }));
    };

     const handleItemSelect = (rowId: string, itemMasterId: string | null) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === rowId) {
                const master = itemMasters.find(im => im.id === itemMasterId);
                return {
                    ...item,
                    itemMasterId: itemMasterId || '',
                    selectedBatchId: 'CREATE_NEW',
                    expiryDate: '',
                    batchNumber: '',
                    unitCost: master ? String(master.unitCost) : '0',
                };
            }
            return item;
        }));
    };
    
    const addItemRow = () => setItems([...items, { ...initialItemState, id: crypto.randomUUID() }]);
    const removeItemRow = (id: string) => setItems(items.filter(item => item.id !== id));
  
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    
        if (!supplierId || !facilityId || !storageLocationId) {
            showError({ title: "Validation Error", message: "Please fill out all required fields for the transaction: Supplier, Facility, and Storage Location." });
            return;
        }

        if (!user) {
            showError({ title: "Auth Error", message: 'Cannot determine user.' });
            return;
        }
    
        const validationErrors: React.ReactNode[] = [];
        const itemsWithData = items.filter(i => i.itemMasterId || i.quantity || i.batchNumber || i.expiryDate);
        
        if (itemsWithData.length === 0) {
            showError({ title: "No Items", message: "Please add at least one item to receive." });
            return;
        }
    
        for (const [index, itemRow] of itemsWithData.entries()) {
            const master = itemMasters.find(im => im.id === itemRow.itemMasterId);
            const itemName = master?.name || `Item in row #${index + 1}`;
    
            if (!itemRow.itemMasterId) {
                validationErrors.push(<li key={`err-noitem-${index}`}>Please select an item for row #{index + 1}.</li>);
                continue;
            }
    
            const quantity = parseInt(itemRow.quantity, 10);
    
            if (isNaN(quantity) || quantity < 0) {
                validationErrors.push(<li key={`err-qty-neg-${index}`}>Invalid quantity for "{itemName}". Quantity must be a non-negative number.</li>);
                continue;
            }
            
            // Only perform deeper validation if quantity is positive
            if (quantity > 0) {
                const unitCost = parseFloat(itemRow.unitCost);
                if (isNaN(unitCost) || unitCost < 0) {
                    validationErrors.push(<li key={`err-cost-${index}`}>Invalid unit cost for "{itemName}".</li>);
                }
                if (itemRow.selectedBatchId === 'CREATE_NEW') {
                    if (!itemRow.batchNumber) {
                        validationErrors.push(<li key={`err-batch-${index}`}>Batch number is required for "{itemName}".</li>);
                    }
                    if (!itemRow.noExpiry && !itemRow.expiryDate) {
                        validationErrors.push(<li key={`err-expiry-${index}`}>Expiry date is required for "{itemName}".</li>);
                    }
                }
            } else if (quantity === 0 && !purchaseOrderId) {
                // For non-PO receipts, 0 quantity is not allowed
                validationErrors.push(<li key={`err-qty-zero-${index}`}>Quantity for "{itemName}" must be greater than 0 for non-PO receipts.</li>);
            }
    
            if (selectedPO) {
                const poItem = selectedPO.items.find(i => i.itemMasterId === itemRow.itemMasterId);
                const remainingQty = poItem ? poItem.orderedQuantity - poItem.receivedQuantity : undefined;
                if (remainingQty !== undefined && quantity > remainingQty) {
                    validationErrors.push(<li key={`err-po-qty-${index}`}>Receive quantity for "{itemName}" ({quantity}) cannot exceed remaining PO quantity ({remainingQty}).</li>);
                }
            }
        }
    
        if (validationErrors.length > 0) {
            showError({ title: "Validation Errors", message: <ul className="list-disc list-inside">{validationErrors}</ul> });
            return;
        }
    
        const itemsToProcess = items.filter(i => {
            const quantity = parseInt(i.quantity, 10);
            return i.itemMasterId && !isNaN(quantity) && quantity >= 0;
        });
        
        const itemsWithPositiveQuantity = itemsToProcess.filter(i => parseInt(i.quantity, 10) > 0);
    
        if (itemsWithPositiveQuantity.length === 0 && !purchaseOrderId) {
            showError({ title: "No Items to Receive", message: "Please enter a quantity greater than 0 for at least one item for a manual receipt." });
            return;
        }

        let isConfirmed = true;
        if(itemsWithPositiveQuantity.length === 0 && purchaseOrderId) {
             isConfirmed = await confirm({
                title: "Confirm Zero-Quantity Receipt",
                message: "You have entered a quantity of 0 for all items. This will NOT add any stock to your inventory but WILL update the purchase order status. Do you want to proceed?",
                confirmText: "Yes, Proceed",
             });
        } else {
             isConfirmed = await confirm({
                title: "Confirm Receipt",
                message: "Please review the items and quantities. This will update inventory levels. Proceed?",
                confirmText: "Confirm",
            });
        }
    
        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            const itemsToCreate = itemsWithPositiveQuantity.filter(i => i.selectedBatchId === 'CREATE_NEW');
            const itemsToUpdate = itemsWithPositiveQuantity.filter(i => i.selectedBatchId !== 'CREATE_NEW');
            
            const updates: Record<string, any> = {};
            const newInventoryItemIds: string[] = [];
            const updatedInventoryItemIds = itemsToUpdate.map(i => i.selectedBatchId);

            itemsToCreate.forEach(itemRow => {
                const newInventoryItemRef = db.ref('inventoryItems').push();
                newInventoryItemIds.push(newInventoryItemRef.key!);
                const newItemData: Omit<InventoryItem, 'id'> = {
                    itemMasterId: itemRow.itemMasterId,
                    quantity: parseInt(itemRow.quantity),
                    purchaseCost: parseFloat(itemRow.unitCost) || 0,
                    expiryDate: itemRow.expiryDate ? new Date(itemRow.expiryDate).toISOString() : '',
                    batchNumber: itemRow.batchNumber,
                    storageLocationId,
                    supplierId,
                    isConsignment: false,
                    ...(purchaseOrderId && { purchaseOrder: selectedPO?.poNumber }),
                    ...(itemRow.programId && { programId: itemRow.programId }),
                    ...(itemRow.fundSourceId && { fundSourceId: itemRow.fundSourceId }),
                    ...(itemRow.icsNumber && { icsNumber: itemRow.icsNumber }),
                };
                updates[`/inventoryItems/${newInventoryItemRef.key}`] = newItemData;
            });
    
            itemsToUpdate.forEach(itemRow => {
                updates[`/inventoryItems/${itemRow.selectedBatchId}/quantity`] = firebase.database.ServerValue.increment(parseInt(itemRow.quantity, 10));
            });
            
            const newReceiveLogRef = db.ref('receiveLogs').push();
            const newReceiveLogData: Omit<ReceiveLog, 'id'> = {
                controlNumber,
                items: itemsToProcess.map((itemRow): NewInventoryItemInfo => {
                    const logItem: NewInventoryItemInfo = {
                        itemMasterId: itemRow.itemMasterId,
                        quantity: parseInt(itemRow.quantity),
                        unitCost: parseFloat(itemRow.unitCost) || 0,
                        expiryDate: itemRow.expiryDate ? new Date(itemRow.expiryDate).toISOString() : '',
                        batchNumber: itemRow.batchNumber,
                    };
                    if (itemRow.fundSourceId) logItem.fundSourceId = itemRow.fundSourceId;
                    if (itemRow.icsNumber) logItem.icsNumber = itemRow.icsNumber;
                    return logItem;
                }),
                affectedInventoryItemIds: [...newInventoryItemIds, ...updatedInventoryItemIds],
                supplierId,
                ...(purchaseOrderId && { purchaseOrderId: purchaseOrderId }),
                userId: user.uid,
                facilityId,
                storageLocationId,
                timestamp: new Date().toISOString(),
                isConsignment: false,
            };
            
            updates[`/receiveLogs/${newReceiveLogRef.key}`] = newReceiveLogData;
    
            if (selectedPO) {
                const updatedPOItems = [...selectedPO.items];
                items.forEach(receivedItem => {
                    const quantity = parseInt(receivedItem.quantity, 10);
                    if (!isNaN(quantity) && quantity >= 0) {
                        const poItemIndex = updatedPOItems.findIndex(p => p.itemMasterId === receivedItem.itemMasterId);
                        if (poItemIndex > -1) {
                            updatedPOItems[poItemIndex].receivedQuantity += quantity;
                        }
                    }
                });
    
                const allItemsReceived = updatedPOItems.every(item => item.receivedQuantity >= item.orderedQuantity);
                const newStatus = allItemsReceived ? PurchaseOrderStatus.Completed : PurchaseOrderStatus.PartiallyReceived;
    
                updates[`/purchaseOrders/${selectedPO.id}/items`] = updatedPOItems;
                updates[`/purchaseOrders/${selectedPO.id}/status`] = newStatus;
            }
    
            await db.ref().update(updates);
    
            await logAuditEvent(user, 'Stock Receive', {
                controlNumber,
                supplier: suppliers.find(s => s.id === supplierId)?.name || 'Unknown',
                facilityName: facilities.find(f => f.id === facilityId)?.name || 'Unknown',
            });
    
            showSuccess({ title: "Success!", message: "Items received successfully!" });
            navigate('/inventory/commodities');
        } catch (error) {
            console.error("Failed to receive stock:", error);
            showError({ title: "Error", message: "An error occurred. Could not receive stock." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleScan = (barcode: string) => {
        // Implementation for barcode scanning can be added here
        setIsScannerOpen(false);
    };

    const handleHistoryFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setHistoryFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleHistoryDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
        setHistoryFilters(prev => ({ ...prev, [name]: date }));
    };

    const augmentedLogs = useMemo(() => {
        return receiveLogs.map(log => ({
            ...log,
            userName: getUserName(users, log.userId),
            facilityName: getFacilityName(facilities, log.facilityId),
            supplierName: getSupplierName(suppliers, log.supplierId),
        }));
    }, [receiveLogs, users, facilities, suppliers]);

    const filteredLogs = useMemo(() => {
        return augmentedLogs.filter(log => {
            if (log.isConsignment) return false;
            const { searchTerm, facilityId, supplierId, startDate, endDate } = historyFilters;
            const logDate = new Date(log.timestamp);
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);
            return (!searchTerm || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase())) &&
                   (!facilityId || log.facilityId === facilityId) &&
                   (!supplierId || log.supplierId === supplierId) &&
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
    
    const itemMasterOptions = useMemo(() => {
        let options = itemMasters;
        if(selectedPO) {
            const poItemIds = new Set(selectedPO.items.filter(i => i.orderedQuantity > i.receivedQuantity).map(i => i.itemMasterId));
            options = itemMasters.filter(im => poItemIds.has(im.id));
        }
        return options.map(im => ({
            value: im.id,
            label: im.name,
            brand: im.brand || 'N/A',
            unit: im.unit
        }))
    }, [itemMasters, selectedPO]);

    const exportHistoryToCSV = () => {
        const headers = ['Date', 'Control #', 'Items Summary', 'Supplier', 'User', 'Facility'];
        const csvRows = [
            headers.join(','),
            ...sortedLogs.map(log => {
                const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
                const itemSummary = log.items.map(item => `${item.quantity} x ${getItemMasterName(itemMasters, item.itemMasterId)}`).join('; ');
                return [
                    escape(new Date(log.timestamp).toLocaleDateString()),
                    escape(log.controlNumber),
                    escape(itemSummary),
                    escape(log.supplierName),
                    escape(log.userName),
                    escape(log.facilityName)
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'receive_history.csv', 'text/csv;charset=utf-8;');
    };

    const handlePrintHistory = () => {
        navigate('/print/receive-history', { state: { items: sortedLogs } });
    };


    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-secondary-800">Receive Stock</h2>
            
            <form onSubmit={handleSubmit}>
              <Card>
                  <div className="p-6 space-y-8">
                      <div>
                        <h3 className="text-lg font-medium leading-6 text-secondary-900">Voucher Details</h3>
                        <p className="text-sm text-secondary-500 mt-1">Record new inventory received from a supplier.</p>
                        
                        <div className="mt-4 p-4 border rounded-md bg-secondary-50">
                            <SearchableSelect
                                label="Receive Against Purchase Order? (Optional)"
                                options={availablePOs.map(po => ({ value: po.id, label: `${po.poNumber} - ${suppliers.find(s => s.id === po.supplierId)?.name}`}))}
                                value={purchaseOrderId}
                                onChange={handlePOChange}
                                placeholder="Search for a PO number or supplier..."
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input label="Control Number" id="controlNumber" value={controlNumber} readOnly disabled />
                            <Select label="Supplier" id="supplierId" name="supplierId" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required disabled={!!selectedPO}>
                                <option value="">Select a supplier...</option>
                                {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select label="Receiving Facility" id="facilityId" name="facilityId" value={facilityId} onChange={(e) => { setFacilityId(e.target.value); setStorageLocationId(''); }} required disabled={isEncoder || !!selectedPO}>
                                {!isEncoder && <option value="">Select a facility...</option>}
                                {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </Select>
                            <Select label="Storage Location" id="storageLocationId" name="storageLocationId" value={storageLocationId} onChange={(e) => setStorageLocationId(e.target.value)} required disabled={!facilityId}>
                                <option value="">Select a storage location...</option>
                                {availableStorageLocationOptions}
                            </Select>
                        </div>
                      </div>

                       <div className="border-t border-secondary-200 pt-8">
                          <div className="flex justify-between items-center mb-2">
                              <h3 className="text-lg font-medium leading-6 text-secondary-900">Items Received</h3>
                              {settings.enableBarcodeScanner && !selectedPO && (
                                <Button type="button" variant="ghost" onClick={() => setIsScannerOpen(true)} leftIcon={<ScanIcon />}>Scan Item</Button>
                              )}
                          </div>
                          
                          <div className="space-y-4">
                            {items.map((itemRow) => {
                                const batches = existingBatchesByItem[itemRow.itemMasterId] || [];
                                const isCreatingNew = itemRow.selectedBatchId === 'CREATE_NEW';
                                const poItem = selectedPO?.items.find(i => i.itemMasterId === itemRow.itemMasterId);
                                const remainingQty = poItem ? poItem.orderedQuantity - poItem.receivedQuantity : undefined;
                                const quantityNum = Number(itemRow.quantity);

                                return (
                                <div key={itemRow.id} className="grid grid-cols-1 lg:grid-cols-12 gap-x-4 gap-y-3 items-end p-2 rounded-lg border lg:border-none">
                                    <div className="col-span-12 lg:col-span-4">
                                        <label className="text-xs font-medium text-secondary-500 lg:hidden">Item Name</label>
                                        <SearchableSelect options={itemMasterOptions} value={itemRow.itemMasterId || null} onChange={value => handleItemSelect(itemRow.id, value)} placeholder="Search for an item..." disabled={!!selectedPO}/>
                                    </div>
                                    <div className="col-span-12 lg:col-span-2">
                                        <label className="text-xs font-medium text-secondary-500 lg:hidden">Add to Batch</label>
                                        <Select name="selectedBatchId" value={itemRow.selectedBatchId} onChange={e => handleItemChange(itemRow.id, 'selectedBatchId', e.target.value)} disabled={!itemRow.itemMasterId || !facilityId || !!selectedPO}>
                                            <option value="CREATE_NEW">— Create New Batch —</option>
                                            {batches.map(batch => (<option key={batch.id} value={batch.id}>{batch.batchNumber} (Stock: {batch.quantity})</option>))}
                                        </Select>
                                    </div>
                                    <div className="col-span-6 lg:col-span-1"><Input name="quantity" type="number" placeholder="Qty" value={itemRow.quantity} onChange={e => handleItemChange(itemRow.id, 'quantity', e.target.value)} required min={!!purchaseOrderId ? "0" : "1"} max={remainingQty} title={remainingQty ? `Max remaining: ${remainingQty}`: ''} /></div>
                                    <div className="col-span-6 lg:col-span-1"><Input name="unitCost" type="number" placeholder="Cost" step="0.01" value={itemRow.unitCost} onChange={e => handleItemChange(itemRow.id, 'unitCost', e.target.value)} required min="0" /></div>
                                    <div className="col-span-12 lg:col-span-2"><Input name="batchNumber" type="text" placeholder="New Batch #" value={itemRow.batchNumber} onChange={e => handleItemChange(itemRow.id, 'batchNumber', e.target.value)} required={isCreatingNew && quantityNum > 0} disabled={!isCreatingNew} /></div>
                                    <div className="col-span-12 lg:col-span-2 flex items-end gap-2">
                                        <Input name="expiryDate" type="date" value={itemRow.expiryDate} onChange={e => handleItemChange(itemRow.id, 'expiryDate', e.target.value)} required={!itemRow.noExpiry && isCreatingNew && quantityNum > 0} disabled={!isCreatingNew || !!itemRow.noExpiry} />
                                        {items.length > 1 && !selectedPO && <Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(itemRow.id)} className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 h-auto mb-1"><TrashIcon /></Button>}
                                    </div>
                                    <div className="col-span-12 -mt-2"><input id={`no-expiry-recv-${itemRow.id}`} type="checkbox" checked={!!itemRow.noExpiry} onChange={(e) => handleItemChange(itemRow.id, 'noExpiry', e.target.checked)} className="h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500" disabled={!isCreatingNew}/><label htmlFor={`no-expiry-recv-${itemRow.id}`} className="ml-2 text-xs text-secondary-700">No Expiry</label></div>
                                </div>
                            );
                            })}
                          </div>
                          <div className="mt-4">
                            {!selectedPO && <Button type="button" variant="secondary" onClick={addItemRow} leftIcon={<PlusIcon />}>Add Another Item</Button>}
                          </div>
                      </div>
                  </div>
                  <div className="bg-secondary-50 px-6 py-4 text-right rounded-b-lg">
                      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : 'Add to Inventory'}</Button>
                  </div>
              </Card>
            </form>
            
            <Card footer={<TablePagination currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={sortedLogs.length} startItemIndex={(currentPage-1)*itemsPerPage} endItemIndex={Math.min(((currentPage-1)*itemsPerPage) + itemsPerPage, sortedLogs.length)} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage}/>}>
                <div className="p-4 border-b space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-secondary-900">History & Filters</h3>
                        <div className="flex gap-2">
                            <Button onClick={handlePrintHistory} variant="secondary" leftIcon={<PrintIcon />}>Print</Button>
                            <Button onClick={exportHistoryToCSV} variant="secondary" leftIcon={<DownloadIcon />}>Export CSV</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Input name="searchTerm" placeholder="Search Control #" value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} />
                        <Select name="facilityId" value={historyFilters.facilityId} onChange={handleHistoryFilterChange} disabled={isEncoder}>
                            {!isEncoder && <option value="">All Facilities</option>}
                            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                        <Select name="supplierId" value={historyFilters.supplierId} onChange={handleHistoryFilterChange}>
                            <option value="">All Suppliers</option>
                            {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <DatePicker label="Start Date" selectedDate={historyFilters.startDate} onSelectDate={(date) => handleHistoryDateChange('startDate', date)} />
                         <DatePicker label="End Date" selectedDate={historyFilters.endDate} onSelectDate={(date) => handleHistoryDateChange('endDate', date)} />
                     </div>
                </div>
                 <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                    <tr>
                        <SortableHeader sortKey="timestamp" requestSort={requestSort} sortConfig={sortConfig}>Date</SortableHeader>
                        <SortableHeader sortKey="controlNumber" requestSort={requestSort} sortConfig={sortConfig}>Control #</SortableHeader>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Items</th>
                        <SortableHeader sortKey="supplierName" requestSort={requestSort} sortConfig={sortConfig}>Supplier</SortableHeader>
                        <SortableHeader sortKey="userName" requestSort={requestSort} sortConfig={sortConfig}>User</SortableHeader>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                    {paginatedLogs.map(log => {
                        const itemSummary = log.items.length > 1 ? `${log.items.length} types of items` : getItemMasterName(itemMasters, log.items[0]?.itemMasterId);
                        return (
                        <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-700">{log.controlNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{itemSummary}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.supplierName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.userName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => window.open(`/#/print/receive/${log.id}`, '_blank')} aria-label="Print" title="Print Voucher"><PrintIcon /></Button>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                 {paginatedLogs.length === 0 && <p className="text-center p-4">No logs found.</p>}
                </div>
            </Card>

            {isScannerOpen && <BarcodeScannerModal onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}
        </div>
    );
};

export default Receiving;