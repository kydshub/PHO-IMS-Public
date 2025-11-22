import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { Role, ItemMaster, InventoryItem, FacilityStatus, Facility, Category } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import { downloadStringAsFile } from '../../utils/download';
import { TablePagination } from '../components/ui/TablePagination';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import { getStorageLocationPath } from '../utils/locationHelpers';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;

interface ComprehensiveItem {
    id: string;
    master: ItemMaster;
    categoryName: string;
    facilityName: string;
    locationName: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    daysOfSupply: number | typeof Infinity;
    abcClass: 'A' | 'B' | 'C' | 'N/A';
}

const Reports: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const navigate = useNavigate();
    const { inventoryItems, itemMasters, categories, facilities, storageLocations, dispenseLogs } = data;
    const isEncoder = user?.role === Role.Encoder;
    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);

    const [filters, setFilters] = useState({
        facilityId: isEncoder ? user?.facilityId || '' : '',
        categoryId: '',
        status: '',
        abcClass: '',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const { comprehensiveInventory, summaryStats } = useMemo(() => {
        const itemMasterMap = new Map(itemMasters.map(im => [im.id, im]));
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const storageFacilityMap = new Map(storageLocations.map(sl => [sl.id, sl.facilityId]));
        const facilityMap = new Map(facilities.map(f => [f.id, f.name]));
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const consumptionValueMap = new Map<string, number>();
        dispenseLogs.filter(log => new Date(log.timestamp) > thirtyDaysAgo && (!filters.facilityId || log.facilityId === filters.facilityId)).forEach(log => {
            log.items.forEach(item => {
                const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                if (invItem) {
                    const cost = invItem.purchaseCost || itemMasterMap.get(invItem.itemMasterId)?.unitCost || 0;
                    const value = item.quantity * cost;
                    consumptionValueMap.set(invItem.itemMasterId, (consumptionValueMap.get(invItem.itemMasterId) || 0) + value);
                }
            })
        });
        const totalConsumptionValue = Array.from(consumptionValueMap.values()).reduce((s, v) => s + v, 0);
        
        let cumulativeValue = 0;
        const abcMap = new Map<string, 'A' | 'B' | 'C'>();
        Array.from(consumptionValueMap.entries())
            .sort((a,b) => b[1] - a[1])
            .forEach(([id, value]) => {
                cumulativeValue += value;
                const cumulativePercent = totalConsumptionValue > 0 ? (cumulativeValue / totalConsumptionValue) * 100 : 0;
                if (cumulativePercent <= 80) abcMap.set(id, 'A');
                else if (cumulativePercent <= 95) abcMap.set(id, 'B');
                else abcMap.set(id, 'C');
            });
        
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const consumptionMap = new Map<string, number>();
        dispenseLogs.filter(log => new Date(log.timestamp) > ninetyDaysAgo && (!filters.facilityId || log.facilityId === filters.facilityId)).forEach(log => {
            log.items.forEach(item => {
                const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                if(invItem) consumptionMap.set(invItem.itemMasterId, (consumptionMap.get(invItem.itemMasterId) || 0) + item.quantity);
            });
        });

        const allItems: ComprehensiveItem[] = [];
        let totalValue = 0;
        const valueByCategoryMap = new Map<string, number>();
        const uniqueSKUs = new Set<string>();
        let lowStockCount = 0;

        inventoryItems.forEach(item => {
            const master = itemMasterMap.get(item.itemMasterId);
            if (!master) return;

            const facilityId = storageFacilityMap.get(item.storageLocationId);
            if (!facilityId) return;

            if (filters.facilityId && facilityId !== filters.facilityId) return;
            if (filters.categoryId && master.categoryId !== filters.categoryId) return;

            const value = item.quantity * (item.purchaseCost ?? master.unitCost);
            totalValue += value;
            uniqueSKUs.add(item.itemMasterId);
            const categoryName = categoryMap.get(master.categoryId) || 'Uncategorized';
            valueByCategoryMap.set(categoryName, (valueByCategoryMap.get(categoryName) || 0) + value);

            let status: ComprehensiveItem['status'] = 'In Stock';
            if (item.quantity === 0) status = 'Out of Stock';
            else if (master.lowStockThreshold && item.quantity <= master.lowStockThreshold) {
                status = 'Low Stock';
                lowStockCount++;
            }

            const consumption = consumptionMap.get(item.itemMasterId) || 0;
            const avgDaily = consumption / 90;
            const daysOfSupply = avgDaily > 0 ? item.quantity / avgDaily : Infinity;
            
            allItems.push({
                id: item.id, master, categoryName,
                facilityName: facilityMap.get(facilityId) || 'N/A',
                locationName: getStorageLocationPath(item.storageLocationId, storageLocations, facilities),
                quantity: item.quantity, unitCost: item.purchaseCost ?? master.unitCost, totalValue: value,
                status, daysOfSupply,
                abcClass: abcMap.get(item.itemMasterId) || 'N/A',
            });
        });
        
        const valueByCategory = Array.from(valueByCategoryMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        return {
            comprehensiveInventory: allItems,
            summaryStats: { totalValue, uniqueSKUs: uniqueSKUs.size, valueByCategory, lowStockCount }
        };
    }, [filters, itemMasters, inventoryItems, dispenseLogs, categories, storageLocations, facilities]);

    const filteredItems = useMemo(() => {
        return comprehensiveInventory.filter(item => {
            const statusMatch = !filters.status || item.status === filters.status;
            const abcMatch = !filters.abcClass || item.abcClass === filters.abcClass;
            const searchMatch = !searchTerm ||
                item.master.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.master.brand && item.master.brand.toLowerCase().includes(searchTerm.toLowerCase()));
            return statusMatch && abcMatch && searchMatch;
        });
    }, [comprehensiveInventory, filters, searchTerm]);
    
    const { sortedItems, requestSort, sortConfig } = useSort<ComprehensiveItem>(filteredItems, { key: 'totalValue', direction: 'descending' });

    useEffect(() => setCurrentPage(1), [filters, searchTerm, itemsPerPage, sortConfig]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

    const handlePrint = () => {
        const facilityName = filters.facilityId ? facilities.find(f => f.id === filters.facilityId)?.name : 'All Facilities';
        const printState = {
            items: sortedItems,
            facilityName,
            generatedDate: new Date().toISOString(),
        };
        sessionStorage.setItem('printData-inventoryDeepDive', JSON.stringify(printState));
        window.open('/#/print/report', '_blank');
    };

    const handleExport = () => {
        const headers = ['Item Name', 'Category', 'Facility', 'Location', 'Quantity', 'Total Value', 'Status', 'Days of Supply', 'ABC Class'];
        const csvRows = [headers.join(','), ...sortedItems.map(item => {
            const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
            return [
                escape(item.master.name), escape(item.categoryName), escape(item.facilityName), escape(item.locationName),
                item.quantity, item.totalValue, item.status,
                item.daysOfSupply === Infinity ? 'Infinity' : Math.round(item.daysOfSupply),
                item.abcClass
            ].join(',');
        })];
        downloadStringAsFile(csvRows.join('\n'), 'inventory_deep_dive.csv', 'text/csv;charset=utf-8;');
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="p-4 flex justify-between items-center">
                    <h3 className="font-semibold text-secondary-800">Inventory Deep Dive</h3>
                    <div className="flex gap-2">
                        <Button onClick={handlePrint} variant="secondary" size="sm" leftIcon={<PrintIcon />}>Print Summary</Button>
                        <Button onClick={handleExport} variant="secondary" size="sm" leftIcon={<DownloadIcon />}>Export All</Button>
                    </div>
                </div>
                <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <Input label="Search" placeholder="Search by name or brand..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Select label="Facility" name="facilityId" value={filters.facilityId} onChange={e => setFilters(f => ({...f, facilityId: e.target.value}))} disabled={isEncoder}>
                        {!isEncoder && <option value="">All Facilities</option>}
                        {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                    <Select label="Category" name="categoryId" value={filters.categoryId} onChange={e => setFilters(f => ({...f, categoryId: e.target.value}))}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                     <Select label="Status" name="status" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
                        <option value="">All Statuses</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                    </Select>
                    <Select label="ABC Class" name="abcClass" value={filters.abcClass} onChange={e => setFilters(f => ({...f, abcClass: e.target.value}))}>
                        <option value="">All Classes</option>
                        <option value="A">A (High Value)</option>
                        <option value="B">B (Medium Value)</option>
                        <option value="C">C (Low Value)</option>
                        <option value="N/A">N/A</option>
                    </Select>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard title="Total Inventory Value" value={formatCurrency(summaryStats.totalValue)} icon={<div className="text-2xl font-bold">₱</div>} color="green" />
                <DashboardCard title="Unique SKUs" value={formatNumber(summaryStats.uniqueSKUs)} icon={<div className="text-2xl font-bold">#</div>} color="blue" />
                <DashboardCard title="Low Stock Items" value={formatNumber(summaryStats.lowStockCount)} icon={<div className="text-2xl font-bold">!</div>} color="yellow" />
            </div>

            <Card>
                <div className="p-4"><h3 className="font-semibold text-secondary-800">Inventory Value by Category</h3></div>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summaryStats.valueByCategory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), "Value"]} />
                        <Bar dataKey="value" fill="#3b82f6" name="Total Value" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <Card noPadding footer={<TablePagination currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={sortedItems.length} startItemIndex={(currentPage - 1) * itemsPerPage} endItemIndex={Math.min(((currentPage - 1) * itemsPerPage) + itemsPerPage, sortedItems.length)} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <SortableHeader sortKey="master.name" requestSort={requestSort} sortConfig={sortConfig}>Item</SortableHeader>
                                <SortableHeader sortKey="categoryName" requestSort={requestSort} sortConfig={sortConfig}>Category</SortableHeader>
                                <SortableHeader sortKey="facilityName" requestSort={requestSort} sortConfig={sortConfig}>Facility</SortableHeader>
                                <SortableHeader sortKey="quantity" requestSort={requestSort} sortConfig={sortConfig}>Quantity</SortableHeader>
                                <SortableHeader sortKey="totalValue" requestSort={requestSort} sortConfig={sortConfig}>Total Value</SortableHeader>
                                <SortableHeader sortKey="status" requestSort={requestSort} sortConfig={sortConfig}>Status</SortableHeader>
                                <SortableHeader sortKey="daysOfSupply" requestSort={requestSort} sortConfig={sortConfig}>Days of Supply</SortableHeader>
                                <SortableHeader sortKey="abcClass" requestSort={requestSort} sortConfig={sortConfig}>ABC Class</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map(item => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{item.master.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.categoryName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.facilityName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{formatNumber(item.quantity)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{formatCurrency(item.totalValue)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{item.status}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{item.daysOfSupply === Infinity ? '∞' : Math.round(item.daysOfSupply)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center">{item.abcClass}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {sortedItems.length === 0 && <p className="text-center p-4 text-secondary-500">No items match the current filters.</p>}
                </div>
            </Card>
        </div>
    );
};

export default Reports;