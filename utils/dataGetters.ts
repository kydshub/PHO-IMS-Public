import { User, Facility, Supplier, ItemMaster, InventoryItem, Program, Category } from '../types';

export const getUserName = (users: User[], userId: string | undefined): string => {
    if (!userId) return 'N/A';
    return users.find(u => u.uid === userId)?.name || 'Unknown User';
};

export const getFacilityName = (facilities: Facility[], facilityId: string | undefined): string => {
    if (!facilityId) return 'N/A';
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown Facility';
};

export const getSupplierName = (suppliers: Supplier[], supplierId: string | undefined): string => {
    if (!supplierId) return 'N/A';
    return suppliers.find(s => s.id === supplierId)?.name || 'Unknown Supplier';
};

export const getItemDetails = (inventoryItems: InventoryItem[], itemMasters: ItemMaster[], inventoryItemId: string): { item?: InventoryItem, master?: ItemMaster } => {
    const item = inventoryItems.find(i => i.id === inventoryItemId);
    const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
    return { item, master };
};

export const getItemMasterName = (itemMasters: ItemMaster[], itemMasterId: string | undefined): string => {
    if (!itemMasterId) return 'N/A';
    return itemMasters.find(im => im.id === itemMasterId)?.name || 'Unknown Item';
};

export const getCategoryName = (categories: Category[], categoryId: string | undefined): string => {
    if (!categoryId) return 'N/A';
    return categories.find(c => c.id === categoryId)?.name || 'Unknown Category';
};

export const getProgramName = (programs: Program[], programId: string | undefined): string => {
    if (!programId) return 'N/A';
    return programs.find(p => p.id === programId)?.name || 'Unknown Program';
};
