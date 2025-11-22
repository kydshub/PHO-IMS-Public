import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Textarea } from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { useNotifications } from '../hooks/useNotifications';
import { useSettings } from '../hooks/useSettings';
import { db } from '../services/firebase';
import { Facility, FacilityStatus, TransferLog, TransferStatus, InventoryItem, Role, User, StorageLocation, PhysicalCountStatus } from '../types';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import AcknowledgeTransferModal from '../components/AcknowledgeTransferModal';
import { logAuditEvent } from '../services/audit';
import { TablePagination } from '../components/ui/TablePagination';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { buildIndentedLocationOptions } from '../utils/locationHelpers';
import SearchableSelect, { SearchableSelectOption } from '../components/ui/SearchableSelect';
import { downloadStringAsFile } from '../../utils/download';
import { useConfirmation } from '../hooks/useConfirmation';
import { useInfoModal } from '../hooks/useInfoModal';
import { generateControlNumber } from '../utils/helpers';
import { PREFIX_TRANSFER } from '../constants';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const ScanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;

type TransferItemRow = { id: string; inventoryItemId: string; quantity: string };

const Transfers: React.FC = () => {
  const { user } = useAuth();
  const { data } = useDatabase();
  const { settings } = useSettings();
  const { facilities, inventoryItems, itemMasters, storageLocations, users, transferLogs, physicalCounts, suppliers, fundSources } = data;
  const { addNotification, removeNotificationsBySource } = useNotifications();
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const { showSuccess, showError } = useInfoModal();
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<TransferLog | null>(null);
  const isEncoder = user?.role === Role.Encoder;

  const [fromFacilityId, setFromFacilityId] = useState<string>(isEncoder ? user?.facilityId || '' : '');
  const [controlNumber, setControlNumber] = useState('');
  const [items, setItems] = useState<TransferItemRow[]>([{ id: crypto.randomUUID(), inventoryItemId: '', quantity: '' }]);
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');

  const [historyFilters, setHistoryFilters] = useState({
    searchTerm: '',
    fromFacilityId: '',
    toFacilityId: '',
    status: '',
    categoryId: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  
  const handleHistoryFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setHistoryFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleHistoryDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
      setHistoryFilters(prev => ({ ...prev, [name]: date }));
  };

  const storageLocationMap = useMemo(() => new Map(storageLocations.map(sl => [sl.id, sl.facilityId])), [storageLocations]);
  const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f.name])), [facilities]);
  
  useEffect(() => {
    if (isEncoder && user?.facilityId) {
        setFromFacilityId(user.facilityId);
    }
  }, [isEncoder, user?.facilityId]);
  
  useEffect(() => {
    setControlNumber(generateControlNumber(PREFIX_TRANSFER, transferLogs.length));
  }, [transferLogs.length]);

  const accessibleItems = useMemo(() => {
    if (!fromFacilityId) return [];

    const activeCountStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
    const frozenItemIds = new Set<string>();
    physicalCounts
        .filter(count => activeCountStatuses.includes(count.status))
        .forEach(count => {
            count.items?.forEach(item => {
                if (item) frozenItemIds.add(item.inventoryItemId);
            });
        });
    
    const allItemsWithFacility = inventoryItems.map(item => ({...item, facilityId: storageLocationMap.get(item.storageLocationId)}));
    
    return allItemsWithFacility.filter(item => 
        item.facilityId === fromFacilityId && 
        item.quantity > 0 &&
        !frozenItemIds.has(item.id) &&
        !item.isConsignment
    );
  }, [fromFacilityId, inventoryItems, storageLocationMap, physicalCounts]);
  
  const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
  const activeFacilitiesForTransfer = useMemo(() => activeFacilities.filter(f => f.id !== fromFacilityId), [fromFacilityId, activeFacilities]);
  
  const destinationLocationsByFacility = useMemo(() => {
    if (!activeFacilitiesForTransfer.length) return {};
    const activeFacilityIds = new Set(activeFacilitiesForTransfer.map(f => f.id));
    const destLocations = storageLocations.filter(sl => activeFacilityIds.has(sl.facilityId));
    
    const grouped: Record<string, { value: string; label: string }[]> = {};
    activeFacilitiesForTransfer.forEach(facility => {
        const locationsForFacility = destLocations.filter(loc => loc.facilityId === facility.id);
        grouped[facility.id] = buildIndentedLocationOptions(locationsForFacility);
    });
    return grouped;
}, [activeFacilitiesForTransfer, storageLocations]);
  
  const getItemDetails = (id: string) => {
      const item = inventoryItems.find(i => i.id === id);
      const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
      return { item, master };
  };
  const getUserName = (userId: string | undefined) => users.find(u => u.uid === userId)?.name || 'N/A';
  const getFacilityName = (facilityId: string | undefined) => facilities.find(f => f.id === facilityId)?.name || 'N/A';
  
  const handleFromFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFromFacilityId(e.target.value);
    setItems([{ id: crypto.randomUUID(), inventoryItemId: '', quantity: '' }]);
    setToLocationId('');
  };

  const handleItemChange = (id: string, field: keyof TransferItemRow, value: string | null) => {
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
  const addItemRow = () => setItems([...items, { id: crypto.randomUUID(), inventoryItemId: '', quantity: '' }]);
  const removeItemRow = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromFacilityId || !toLocationId || items.some(i => !i.inventoryItemId || !i.quantity || parseInt(i.quantity) <= 0)) {
        showError({ title: 'Validation Error', message: 'Please fill out From/To facilities and ensure all items have a valid quantity.' });
        return;
    }
    if (!user) {
        showError({ title: 'Authentication Error', message: 'Could not determine the current user.' });
        return;
    }
    
    for(const itemRow of items) {
        const itemDetails = getItemDetails(itemRow.inventoryItemId);
        if(!itemDetails.item || parseInt(itemRow.quantity) > itemDetails.item.quantity) {
            showError({ title: 'Validation Error', message: `Transfer quantity for ${itemDetails.master?.name || 'an item'} exceeds available stock.` });
            return;
        }
    }

    const toStorageLocation = storageLocations.find(sl => sl.id === toLocationId);
    if (!toStorageLocation) {
        showError({ title: 'Validation Error', message: 'The selected destination location is invalid.' });
        return;
    }
    
    const toFacility = facilities.find(f => f.id === toStorageLocation.facilityId);

    const isConfirmed = await confirm({
        title: "Confirm Stock Transfer",
        message: (
            <div>
                <p className="mb-4">You are about to initiate the following stock transfer. This will deduct the items from the source inventory immediately. Please review the details before confirming.</p>
                <div className="bg-secondary-50 p-3 rounded-md mb-4 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-secondary-600">From:</span><span className="font-medium text-secondary-900">{getFacilityName(fromFacilityId)}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-600">To:</span><span className="font-medium text-secondary-900 text-right">{toFacility?.name} / {toStorageLocation.name}</span></div>
                </div>
                <h4 className="font-semibold text-secondary-700 mb-2">Items to Transfer:</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-secondary-50/50">
                    {items.map(itemRow => {
                        const { master } = getItemDetails(itemRow.inventoryItemId);
                        return (
                            <li key={itemRow.id} className="text-sm flex justify-between">
                                <span className="font-medium text-secondary-800">{master?.name || 'Unknown Item'}</span>
                                <span className="font-bold text-primary-700">{itemRow.quantity} {master?.unit}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>
        ),
        confirmText: "Initiate Transfer",
    });

    if (!isConfirmed) return;

    const newLogData: Omit<TransferLog, 'id'> = {
        controlNumber,
        items: items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: parseInt(i.quantity) })),
        fromFacilityId: fromFacilityId,
        toFacilityId: toStorageLocation.facilityId,
        toStorageLocationId: toLocationId,
        notes: notes,
        initiatedByUserId: user.uid,
        timestamp: new Date().toISOString(),
        status: TransferStatus.Pending,
        isConsignment: false,
    };
    
    try {
        const newLogRef = db.ref('transferLogs').push();
        const updates: Record<string, any> = {
            [`/transferLogs/${newLogRef.key}`]: newLogData
        };
        
        newLogData.items.forEach(logItem => {
            const sourceItem = inventoryItems.find(i => i.id === logItem.inventoryItemId);
            if (sourceItem) {
                updates[`/inventoryItems/${sourceItem.id}/quantity`] = sourceItem.quantity - logItem.quantity;
            }
        });

        await db.ref().update(updates);

        await logAuditEvent(user, 'Stock Transfer Initiate', {
            controlNumber,
            from: getFacilityName(fromFacilityId),
            to: getFacilityName(toStorageLocation.facilityId),
        });

        const usersToNotify = users.filter(u => u.facilityId === toStorageLocation.facilityId && (u.role === 'Admin' || u.role === 'Encoder' || u.role === 'System Administrator'));
        for(const notifiedUser of usersToNotify) {
            await addNotification({
                userId: notifiedUser.uid,
                message: `Incoming transfer ${controlNumber} from ${getFacilityName(fromFacilityId)}.`,
                link: '/transfers',
                type: 'stockTransfer',
                sourceId: newLogRef.key!,
            });
        }

        showSuccess({ title: 'Success', message: 'Transfer initiated successfully!' });
        setItems([{ id: crypto.randomUUID(), inventoryItemId: '', quantity: '' }]);
        setToLocationId('');
        setNotes('');
        setFromFacilityId(isEncoder ? user?.facilityId || '' : '');
    } catch (error) {
        console.error("Failed to initiate transfer:", error);
        showError({ title: 'Transfer Failed', message: `An error occurred. Could not initiate transfer.` });
    }
  };

  const handleScan = (itemMasterId: string) => {
      // Logic to find a suitable inventoryItemId from the itemMasterId would go here
      alert(`Scanned master item ID: ${itemMasterId}. Please select the specific batch.`);
      setIsScannerOpen(false);
  };
  
  const handleAcknowledge = (log: TransferLog) => {
    setSelectedLog(log);
    setIsAcknowledgeModalOpen(true);
  };

  const handleSaveAcknowledgement = async (logId: string, receivedItems: { inventoryItemId: string, quantity: number }[], notes: string, isDiscrepancy: boolean) => {
    const log = transferLogs.find(l => l.id === logId);
    if (!log || !user) return;
    
    const toStorageLocation = storageLocations.find(sl => sl.id === log.toStorageLocationId);
    if (!toStorageLocation) {
        showError({ title: "Acknowledgement Error", message: "The destination storage location for this transfer could not be found. It may have been deleted. Acknowledgment cannot proceed." });
        console.error("Destination storage location not found for transfer log:", logId);
        return;
    }

    try {
        const updates: Record<string, any> = {};

        updates[`/transferLogs/${logId}/status`] = isDiscrepancy ? TransferStatus.Discrepancy : TransferStatus.Received;
        updates[`/transferLogs/${logId}/acknowledgedByUserId`] = user.uid;
        updates[`/transferLogs/${logId}/acknowledgementTimestamp`] = new Date().toISOString();
        if (notes) updates[`/transferLogs/${logId}/acknowledgementNotes`] = notes;
        if (isDiscrepancy) updates[`/transferLogs/${logId}/receivedItems`] = receivedItems;


        for(const receivedItem of receivedItems) {
            if (receivedItem.quantity > 0) {
                 const sourceItem = inventoryItems.find(i => i.id === receivedItem.inventoryItemId);
                 if (sourceItem) {
                     const existingDestItem = inventoryItems.find(i => 
                        i.itemMasterId === sourceItem.itemMasterId &&
                        i.batchNumber === sourceItem.batchNumber &&
                        i.expiryDate === sourceItem.expiryDate &&
                        i.storageLocationId === log.toStorageLocationId
                     );

                     if (existingDestItem) {
                         updates[`/inventoryItems/${existingDestItem.id}/quantity`] = existingDestItem.quantity + receivedItem.quantity;
                     } else {
                         const newItemRef = db.ref('inventoryItems').push();
                         const newItemData: Omit<InventoryItem, 'id'> = {
                             ...sourceItem,
                             quantity: receivedItem.quantity,
                             storageLocationId: log.toStorageLocationId,
                         };
                         updates[`/inventoryItems/${newItemRef.key}`] = newItemData;
                     }
                 }
            }
        }
        
        await db.ref().update(updates);

        await removeNotificationsBySource(logId);

        const status = isDiscrepancy ? 'Acknowledged with Discrepancy' : 'Acknowledged';
        await logAuditEvent(user, 'Stock Transfer Acknowledge', {
            controlNumber: log.controlNumber,
            from: getFacilityName(log.fromFacilityId),
            to: getFacilityName(toStorageLocation.facilityId),
            status: status,
        });

        await addNotification({
            userId: log.initiatedByUserId,
            message: `Your transfer ${controlNumber} has been acknowledged.`,
            link: '/transfers',
            type: 'stockTransfer'
        });

        showSuccess({ title: "Success", message: `Transfer ${isDiscrepancy ? 'acknowledged with discrepancy' : 'received successfully'}.` });
    } catch(error) {
        console.error("Failed to acknowledge transfer:", error);
        showError({ title: 'Error', message: 'An error occurred while acknowledging the transfer.' });
    }
  };

  const getStatusPill = (status: TransferStatus) => {
      const styles = {
          [TransferStatus.Pending]: 'bg-yellow-100 text-yellow-800',
          [TransferStatus.Received]: 'bg-green-100 text-green-800',
          [TransferStatus.Discrepancy]: 'bg-orange-100 text-orange-800',
      };
      return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
  }
  
    const augmentedHistoryLogs = useMemo(() => {
        return [...transferLogs].map(log => ({
            ...log,
            fromFacilityName: getFacilityName(log.fromFacilityId),
            toFacilityName: getFacilityName(log.toFacilityId),
            initiatedByUserName: getUserName(log.initiatedByUserId),
            acknowledgedByUserName: getUserName(log.acknowledgedByUserId),
        }));
    }, [transferLogs, facilities, users]);

    const filteredHistoryLogs = useMemo(() => {
        const itemMasterCategoryMap = new Map(itemMasters.map(im => [im.id, im.categoryId]));
        const inventoryItemMasterMap = new Map(inventoryItems.map(ii => [ii.id, ii.itemMasterId]));
        
        return augmentedHistoryLogs.filter(log => {
            if (log.isConsignment) return false;
            
            if (isEncoder && user?.facilityId) {
                if (log.fromFacilityId !== user.facilityId && log.toFacilityId !== user.facilityId) {
                    return false;
                }
            }
            
            const { searchTerm, fromFacilityId, toFacilityId, status, startDate, endDate, categoryId } = historyFilters;
            const logDate = new Date(log.timestamp);
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0,0,0,0);
            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23,59,59,999);
            
            const searchMatch = !searchTerm || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const fromFacilityMatch = !fromFacilityId || log.fromFacilityId === fromFacilityId;
            const toFacilityMatch = !toFacilityId || log.toFacilityId === toFacilityId;
            const statusMatch = !status || log.status === status;
            const dateMatch = (!sDate || logDate >= sDate) && (!eDate || logDate <= eDate);
            
            const categoryMatch = !categoryId || log.items.some(item => {
                const itemMasterId = inventoryItemMasterMap.get(item.inventoryItemId);
                if (!itemMasterId) return false;
                const itemCategoryId = itemMasterCategoryMap.get(itemMasterId);
                return itemCategoryId === categoryId;
            });

            return searchMatch && fromFacilityMatch && toFacilityMatch && statusMatch && dateMatch && categoryMatch;
        });
    }, [augmentedHistoryLogs, historyFilters, user, isEncoder, itemMasters, inventoryItems]);
    
    const { sortedItems: sortedHistoryItems, requestSort: requestHistorySort, sortConfig: historySortConfig } = useSort(filteredHistoryLogs, { key: 'timestamp', direction: 'descending' });

    useEffect(() => {
        setHistoryCurrentPage(1);
    }, [historyFilters, historyItemsPerPage, historySortConfig]);
    
    const paginatedHistoryItems = useMemo(() => {
        const startIndex = (historyCurrentPage - 1) * historyItemsPerPage;
        return sortedHistoryItems.slice(startIndex, startIndex + historyItemsPerPage);
    }, [sortedHistoryItems, historyCurrentPage, historyItemsPerPage]);
    
    const totalHistoryPages = Math.ceil(sortedHistoryItems.length / historyItemsPerPage);
    const startHistoryItemIndex = (historyCurrentPage - 1) * historyItemsPerPage;
    const endHistoryItemIndex = Math.min(startHistoryItemIndex + historyItemsPerPage, sortedHistoryItems.length);

    const downloadVoucherAsCSV = (log: TransferLog & { fromFacilityName: string, toFacilityName: string, initiatedByUserName: string, acknowledgedByUserName?: string }) => {
        const headers = ['Item Name', 'Brand', 'Batch #', 'Expiry Date', 'Quantity', 'Unit', 'Unit Cost', 'Subtotal'];
        
        const totalValue = log.items.reduce((acc, currentItem) => {
            const { item, master } = getItemDetails(currentItem.inventoryItemId);
            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
            return acc + (currentItem.quantity * cost);
        }, 0);
    
        const csvRows = [
            `"Control #","${log.controlNumber}"`,
            `"Date","${new Date(log.timestamp).toLocaleString()}"`,
            `"From Facility","${log.fromFacilityName}"`,
            `"To Facility","${log.toFacilityName}"`,
            `"Initiated By","${log.initiatedByUserName}"`,
            `"Status","${log.status}"`,
            `"Notes","${(log.notes || '').replace(/"/g, '""')}"`,
            '',
            headers.join(','),
            ...log.items.map(transferredItem => {
                const { item, master } = getItemDetails(transferredItem.inventoryItemId);
                const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
                const subtotal = cost * transferredItem.quantity;
                return [
                    `"${master?.name || 'Unknown Item'}"`,
                    `"${master?.brand || 'N/A'}"`,
                    `"${item?.batchNumber || 'N/A'}"`,
                    `"${item?.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}"`,
                    transferredItem.quantity,
                    `"${master?.unit || ''}"`,
                    cost,
                    subtotal
                ].join(',');
            }),
            '',
            `"","","","","","","Total Value",${totalValue}`
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, `trans_${log.controlNumber}.csv`, 'text/csv;charset=utf-8;');
    };

    const exportHistoryToCSV = () => {
        const headers = ['Date', 'Control #', 'Status', 'From', 'To', 'User', 'Acknowledged By'];
        const csvRows = [
            headers.join(','),
            ...sortedHistoryItems.map(log => {
                const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
                return [
                    escape(new Date(log.timestamp).toLocaleDateString()),
                    escape(log.controlNumber),
                    escape(log.status),
                    escape(log.fromFacilityName),
                    escape(log.toFacilityName),
                    escape(log.initiatedByUserName),
                    escape(log.acknowledgedByUserName),
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'transfer_history.csv', 'text/csv;charset=utf-8;');
    };
    
    const handlePrintHistory = () => {
        navigate('/print/transfer-history', { state: { items: sortedHistoryItems } });
    };
    
    const inventoryOptionsForSelect = useMemo(() => {
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

    const renderInventoryOption = (option: SearchableSelectOption, isSelected: boolean) => (
        <div className="flex justify-between items-center w-full">
            <div className="flex flex-col flex-grow min-w-0">
                <span className="font-semibold block truncate">{option.label} ({option.master?.brand || 'N/A'})</span>
                <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-secondary-500'} truncate`}>
                    Batch: {option.batchNumber} | Qty: {option.quantity} | Expires: {option.expiryDate ? new Date(option.expiryDate).toLocaleDateString() : 'N/A'}
                </span>
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
      <h2 className="text-3xl font-semibold text-secondary-800">Regular Stock Transfers</h2>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-lg font-medium leading-6 text-secondary-900">Voucher Details</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Control Number" id="controlNumber" value={controlNumber} readOnly disabled />
                <Select label="From Facility" id="fromFacilityId" name="fromFacilityId" value={fromFacilityId} onChange={handleFromFacilityChange} required disabled={isEncoder}>
                    {!isEncoder && <option value="">Select source facility...</option>}
                    {activeFacilities.filter(f => !isEncoder || f.id === user?.facilityId).map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </Select>
                <div className="md:col-span-2 lg:col-span-1">
                    <Select label="To (Destination Storage Location)" id="toLocationId" name="toLocationId" value={toLocationId} onChange={e => setToLocationId(e.target.value)} required disabled={!fromFacilityId}>
                        <option value="">Select destination location...</option>
                        {activeFacilitiesForTransfer.map(facility => (
                            <optgroup key={facility.id} label={facility.name}>
                                {destinationLocationsByFacility[facility.id]?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </optgroup>
                        ))}
                    </Select>
                </div>
              </div>
              <div className="mt-4">
                <Textarea label="Notes" id="notes" name="notes" rows={2} placeholder="Add any relevant notes for the transfer..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="border-t border-secondary-200 pt-8">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium leading-6 text-secondary-900">Items to Transfer</h3>
                  {settings.enableBarcodeScanner && (
                    <Button type="button" variant="ghost" onClick={() => setIsScannerOpen(true)} leftIcon={<ScanIcon />} disabled={!fromFacilityId}>Scan Item</Button>
                  )}
                </div>

                <div className="hidden md:grid grid-cols-12 gap-x-4 mb-1 px-2 text-xs font-medium text-secondary-500 uppercase">
                    <div className="col-span-8">Item Name</div>
                    <div className="col-span-2">Available</div>
                    <div className="col-span-2">Quantity</div>
                </div>
                
                <div className="space-y-2">
                  {items.map((itemRow) => {
                      const { item, master } = getItemDetails(itemRow.inventoryItemId);
                      return (
                        <div key={itemRow.id} className="grid grid-cols-12 gap-x-4 gap-y-3 items-end p-2 rounded-lg even:bg-secondary-50/50">
                             <div className="col-span-12 md:col-span-8">
                                <label className="text-xs text-secondary-500 md:hidden">Item Name</label>
                                 <SearchableSelect
                                    options={inventoryOptionsForSelect}
                                    value={itemRow.inventoryItemId}
                                    onChange={value => handleItemChange(itemRow.id, 'inventoryItemId', value)}
                                    placeholder="Search for an item..."
                                    renderOption={renderInventoryOption}
                                    disabled={!fromFacilityId}
                                />
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="text-xs text-secondary-500 md:hidden">Available</label>
                                <Input value={item ? `${item.quantity} ${master?.unit}` : '-'} readOnly disabled />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <label className="text-xs text-secondary-500 md:hidden">Quantity</label>
                                <Input name="quantity" type="number" placeholder="0" value={itemRow.quantity} onChange={e => handleItemChange(itemRow.id, 'quantity', e.target.value)} required max={item?.quantity} min="1"/>
                            </div>
                            <div className="col-span-1 flex items-center justify-end">
                                {items.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(itemRow.id)} className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 h-auto"><TrashIcon /></Button>}
                            </div>
                        </div>
                      );
                  })}
                </div>
                <div className="mt-4">
                  <Button type="button" variant="secondary" onClick={addItemRow} leftIcon={<PlusIcon />} disabled={!fromFacilityId}>Add Another Item</Button>
                </div>
            </div>
          </div>

          <div className="bg-secondary-50 px-6 py-4 text-right rounded-b-lg">
            <Button type="submit">Initiate Transfer</Button>
          </div>
        </Card>
      </form>

       <Card>
            <div className="p-4 border-b space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-secondary-900">Transfer History</h3>
                    <div className="flex gap-2">
                        <Button onClick={handlePrintHistory} variant="secondary" leftIcon={<PrintIcon />}>Print</Button>
                        <Button onClick={exportHistoryToCSV} variant="secondary" leftIcon={<DownloadIcon />}>Export CSV</Button>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Input name="searchTerm" placeholder="Search Control #" value={historyFilters.searchTerm} onChange={handleHistoryFilterChange} />
                        <Select name="fromFacilityId" value={historyFilters.fromFacilityId} onChange={handleHistoryFilterChange}>
                            <option value="">From Any Facility</option>
                            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                        <Select name="toFacilityId" value={historyFilters.toFacilityId} onChange={handleHistoryFilterChange}>
                            <option value="">To Any Facility</option>
                            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                        <Select name="status" value={historyFilters.status} onChange={handleHistoryFilterChange}>
                            <option value="">All Statuses</option>
                            {Object.values(TransferStatus).map(s => <option key={s} value={s}>{s}</option>)}
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
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <SortableHeader sortKey="timestamp" requestSort={requestHistorySort} sortConfig={historySortConfig}>Date</SortableHeader>
                    <SortableHeader sortKey="controlNumber" requestSort={requestHistorySort} sortConfig={historySortConfig}>Control #</SortableHeader>
                    <SortableHeader sortKey="status" requestSort={requestHistorySort} sortConfig={historySortConfig}>Status</SortableHeader>
                    <SortableHeader sortKey="fromFacilityName" requestSort={requestHistorySort} sortConfig={historySortConfig}>From</SortableHeader>
                    <SortableHeader sortKey="toFacilityName" requestSort={requestHistorySort} sortConfig={historySortConfig}>To</SortableHeader>
                    <SortableHeader sortKey="initiatedByUserName" requestSort={requestHistorySort} sortConfig={historySortConfig}>User</SortableHeader>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {paginatedHistoryItems.map(log => (
                       <tr key={log.id}>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-700">{log.controlNumber}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusPill(log.status)}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.fromFacilityName}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.toFacilityName}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.initiatedByUserName}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => window.open(`/#/print/transfer/${log.id}`, '_blank')} aria-label="Print" title="Print Voucher"><PrintIcon /></Button>
                            <Button variant="ghost" size="sm" onClick={() => downloadVoucherAsCSV(log)} aria-label="Download CSV" title="Download Voucher as CSV"><DownloadIcon /></Button>
                           {(() => {
                                if (log.status !== TransferStatus.Pending || !user) return null;
                            
                                // Rule 1: Initiator cannot acknowledge.
                                if (log.initiatedByUserId === user.uid) return null;
                            
                                // Admins and SysAdmins can acknowledge any transfer. Encoders must be in the receiving facility.
                                const canAcknowledge = 
                                    user.role === Role.SystemAdministrator ||
                                    user.role === Role.Admin ||
                                    (user.role === Role.Encoder && user.facilityId === log.toFacilityId);
                            
                                if (canAcknowledge) {
                                    return <Button size="sm" onClick={() => handleAcknowledge(log)}>Acknowledge</Button>;
                                }
                                
                                return null;
                            })()}
                         </td>
                       </tr>
                     ))}
                </tbody>
              </table>
              {paginatedHistoryItems.length === 0 && <p className="text-center p-4">No records match the current filters.</p>}
            </div>
             <div className="p-4 border-t">
                 <TablePagination
                    currentPage={historyCurrentPage}
                    totalPages={totalHistoryPages}
                    itemsPerPage={historyItemsPerPage}
                    totalItems={sortedHistoryItems.length}
                    startItemIndex={startHistoryItemIndex}
                    endItemIndex={endHistoryItemIndex}
                    onPageChange={setHistoryCurrentPage}
                    onItemsPerPageChange={(val) => setHistoryItemsPerPage(Number(val))}
                />
            </div>
        </Card>
      
      {isScannerOpen && <BarcodeScannerModal onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}
      {isAcknowledgeModalOpen && selectedLog && (
        <AcknowledgeTransferModal 
            isOpen={isAcknowledgeModalOpen}
            onClose={() => setIsAcknowledgeModalOpen(false)}
            onSave={handleSaveAcknowledgement}
            log={selectedLog}
            getItemDetails={getItemDetails}
        />
      )}
    </div>
  );
};

export default Transfers;