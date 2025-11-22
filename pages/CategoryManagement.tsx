

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { Category, ItemMaster, Role, ItemType } from '../types';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import CategoryImportModal from '../components/ui/CategoryImportModal';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';
import { downloadStringAsFile } from '../../utils/download';


// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const CategoryManagement: React.FC = () => {
    const { data } = useDatabase();
    const { user } = useAuth();
    const { categories, itemMasters } = data;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const canImport = user?.role === Role.Admin || user?.role === Role.SystemAdministrator;
    
    const augmentedItems = useMemo(() => {
        return categories.map(category => {
            const itemsInCategory = itemMasters.filter(item => item.categoryId === category.id);
            const commodityCount = itemsInCategory.filter(item => item.itemType === ItemType.Consumable || item.itemType === ItemType.Equipment).length;
            const assetCount = itemsInCategory.filter(item => item.itemType === ItemType.Asset).length;
            return {
                ...category,
                itemsInUse: itemsInCategory.length,
                commodityCount,
                assetCount,
            };
        });
    }, [categories, itemMasters]);

    const filteredItems = useMemo(() => {
        return augmentedItems
            .filter(item => {
                const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
                return searchMatch;
            });
    }, [augmentedItems, searchTerm]);
    
    const { sortedItems, requestSort, sortConfig } = useSort(filteredItems, { key: 'name', direction: 'ascending' });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);

    const openAddModal = () => { setEditingCategory(null); setIsModalOpen(true); };
    const openEditModal = (category: Category) => { setEditingCategory(category); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingCategory(null); };
    const openDeleteModal = (category: Category) => { setCategoryToDelete(category); setIsDeleteModalOpen(true); };
    
    const handleSaveCategory = async (categoryData: Partial<Category>) => {
        if (!user || !categoryData.name?.trim()) {
            alert('Category name cannot be empty.');
            return;
        }

        if (editingCategory) {
            await db.ref(`categories/${editingCategory.id}`).update({ name: categoryData.name! });
            await logAuditEvent(user, 'Category Update', { categoryName: categoryData.name });
        } else {
            const newCategoryRef = db.ref('categories').push();
            const newCategory: Omit<Category, 'id'> = { name: categoryData.name! };
            await newCategoryRef.set(newCategory);
            await logAuditEvent(user, 'Category Create', { categoryName: newCategory.name });
        }
        closeModal();
    };
    
    const confirmDeleteCategory = async () => {
        if (!categoryToDelete || !user) return;
        const isCategoryInUse = itemMasters.some(item => item.categoryId === categoryToDelete.id);
        if (isCategoryInUse) {
            alert("Cannot delete this category because it is currently in use by items.");
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
            return;
        }
        await db.ref(`categories/${categoryToDelete.id}`).remove();
        await logAuditEvent(user, 'Category Delete', { categoryName: categoryToDelete.name });
        setIsDeleteModalOpen(false);
        setCategoryToDelete(null);
    };

    const handleImport = async (newItems: Omit<Category, 'id'>[]) => {
        if (!user || !newItems || newItems.length === 0) return;
        try {
            const updates: Record<string, any> = {};
            newItems.forEach(item => {
                const newCategoryRefKey = db.ref('categories').push().key;
                updates[`/categories/${newCategoryRefKey}`] = item;
            });
            await db.ref().update(updates);
            await logAuditEvent(user, 'Bulk Import: Categories', { count: newItems.length });
            alert(`${newItems.length} categories imported successfully!`);
            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Error importing categories:", error);
            alert("An error occurred during import.");
        }
    };
    
    const exportToCSV = () => {
        const headers = ['name'];
        const csvRows = [headers.join(','), ...sortedItems.map(item => `"${item.name}"`)];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'categories.csv', 'text/csv;charset=utf-8;');
    };

    const handlePrint = () => {
        const params = new URLSearchParams();
        if (searchTerm) params.set('searchTerm', searchTerm);
        
        window.open(`#/print/categories?${params.toString()}`, '_blank');
    };

    return (
        <div>
            <ManagementPageHeader
                title="Category Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
                onAddNew={openAddModal}
                addNewText="Add New Category"
            />
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
                <div className="p-4 border-b">
                     <Input 
                        placeholder="Search by category name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
                                <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig} isSticky>Category Name</SortableHeader>
                                <SortableHeader sortKey="itemsInUse" requestSort={requestSort} sortConfig={sortConfig}>Items In Use</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((category, index) => {
                                const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50';
                                return (
                                <tr key={category.id} className={`${rowBgClass} hover:bg-primary-50`}>
                                    <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 shadow-md z-10 ${rowBgClass}`}>{category.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {category.commodityCount > 0 && 
                                                <Link to="/inventory/commodities" state={{ preselectedCategoryId: category.id }} className="text-primary-600 hover:underline">
                                                   {category.commodityCount} {category.commodityCount > 1 ? 'commodities' : 'commodity'}
                                                </Link>
                                            }
                                            {category.assetCount > 0 && 
                                                <Link to="/inventory/ppe" state={{ preselectedCategoryId: category.id }} className="text-primary-600 hover:underline">
                                                    {category.assetCount} {category.assetCount > 1 ? 'Assets' : 'Asset'}
                                                </Link>
                                            }
                                            {category.itemsInUse === 0 && '0'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(category)} aria-label={`Edit ${category.name}`}><EditIcon /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(category)} aria-label={`Delete ${category.name}`}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {paginatedItems.length === 0 && (
                        <div className="text-center p-8 text-secondary-500">
                            No categories match the current filters.
                        </div>
                    )}
                </div>
            </Card>

            <CategoryFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveCategory}
                category={editingCategory}
            />
            <CategoryImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteCategory}
                itemName={categoryToDelete?.name || ''}
                itemType="category"
            />
        </div>
    );
};

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Partial<Category>) => void;
    category: Category | null;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSave, category }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(category?.name || '');
        }
    }, [isOpen, category]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={category ? 'Edit Category' : 'Add New Category'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{category ? 'Save Changes' : 'Add Category'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Category Name"
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                />
            </form>
        </Modal>
    );
};

export default CategoryManagement;