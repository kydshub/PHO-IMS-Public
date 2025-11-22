
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { useSort } from '../hooks/useSort';
import { PurchaseOrder, PurchaseOrderStatus, Role, Supplier, Facility, FacilityStatus } from '../types';
import { formatCurrency } from '../utils/formatters';
import { db } from '../services/firebase';
import { logAuditEvent } from '../services/audit';
import { PurgePOConfirmationModal } from '../components/ui/PurgePOConfirmationModal';
import { useInfoModal } from '../hooks/useInfoModal';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const PurchaseOrderManagement: React.FC = () => {
    const { data } = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { purchaseOrders, suppliers, facilities } = data;
    const { showError, showSuccess } = useInfoModal();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [poToDelete, setPOToDelete] = useState<PurchaseOrder | null>(null);
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
    const [poToPurge, setPOToPurge] = useState<PurchaseOrder | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEncoder = user?.role === Role.Encoder;
    const [filters, setFilters] = useState({
        searchTerm: '',
        facilityId: isEncoder ? user?.facilityId || '' : '',
        supplierId: '',
        status: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const augmentedPOs = useMemo(() => {
        return purchaseOrders.map(po => ({
            ...po,
            supplierName: suppliers.find(s => s.id === po.supplierId)?.name || 'N/A',
            facilityName: facilities.find(f => f.id === po.facilityId)?.name || 'N/A',
        }));
    }, [purchaseOrders, suppliers, facilities]);
    
    const filteredPOs = useMemo(() => {
        return augmentedPOs.filter(po => {
            const { searchTerm, facilityId, supplierId, status, startDate, endDate } = filters;
            const poDate = new Date(po.orderDate);
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            const searchMatch = !searchTerm || po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || po.controlNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const facilityMatch = !facilityId || po.facilityId === facilityId;
            const supplierMatch = !supplierId || po.supplierId === supplierId;
            const statusMatch = !status || po.status === status;
            const dateMatch = (!sDate || poDate >= sDate) && (!eDate || poDate <= eDate);

            return searchMatch && facilityMatch && supplierMatch && statusMatch && dateMatch;
        });
    }, [augmentedPOs, filters]);
    
    const { sortedItems, requestSort, sortConfig } = useSort(filteredPOs, { key: 'orderDate', direction: 'descending' });
    
    useEffect(() => setCurrentPage(1), [filters, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);
    
    const confirmDeletePO = async () => {
        if (!poToDelete || !user) return;
        setIsSubmitting(true);
        try {
            await db.ref(`purchaseOrders/${poToDelete.id}`).remove();
            await logAuditEvent(user, 'Purchase Order Delete', { poNumber: poToDelete.poNumber });
            showSuccess({ title: 'Success', message: 'Purchase Order deleted successfully.' });
        } catch (error: any) {
            console.error("Failed to delete PO:", error);
            showError({ title: 'Delete Failed', message: `An error occurred: ${error.message}` });
        } finally {
            setIsDeleteModalOpen(false);
            setPOToDelete(null);
            setIsSubmitting(false);
        }
    };

    const confirmPurgePO = async () => {
        if (!poToPurge || !user) return;
        setIsSubmitting(true);
        try {
            await db.ref(`purchaseOrders/${poToPurge.id}`).remove();
            await logAuditEvent(user, 'Purchase Order Purge', { poNumber: poToPurge.poNumber, controlNumber: poToPurge.controlNumber });
            showSuccess({ title: 'Success', message: 'Purchase Order purged successfully.' });
        } catch (error: any) {
            console.error("Failed to purge PO:", error);
            showError({ title: 'Purge Failed', message: `An error occurred: ${error.message}` });
        } finally {
            setIsPurgeModalOpen(false);
            setPOToPurge(null);
            setIsSubmitting(false);
        }
    };
    
    const getStatusColor = (status: PurchaseOrderStatus) => {
        switch (status) {
            case PurchaseOrderStatus.Pending: return 'bg-yellow-100 text-yellow-800';
            case PurchaseOrderStatus.PartiallyReceived: return 'bg-blue-100 text-blue-800';
            case PurchaseOrderStatus.Completed: return 'bg-green-100 text-green-800';
            case PurchaseOrderStatus.Cancelled: return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
        setFilters(prev => ({ ...prev, [name]: date }));
    };

    return (
        <div>
            <ManagementPageHeader
                title="Purchase Orders"
                onPrint={() => navigate(`/print/po-history`)}
                onAddNew={() => navigate('/purchase-orders/new')}
                addNewText="Add New Purchase Order"
            />
            
            <Card footer={<TablePagination currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={sortedItems.length} startItemIndex={startItemIndex} endItemIndex={endItemIndex} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />}>
                <div className="p-4 border-b grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Input name="searchTerm" placeholder="Search PO # or Control #" value={filters.searchTerm} onChange={handleFilterChange} />
                    <Select name="facilityId" value={filters.facilityId} onChange={handleFilterChange} disabled={isEncoder}>
                        {!isEncoder && <option value="">All Facilities</option>}
                        {facilities.filter(f => f.status === FacilityStatus.Active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                    <Select name="supplierId" value={filters.supplierId} onChange={handleFilterChange}>
                        <option value="">All Suppliers</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="">All Statuses</option>
                        {Object.values(PurchaseOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <DatePicker label="Order Date After" selectedDate={filters.startDate} onSelectDate={(d) => handleDateChange('startDate', d)} />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <SortableHeader sortKey="poNumber" requestSort={requestSort} sortConfig={sortConfig}>PO Number</SortableHeader>
                                <SortableHeader sortKey="supplierName" requestSort={requestSort} sortConfig={sortConfig}>Supplier</SortableHeader>
                                <SortableHeader sortKey="orderDate" requestSort={requestSort} sortConfig={sortConfig}>Order Date</SortableHeader>
                                <SortableHeader sortKey="totalValue" requestSort={requestSort} sortConfig={sortConfig}>Total Value</SortableHeader>
                                <SortableHeader sortKey="status" requestSort={requestSort} sortConfig={sortConfig}>Status</SortableHeader>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map(po => (
                                <tr key={po.id} className="hover:bg-secondary-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                                        <button onClick={() => navigate(`/purchase-orders/${po.id}`)} className="hover:underline">{po.poNumber}</button>
                                        <div className="text-xs text-secondary-500 font-mono">{po.controlNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{po.supplierName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(po.orderDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{formatCurrency(po.totalValue)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(po.status)}`}>{po.status}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/purchase-orders/edit/${po.id}`)} disabled={po.status !== PurchaseOrderStatus.Pending} title="Edit PO">
                                            <EditIcon />
                                        </Button>
                                        {user?.role === Role.SystemAdministrator ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-700 hover:bg-red-200"
                                                onClick={() => { setPOToPurge(po); setIsPurgeModalOpen(true); }}
                                                title={`Permanently Purge PO ${po.poNumber}`}
                                            >
                                                <TrashIcon />
                                            </Button>
                                        ) : user?.role === Role.Admin && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-red-600 hover:bg-red-100" 
                                                onClick={() => { setPOToDelete(po); setIsDeleteModalOpen(true); }} 
                                                disabled={po.status !== PurchaseOrderStatus.Pending}
                                                title={po.status !== PurchaseOrderStatus.Pending ? `Cannot delete a PO that is not in 'Pending' status.` : `Delete PO ${po.poNumber}`}
                                            >
                                                <TrashIcon />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paginatedItems.length === 0 && <div className="text-center p-8 text-secondary-500">No purchase orders found.</div>}
                </div>
            </Card>

            {poToDelete && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeletePO} itemName={poToDelete.poNumber} itemType="purchase order" isSubmitting={isSubmitting} />}
            {poToPurge && <PurgePOConfirmationModal isOpen={isPurgeModalOpen} onClose={() => setIsPurgeModalOpen(false)} onConfirm={confirmPurgePO} poToPurge={poToPurge} isSubmitting={isSubmitting} />}
        </div>
    );
};

export default PurchaseOrderManagement;
