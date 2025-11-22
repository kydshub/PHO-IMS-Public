import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { PurchaseOrderStatus } from '../types';
import { formatCurrency } from '../utils/formatters';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;

const PurchaseOrderDetailPage: React.FC = () => {
    const { poId } = useParams<{ poId: string }>();
    const navigate = useNavigate();
    const { data, loading } = useDatabase();
    const { purchaseOrders, suppliers, facilities, itemMasters, receiveLogs, users } = data;

    const po = useMemo(() => purchaseOrders.find(p => p.id === poId), [purchaseOrders, poId]);
    
    const relatedData = useMemo(() => {
        if (!po) return null;
        return {
            supplier: suppliers.find(s => s.id === po.supplierId),
            facility: facilities.find(f => f.id === po.facilityId),
            linkedReceivings: receiveLogs.filter(log => log.purchaseOrderId === po.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        };
    }, [po, suppliers, facilities, receiveLogs]);
    
    if (loading) return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
    if (!po || !relatedData) return <div>Purchase Order not found.</div>;

    const getStatusColor = (status: PurchaseOrderStatus) => {
        switch (status) {
            case PurchaseOrderStatus.Pending: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case PurchaseOrderStatus.PartiallyReceived: return 'bg-blue-100 text-blue-800 border-blue-300';
            case PurchaseOrderStatus.Completed: return 'bg-green-100 text-green-800 border-green-300';
            case PurchaseOrderStatus.Cancelled: return 'bg-gray-200 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/purchase-orders')} className="mb-2 -ml-3 text-secondary-600 hover:text-secondary-900">
                        <BackIcon />
                        <span className="ml-2">Back to Purchase Orders</span>
                    </Button>
                    <h2 className="text-3xl font-semibold text-secondary-800">Purchase Order Details</h2>
                    <p className="text-secondary-600 font-mono mt-1">
                        PO #: <span className="font-bold text-primary-700">{po.poNumber}</span>
                    </p>
                </div>
                <Button onClick={() => window.open(`/#/print/po/${po.id}`, '_blank')} leftIcon={<PrintIcon />}>Print PO</Button>
            </div>

            <Card className="mb-6">
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><span className="font-semibold">Supplier:</span> {relatedData.supplier?.name}</div>
                    <div><span className="font-semibold">Facility:</span> {relatedData.facility?.name}</div>
                    <div><span className="font-semibold">Order Date:</span> {new Date(po.orderDate).toLocaleDateString()}</div>
                    <div><span className="font-semibold">Total Value:</span> {formatCurrency(po.totalValue)}</div>
                    <div className="md:col-span-2"><span className="font-semibold">Notes:</span> {po.notes || 'N/A'}</div>
                    <div className="flex items-center gap-2"><span className="font-semibold">Status:</span> <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(po.status)}`}>{po.status}</span></div>
                </div>
            </Card>

            <Card title="Items on this Order">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-2/5">Item</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Ordered</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Received</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Remaining</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-1/4">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {po.items.map((item, index) => {
                                const master = itemMasters.find(im => im.id === item.itemMasterId);
                                const remaining = item.orderedQuantity - item.receivedQuantity;
                                const progress = item.orderedQuantity > 0 ? (item.receivedQuantity / item.orderedQuantity) * 100 : 0;
                                return (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{master?.name || 'Unknown Item'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{item.orderedQuantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{item.receivedQuantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-secondary-700 text-right">{remaining}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="w-full bg-secondary-200 rounded-full h-2.5">
                                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Receiving History" className="mt-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Control #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Received By</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {relatedData.linkedReceivings.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-700">{log.controlNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{users.find(u => u.uid === log.userId)?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/print/receive/${log.id}`)}>View Voucher</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {relatedData.linkedReceivings.length === 0 && <p className="text-center p-4 text-secondary-500">No receiving vouchers have been linked to this purchase order yet.</p>}
                </div>
            </Card>
        </div>
    );
};

export default PurchaseOrderDetailPage;