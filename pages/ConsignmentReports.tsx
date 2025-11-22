import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { useDatabase } from '../hooks/useDatabase';
import { ConsignmentConsumptionLog, Facility, FacilityStatus, Supplier, SupplierStatus, Role } from '../types';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { logAuditEvent } from '../services/audit';
import { useAuth } from '../hooks/useAuth';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const ConsignmentReports: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { consignmentConsumptionLogs, suppliers, facilities, users } = data;

    const isEncoder = user?.role === Role.Encoder;

    const [filters, setFilters] = useState({
        supplierId: '',
        facilityId: isEncoder ? user?.facilityId || '' : '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const activeSuppliers = useMemo(() => suppliers.filter(s => s.status === SupplierStatus.Active), [suppliers]);
    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'N/A';
    const getFacilityName = (id: string) => facilities.find(f => f.id === id)?.name || 'N/A';
    const getUserName = (id: string) => users.find(u => u.uid === id)?.name || 'N/A';

    const filteredLogs = useMemo(() => {
        return consignmentConsumptionLogs.filter(log => {
            const { supplierId, facilityId, startDate, endDate } = filters;
            const logDate = new Date(log.timestamp);
            
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);

            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            return (
                (!supplierId || log.supplierId === supplierId) &&
                (!facilityId || log.facilityId === facilityId) &&
                (!sDate || logDate >= sDate) &&
                (!eDate || logDate <= eDate)
            );
        });
    }, [consignmentConsumptionLogs, filters]);

    const { sortedItems, requestSort, sortConfig } = useSort(filteredLogs, { key: 'timestamp', direction: 'descending' });

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedItems.length);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
        setFilters(prev => ({ ...prev, [name]: date }));
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Control #', 'Supplier', 'Facility', 'User', 'Total Value'];
        const csvRows = [
            headers.join(','),
            ...sortedItems.map(log => [
                `"${new Date(log.timestamp).toLocaleString()}"`,
                `"${log.controlNumber}"`,
                `"${getSupplierName(log.supplierId)}"`,
                `"${getFacilityName(log.facilityId)}"`,
                `"${getUserName(log.userId)}"`,
                log.totalValueConsumed,
            ].join(','))
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'consignment_consumption_report.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const params = new URLSearchParams();
        if (filters.supplierId) params.set('supplierId', filters.supplierId);
        if (filters.facilityId) params.set('facilityId', filters.facilityId);
        if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
        if (filters.endDate) params.set('endDate', filters.endDate.toISOString());

        window.open(`#/print/consignment-report?${params.toString()}`, '_blank');
    };

    return (
        <div>
            <ManagementPageHeader
                title="Consignment Consumption Reports"
                onPrint={handlePrint}
                onExport={exportToCSV}
            />
            
            <Card className="mb-6">
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Select label="Filter by Supplier" name="supplierId" value={filters.supplierId} onChange={handleFilterChange}>
                        <option value="">All Suppliers</option>
                        {activeSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                     <Select label="Filter by Facility" name="facilityId" value={filters.facilityId} onChange={handleFilterChange} disabled={isEncoder}>
                        {!isEncoder && <option value="">All Facilities</option>}
                        {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                     <DatePicker 
                        label="Start Date"
                        selectedDate={filters.startDate}
                        onSelectDate={(date) => handleDateChange('startDate', date)}
                    />
                    <DatePicker 
                        label="End Date"
                        selectedDate={filters.endDate}
                        onSelectDate={(date) => handleDateChange('endDate', date)}
                    />
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
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <SortableHeader sortKey="timestamp" requestSort={requestSort} sortConfig={sortConfig}>Date Consumed</SortableHeader>
                                <SortableHeader sortKey="controlNumber" requestSort={requestSort} sortConfig={sortConfig}>Control #</SortableHeader>
                                <SortableHeader sortKey="supplierId" requestSort={requestSort} sortConfig={sortConfig}>Supplier</SortableHeader>
                                <SortableHeader sortKey="facilityId" requestSort={requestSort} sortConfig={sortConfig}>Facility</SortableHeader>
                                <SortableHeader sortKey="userId" requestSort={requestSort} sortConfig={sortConfig}>User</SortableHeader>
                                <SortableHeader sortKey="totalValueConsumed" requestSort={requestSort} sortConfig={sortConfig}>Value Consumed</SortableHeader>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map((log, index) => (
                                <tr key={log.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50'} hover:bg-primary-50`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-700">{log.controlNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{getSupplierName(log.supplierId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{getFacilityName(log.facilityId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{getUserName(log.userId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right font-semibold">{formatCurrency(log.totalValueConsumed)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {paginatedItems.length === 0 && (
                        <div className="text-center p-8 text-secondary-500">
                            No consumption logs match the current filters.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default ConsignmentReports;