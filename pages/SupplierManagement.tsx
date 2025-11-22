import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { Supplier, SupplierStatus, Role } from '../types';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import SupplierImportModal from '../components/ui/SupplierImportModal';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { logAuditEvent } from '../services/audit';

// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const DeactivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;
const ActivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

const SupplierManagement: React.FC = () => {
    const { data } = useDatabase();
    const { user } = useAuth();
    const { suppliers, inventoryItems } = data;
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const canImport = user?.role === Role.Admin || user?.role === Role.SystemAdministrator;

    const augmentedItems = useMemo(() => {
        return suppliers.map(supplier => ({
            ...supplier,
            itemsInUse: inventoryItems.filter(i => i.supplierId === supplier.id).length
        }));
    }, [suppliers, inventoryItems]);

    const filteredItems = useMemo(() => {
        return augmentedItems
            .filter(item => {
                const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
                const statusMatch = !statusFilter || item.status === statusFilter;
                return searchMatch && statusMatch;
            });
    }, [augmentedItems, searchTerm, statusFilter]);

    const { sortedItems, requestSort, sortConfig } = useSort(filteredItems, { key: 'name', direction: 'ascending' });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);

    const openAddModal = () => {
        setEditingSupplier(null);
        setIsModalOpen(true);
    };

    const openEditModal = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const openDeleteModal = (supplier: Supplier) => {
        setSupplierToDelete(supplier);
        setIsDeleteModalOpen(true);
    };

    const handleSaveSupplier = async (supplierData: Partial<Supplier>) => {
        if (!user || !supplierData.name || supplierData.name.trim() === '') {
            alert('Supplier name cannot be empty.');
            return;
        }

        if (editingSupplier) {
            await db.ref(`suppliers/${editingSupplier.id}`).update(supplierData);
            await logAuditEvent(user, 'Supplier Update', { supplierName: supplierData.name });
        } else {
            const newSupplier: Omit<Supplier, 'id'> = {
                name: supplierData.name,
                contactPerson: supplierData.contactPerson || '',
                email: supplierData.email || '',
                phone: supplierData.phone || '',
                status: SupplierStatus.Active,
            };
            await db.ref('suppliers').push(newSupplier);
            await logAuditEvent(user, 'Supplier Create', { supplierName: newSupplier.name });
        }
        closeModal();
    };
    
    const confirmDeleteSupplier = async () => {
        if (!supplierToDelete || !user) return;
        const isSupplierInUse = inventoryItems.some(item => item.supplierId === supplierToDelete.id);
        if (isSupplierInUse) {
            alert("Cannot delete this supplier because it is currently linked to inventory items.");
            setIsDeleteModalOpen(false);
            setSupplierToDelete(null);
            return;
        }

        await db.ref(`suppliers/${supplierToDelete.id}`).remove();
        await logAuditEvent(user, 'Supplier Delete', { supplierName: supplierToDelete.name });
        setIsDeleteModalOpen(false);
        setSupplierToDelete(null);
    };

    const handleToggleStatus = async (id: string) => {
        if (!user) return;
        const supplier = suppliers.find(s => s.id === id);
        if (!supplier) return;

        const action = supplier.status === SupplierStatus.Active ? 'deactivate' : 'activate';
        if (window.confirm(`Are you sure you want to ${action} this supplier?`)) {
            const newStatus = action === 'deactivate' ? SupplierStatus.Inactive : SupplierStatus.Active;
            await db.ref(`suppliers/${id}`).update({ status: newStatus });
            const eventName = newStatus === SupplierStatus.Active ? 'Supplier Activate' : 'Supplier Deactivate';
            await logAuditEvent(user, eventName, { supplierName: supplier.name });
        }
    };

    const handleImport = async (newItems: Omit<Supplier, 'id'>[]) => {
        if (!user || !newItems || newItems.length === 0) return;
        try {
            const updates: Record<string, any> = {};
            newItems.forEach(item => {
                const newItemRef = db.ref('suppliers').push();
                updates[`/suppliers/${newItemRef.key}`] = item;
            });
            await db.ref().update(updates);
            await logAuditEvent(user, 'Bulk Import: Suppliers', { count: newItems.length });
            alert(`${newItems.length} suppliers imported successfully!`);
            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Error importing suppliers:", error);
            alert("An error occurred during import.");
        }
    };

    const exportToCSV = () => {
        const headers = ['name', 'contactPerson', 'email', 'phone', 'status'];
        const csvRows = [
            headers.join(','),
            ...sortedItems.map(item => [
                `"${item.name}"`,
                `"${item.contactPerson || ''}"`,
                `"${item.email || ''}"`,
                `"${item.phone || ''}"`,
                item.status
            ].join(','))
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'suppliers.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        navigate('/print/suppliers', {
            state: {
                items: sortedItems,
                filterCriteria: { searchTerm, status: statusFilter || 'All' },
                generatedDate: new Date().toISOString(),
            }
        });
    };

    return (
        <div>
            <ManagementPageHeader
                title="Supplier Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
                onAddNew={openAddModal}
                addNewText="Add New Supplier"
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
                 <div className="p-4 border-b grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        placeholder="Search by name or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All Statuses</option>
                        {Object.values(SupplierStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
                                <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig} isSticky>Supplier Name</SortableHeader>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Contact Details</th>
                                <SortableHeader sortKey="status" requestSort={requestSort} sortConfig={sortConfig}>Status</SortableHeader>
                                <SortableHeader sortKey="itemsInUse" requestSort={requestSort} sortConfig={sortConfig}>Items In Use</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((supplier, index) => {
                                 const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50';
                                return (
                                <tr key={supplier.id} className={`${rowBgClass} hover:bg-primary-50`}>
                                    <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 shadow-md z-10 ${rowBgClass}`}>{supplier.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                        {supplier.contactPerson && <div>{supplier.contactPerson}</div>}
                                        {supplier.email && <div className="text-xs">{supplier.email}</div>}
                                        {supplier.phone && <div className="text-xs">{supplier.phone}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${supplier.status === SupplierStatus.Active ? 'bg-green-100 text-green-800' : 'bg-secondary-200 text-secondary-800'}`}>
                                            {supplier.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{supplier.itemsInUse}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                         {supplier.status === SupplierStatus.Active ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(supplier.id)} aria-label={`Deactivate ${supplier.name}`} title="Deactivate Supplier" className="text-yellow-600 hover:bg-yellow-100"><DeactivateIcon /></Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(supplier.id)} aria-label={`Activate ${supplier.name}`} title="Activate Supplier" className="text-green-600 hover:bg-green-100"><ActivateIcon /></Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(supplier)} aria-label={`Edit ${supplier.name}`}><EditIcon /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(supplier)} aria-label={`Delete ${supplier.name}`}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {paginatedItems.length === 0 && (
                        <div className="text-center p-8 text-secondary-500">
                            No suppliers match the current filters.
                        </div>
                    )}
                </div>
            </Card>

            <SupplierFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveSupplier}
                supplier={editingSupplier}
            />
            <SupplierImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />
            <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteSupplier}
                itemName={supplierToDelete?.name || ''}
                itemType="supplier"
            />
        </div>
    );
};

interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplierData: Partial<Supplier>) => void;
    supplier: Supplier | null;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, onSave, supplier }) => {
    const [formData, setFormData] = useState<Partial<Supplier>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(supplier ? { ...supplier } : { name: '', contactPerson: '', email: '', phone: '', status: SupplierStatus.Active });
        }
    }, [isOpen, supplier]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={supplier ? 'Edit Supplier' : 'Add New Supplier'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{supplier ? 'Save Changes' : 'Add Supplier'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Supplier Name"
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name || ''}
                    onChange={handleChange}
                    required
                    autoFocus
                />
                 <Input 
                    label="Contact Person (Optional)"
                    id="contactPerson"
                    name="contactPerson"
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={handleChange}
                />
                <Input 
                    label="Email Address (Optional)"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                />
                 <Input 
                    label="Phone Number (Optional)"
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={handleChange}
                />
            </form>
        </Modal>
    );
};

export default SupplierManagement;
