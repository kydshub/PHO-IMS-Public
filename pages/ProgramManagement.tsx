import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { Program, Role } from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import ProgramImportModal from '../components/ui/ProgramImportModal';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';

// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const ProgramManagement: React.FC = () => {
    const { data } = useDatabase();
    const { user } = useAuth();
    const { programs, inventoryItems } = data;
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [programToDelete, setProgramToDelete] = useState<Program | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const canImport = user?.role === Role.Admin || user?.role === Role.SystemAdministrator;

    const augmentedItems = useMemo(() => {
        return programs.map(program => ({
            ...program,
            itemsInUse: inventoryItems.filter(item => item.programId === program.id).length
        }));
    }, [programs, inventoryItems]);

    const filteredItems = useMemo(() => {
        return augmentedItems
            .filter(item => {
                const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.programManagerName.toLowerCase().includes(searchTerm.toLowerCase());
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

    const openAddModal = () => { setEditingProgram(null); setIsModalOpen(true); };
    const openEditModal = (program: Program) => { setEditingProgram(program); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingProgram(null); };
    const openDeleteModal = (program: Program) => { setProgramToDelete(program); setIsDeleteModalOpen(true); };
    
    const handleSaveProgram = async (programData: Partial<Program>) => {
        if (!user || !programData.name?.trim() || !programData.programManagerName?.trim()) {
            alert('Program name and manager name are required.');
            return;
        }

        if (editingProgram) {
            await db.ref(`programs/${editingProgram.id}`).update(programData);
            await logAuditEvent(user, 'Program Update', { programName: programData.name });
        } else {
            const newProgram: Omit<Program, 'id'> = {
                name: programData.name!,
                programManagerName: programData.programManagerName!,
                programManagerEmail: programData.programManagerEmail || '',
                programManagerContact: programData.programManagerContact || '',
            };
            await db.ref('programs').push(newProgram);
            await logAuditEvent(user, 'Program Create', { programName: newProgram.name });
        }
        closeModal();
    };
    
    const confirmDeleteProgram = async () => {
        if (!programToDelete || !user) return;
        const isProgramInUse = inventoryItems.some(item => item.programId === programToDelete.id);
        if (isProgramInUse) {
            alert("Cannot delete this program because it is currently linked to inventory items.");
            setIsDeleteModalOpen(false);
            setProgramToDelete(null);
            return;
        }
        await db.ref(`programs/${programToDelete.id}`).remove();
        await logAuditEvent(user, 'Program Delete', { programName: programToDelete.name });
        setIsDeleteModalOpen(false);
        setProgramToDelete(null);
    };

    const handleImport = async (newItems: Omit<Program, 'id'>[]) => {
        if (!user || !newItems || newItems.length === 0) return;
        try {
            const updates: Record<string, any> = {};
            newItems.forEach(item => {
                const newProgramRef = db.ref('programs').push();
                updates[`/programs/${newProgramRef.key}`] = item;
            });
            await db.ref().update(updates);
            await logAuditEvent(user, 'Bulk Import: Programs', { count: newItems.length });
            alert(`${newItems.length} programs imported successfully!`);
            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Error importing programs:", error);
            alert("An error occurred during import.");
        }
    };
    
    const exportToCSV = () => {
        const headers = ['name', 'programManagerName', 'programManagerEmail', 'programManagerContact'];
        const csvRows = [
            headers.join(','),
            ...sortedItems.map(item => [
                `"${item.name}"`,
                `"${item.programManagerName}"`,
                `"${item.programManagerEmail}"`,
                `"${item.programManagerContact}"`
            ].join(','))
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'programs.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        navigate('/print/programs', {
            state: {
                items: sortedItems,
                filterCriteria: { searchTerm },
                generatedDate: new Date().toISOString(),
            }
        });
    };

    return (
        <div>
            <ManagementPageHeader
                title="Program Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
                onAddNew={openAddModal}
                addNewText="Add New Program"
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
                        placeholder="Search by program or manager name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
                                <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig} isSticky>Program Name</SortableHeader>
                                <SortableHeader sortKey="programManagerName" requestSort={requestSort} sortConfig={sortConfig}>Program Manager</SortableHeader>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Contact Details</th>
                                <SortableHeader sortKey="itemsInUse" requestSort={requestSort} sortConfig={sortConfig}>Items In Use</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((program, index) => {
                                const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50';
                                return (
                                <tr key={program.id} className={`${rowBgClass} hover:bg-primary-50`}>
                                    <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 shadow-md z-10 ${rowBgClass}`}>{program.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{program.programManagerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                        <div>{program.programManagerEmail}</div>
                                        <div className="text-xs">{program.programManagerContact}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{program.itemsInUse}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(program)} aria-label={`Edit ${program.name}`}><EditIcon /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(program)} aria-label={`Delete ${program.name}`}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {paginatedItems.length === 0 && (
                        <div className="text-center p-8 text-secondary-500">
                            No programs match the current filters.
                        </div>
                    )}
                </div>
            </Card>

            <ProgramFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveProgram}
                program={editingProgram}
            />
            <ProgramImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteProgram}
                itemName={programToDelete?.name || ''}
                itemType="program"
            />
        </div>
    );
};

interface ProgramFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (program: Partial<Program>) => void;
    program: Program | null;
}

const ProgramFormModal: React.FC<ProgramFormModalProps> = ({ isOpen, onClose, onSave, program }) => {
    const [formData, setFormData] = useState<Partial<Program>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(program ? { ...program } : { name: '', programManagerName: '', programManagerEmail: '', programManagerContact: '' });
        }
    }, [isOpen, program]);

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
            title={program ? 'Edit Program' : 'Add New Program'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{program ? 'Save Changes' : 'Add Program'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Program Name" name="name" type="text" value={formData.name || ''} onChange={handleChange} required autoFocus />
                <Input label="Program Manager Name" name="programManagerName" type="text" value={formData.programManagerName || ''} onChange={handleChange} required />
                <Input label="Manager Email" name="programManagerEmail" type="email" value={formData.programManagerEmail || ''} onChange={handleChange} />
                <Input label="Manager Contact" name="programManagerContact" type="tel" value={formData.programManagerContact || ''} onChange={handleChange} />
            </form>
        </Modal>
    );
};

export default ProgramManagement;