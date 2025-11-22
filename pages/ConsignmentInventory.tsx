
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryTable from '../components/InventoryTable';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Role, FacilityStatus, ItemType, ItemMaster, InventoryItem, Program, StorageLocation, Facility, PhysicalCountStatus, AdjustmentReason } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { useSort } from '../hooks/useSort';
import { buildIndentedLocationOptions, getStorageLocationPath } from '../utils/locationHelpers';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';
import { useConfirmation } from '../hooks/useConfirmation';
import { useInfoModal } from '../hooks/useInfoModal';

type AugmentedInventoryItem = InventoryItem & {
    master?: ItemMaster;
    facilityId?: string;
    facilityName?: string;
    locationName?: string;
    categoryName?: string;
    programName?: string;
    totalValue?: number;
    isFrozen?: boolean;
    fundSourceName?: string;
};


const ConsignmentInventory: React.FC = () => {
  const { user } = useAuth();
  const { data } = useDatabase();
  const { inventoryItems, facilities, programs, storageLocations, categories, itemMasters, physicalCounts, fundSources, adjustmentLogs } = data;
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const { showError, showSuccess } = useInfoModal();

  const canModify = useMemo(() => {
    if (!user) return false;
    return ![Role.User, Role.Auditor].includes(user.role);
  }, [user]);

  const isRestrictedToFacility = useMemo(() => user?.role === Role.User || user?.role === Role.Encoder, [user]);
  const canExport = true;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    facilityId: isRestrictedToFacility ? user?.facilityId || '' : '',
    storageLocationId: '',
    programId: '',
    categoryId: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [itemToAdjust, setItemToAdjust] = useState<AugmentedInventoryItem | null>(null);

  const handleOpenAdjustModal = (item: AugmentedInventoryItem) => {
    setItemToAdjust(item);
    setIsAdjustModalOpen(true);
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
        isConsignment: true,
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
  
    const handlePurgeItem = async (itemToPurge: InventoryItem) => {
        if (!user) {
            showError({ title: "Error", message: "User not found for purge operation." });
            return;
        }

        const isConfirmed = await confirm({
            title: "Confirm Permanent Deletion",
            message: (
                <div>
                    <p className="font-bold text-lg text-red-700">Warning: This action is irreversible.</p>
                    <p className="mt-2">You are about to permanently purge the following item from the inventory. This will delete the item record and cannot be undone. This action should only be used to correct significant data entry errors.</p>
                    <div className="bg-red-50 p-3 mt-4 rounded-md border border-red-200 text-sm">
                        <p><strong>Item:</strong> {itemMasters.find(im => im.id === itemToPurge.itemMasterId)?.name}</p>
                        <p><strong>Batch:</strong> {itemToPurge.batchNumber}</p>
                        <p><strong>Quantity:</strong> {itemToPurge.quantity}</p>
                    </div>
                    <p className="mt-4">Are you absolutely sure you want to proceed?</p>
                </div>
            ),
            confirmText: "Yes, Purge Item",
            variant: "danger"
        });

        if (isConfirmed) {
            try {
                await db.ref(`inventoryItems/${itemToPurge.id}`).remove();
                await logAuditEvent(user, 'Inventory Item Purge', {
                    itemMasterId: itemToPurge.itemMasterId,
                    itemName: itemMasters.find(im => im.id === itemToPurge.itemMasterId)?.name,
                    batchNumber: itemToPurge.batchNumber,
                    quantity: itemToPurge.quantity,
                    inventoryItemId: itemToPurge.id,
                });
                showSuccess({ title: "Success", message: "Item purged successfully from the database." });
            } catch (error: any) {
                console.error("Failed to purge item:", error);
                showError({ title: "Purge Failed", message: `An error occurred: ${error.message}` });
            }
        }
    };


  const filteredAugmentedItems: AugmentedInventoryItem[] = useMemo(() => {
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
    const facilityMap = new Map<string, string>(facilities.map(f => [f.id, f.name]));
    const fundSourceMap = new Map<string, string>(fundSources.map(fs => [fs.id, fs.name]));

    let augmented = inventoryItems
        .filter(item => item.isConsignment) // The key filter for this page
        .reduce<AugmentedInventoryItem[]>((acc, item) => {
            const master = itemMasterMap.get(item.itemMasterId);
            if(master) {
                const facilityId = storageFacilityMap.get(item.storageLocationId);
                const program = programs.find(p => p.id === item.programId);
                acc.push({
                    ...item,
                    master,
                    facilityId: facilityId,
                    facilityName: facilityId ? facilityMap.get(facilityId) : 'N/A',
                    locationName: getStorageLocationPath(item.storageLocationId, storageLocations, facilities),
                    categoryName: master ? categoryMap.get(master.categoryId) || 'N/A' : 'N/A',
                    programName: program?.name || 'N/A',
                    totalValue: 0, // Consignment items have no owned value until consumed
                    isFrozen: frozenItemIds.has(item.id),
                    fundSourceName: item.fundSourceId ? fundSourceMap.get(item.fundSourceId) : 'N/A',
                });
            }
            return acc;
        }, []);
    
    return augmented.filter(item => {
        const searchMatch = !searchTerm ||
            item.master!.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.master!.brand && item.master!.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.batchNumber && item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()));

        const facilityMatch = !filters.facilityId || item.facilityId === filters.facilityId;
        const storageLocationMatch = !filters.storageLocationId || item.storageLocationId === filters.storageLocationId;
        const categoryMatch = !filters.categoryId || item.master!.categoryId === filters.categoryId;
        const programMatch = !filters.programId || item.programId === filters.programId;

        return searchMatch && facilityMatch && storageLocationMatch && categoryMatch && programMatch;
    });
  }, [inventoryItems, facilities, storageLocations, itemMasters, categories, programs, searchTerm, filters, physicalCounts, fundSources]);
  

  const { sortedItems, requestSort, sortConfig } = useSort(filteredAugmentedItems, { key: 'master.name', direction: 'ascending' });

  useEffect(() => setCurrentPage(1), [searchTerm, filters, itemsPerPage, sortConfig]);

  const paginatedItems = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startItemIndex = (currentPage - 1) * itemsPerPage;
  const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      if (name === 'facilityId') newFilters.storageLocationId = '';
      return newFilters;
    });
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Brand', 'Program', 'Location', 'Quantity', 'Unit', 'ExpiryDate', 'BatchNumber'];
    const csvRows = [
        headers.join(','),
        ...sortedItems.map(item => {
            const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
            return [
                escape(item.master?.name),
                escape(item.categoryName),
                escape(item.master?.brand),
                escape(item.programName),
                escape(item.locationName),
                item.quantity,
                escape(item.master?.unit),
                item.expiryDate ? escape(new Date(item.expiryDate).toLocaleDateString()) : 'N/A',
                escape(item.batchNumber)
            ].join(',');
        })
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consignment_inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    navigate('/print/inventory', {
        state: {
            items: sortedItems.map(item => ({...item, totalValue: 0})),
            itemType: 'Consignment',
            filterCriteria: { ...filters, searchTerm },
            generatedDate: new Date().toISOString()
        }
    });
  };
  
  const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
  
  const availableStorageLocationOptions = useMemo(() => {
    const targetFacilityId = filters.facilityId;
    if (!targetFacilityId) return [];
    const locationsForFacility = storageLocations.filter(sl => sl.facilityId === targetFacilityId);
    return buildIndentedLocationOptions(locationsForFacility);
  }, [filters.facilityId, storageLocations]);

  return (
    <div>
        <ManagementPageHeader
            title="Consignment Stock"
            onPrint={handlePrint}
            onExport={canExport ? exportToCSV : undefined}
            onImport={canModify ? () => navigate('/consignment/receiving') : undefined}
            onAddNew={canModify ? () => navigate('/consignment/receiving') : undefined}
            addNewText="Receive Consignment Stock"
        />

      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <Input 
            placeholder="Search by name or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Select name="programId" value={filters.programId} onChange={handleFilterChange}>
                <option value="">All Programs</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
          </div>
        </div>
      </Card>
      
      <Card footer={
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
        <InventoryTable 
            items={paginatedItems}
            requestSort={key => requestSort(key)}
            sortConfig={sortConfig}
            onEdit={() => alert("Consignment items cannot be edited directly. Please use transaction modules.")}
            onAdjust={handleOpenAdjustModal}
            onPurge={handlePurgeItem}
        />
      </Card>

      {isAdjustModalOpen && itemToAdjust && (
        <AdjustStockModal
            isOpen={isAdjustModalOpen}
            onClose={() => setIsAdjustModalOpen(false)}
            onSave={handleSaveAdjustment}
            item={itemToAdjust}
        />
      )}
    </div>
  );
};

export default ConsignmentInventory;
