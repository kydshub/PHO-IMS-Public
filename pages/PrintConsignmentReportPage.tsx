import React, { useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ConsignmentConsumptionLog, ItemMaster } from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/formatters';
import { Spinner } from '../components/ui/Spinner';
import PrintLayout from '../components/ui/PrintLayout';

const PrintConsignmentReportPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { consignmentConsumptionLogs, itemMasters, inventoryItems, suppliers, facilities } = data;
    
    const filters = {
        supplierId: searchParams.get('supplierId'),
        facilityId: searchParams.get('facilityId'),
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
    };

    const items = useMemo(() => {
        if (loading) return [];
        return consignmentConsumptionLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            const sDate = filters.startDate ? new Date(filters.startDate) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = filters.endDate ? new Date(filters.endDate) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            return (
                (!filters.supplierId || log.supplierId === filters.supplierId) &&
                (!filters.facilityId || log.facilityId === filters.facilityId) &&
                (!sDate || logDate >= sDate) &&
                (!eDate || logDate <= eDate)
            );
        }).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [loading, consignmentConsumptionLogs, filters]);

    const getItemMaster = (inventoryItemId: string): ItemMaster | undefined => {
        const invItem = inventoryItems.find(i => i.id === inventoryItemId);
        return invItem ? itemMasters.find(im => im.id === invItem.itemMasterId) : undefined;
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    if (!items) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page may have been accessed directly. Please generate a report from the Consignment Reports page first.</p>
                    <Link to="/consignment/reports">
                        <Button className="mt-6">Go to Consumption Reports</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => {
        const supplierName = filters.supplierId ? suppliers.find(s => s.id === filters.supplierId)?.name : 'All';
        const facilityName = filters.facilityId ? facilities.find(f => f.id === filters.facilityId)?.name : 'All';

        return (
            <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mt-1">Consignment Consumption Report</h2>
                <div className="mt-2 text-sm text-gray-500">
                    <p><strong>Filters Applied:</strong></p>
                    <p>
                        Supplier: {supplierName} | Facility: {facilityName}
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

    const totalValue = items.reduce((sum: number, log: ConsignmentConsumptionLog) => sum + log.totalValueConsumed, 0);
    
    return (
        <PrintLayout title={`Consignment Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable 
                    headers={["Date", "Item Consumed", "Quantity", "Unit Cost", "Subtotal"]}
                    footer={
                        <tr className="bg-gray-100">
                            <td colSpan={4} className="p-2 border text-right font-bold">Grand Total:</td>
                            <td className="p-2 border text-right font-bold">{formatCurrency(totalValue)}</td>
                        </tr>
                    }
                >
                   {items.map((log: ConsignmentConsumptionLog) => (
                       log.items.map((item, index) => {
                           const master = getItemMaster(item.inventoryItemId);
                           return (
                               <tr key={`${log.id}-${index}`} className="border-t">
                                    {index === 0 && (
                                        <td className="p-2 border align-top" rowSpan={log.items.length}>
                                            {new Date(log.timestamp).toLocaleDateString()}
                                        </td>
                                    )}
                                    <td className="p-2 border">{master?.name || 'Unknown Item'}</td>
                                    <td className="p-2 border text-right">{item.quantity} {master?.unit}</td>
                                    <td className="p-2 border text-right">{formatCurrency(item.unitCost)}</td>
                                    <td className="p-2 border text-right">{formatCurrency(item.quantity * item.unitCost)}</td>
                                </tr>
                           );
                       })
                   ))}
                </StandardTable>
                {items.length === 0 && <p className="text-gray-600 text-sm p-2">No consumption records match the selected criteria.</p>}
            </section>
            <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center text-sm">
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Prepared By (Name & Signature)</div>
                </div>
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Noted By (Supplier Representative)</div>
                </div>
            </div>
        </PrintLayout>
    );
};

export default PrintConsignmentReportPage;