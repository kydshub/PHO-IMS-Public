import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { ItemMaster, Category, ItemType, Role } from '../types';
import ItemImportModal from '../components/ui/ItemImportModal';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';
import { useInfoModal } from '../hooks/useInfoModal';
import { useConfirmation } from '../hooks/useConfirmation';


// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const AssetManagement: React.FC = () => {
    const { data } = useDatabase();
    const { user } = useAuth();
    const { itemMasters, inventoryItems, assetItems, categories } = data;
    const { showError } = useInfoModal();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
    const [itemToDelete, setItemToDelete] = useState<ItemMaster | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const canImport = user?.role === Role.Admin || user?.role === Role.SystemAdministrator;

    const stockCountMap = useMemo(() => {
        const map = new Map<string, number>();
        assetItems.forEach(asset => {
            const currentCount = map.get(asset.itemMasterId) || 0;
            map.set(asset.itemMasterId, currentCount + 1);
        });
        return map;
    }, [assetItems]);

    const augmentedItems = useMemo(() => {
        return itemMasters
            .filter(item => {
                // Temporarily allow legacy 'Asset' string to show up until they are all migrated upon edit.
                // Using `as any` to avoid potential TypeScript comparison errors with string literals.
                return item.itemType === ItemType.Asset || (item.itemType as any) === 'Asset';
            })
            .map(item => ({
                ...item,
                categoryName: categories.find(c => c.id === item.categoryId)?.name || 'N/A',
                stockCount: stockCountMap.get(item.id) || 0,
            }));
    }, [itemMasters, categories, stockCountMap]);


    const filteredItems = useMemo(() => {
        return augmentedItems
            .filter(item => {
                const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
                const categoryMatch = !selectedCategory || item.categoryId === selectedCategory;
                return searchMatch && categoryMatch;
            });
    }, [augmentedItems, searchTerm, selectedCategory]);

    const { sortedItems, requestSort, sortConfig } = useSort(filteredItems, { key: 'name', direction: 'ascending' });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);

    const openAddModal = () => { setEditingItem(null); setIsModalOpen(true); };
    const openEditModal = (item: ItemMaster) => { setEditingItem(item); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };
    const openDeleteModal = (item: ItemMaster) => { setItemToDelete(item); setIsDeleteModalOpen(true); };

    const handleSaveItem = async (itemData: Partial<ItemMaster>) => {
        if (!user || !itemData.name?.trim() || !itemData.unit?.trim() || !itemData.categoryId || itemData.unitCost === undefined) {
            alert('Please fill all required fields: Name, Category, Unit, and Unit Cost.');
            return;
        }

        const dataToSave: Omit<ItemMaster, 'id'> & { usefulLife?: number } = {
            name: itemData.name.trim(),
            description: itemData.description?.trim() || '',
            categoryId: itemData.categoryId,
            unit: itemData.unit.trim(),
            lowStockThreshold: 0, // Assets don't have a threshold, 0 satisfies DB rules
            itemType: ItemType.Asset,
            unitCost: Number(itemData.unitCost),
            brand: itemData.brand?.trim() || '',
            manufacturer: itemData.manufacturer?.trim() || '',
            barcode: itemData.barcode?.trim() || '',
            usefulLife: itemData.usefulLife ? Number(itemData.usefulLife) : undefined,
        };

        if (dataToSave.usefulLife && dataToSave.usefulLife <= 0) {
            delete dataToSave.usefulLife;
        }

        try {
            if (editingItem) {
                await db.ref(`itemMasters/${editingItem.id}`).update(dataToSave);
                await logAuditEvent(user, 'Item Master Update', { itemName: dataToSave.name });
            } else {
                const newItemRef = db.ref('itemMasters').push();
                await newItemRef.set(dataToSave);
                await logAuditEvent(user, 'Item Master Create', { itemName: dataToSave.name });
            }
            closeModal();
        } catch (error: any) {
            console.error("Failed to save asset type:", error);
            alert(`An error occurred: ${error.message}`);
        }
    };
    
    const confirmDeleteItem = async () => {
        if (!itemToDelete || !user) return;
        if (assetItems.some(item => item.itemMasterId === itemToDelete.id)) {
            alert("Cannot delete this asset type because it is currently in use in the asset inventory.");
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            return;
        }
        await db.ref(`itemMasters/${itemToDelete.id}`).remove();
        await logAuditEvent(user, 'Item Master Delete', { itemName: itemToDelete.name });
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };
    
    const handleImportItems = async (newItemsToImport: Omit<ItemMaster, 'id'>[]) => {
        if (!user || !newItemsToImport || newItemsToImport.length === 0) return;
        try {
            const updates: Record<string, any> = {};
            newItemsToImport.forEach(item => {
                if(item.itemType === ItemType.Asset) { // Only import assets on this page
                    const newItemRef = db.ref('itemMasters').push();
                    updates[`/itemMasters/${newItemRef.key}`] = item;
                }
            });
            await db.ref().update(updates);
            const importedCount = Object.keys(updates).length;
            await logAuditEvent(user, 'Bulk Import: PPE Types', { count: importedCount });
            alert(`${importedCount} assets imported successfully!`);
            setIsImportModalOpen(false);
        } catch (error: any) {
            console.error("Error importing assets:", error);
            alert("An error occurred during the import process.");
        }
    };
    
    const exportToCSV = () => {
        const headers = ['Name', 'Brand', 'Manufacturer', 'Barcode', 'Item Type', 'Category', 'Unit', 'Unit Cost', 'Current Stock'];
        const csvRows = [headers.join(','), ...sortedItems.map(item => `"${item.name}","${item.brand || ''}","${item.manufacturer || ''}","${item.barcode || ''}","${item.itemType}","${item.categoryName}",${item.unit},${item.unitCost},${item.stockCount}`)];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'asset_master_list.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const categoryName = selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'All';
        navigate('/print/item-master', { state: { items: sortedItems, filterCriteria: { searchTerm, category: categoryName, itemType: 'Asset' }, generatedDate: new Date().toISOString(), stockCounts: Object.fromEntries(sortedItems.map(item => [item.id, item.stockCount])) } });
    };

    return (
        <div>
            <ManagementPageHeader
                title="PPE Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
                onAddNew={openAddModal}
                addNewText="Add New PPE Type"
            />
            
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="Search by name, brand, etc..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </div>
            </Card>
            
            <Card footer={
                 <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredItems.length}
                    startItemIndex={startItemIndex}
                    endItemIndex={endItemIndex}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                 />
            }>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
                                <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig}>Asset Type Name</SortableHeader>
                                <SortableHeader sortKey="brand" requestSort={requestSort} sortConfig={sortConfig}>Brand</SortableHeader>
                                <SortableHeader sortKey="categoryName" requestSort={requestSort} sortConfig={sortConfig}>Category</SortableHeader>
                                <SortableHeader sortKey="stockCount" requestSort={requestSort} sortConfig={sortConfig}>In Stock</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((item, index) => (
                                <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50'} hover:bg-primary-50`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.brand || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.categoryName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{item.stockCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} aria-label={`Edit ${item.name}`}><EditIcon /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(item)} aria-label={`Delete ${item.name}`}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {paginatedItems.length === 0 && (
                        <div className="text-center p-8 text-secondary-500">
                            No asset types match the current filters.
                        </div>
                    )}
                </div>
            </Card>

            <AssetFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveItem}
                item={editingItem}
                categories={categories}
            />
             <ItemImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportItems}
                categories={categories}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteItem}
                itemName={itemToDelete?.name || ''}
                itemType="asset type"
            />
        </div>
    );
};


interface AssetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Partial<ItemMaster>) => void;
    item: ItemMaster | null;
    categories: Category[];
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({ isOpen, onClose, onSave, item, categories }) => {
    const [formData, setFormData] = useState<Partial<ItemMaster>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(item ? { ...item } : { name: '', categoryId: '', unit: 'unit', unitCost: 0, usefulLife: 5 });
        }
    }, [isOpen, item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'unitCost' || name === 'usefulLife') ? Number(value) : value 
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={item ? 'Edit PPE Type' : 'Add New PPE Type'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{item ? 'Save Changes' : 'Add PPE Type'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                 <Input 
                    label="Asset Name"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    required
                    autoFocus
                />
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Brand (Optional)"
                        name="brand"
                        value={formData.brand || ''}
                        onChange={handleChange}
                    />
                     <Input 
                        label="Manufacturer (Optional)"
                        name="manufacturer"
                        value={formData.manufacturer || ''}
                        onChange={handleChange}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Category"
                        name="categoryId"
                        value={formData.categoryId || ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select a category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                     <Input 
                        label="Unit"
                        name="unit"
                        placeholder="e.g., unit, set"
                        value={formData.unit || ''}
                        onChange={handleChange}
                        required
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Default Acquisition Cost (PHP)"
                        name="unitCost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.unitCost ?? ''}
                        onChange={handleChange}
                        required
                    />
                     <Input 
                        label="Default Useful Life (Years)"
                        name="usefulLife"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 5"
                        value={formData.usefulLife ?? ''}
                        onChange={handleChange}
                    />
                 </div>
                 <Input 
                    label="Barcode (Optional)"
                    name="barcode"
                    value={formData.barcode || ''}
                    onChange={handleChange}
                />
                 <Textarea
                    label="Description (Optional)"
                    name="description"
                    rows={3}
                    value={formData.description || ''}
                    onChange={handleChange}
                />
            </form>
        </Modal>
    );
};

export default AssetManagement;