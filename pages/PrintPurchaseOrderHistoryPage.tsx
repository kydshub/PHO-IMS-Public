import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PrintLayout from '../components/ui/PrintLayout';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { Spinner } from '../components/ui/Spinner';
import { PurchaseOrder } from '../types';
import { formatCurrency } from '../utils/formatters';

const PrintPurchaseOrderHistoryPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { purchaseOrders, suppliers, facilities } = data;

    const filters = {
        searchTerm: searchParams.get('searchTerm') || '',
        facilityId: searchParams.get('facilityId') || '',
        supplierId: searchParams.get('supplierId') || '',
        status: searchParams.get('status') || '',
        startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null,
        endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null,
    };

    const items = useMemo(() => {
        if (loading) return [];
        return purchaseOrders
            .filter(po => {
                const { searchTerm, facilityId, supplierId, status, startDate, endDate } = filters;
                const poDate = new Date(po.orderDate);
                const sDate = startDate;
                if (sDate) sDate.setHours(0, 0, 0, 0);
                const eDate = endDate;
                if (eDate) eDate.setHours(23, 59, 59, 999);

                return (
                    (!searchTerm || po.poNumber.toLowerCase().includes(searchTerm.toLowerCase())) &&
                    (!facilityId || po.facilityId === facilityId) &&
                    (!supplierId || po.supplierId === supplierId) &&
                    (!status || po.status === status) &&
                    (!sDate || poDate >= sDate) &&
                    (!eDate || poDate <= eDate)
                );
            })
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [loading, purchaseOrders, filters]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }
    
    return (
        <PrintLayout title={`Purchase Order History - ${new Date().toLocaleDateString()}`}>
            <header className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mt-1">Purchase Order History Report</h2>
                <div className="mt-2 text-sm text-gray-500">
                    <p><strong>Date Generated:</strong> {new Date().toLocaleString()}</p>
                </div>
            </header>
            <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 border text-left text-xs font-bold uppercase text-gray-600">PO Number</th>
                        <th className="p-2 border text-left text-xs font-bold uppercase text-gray-600">Supplier</th>
                        <th className="p-2 border text-left text-xs font-bold uppercase text-gray-600">Facility</th>
                        <th className="p-2 border text-left text-xs font-bold uppercase text-gray-600">Order Date</th>
                        <th className="p-2 border text-right text-xs font-bold uppercase text-gray-600">Total Value</th>
                        <th className="p-2 border text-left text-xs font-bold uppercase text-gray-600">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((po: PurchaseOrder) => (
                        <tr key={po.id} className="border-t">
                            <td className="p-2 border font-mono">{po.poNumber}</td>
                            <td className="p-2 border">{suppliers.find(s => s.id === po.supplierId)?.name || 'N/A'}</td>
                            <td className="p-2 border">{facilities.find(f => f.id === po.facilityId)?.name || 'N/A'}</td>
                            <td className="p-2 border">{new Date(po.orderDate).toLocaleDateString()}</td>
                            <td className="p-2 border text-right">{formatCurrency(po.totalValue)}</td>
                            <td className="p-2 border">{po.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {items.length === 0 && <p className="text-gray-600 text-sm p-2 text-center">No purchase orders match the selected criteria.</p>}
        </PrintLayout>
    );
};

export default PrintPurchaseOrderHistoryPage;
