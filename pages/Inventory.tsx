import React, { useState, useMemo, useEffect } from 'react';
import * as ReactRouterDom from 'react-router-dom';
import InventoryTable from '../components/InventoryTable';
import AssetTable from '../components/AssetTable';
import AssetFormModal from '../components/AssetFormModal';
import EditStockItemModal from '../components/EditStockItemModal';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { Role, FacilityStatus, ItemType, AssetItem, AssetStatus, ItemMaster, InventoryItem, ReceiveLog, NewInventoryItemInfo, Program, Supplier, StorageLocation, Facility, PhysicalCountStatus, FundSource, AdjustmentReason } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import AssetImportModal from '../components/ui/AssetImportModal';
import InventoryImportModal from '../components/ui/InventoryImportModal';
import { useSort } from '../hooks/useSort';
import AddItemModal, { NewItemData } from '../components/AddItemModal';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';
import { useInfoModal } from '../hooks/useInfoModal';
import { useConfirmation } from '../hooks/useConfirmation';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { buildIndentedLocationOptions, getStorageLocationPath } from '../utils/locationHelpers';
import { calculateDepreciation } from '../utils/depreciation';
import { PurgeConfirmationModal } from '../components/ui/PurgeConfirmationModal';

interface InventoryProps {
    itemTypes: ItemType[];
}

// Define augmented types for better type safety
type AugmentedInventoryItem = InventoryItem & {
    master: ItemMaster;
    facilityId?: string;
    facilityName?: string;
    locationName?: string; // This will now be the full path
    categoryName: string;
    programName: string;
    totalValue: number;
    isFrozen: boolean;
    fundSourceName?: string;
};

type AugmentedAssetItem = AssetItem & {
    master: ItemMaster;
    facilityId?: string;
    facilityName?: string;
    locationName?: string; // This will now be the full path
    categoryName: string;
    custodianName: string;
    fundSourceName?: string;
    age: number;
    depreciatedValue: number;
};


const Inventory: React.FC<InventoryProps> = ({ itemTypes }) => {
  const { user } = useAuth();
  const { data } = useDatabase();
  const { inventoryItems, assetItems, facilities, programs, storageLocations, categories, itemMasters, users, suppliers, physicalCounts, fundSources } = data;
  const navigate = ReactRouterDom.useNavigate();
  const location = ReactRouterDom.useLocation();
  const { showError, showSuccess } = useInfoModal();
  const confirm = useConfirmation();
  const preselectedCategoryId = (location.state as any)?.preselectedCategoryId;
  const preselectedStatus = (location.state as any)?.preselectedStatus;
  const preselectedExpiration = (location.state as any)?.preselectedExpiration;

  const canModify = useMemo(() => {
    if (!user) return false;
    return ![Role.User, Role.Auditor].includes(user.role);
  }, [user]);

  const canImport = useMemo(() => {
    if (!user) return false;
    return user.role === Role.Admin || user.role === Role.SystemAdministrator;
  }, [user]);
  
  const isRestrictedToFacility = useMemo(() => user?.role === Role.User || user?.role === Role.Encoder, [user]);

  const canExport = true;
  const isAssetView = itemTypes.includes(ItemType.Asset);
  
  // State for modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isEditStockItemModalOpen, setIsEditStockItemModalOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<AugmentedInventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [itemToAdjust, setItemToAdjust] = useState<AugmentedInventoryItem | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [itemToPurge, setItemToPurge] = useState<AugmentedInventoryItem | null>(null);

  // State for filters, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    facilityId: isRestrictedToFacility ? user?.facilityId || '' : '',
    storageLocationId: '',
    programId: '',
    categoryId: preselectedCategoryId || '',
    assetStatus: '',
    propertyCustodian: '',
    fundSourceId: '',
    supplierId: '',
    purchaseOrder: '',
    icsNumber: '',
    status: preselectedStatus || '',
    expiration: preselectedExpiration || '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const state = location.state as any;
    if (state?.preselectedCategoryId || state?.preselectedStatus || state?.preselectedExpiration) {
        const newState = { ...location.state };
        delete newState.preselectedCategoryId;
        delete newState.preselectedStatus;
        delete newState.preselectedExpiration;
        navigate(location.pathname, { replace: true, state: Object.keys(newState).length > 0 ? newState : null });
    }
  }, [preselectedCategoryId, preselectedStatus, preselectedExpiration, navigate, location.pathname, location.state]);

  const getStatus = (item: AugmentedInventoryItem) => {
    if (!item.master) return { text: 'Unknown' };
    if (item.isFrozen) return { text: 'On Count' };
    if (item.quantity === 0) return { text: 'Out of Stock' };
    if (item.master.lowStockThreshold && item.master.lowStockThreshold > 0 && item.quantity <= item.master.lowStockThreshold) return { text: 'Low Stock' };
    return { text: 'In Stock' };
  };

  // --- START: Data Processing Pipeline ---
  const filteredAugmentedItems: any[] = useMemo(() => {
    const activeCountStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
    const frozenItemIds = new Set<string>();
    physicalCounts
        .filter(count => activeCountStatuses.includes(count.status))
        .forEach(count => {
            count.items?.forEach(item => {
                if (item) frozenItemIds.add(item.inventoryItemId);
            });
        });

    const storageFacilityMap = new Map<string, string>();
    storageLocations.forEach(sl => storageFacilityMap.set(sl.id, sl.facilityId));
    
    const itemMasterMap = new Map<string, ItemMaster>(itemMasters.map(im => [im.id, im]));
    const categoryMap = new Map<string, string>(categories.map(c => [c.id, c.name]));
    const facilityMap = new Map<string, Facility>(facilities.map(f => [f.id, f]));
    const fundSourceMap = new Map<string, string>(fundSources.map(fs => [fs.id, fs.name]));


    if (isAssetView) {
        let augmented = assetItems.reduce<AugmentedAssetItem[]>((acc, asset) => {
            const master = itemMasterMap.get(asset.itemMasterId);
            if(master){
                const facilityId = storageFacilityMap.get(asset.storageLocationId);
                const { age, depreciatedValue } = calculateDepreciation(asset);
                acc.push({
                    ...asset,
                    master,
                    facilityId: facilityId,
                    facilityName: facilityId ? facilityMap.get(facilityId)?.name : 'N/A',
                    locationName: getStorageLocationPath(asset.storageLocationId, storageLocations, facilities),
                    categoryName: master ? categoryMap.get(master.categoryId) || 'N/A' : 'N/A',
                    custodianName: asset.propertyCustodian || 'N/A',
                    fundSourceName: asset.fundSourceId ? fundSourceMap.get(asset.fundSourceId) : 'N/A',
                    age,
                    depreciatedValue,
                });
            }
            return acc;
        }, []);

        return augmented.filter(item => {
            const searchMatch = !searchTerm ||
                item.master.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.master.brand && item.master.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.propertyNumber && item.propertyNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));

            const facilityMatch = !filters.facilityId || item.facilityId === filters.facilityId;
            const storageLocationMatch = !filters.storageLocationId || item.storageLocationId === filters.storageLocationId;
            const categoryMatch = !filters.categoryId || item.master.categoryId === filters.categoryId;
            const statusMatch = !filters.assetStatus || item.status === filters.assetStatus;
            const custodianMatch = !filters.propertyCustodian || (item.propertyCustodian && item.propertyCustodian.toLowerCase().includes(filters.propertyCustodian.toLowerCase()));
            const fundSourceMatch = !filters.fundSourceId || item.fundSourceId === filters.fundSourceId;
            return searchMatch && facilityMatch && storageLocationMatch && categoryMatch && statusMatch && custodianMatch && fundSourceMatch;
        });

    } else {
        let augmented = inventoryItems
            .filter(item => !item.isConsignment && itemTypes.includes(itemMasterMap.get(item.itemMasterId)?.itemType as ItemType))
            .reduce<AugmentedInventoryItem[]>((acc, item) => {
                const master = itemMasterMap.get(item.itemMasterId);
                if(master) {
                    const facilityId = storageFacilityMap.get(item.storageLocationId);
                    const program = programs.find(p => p.id === item.programId);
                    const cost = item.purchaseCost ?? master?.unitCost ?? 0;
                    acc.push({
                        ...item,
                        master,
                        facilityId: facilityId,
                        facilityName: facilityId ? facilityMap.get(facilityId)?.name : 'N/A',
                        locationName: getStorageLocationPath(item.storageLocationId, storageLocations, facilities),
                        categoryName: master ? categoryMap.get(master.categoryId) || 'N/A' : 'N/A',
                        programName: program?.name || 'N/A',
                        totalValue: cost * item.quantity,
                        isFrozen: frozenItemIds.has(item.id),
                        fundSourceName: item.fundSourceId ? fundSourceMap.get(item.fundSourceId) : 'N/A'
                    });
                }
                return acc;
            }, []);
        
        return augmented.filter(item => {
            const searchMatch = !searchTerm ||
                item.master.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.master.brand && item.master.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.batchNumber && item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.purchaseOrder && item.purchaseOrder.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.icsNumber && item.icsNumber.toLowerCase().includes(searchTerm.toLowerCase()));

            const facilityMatch = !filters.facilityId || item.facilityId === filters.facilityId;
            const storageLocationMatch = !filters.storageLocationId || item.storageLocationId === filters.storageLocationId;
            const categoryMatch = !filters.categoryId || item.master.categoryId === filters.categoryId;
            const programMatch = !filters.programId || item.programId === filters.programId;
            const fundSourceMatch = !filters.fundSourceId || item.fundSourceId === filters.fundSourceId;
            const supplierMatch = !filters.supplierId || item.supplierId === filters.supplierId;
            const poMatch = !filters.purchaseOrder || (item.purchaseOrder && item.purchaseOrder.toLowerCase().includes(filters.purchaseOrder.toLowerCase()));
            const icsMatch = !filters.icsNumber || (item.icsNumber && item.icsNumber.toLowerCase().includes(filters.icsNumber.toLowerCase()));
            const statusMatch = (() => {
              if (!filters.status) return true;
              const itemStatus = getStatus(item);
              return itemStatus.text === filters.status;
            })();

            const expirationMatch = (() => {
                if (!filters.expiration) return true;
                if (!item.expiryDate) return false;
                
                const now = new Date();
                const expiry = new Date(item.expiryDate);
                now.setHours(0,0,0,0);

                if (filters.expiration === 'expired') {
                    return expiry < now;
                }
                if (filters.expiration === 'expiringSoon') {
                    const ninetyDaysFromNow = new Date();
                    ninetyDaysFromNow.setDate(now.getDate() + 90);
                    return expiry >= now && expiry <= ninetyDaysFromNow;
                }
                return true;
            })();

            return searchMatch && facilityMatch && storageLocationMatch && categoryMatch && programMatch && fundSourceMatch && supplierMatch && poMatch && icsMatch && statusMatch && expirationMatch;
        });
    }
  }, [itemTypes, inventoryItems, assetItems, facilities, storageLocations, itemMasters, categories, users, programs, isAssetView, searchTerm, filters, physicalCounts, fundSources, suppliers]);
  

  const { sortedItems, requestSort, sortConfig } = useSort(filteredAugmentedItems, { key: 'master.name', direction: 'ascending' });

  useEffect(() => setCurrentPage(1), [searchTerm, filters, itemsPerPage, sortConfig]);

  const paginatedItems = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startItemIndex = (currentPage - 1) * itemsPerPage;
  const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);
  // --- END: Data Processing Pipeline ---

  // --- START: Modal and CRUD Handlers ---
  const openAddAssetModal = () => { setEditingAsset(null); setIsAssetModalOpen(true); };
  const openEditAssetModal = (asset: AssetItem) => { setEditingAsset(asset); setIsAssetModalOpen(true); };
  const openDeleteAssetModal = (asset: AssetItem) => { setAssetToDelete(asset); setIsDeleteModalOpen(true); };
  const openEditStockItemModal = (item: AugmentedInventoryItem) => {
    setEditingStockItem(item);
    setIsEditStockItemModalOpen(true);
  };
   const handleOpenAdjustModal = (item: AugmentedInventoryItem) => {
    setItemToAdjust(item);
    setIsAdjustModalOpen(true);
  };
  const handleOpenPurgeModal = (item: AugmentedInventoryItem) => {
    setItemToPurge(item);
    setIsPurgeModalOpen(true);
  };

  const handleSaveAsset = async (savedAsset: AssetItem) => {
    const propertyNumber = savedAsset.propertyNumber?.trim();
    if (!propertyNumber) {
        showError({
            title: "Missing Property Number",
            message: "The property number cannot be empty."
        });
        return;
    }

    const propertyNumberExists = assetItems.some(
        (item) => 
        item.id !== savedAsset.id && 
        item.propertyNumber.trim().toLowerCase() === propertyNumber.toLowerCase()
    );

    if (propertyNumberExists) {
        showError({
            title: "Duplicate Property Number",
            message: `The property number "${propertyNumber}" is already assigned to another asset. Please use a unique property number.`
        });
        return;
    }

    if (!user) {
        showError({ title: "Error", message: "User not authenticated." });
        return;
    }
    
    const master = itemMasters.find(im => im.id === savedAsset.itemMasterId);
    
    if (editingAsset) {
        await db.ref(`assetItems/${editingAsset.id}`).update(savedAsset);
        const oldData: Record<string, any> = {};
        const newData: Record<string, any> = {};

        const fieldsToCompare: (keyof AssetItem)[] = [
            'itemMasterId', 'propertyNumber', 'serialNumber', 'purchaseDate', 'acquisitionPrice', 
            'warrantyEndDate', 'status', 'assignedTo', 'propertyCustodian', 'condition', 
            'storageLocationId', 'notes', 'fundSourceId', 'usefulLife', 'salvageValue'
        ];
        
        fieldsToCompare.forEach(key => {
            const oldValue = editingAsset[key];
            const newValue = savedAsset[key];
        
            if (oldValue !== newValue) {
                if (key === 'storageLocationId') {
                    oldData['location'] = getStorageLocationPath(oldValue as string, storageLocations, facilities);
                    newData['location'] = getStorageLocationPath(newValue as string, storageLocations, facilities);
                } else if (key === 'itemMasterId') {
                    oldData.assetType = itemMasters.find(im => im.id === oldValue)?.name || 'N/A';
                    newData.assetType = itemMasters.find(im => im.id === newValue)?.name || 'N/A';
                } else if (key === 'fundSourceId') {
                    oldData.fundSource = fundSources.find(fs => fs.id === oldValue)?.name || 'N/A';
                    newData.fundSource = fundSources.find(fs => fs.id === newValue)?.name || 'N/A';
                } else {
                    oldData[key] = oldValue ?? 'N/A';
                    newData[key] = newValue ?? 'N/A';
                }
            }
        });
        
        if (Object.keys(newData).length > 0) {
            await logAuditEvent(user, 'Asset Item Update', { 
                propertyNumber: savedAsset.propertyNumber,
                assetName: master?.name || 'Unknown',
                oldData,
                newData
            });
        }
    } else {
        const newAssetRef = db.ref('assetItems').push();
        await newAssetRef.set({ ...savedAsset, id: newAssetRef.key! });
        await logAuditEvent(user, 'Asset Item Create', { 
            propertyNumber: savedAsset.propertyNumber,
            assetName: master?.name || 'Unknown'
        });
    }
    setIsAssetModalOpen(false);
    setEditingAsset(null);
  };

  const handleSaveStockItem = async (savedItem: InventoryItem) => {
    if (!user) return;
    const originalItem = inventoryItems.find(i => i.id === savedItem.id);
    if (!originalItem) return;

    await db.ref(`inventoryItems/${savedItem.id}`).update(savedItem);
    
    const oldData: Record<string, any> = {};
    const newData: Record<string, any> = {};
    
    const fieldsToCompare: (keyof InventoryItem)[] = ['batchNumber', 'expiryDate', 'purchaseCost', 'supplierId', 'programId', 'fundSourceId', 'purchaseOrder', 'icsNumber'];

    fieldsToCompare.forEach(key => {
        const oldValue = originalItem[key];
        const newValue = savedItem[key];
        if (oldValue !== newValue) {
            if (key === 'supplierId') {
                oldData.supplier = suppliers.find(s => s.id === oldValue)?.name || 'N/A';
                newData.supplier = suppliers.find(s => s.id === newValue)?.name || 'N/A';
            } else if (key === 'programId') {
                oldData.program = programs.find(p => p.id === oldValue)?.name || 'N/A';
                newData.program = programs.find(p => p.id === newValue)?.name || 'N/A';
            } else if (key === 'fundSourceId') {
                oldData.fundSource = fundSources.find(fs => fs.id === oldValue)?.name || 'N/A';
                newData.fundSource = fundSources.find(fs => fs.id === newValue)?.name || 'N/A';
            } else {
                oldData[key] = oldValue ?? 'N/A';
                newData[key] = newValue ?? 'N/A';
            }
        }
    });

    if (Object.keys(newData).length > 0) {
        const master = itemMasters.find(im => im.id === savedItem.itemMasterId);
        await logAuditEvent(user, 'Stock Item Update', {
            itemName: master?.name || 'Unknown',
            batchNumber: savedItem.batchNumber,
            oldData,
            newData
        });
    }

    setIsEditStockItemModalOpen(false);
    setEditingStockItem(null);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    await db.ref(`assetItems/${assetToDelete.id}`).remove();
    setIsDeleteModalOpen(false);
    setAssetToDelete(null);
  };
  
  const handleImportAssets = async (newAssetsToImport: Omit<AssetItem, 'id'>[]) => {
    if (!user || !newAssetsToImport || newAssetsToImport.length === 0) return;
    try {
        const updates: Record<string, any> = {};
        newAssetsToImport.forEach(asset => {
            const newAssetRef = db.ref('assetItems').push();
            updates[`/assetItems/${newAssetRef.key}`] = asset;
        });
        await db.ref().update(updates);
        await logAuditEvent(user, 'Bulk Import: PPE Inventory', { count: newAssetsToImport.length });
        alert(`${newAssetsToImport.length} assets imported successfully!`);
        setIsImportModalOpen(false);
    } catch (error) {
        console.error("Error importing assets:", error);
        alert("An error occurred during import.");
    }
  };

  const handleImportInventoryItems = async (newItemsToImport: Omit<InventoryItem, 'id'>[]) => {
    if (!user || !newItemsToImport || newItemsToImport.length === 0) return;
    try {
        const updates: Record<string, any> = {};
        newItemsToImport.forEach(item => {
            const newItemRef = db.ref('inventoryItems').push();
            updates[`/inventoryItems/${newItemRef.key}`] = item;
        });
        await db.ref().update(updates);
        await logAuditEvent(user, 'Bulk Import: Commodity Inventory', { count: newItemsToImport.length });
        alert(`${newItemsToImport.length} items imported successfully!`);
        setIsImportModalOpen(false);
    } catch (error) {
        console.error("Error importing inventory items:", error);
        alert("An error occurred during import.");
    }
  };

    const handleSaveNewItem = async (newItemData: NewItemData) => {
        if (!user) {
            alert("Authentication error.");
            return;
        }
        
        const { itemMasterId, quantity, unitCost, expiryDate, batchNumber, storageLocationId, supplierId, facilityId, programId, purchaseOrder, fundSourceId, icsNumber } = newItemData;
        
        const numQuantity = parseInt(String(quantity), 10);
        if (isNaN(numQuantity) || numQuantity < 0) {
            alert("Please enter a valid, non-negative quantity.");
            return;
        }

        const newInventoryItemRef = db.ref('inventoryItems').push();
        const newInventoryItem: Omit<InventoryItem, 'id'> = {
            itemMasterId,
            quantity: numQuantity,
            purchaseCost: unitCost,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString() : '',
            batchNumber,
            storageLocationId,
            supplierId,
            isConsignment: false,
            ...(programId && { programId }),
            ...(purchaseOrder && { purchaseOrder }),
            ...(fundSourceId && { fundSourceId }),
            ...(icsNumber && { icsNumber }),
        };

        const controlNumber = `QUICK-RECV-${Date.now()}`;
        
        const newLogItemInfo: NewInventoryItemInfo = {
            itemMasterId,
            quantity: numQuantity,
            unitCost: unitCost,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString() : '',
            batchNumber,
            ...(fundSourceId && { fundSourceId }),
            ...(icsNumber && { icsNumber }),
        };

        const newReceiveLogRef = db.ref('receiveLogs').push();
        const newReceiveLog: Omit<ReceiveLog, 'id'> = {
            controlNumber,
            items: [newLogItemInfo],
            affectedInventoryItemIds: [newInventoryItemRef.key!],
            supplierId,
            userId: user.uid,
            facilityId,
            storageLocationId,
            timestamp: new Date().toISOString(),
            isConsignment: false,
            ...(purchaseOrder && { purchaseOrder }),
        };

        try {
            const updates: Record<string, any> = {};
            updates[`/inventoryItems/${newInventoryItemRef.key}`] = newInventoryItem;
            updates[`/receiveLogs/${newReceiveLogRef.key}`] = newReceiveLog;

            await db.ref().update(updates);

            alert("Item added to inventory successfully.");
            setIsAddItemModalOpen(false);
        } catch (error) {
            console.error("Failed to add new item:", error);
            alert("An error occurred while adding the item.");
        }
    };

  const handleSaveAdjustment = async (inventoryItemId: string, newQuantity: number, reason: AdjustmentReason, notes: string) => {
    if (!user) return;
    const itemToUpdate = inventoryItems.find(i => i.id === inventoryItemId);
    if (!itemToUpdate) return;

    const storageLocation = storageLocations.find(sl => sl.id === itemToUpdate.storageLocationId);

    const newLogRef = db.ref('adjustmentLogs').push();
    const newLogData = {
        controlNumber: `ADJ-${Date.now()}`,
        inventoryItemId,
        itemMasterId: itemToUpdate.itemMasterId,
        fromQuantity: itemToUpdate.quantity,
        toQuantity: newQuantity,
        reason,
        notes,
        userId: user.uid,
        facilityId: storageLocation?.facilityId || 'UNKNOWN',
        timestamp: new Date().toISOString(),
        isConsignment: false,
    };
    
    const updates: Record<string, any> = {};
    updates[`/inventoryItems/${inventoryItemId}/quantity`] = newQuantity;
    updates[`/adjustmentLogs/${newLogRef.key}`] = newLogData;

    try {
        await db.ref().update(updates);
        await logAuditEvent(user, 'Stock Adjustment', {
            item: itemMasters.find(im => im.id === itemToUpdate.itemMasterId)?.name,
            from: itemToUpdate.quantity,
            to: newQuantity,
            reason
        });
        alert('Stock quantity adjusted successfully.');
    } catch (error) {
        console.error("Failed to adjust stock:", error);
        alert("An error occurred while adjusting stock.");
    } finally {
        setIsAdjustModalOpen(false);
        setItemToAdjust(null);
    }
  };
  
    const confirmPurgeItem = async () => {
        if (!itemToPurge || !user) {
            showError({ title: "Error", message: "User or item to purge not specified." });
            setIsPurgeModalOpen(false);
            setItemToPurge(null);
            return;
        }

        try {
            await db.ref(`inventoryItems/${itemToPurge.id}`).remove();
            await logAuditEvent(user, 'Inventory Item Purge', {
                itemMasterId: itemToPurge.itemMasterId,
                itemName: itemToPurge.master?.name,
                batchNumber: itemToPurge.batchNumber,
                quantity: itemToPurge.quantity,
                inventoryItemId: itemToPurge.id,
            });
            showSuccess({ title: "Success", message: "Item purged successfully from the database." });
        } catch (error: any) {
            console.error("Failed to purge item:", error);
            showError({ title: "Purge Failed", message: `An error occurred: ${error.message}` });
        } finally {
            setIsPurgeModalOpen(false);
            setItemToPurge(null);
        }
    };
  // --- END: Modal and CRUD Handlers ---

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      if (name === 'facilityId') newFilters.storageLocationId = '';
      return newFilters;
    });
  };

  // --- START: Page Actions (Print, Export) ---
  const exportToCSV = () => {
    let csvRows: string[];
    let filename: string;
    const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;

    if (isAssetView) {
        const headers = ['PropertyNumber', 'Name', 'Category', 'Status', 'Custodian', 'AssignedTo', 'Location', 'PurchaseDate', 'AcquisitionPrice', 'FundSource'];
        const assetItemsToExport = sortedItems as AugmentedAssetItem[];
        csvRows = [headers.join(','), ...assetItemsToExport.map(asset => [
            escape(asset.propertyNumber), escape(asset.master?.name), escape(asset.categoryName), escape(asset.status),
            escape(asset.custodianName), escape(asset.assignedTo), escape(asset.locationName),
            escape(new Date(asset.purchaseDate).toLocaleDateString()), asset.acquisitionPrice, escape(asset.fundSourceName)
        ].join(','))];
        filename = 'assets_inventory.csv';
    } else {
        const headers = ['Name', 'Brand', 'Category', 'Program', 'Location', 'Quantity', 'Unit', 'TotalValue', 'ExpiryDate', 'BatchNumber', 'FundSource'];
        const inventoryItemsToExport = sortedItems as AugmentedInventoryItem[];
        csvRows = [headers.join(','), ...inventoryItemsToExport.map(item => [
            escape(item.master?.name), escape(item.master?.brand), escape(item.categoryName), escape(item.programName),
            escape(item.locationName), item.quantity, escape(item.master?.unit),
            item.totalValue.toFixed(2), item.expiryDate ? escape(new Date(item.expiryDate).toLocaleDateString()) : 'N/A', escape(item.batchNumber), escape(item.fundSourceName)
        ].join(','))];
        filename = `commodities_inventory.csv`;
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const params = new URLSearchParams();
    params.set('itemType', isAssetView ? ItemType.Asset : 'Commodities');
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    if(searchTerm) params.set('searchTerm', searchTerm);
    
    window.open(`#/print/inventory?${params.toString()}`, '_blank');
  };

  const handleAddNew = () => {
    if (isAssetView) {
        openAddAssetModal();
    } else {
        setIsAddItemModalOpen(true);
    }
  };
  // --- END: Page Actions ---

  const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
  
  const availableStorageLocationOptions = useMemo(() => {
    const targetFacilityId = filters.facilityId;
    if (!targetFacilityId) return [];
    const locationsForFacility = storageLocations.filter(sl => sl.facilityId === targetFacilityId);
    return buildIndentedLocationOptions(locationsForFacility);
}, [filters.facilityId, storageLocations]);


  const filterGridClass = isAssetView ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5';

  return (
    <div>
        <ManagementPageHeader
            title={`${isAssetView ? 'PPE' : 'Commodities'} Inventory`}
            onPrint={handlePrint}
            onExport={canExport ? exportToCSV : undefined}
            onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
            onAddNew={canModify ? handleAddNew : undefined}
            addNewText={isAssetView ? "Add New PPE" : "Add New Stock"}
        />

      <Card className="mb-6">
        <div className="p-4 space-y-4">
          <Input 
            placeholder={isAssetView ? "Search by name, property #, S/N..." : "Search by name, batch, PO#, or ICS#..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className={`grid ${filterGridClass} gap-4`}>
              <Select name="facilityId" value={filters.facilityId} onChange={handleFilterChange} disabled={isRestrictedToFacility}>
                {!isRestrictedToFacility && <option value="">All Facilities</option>}
                {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
               <Select name="storageLocationId" value={filters.storageLocationId} onChange={handleFilterChange} disabled={!filters.facilityId}>
                <option value="">All Storage Locations</option>
                {availableStorageLocationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </Select>
              <Select name="categoryId" value={filters.categoryId} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              
              {isAssetView ? (
                <>
                  <Select name="assetStatus" value={filters.assetStatus} onChange={handleFilterChange}>
                      <option value="">All Statuses</option>
                      {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Input
                      name="propertyCustodian"
                      placeholder="Filter by Custodian name..."
                      value={filters.propertyCustodian}
                      onChange={handleFilterChange}
                  />
                  <Select name="fundSourceId" value={filters.fundSourceId} onChange={handleFilterChange}>
                    <option value="">All Fund Sources</option>
                    {fundSources.map(fs => <option key={fs.id} value={fs.id}>{fs.name}</option>)}
                  </Select>
                </>
              ) : (
                 <>
                    <Select name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="">All Statuses</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                        <option value="On Count">On Count</option>
                    </Select>
                    <Select name="expiration" value={filters.expiration} onChange={handleFilterChange}>
                        <option value="">All Expiration</option>
                        <option value="expiringSoon">Expiring in 90 Days</option>
                        <option value="expired">Expired</option>
                    </Select>
                 </>
              )}
          </div>
        </div>
      </Card>
      
      <Card noPadding footer={
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={sortedItems.length}
            startItemIndex={startItemIndex}
            endItemIndex={endItemIndex}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
      }>
        {isAssetView ? (
          <AssetTable 
              assets={paginatedItems as AugmentedAssetItem[]}
              onEdit={openEditAssetModal}
              onDelete={openDeleteAssetModal}
              canModify={canModify}
              requestSort={key => requestSort(key as string)}
              sortConfig={sortConfig}
          />
        ) : (
          <InventoryTable 
              items={paginatedItems as AugmentedInventoryItem[]}
              requestSort={key => requestSort(key as string)}
              sortConfig={sortConfig}
              onEdit={openEditStockItemModal}
              onAdjust={handleOpenAdjustModal}
              onPurge={handleOpenPurgeModal}
          />
        )}
      </Card>

      {isAssetModalOpen && (
          <AssetFormModal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} onSave={handleSaveAsset} assetItem={editingAsset}
            itemMasters={itemMasters} storageLocations={storageLocations} facilities={facilities} fundSources={fundSources}
          />
      )}
      
      {!isAssetView && (
          <AddItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                onSave={handleSaveNewItem}
                itemMasters={itemMasters.filter(im => itemTypes.includes(im.itemType))}
                suppliers={suppliers}
                programs={programs}
                facilities={facilities}
                storageLocations={storageLocations}
                fundSources={fundSources}
            />
      )}

      {!isAssetView && editingStockItem && (
          <EditStockItemModal
                isOpen={isEditStockItemModalOpen}
                onClose={() => setIsEditStockItemModalOpen(false)}
                onSave={handleSaveStockItem}
                item={editingStockItem}
                itemMasters={itemMasters}
                suppliers={suppliers}
                programs={programs}
                fundSources={fundSources}
            />
      )}
       {itemToAdjust && (
        <AdjustStockModal
            isOpen={isAdjustModalOpen}
            onClose={() => setIsAdjustModalOpen(false)}
            onSave={handleSaveAdjustment}
            item={itemToAdjust}
        />
      )}

      <PurgeConfirmationModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onConfirm={confirmPurgeItem}
        itemToPurge={itemToPurge}
      />

      {isAssetView ? (
          <AssetImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportAssets}
            itemMasters={itemMasters} storageLocations={storageLocations} facilities={facilities} fundSources={fundSources}
            assetItems={assetItems}
          />
      ) : (
          <InventoryImportModal 
            isOpen={isImportModalOpen} 
            onClose={() => setIsImportModalOpen(false)} 
            onImport={handleImportInventoryItems}
            itemMasters={itemMasters}
            storageLocations={storageLocations}
            facilities={facilities}
            suppliers={suppliers}
            programs={programs}
            fundSources={fundSources}
        />
      )}

      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeleteAsset}
        itemName={assetToDelete?.propertyNumber || ''} itemType="asset"
      />
    </div>
  );
};

export default Inventory;