import React, { useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { DispenseLog, InventoryItem, ItemMaster } from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';
import { formatCurrency } from '../utils/formatters';

const PrintDispenseHistoryPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { users, facilities, inventoryItems, itemMasters, dispenseLogs, categories } = data;
    

    const filters = {
        searchTerm: searchParams.get('searchTerm') || '',
        facilityId: searchParams.get('facilityId') || '',
        categoryId: searchParams.get('categoryId') || '',
        startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null,
        endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null,
        userId: searchParams.get('userId') || '',
    };

    const { dispenseLogsToPrint, totalValue }: { dispenseLogsToPrint: DispenseLog[], totalValue: number } = useMemo(() => {
        if (loading) return { dispenseLogsToPrint: [], totalValue: 0 };
        const itemMasterCategoryMap = new Map(itemMasters.map(im => [im.id, im.categoryId]));
        const inventoryItemMasterMap = new Map(inventoryItems.map(ii => [ii.id, ii.itemMasterId]));

        const filteredLogs = dispenseLogs.filter(log => {
            const { searchTerm, facilityId, startDate, endDate, categoryId, userId } = filters;
            const logDate = new Date(log.timestamp);
            const sDate = startDate ? new Date(startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = endDate ? new Date(endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            const searchMatch = !searchTerm || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase()) || log.dispensedTo.toLowerCase().includes(searchTerm.toLowerCase());
            const facilityMatch = !facilityId || log.facilityId === facilityId;
            const dateMatch = (!sDate || logDate >= sDate) && (!eDate || logDate <= eDate);
            const userMatch = !userId || log.userId === userId;
            
            const categoryMatch = !categoryId || log.items.some(item => {
                const itemMasterId = inventoryItemMasterMap.get(item.inventoryItemId);
                if (!itemMasterId) return false;
                const itemCategoryId = itemMasterCategoryMap.get(itemMasterId);
                return itemCategoryId === categoryId;
            });

            return searchMatch && facilityMatch && dateMatch && categoryMatch && userMatch;
        }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const calculatedTotal = filteredLogs.reduce((total, log) => {
            if (log.isFreeOfCharge) return total;
            return total + log.items.reduce((logTotal, item) => {
                const inventoryItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                const masterItem = inventoryItem ? itemMasters.find(im => im.id === inventoryItem.itemMasterId) : undefined;
                const cost = inventoryItem?.purchaseCost ?? masterItem?.unitCost ?? 0;
                return logTotal + (item.quantity * cost);
            }, 0);
        }, 0);

        return { dispenseLogsToPrint: filteredLogs, totalValue: calculatedTotal };

    }, [loading, dispenseLogs, filters, itemMasters, inventoryItems]);


    const getItemDetails = (inventoryItemId: string): { item: InventoryItem | undefined, master: ItemMaster | undefined } => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    };

    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.name || 'Unknown';
    const getFacilityName = (facilityId: string) => facilities.find(f => f.id === facilityId)?.name || 'N/A';
    
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    if (!dispenseLogsToPrint) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a report from the Dispense page first.</p>
                    <Link to="/dispense">
                        <Button className="mt-6">Go to Dispense Page</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => {
        const facilityName = filters.facilityId ? facilities.find(f => f.id === filters.facilityId)?.name : 'All';
        const categoryName = filters.categoryId ? data.categories.find(c => c.id === filters.categoryId)?.name : 'All';
        const userName = filters.userId ? users.find(u => u.uid === filters.userId)?.name : 'All';

        return (
            <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mt-1">Dispensation History Report</h2>
                <div className="mt-2 text-sm text-gray-500">
                    <p><strong>Filters Applied:</strong></p>
                    <p>
                        Facility: {facilityName} | Category: {categoryName} | User: {userName}
                    </p>
                    <p>
                        Date Range: {filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'Start'} - {filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'End'}
                    </p>
                    <p><strong>Date Generated:</strong> {new Date().toLocaleString()}</p>
                </div>
            </div>
        );
    };

    const StandardTable: React.FC<{headers: string[], children: React.ReactNode, footer?: React.ReactNode}> = ({ headers, children, footer }) => (
        <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100">
                <tr>
                    {headers.map(h => <th key={h} className="p-2 border text-left text-xs font-bold uppercase text-gray-600">{h}</th>)}
                </tr>
            </thead>
            <tbody>{children}</tbody>
            {footer && <tfoot>{footer}</tfoot>}
        </table>
    );
    
    return (
        <PrintLayout title={`Dispense History Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable 
                    headers={["Date", "Control #", "Items Summary", "Dispensed To", "User", "Facility"]}
                    footer={
                        <tr className="bg-gray-100 font-bold">
                            <td colSpan={5} className="p-2 border text-right">Total Value of Dispensed Items:</td>
                            <td className="p-2 border text-right">{formatCurrency(totalValue || 0)}</td>
                        </tr>
                    }
                >
                   {dispenseLogsToPrint.map((log: DispenseLog) => {
                       const itemSummary = log.items.map(item => `${item.quantity} x ${getItemDetails(item.inventoryItemId).master?.name || 'N/A'}`).join('; ');
                       return (
                            <tr key={log.id} className="border-t">
                                <td className="p-2 border">{new Date(log.timestamp).toLocaleDateString()}</td>
                                <td className="p-2 border font-mono">{log.controlNumber}</td>
                                <td className="p-2 border">{itemSummary}</td>
                                <td className="p-2 border">{log.dispensedTo}</td>
                                <td className="p-2 border">{getUserName(log.userId)}</td>
                                <td className="p-2 border">{getFacilityName(log.facilityId)}</td>
                            </tr>
                       );
                   })}
                </StandardTable>
                {dispenseLogsToPrint.length === 0 && <p className="text-gray-600 text-sm p-2">No dispensation records to display.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintDispenseHistoryPage;