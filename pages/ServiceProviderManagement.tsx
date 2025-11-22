import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { ServiceProvider, ServiceProviderStatus, ServiceType, Role } from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import ServiceProviderImportModal from '../components/ui/ServiceProviderImportModal';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { logAuditEvent } from '../services/audit';

// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const DeactivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;
const ActivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

const ServiceProviderManagement: React.FC = () => {
    const { data } = useDatabase();
    const { user } = useAuth();
    const { serviceProviders } = data;
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingServiceProvider, setEditingServiceProvider] = useState<ServiceProvider | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<ServiceProvider | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const canImport = user?.role === Role.Admin || user?.role === Role.SystemAdministrator;

    const filteredItems = useMemo(() => {
        return serviceProviders
            .filter(item => {
                const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
                const statusMatch = !statusFilter || item.status === statusFilter;
                const serviceTypeMatch = !serviceTypeFilter || item.serviceType === serviceTypeFilter;
                return searchMatch && statusMatch && serviceTypeMatch;
            });
    }, [serviceProviders, searchTerm, statusFilter, serviceTypeFilter]);
    
    const { sortedItems, requestSort, sortConfig } = useSort(filteredItems, { key: 'name', direction: 'ascending' });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, serviceTypeFilter, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);

    const openAddModal = () => {
        setEditingServiceProvider(null);
        setIsModalOpen(true);
    };

    const openEditModal = (provider: ServiceProvider) => {
        setEditingServiceProvider(provider);
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingServiceProvider(null);
    };

    const openDeleteModal = (provider: ServiceProvider) => {
        setProviderToDelete(provider);
        setIsDeleteModalOpen(true);
    };

    const handleSaveServiceProvider = async (providerData: Partial<ServiceProvider>) => {
        if (!user || !providerData.name?.trim() || !providerData.serviceType) {
            alert('Provider name and service type are required.');
            return;
        }

        if (editingServiceProvider) {
            await db.ref(`serviceProviders/${providerData.id}`).update(providerData);
            await logAuditEvent(user, 'Service Provider Update', { providerName: providerData.name });
        } else {
            const newProvider: Omit<ServiceProvider, 'id'> = {
                name: providerData.name!,
                serviceType: providerData.serviceType!,
                contactPerson: providerData.contactPerson || '',
                email: providerData.email || '',
                phone: providerData.phone || '',
                status: ServiceProviderStatus.Active,
            };
            await db.ref('serviceProviders').push(newProvider);
            await logAuditEvent(user, 'Service Provider Create', { providerName: newProvider.name });
        }
        closeModal();
    };
    
    const confirmDeleteProvider = async () => {
        if (!providerToDelete || !user) return;
        // In a real app, you would check if this provider is linked to any service records.
        await db.ref(`serviceProviders/${providerToDelete.id}`).remove();
        await logAuditEvent(user, 'Service Provider Delete', { providerName: providerToDelete.name });
        setIsDeleteModalOpen(false);
        setProviderToDelete(null);
    };

    const handleToggleStatus = async (id: string) => {
        if (!user) return;
        const provider = serviceProviders.find(p => p.id === id);
        if (!provider) return;

        const action = provider.status === ServiceProviderStatus.Active ? 'deactivate' : 'activate';
        if (window.confirm(`Are you sure you want to ${action} this service provider?`)) {
            const newStatus = action === 'deactivate' ? ServiceProviderStatus.Inactive : ServiceProviderStatus.Active;
            await db.ref(`serviceProviders/${id}`).update({ status: newStatus });
            const eventName = newStatus === ServiceProviderStatus.Active ? 'Service Provider Activate' : 'Service Provider Deactivate';
            await logAuditEvent(user, eventName, { providerName: provider.name });
        }
    };

    const handleImport = async (newItems: Omit<ServiceProvider, 'id'>[]) => {
        if (!user || !newItems || newItems.length === 0) return;
        try {
            const updates: Record<string, any> = {};
            newItems.forEach(item => {
                const newItemRef = db.ref('serviceProviders').push();
                updates[`/serviceProviders/${newItemRef.key}`] = item;
            });
            await db.ref().update(updates);
            await logAuditEvent(user, 'Bulk Import: Service Providers', { count: newItems.length });
            alert(`${newItems.length} service providers imported successfully!`);
            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Error importing service providers:", error);
            alert("An error occurred during import.");
        }
    };

    const exportToCSV = () => {
        const headers = ['name', 'serviceType', 'contactPerson', 'email', 'phone', 'status'];
        const csvRows = [
            headers.join(','),
            ...sortedItems.map(item => [
                `"${item.name}"`,
                `"${item.serviceType}"`,
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
        a.download = 'service_providers.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        navigate('/print/service-providers', {
            state: {
                items: sortedItems,
                filterCriteria: { searchTerm, status: statusFilter || 'All', serviceType: serviceTypeFilter || 'All' },
                generatedDate: new Date().toISOString(),
            }
        });
    };

    return (
        <div>
            <ManagementPageHeader
                title="Service Provider Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
                onAddNew={openAddModal}
                addNewText="Add New Provider"
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
                <div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                        placeholder="Search by name or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={serviceTypeFilter} onChange={(e) => setServiceTypeFilter(e.target.value)}>
                        <option value="">All Service Types</option>
                        {Object.values(ServiceType).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All Statuses</option>
                        {Object.values(ServiceProviderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
                                <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig} isSticky>Provider Name</SortableHeader>
                                <SortableHeader sortKey="serviceType" requestSort={requestSort} sortConfig={sortConfig}>Service Type</SortableHeader>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Contact Details</th>
                                <SortableHeader sortKey="status" requestSort={requestSort} sortConfig={sortConfig}>Status</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((provider, index) => {
                                 const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50';
                                 return (
                                <tr key={provider.id} className={`${rowBgClass} hover:bg-primary-50`}>
                                    <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 shadow-md z-10 ${rowBgClass}`}>{provider.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{provider.serviceType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                        {provider.contactPerson && <div>{provider.contactPerson}</div>}
                                        {provider.email && <div className="text-xs">{provider.email}</div>}
                                        {provider.phone && <div className="text-xs">{provider.phone}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${provider.status === ServiceProviderStatus.Active ? 'bg-green-100 text-green-800' : 'bg-secondary-200 text-secondary-800'}`}>
                                            {provider.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                         {provider.status === ServiceProviderStatus.Active ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(provider.id)} aria-label={`Deactivate ${provider.name}`} title="Deactivate Provider" className="text-yellow-600 hover:bg-yellow-100"><DeactivateIcon /></Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(provider.id)} aria-label={`Activate ${provider.name}`} title="Activate Provider" className="text-green-600 hover:bg-green-100"><ActivateIcon /></Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(provider)} aria-label={`Edit ${provider.name}`}><EditIcon /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(provider)} aria-label={`Delete ${provider.name}`}><TrashIcon /></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ServiceProviderFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveServiceProvider}
                provider={editingServiceProvider}
            />
            <ServiceProviderImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />
            <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteProvider}
                itemName={providerToDelete?.name || ''}
                itemType="service provider"
            />
        </div>
    );
};

interface ServiceProviderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (provider: Partial<ServiceProvider>) => void;
    provider: ServiceProvider | null;
}

const ServiceProviderFormModal: React.FC<ServiceProviderFormModalProps> = ({ isOpen, onClose, onSave, provider }) => {
    const [formData, setFormData] = useState<Partial<ServiceProvider>>({});

    React.useEffect(() => {
        if (isOpen) {
            setFormData(provider ? { ...provider } : { name: '', serviceType: undefined, contactPerson: '', email: '', phone: '', status: ServiceProviderStatus.Active });
        }
    }, [isOpen, provider]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            title={provider ? 'Edit Service Provider' : 'Add New Service Provider'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{provider ? 'Save Changes' : 'Add Provider'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Provider Name"
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name || ''}
                    onChange={handleChange}
                    required
                    autoFocus
                />
                 <Select
                    label="Service Type"
                    id="serviceType"
                    name="serviceType"
                    value={formData.serviceType || ''}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select a service type</option>
                    {Object.values(ServiceType).map(st => <option key={st} value={st}>{st}</option>)}
                </Select>
                <Input 
                    label="Contact Person"
                    id="contactPerson"
                    name="contactPerson"
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={handleChange}
                />
                <Input 
                    label="Email Address"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                />
                <Input 
                    label="Phone Number"
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

export default ServiceProviderManagement;
