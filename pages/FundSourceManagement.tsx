import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { FundSource } from '../types';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const FundSourceManagement: React.FC = () => {
    const { data } = useDatabase();
    const { user } = useAuth();
    const { fundSources, inventoryItems, assetItems } = data;
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingFundSource, setEditingFundSource] = useState<FundSource | null>(null);
    const [fundSourceToDelete, setFundSourceToDelete] = useState<FundSource | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    
    const augmentedItems = useMemo(() => {
        return fundSources.map(source => ({
            ...source,
            itemsInUse: inventoryItems.filter(item => item.fundSourceId === source.id).length + assetItems.filter(item => item.fundSourceId === source.id).length
        }));
    }, [fundSources, inventoryItems, assetItems]);

    const filteredItems = useMemo(() => {
        return augmentedItems.filter(item => {
            const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
            return searchMatch;
        });
    }, [augmentedItems, searchTerm]);
    
    const { sortedItems, requestSort, sortConfig } = useSort(filteredItems, { key: 'name', direction: 'ascending' });

    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);

    const openAddModal = () => { setEditingFundSource(null); setIsModalOpen(true); };
    const openEditModal = (source: FundSource) => { setEditingFundSource(source); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingFundSource(null); };
    const openDeleteModal = (source: FundSource) => { setFundSourceToDelete(source); setIsDeleteModalOpen(true); };
    
    const handleSaveFundSource = async (sourceData: Partial<FundSource>) => {
        if (!user || !sourceData.name?.trim()) {
            alert('Fund source name cannot be empty.');
            return;
        }

        if (editingFundSource) {
            await db.ref(`fundSources/${editingFundSource.id}`).update({ name: sourceData.name! });
            await logAuditEvent(user, 'Fund Source Update', { fundSourceName: sourceData.name });
        } else {
            const newRef = db.ref('fundSources').push();
            const newData: Omit<FundSource, 'id'> = { name: sourceData.name! };
            await newRef.set(newData);
            await logAuditEvent(user, 'Fund Source Create', { fundSourceName: newData.name });
        }
        closeModal();
    };
    
    const confirmDeleteFundSource = async () => {
        if (!fundSourceToDelete || !user) return;
        const isSourceInUse = inventoryItems.some(item => item.fundSourceId === fundSourceToDelete.id) || assetItems.some(item => item.fundSourceId === fundSourceToDelete.id);
        if (isSourceInUse) {
            alert("Cannot delete this fund source because it is linked to inventory or asset items.");
            setIsDeleteModalOpen(false);
            setFundSourceToDelete(null);
            return;
        }
        await db.ref(`fundSources/${fundSourceToDelete.id}`).remove();
        await logAuditEvent(user, 'Fund Source Delete', { fundSourceName: fundSourceToDelete.name });
        setIsDeleteModalOpen(false);
        setFundSourceToDelete(null);
    };

    const exportToCSV = () => {
        const headers = ['name'];
        const csvRows = [headers.join(','), ...sortedItems.map(item => `"${item.name}"`)];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fund_sources.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        navigate('/print/fund-sources', {
            state: {
                items: sortedItems,
                filterCriteria: { searchTerm },
                generatedDate: new Date().toISOString()
            }
        });
    };

    return (
        <div>
            <ManagementPageHeader
                title="Fund Source Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onAddNew={openAddModal}
                addNewText="Add New Fund Source"
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
                        placeholder="Search by fund source name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig} isSticky>Fund Source Name</SortableHeader>
                                <SortableHeader sortKey="itemsInUse" requestSort={requestSort} sortConfig={sortConfig}>Items In Use</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((source, index) => {
                                const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50';
                                return (
                                <tr key={source.id} className={`${rowBgClass} hover:bg-primary-50`}>
                                    <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 shadow-md z-10 ${rowBgClass}`}>{source.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{source.itemsInUse}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(source)} aria-label={`Edit ${source.name}`}><EditIcon /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(source)} disabled={source.itemsInUse > 0} title={source.itemsInUse > 0 ? "Cannot delete: Fund source is in use." : "Delete Fund Source"}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {paginatedItems.length === 0 && (
                        <div className="text-center p-8 text-secondary-500">
                            No fund sources match the current filters.
                        </div>
                    )}
                </div>
            </Card>

            <FundSourceFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveFundSource}
                source={editingFundSource}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteFundSource}
                itemName={fundSourceToDelete?.name || ''}
                itemType="fund source"
            />
        </div>
    );
};

interface FundSourceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (source: Partial<FundSource>) => void;
    source: FundSource | null;
}

const FundSourceFormModal: React.FC<FundSourceFormModalProps> = ({ isOpen, onClose, onSave, source }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(source?.name || '');
        }
    }, [isOpen, source]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={source ? 'Edit Fund Source' : 'Add New Fund Source'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{source ? 'Save Changes' : 'Add Fund Source'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Fund Source Name"
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

export default FundSourceManagement;