import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { ReceiveLog, ItemMaster } from '../types';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';
import { formatCurrency } from '../utils/formatters';
import NotFound from './NotFound';

const PrintReceivePage: React.FC = () => {
    const { logId } = useParams<{ logId: string }>();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { receiveLogs, itemMasters, users, facilities, suppliers, purchaseOrders } = data;

    const log = useMemo(() => receiveLogs.find(l => l.id === logId && !l.isConsignment), [logId, receiveLogs]);

    const totalValue = useMemo(() => {
        if (!log) return 0;
        return log.items.reduce((acc, currentItem) => {
            return acc + (currentItem.quantity * currentItem.unitCost);
        }, 0);
    }, [log]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
    }

    if (!log) {
        return <PrintLayout title="Voucher Not Found"><NotFound /></PrintLayout>;
    }

    const user = users.find(u => u.uid === log.userId);
    const facility = facilities.find(f => f.id === log.facilityId);
    const supplier = suppliers.find(s => s.id === log.supplierId);
    const po = purchaseOrders.find(p => p.id === log.purchaseOrderId);

    const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between py-1 text-base">
            <span className="font-semibold text-gray-600">{label}:</span>
            <span className="text-gray-800 text-right font-medium">{value || 'N/A'}</span>
        </div>
    );

    return (
        <PrintLayout title={`Receiving Report - ${log.controlNumber}`}>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">{settings.appName}</h1>
                <h2 className="text-xl font-semibold text-gray-700 mt-1">Receiving Report</h2>
                <div className="mt-2">
                    <p className="text-sm text-gray-600">Control No: <span className="font-mono font-bold">{log.controlNumber}</span></p>
                    <p className="text-sm text-gray-500">Date Printed: {new Date().toLocaleString()}</p>
                </div>
            </div>
            <div className="space-y-1">
                <DetailRow label="Transaction Date" value={new Date(log.timestamp).toLocaleString()} />
                <DetailRow label="Facility" value={facility?.name} />
                <DetailRow label="Supplier" value={supplier?.name} />
                <DetailRow label="Purchase Order #" value={po?.poNumber || log.purchaseOrder || 'N/A'} />
                <DetailRow label="Received By" value={user?.name} />
            </div>
            
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Items Received</h3>
                <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">Item Name</th>
                            <th className="p-2 border text-left">Batch No.</th>
                            <th className="p-2 border text-left">Expiry Date</th>
                            <th className="p-2 border text-right">Quantity</th>
                            <th className="p-2 border text-right">Unit Cost</th>
                            <th className="p-2 border text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {log.items.map((receivedItem, idx) => {
                            const master = itemMasters.find(im => im.id === receivedItem.itemMasterId);
                            const subtotal = receivedItem.unitCost * receivedItem.quantity;
                            return (
                                <tr key={idx}>
                                    <td className="p-2 border">{master?.name || 'Unknown Item'}</td>
                                    <td className="p-2 border">{receivedItem.batchNumber}</td>
                                    <td className="p-2 border">{receivedItem.expiryDate ? new Date(receivedItem.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-2 border text-right">{receivedItem.quantity} {master?.unit}</td>
                                    <td className="p-2 border text-right">{formatCurrency(receivedItem.unitCost)}</td>
                                    <td className="p-2 border text-right">{formatCurrency(subtotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="p-2 border text-right font-bold">Grand Total:</td>
                            <td className="p-2 border text-right font-bold">{formatCurrency(totalValue)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center">
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Received By (Name & Signature)</div>
                </div>
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Inspected By (Name & Signature)</div>
                </div>
            </div>
        </PrintLayout>
    );
};

export default PrintReceivePage;