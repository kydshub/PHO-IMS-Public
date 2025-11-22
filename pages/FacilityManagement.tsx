import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { Facility, FacilityStatus, UserStatus, StorageLocation, InventoryItem, Role, User } from '../types';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import FacilityImportModal from '../components/ui/FacilityImportModal';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { DeactivateFacilityModal } from '../components/ui/DeactivateFacilityModal';
import { ActivateFacilityModal } from '../components/ui/ActivateFacilityModal';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';
import { downloadStringAsFile } from '../../utils/download';


// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const DeactivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;
const ActivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>;

type AugmentedFacility = Facility & {
  userCount: number;
  stockLocationsCount: number;
};

const FacilityManagement: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { facilities, users, storageLocations, inventoryItems } = data;
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
    
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
    const [facilityToModify, setFacilityToModify] = useState<Facility | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const canImport = user?.role === Role.Admin || user?.role === Role.SystemAdministrator;

    const augmentedFacilities = useMemo(() => {
        return facilities.map(facility => ({
            ...facility,
            userCount: users.filter(user => user.facilityId === facility.id).length,
            stockLocationsCount: storageLocations.filter(loc => loc.facilityId === facility.id).length
        }));
    }, [facilities, users, storageLocations]);

    const filteredItems = useMemo(() => {
        return augmentedFacilities
            .filter(item => {
                const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.location.toLowerCase().includes(searchTerm.toLowerCase());
                const statusMatch = !statusFilter || item.status === statusFilter;
                return searchMatch && statusMatch;
            });
    }, [augmentedFacilities, searchTerm, statusFilter]);
    
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

    const openAddModal = () => { setEditingFacility(null); setIsModalOpen(true); };
    const openEditModal = (facility: Facility) => { setEditingFacility(facility); setIsModalOpen(true); };
    
    const openDeleteModal = (facility: Facility) => { setFacilityToModify(facility); setIsDeleteModalOpen(true); };
    const openDeactivateModal = (facility: Facility) => { setFacilityToModify(facility); setIsDeactivateModalOpen(true); };
    const openActivateModal = (facility: Facility) => { setFacilityToModify(facility); setIsActivateModalOpen(true); };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingFacility(null);
    };

    const handleSaveFacility = async (facilityData: Partial<Facility>) => {
        if (!user || !facilityData.name?.trim() || !facilityData.location?.trim()) {
            alert('Facility name and location cannot be empty.');
            return;
        }

        if (editingFacility) {
            await db.ref(`facilities/${editingFacility.id}`).update({ name: facilityData.name!, location: facilityData.location! });
            await logAuditEvent(user, 'Facility Update', { facilityName: facilityData.name });
        } else {
            const newFacilityRef = db.ref('facilities').push();
            const newFacility: Omit<Facility, 'id'> = {
                name: facilityData.name!,
                location: facilityData.location!,
                status: FacilityStatus.Active,
            };
            await newFacilityRef.set(newFacility);
            await logAuditEvent(user, 'Facility Create', { facilityName: newFacility.name });
        }
        closeModal();
    };
    
    const confirmDeleteFacility = async () => {
        if (!facilityToModify || !user) return;
        const hasUsers = users.some(u => u.facilityId === facilityToModify.id);
        const hasLocations = storageLocations.some(l => l.facilityId === facilityToModify.id);
        if (hasUsers || hasLocations) {
            alert("Cannot delete this facility because it has users or storage locations assigned to it. Please reassign them first.");
            setIsDeleteModalOpen(false);
            setFacilityToModify(null);
            return;
        }
        await db.ref(`facilities/${facilityToModify.id}`).remove();
        await logAuditEvent(user, 'Facility Delete', { facilityName: facilityToModify.name });
        setIsDeleteModalOpen(false);
        setFacilityToModify(null);
    };

    const handleImport = async (newItems: Omit<Facility, 'id'>[]) => {
        if (!user || !newItems || newItems.length === 0) return;
        try {
            const updates: Record<string, any> = {};
            newItems.forEach(item => {
                const newRef = db.ref('facilities').push();
                updates[`/facilities/${newRef.key}`] = item;
            });
            await db.ref().update(updates);
            await logAuditEvent(user, 'Bulk Import: Facilities', { count: newItems.length });
            alert(`${newItems.length} facilities imported successfully!`);
            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Error importing facilities:", error);
            alert("An error occurred during import.");
        }
    };
    
    const exportToCSV = () => {
        const headers = ['name', 'location', 'status', 'userCount', 'stockLocationsCount'];
        
        const escapeCsv = (str: any) => {
            if (str === undefined || str === null) return '""';
            const string = String(str);
            if (string.includes('"') || string.includes(',') || string.includes('\n')) {
                return `"${string.replace(/"/g, '""')}"`;
            }
            return `"${string}"`;
        };

        const csvRows = [
            headers.join(','),
            ...sortedItems.map(facility => [
                escapeCsv(facility.name),
                escapeCsv(facility.location),
                escapeCsv(facility.status),
                facility.userCount,
                facility.stockLocationsCount
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'facilities.csv', 'text/csv;charset=utf-8;');
    };

    const handlePrint = () => {
        const params = new URLSearchParams();
        if (searchTerm) params.set('searchTerm', searchTerm);
        if (statusFilter) params.set('status', statusFilter);
        
        window.open(`/#/print/facilities?${params.toString()}`, '_blank');
    };

    const confirmDeactivateFacility = async () => {
        if (!facilityToModify || !user) return;
        const updates: any = {};
        updates[`/facilities/${facilityToModify.id}`] = {
            // FIX: Correctly reference 'facilityToModify' instead of the non-existent 'facilityTo'.
            ...facilityToModify,
            status: FacilityStatus.Inactive,
        };
        
        users.forEach(u => {
            if (u.facilityId === facilityToModify.id && u.role !== Role.SystemAdministrator) {
                updates[`/users/${u.uid}/status`] = UserStatus.Suspended;
                updates[`/users/${u.uid}/previousRole`] = u.role;
            }
        });

        await db.ref().update(updates);
        await logAuditEvent(user, 'Facility Deactivate', { facilityName: facilityToModify.name });
        setIsDeactivateModalOpen(false);
        setFacilityToModify(null);
    };
    
    const confirmActivateFacility = async () => {
        if (!facilityToModify || !user) return;
        const updates: any = {};
        updates[`/facilities/${facilityToModify.id}/status`] = FacilityStatus.Active;

        users.forEach(u => {
            if (u.facilityId === facilityToModify.id && u.previousRole) {
                updates[`/users/${u.uid}/status`] = UserStatus.Active;
                updates[`/users/${u.uid}/previousRole`] = null;
            } else if (u.facilityId === facilityToModify.id && u.status === UserStatus.Suspended) {
                 updates[`/users/${u.uid}/status`] = UserStatus.Active;
            }
        });

        await db.ref().update(updates);
        await logAuditEvent(user, 'Facility Activate', { facilityName: facilityToModify.name });
        setIsActivateModalOpen(false);
        setFacilityToModify(null);
    };

    return (
        <div>
            <ManagementPageHeader
                title="Facility Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
                onAddNew={openAddModal}
                addNewText="Add New Facility"
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
                        placeholder="Search by name or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All Statuses</option>
                        {Object.values(FacilityStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig}>Facility Name</SortableHeader>
                                <SortableHeader sortKey="location" requestSort={requestSort} sortConfig={sortConfig}>Location</SortableHeader>
                                <SortableHeader sortKey="status" requestSort={requestSort} sortConfig={sortConfig}>Status</SortableHeader>
                                <SortableHeader sortKey="userCount" requestSort={requestSort} sortConfig={sortConfig}>Users</SortableHeader>
                                <SortableHeader sortKey="stockLocationsCount" requestSort={requestSort} sortConfig={sortConfig}>Storage Locations</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((facility) => (
                                <tr key={facility.id} className="hover:bg-secondary-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{facility.name}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-secondary-500">{facility.location}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${facility.status === FacilityStatus.Active ? 'bg-green-100 text-green-800' : 'bg-secondary-200 text-secondary-800'}`}>
                                            {facility.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{facility.userCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{facility.stockLocationsCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/facilities/${facility.id}/locations`)} title="Manage Storage Locations"><LocationIcon /></Button>
                                        {facility.status === FacilityStatus.Active ? (
                                            <Button variant="ghost" size="sm" onClick={() => openDeactivateModal(facility)} title="Deactivate Facility"><DeactivateIcon /></Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => openActivateModal(facility)} title="Activate Facility"><ActivateIcon /></Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(facility)} title="Edit Facility"><EditIcon /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(facility)} title="Delete Facility"><TrashIcon /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {paginatedItems.length === 0 && (
                        <div className="text-center p-8 text-secondary-500">
                            No facilities match the current filters.
                        </div>
                    )}
                </div>
            </Card>

            <FacilityFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveFacility}
                facility={editingFacility}
            />
            <FacilityImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteFacility}
                itemName={facilityToModify?.name || ''}
                itemType="facility"
            />
            <DeactivateFacilityModal
                isOpen={isDeactivateModalOpen}
                onClose={() => setIsDeactivateModalOpen(false)}
                onConfirm={confirmDeactivateFacility}
                facility={facilityToModify}
            />
            <ActivateFacilityModal
                isOpen={isActivateModalOpen}
                onClose={() => setIsActivateModalOpen(false)}
                onConfirm={confirmActivateFacility}
                facility={facilityToModify}
            />
        </div>
    );
};

interface FacilityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (facilityData: Partial<Facility>) => void;
    facility: Facility | null;
}

const FacilityFormModal: React.FC<FacilityFormModalProps> = ({ isOpen, onClose, onSave, facility }) => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(facility?.name || '');
            setLocation(facility?.location || '');
        }
    }, [isOpen, facility]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, location });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={facility ? 'Edit Facility' : 'Add New Facility'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{facility ? 'Save Changes' : 'Add Facility'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Facility Name"
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                />
                <Input 
                    label="Location / Address"
                    id="location"
                    name="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                />
            </form>
        </Modal>
    );
};

export default FacilityManagement;