import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { Role, Facility, FacilityStatus, Category, WriteOffReason, WastageSubReason } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import { downloadStringAsFile } from '../utils/download';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;

const ExpiryWasteAnalysisTab: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const navigate = useNavigate();
    const { writeOffLogs, inventoryItems, itemMasters, facilities, categories } = data;
    const isRestrictedUser = user?.role === Role.Encoder;
    
    const [filters, setFilters] = useState({
        facilityId: isRestrictedUser ? user?.facilityId || '' : '',
        categoryId: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });

    const reportData = useMemo(() => {
        const itemMasterMap = new Map(itemMasters.map(im => [im.id, im]));
        const inventoryItemMap = new Map(inventoryItems.map(ii => [ii.id, ii]));

        const filteredLogs = writeOffLogs.filter(log => {
            if (log.reason !== WriteOffReason.Wastage || log.subReason !== WastageSubReason.Expired) return false;

            const logDate = new Date(log.timestamp);
            const sDate = filters.startDate;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = filters.endDate;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            return (!filters.facilityId || log.facilityId === filters.facilityId) &&
                   (!sDate || logDate >= sDate) &&
                   (!eDate || logDate <= eDate);
        });

        const categoryData = new Map<string, { value: number, items: number }>();
        const itemData = new Map<string, { value: number, items: number, name: string }>();
        let totalValue = 0;
        let totalItemsWasted = 0;

        filteredLogs.forEach(log => {
            log.items.forEach(wastedItem => {
                const invItem = inventoryItemMap.get(wastedItem.inventoryItemId);
                if (!invItem) return;
                
                const master = itemMasterMap.get(invItem.itemMasterId);
                if (!master) return;
                
                if (filters.categoryId && master.categoryId !== filters.categoryId) return;

                const cost = invItem.purchaseCost ?? master.unitCost;
                const itemValue = wastedItem.quantity * cost;

                const categoryName = categories.find(c => c.id === master.categoryId)?.name || 'Uncategorized';
                
                const currentCategory = categoryData.get(categoryName) || { value: 0, items: 0 };
                currentCategory.value += itemValue;
                currentCategory.items += wastedItem.quantity;
                categoryData.set(categoryName, currentCategory);
                
                const currentItem = itemData.get(master.id) || { value: 0, items: 0, name: master.name };
                currentItem.value += itemValue;
                currentItem.items += wastedItem.quantity;
                itemData.set(master.id, currentItem);

                totalValue += itemValue;
                totalItemsWasted += wastedItem.quantity;
            });
        });

        const chartData = Array.from(categoryData.entries()).map(([name, data]) => ({ name, value: data.value })).sort((a,b) => b.value - a.value);
        const topWastedItems = Array.from(itemData.values()).sort((a,b) => b.value - a.value).slice(0, 10);
        
        return { totalValue, totalItemsWasted, totalTransactions: filteredLogs.length, chartData, topWastedItems };

    }, [filters, writeOffLogs, inventoryItems, itemMasters, categories]);
    
    const handlePrint = () => {
        const printData = { reportData, filters, generatedDate: new Date().toISOString() };
        sessionStorage.setItem('printData', JSON.stringify(printData));
        window.open('/#/print/expiry-waste-report', '_blank');
    };

    const handleExport = () => {
        if (!reportData || reportData.topWastedItems.length === 0) {
            alert("No data to export.");
            return;
        }
    
        const headers = ['Item Name', 'Value Wasted (PHP)', 'Quantity Wasted'];
        const csvRows = [
            headers.join(','),
            ...reportData.topWastedItems.map(item => {
                const escapedName = `"${item.name.replace(/"/g, '""')}"`;
                return [escapedName, item.value, item.items].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, 'expiry_waste_analysis.csv', 'text/csv;charset=utf-8;');
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <DatePicker label="Start Date" selectedDate={filters.startDate} onSelectDate={d => setFilters(f => ({...f, startDate: d}))} />
                    <DatePicker label="End Date" selectedDate={filters.endDate} onSelectDate={d => setFilters(f => ({...f, endDate: d}))} />
                    <Select label="Facility" name="facilityId" value={filters.facilityId} onChange={e => setFilters(f => ({...f, facilityId: e.target.value}))} disabled={isRestrictedUser}>
                        {!isRestrictedUser && <option value="">All Facilities</option>}
                        {facilities.filter(f => f.status === FacilityStatus.Active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                    <Select label="Category" name="categoryId" value={filters.categoryId} onChange={e => setFilters(f => ({...f, categoryId: e.target.value}))}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard title="Total Value Wasted" value={formatCurrency(reportData.totalValue)} icon={<div className="text-2xl font-bold">₱</div>} color="red" />
                <DashboardCard title="Total Write-Offs" value={formatNumber(reportData.totalTransactions)} icon={<div className="text-2xl font-bold">#</div>} color="orange" />
                <DashboardCard title="Total Items Wasted" value={formatNumber(reportData.totalItemsWasted)} icon={<div className="text-2xl font-bold">Σ</div>} color="yellow" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                     <div className="p-4 flex justify-between items-center">
                        <h3 className="font-semibold text-secondary-800">Waste Value by Category</h3>
                     </div>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                            <Tooltip formatter={(value) => [formatCurrency(value as number), "Value"]} />
                            <Bar dataKey="value" fill="#ef4444" name="Wasted Value"/>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                <Card noPadding>
                    <div className="p-4 flex justify-between items-center border-b">
                        <h3 className="font-semibold text-secondary-800">Top 10 Wasted Items by Value</h3>
                        <div>
                            <Button onClick={handlePrint} variant="secondary" size="sm" leftIcon={<PrintIcon />} className="mr-2">Print</Button>
                            <Button onClick={handleExport} variant="secondary" size="sm" leftIcon={<DownloadIcon />}>Export</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Item Name</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Value Wasted</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Qty Wasted</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {reportData.topWastedItems.map(item => (
                                    <tr key={item.name}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(item.value)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatNumber(item.items)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {reportData.topWastedItems.length === 0 && <p className="text-center text-secondary-500 p-4">No expired items found in this period.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ExpiryWasteAnalysisTab;