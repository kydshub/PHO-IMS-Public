// This file is new. Please create it.
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PrintLayout from '../components/ui/PrintLayout';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { Spinner } from '../components/ui/Spinner';
import NotFound from './NotFound';
import { formatCurrency } from '../utils/formatters';

const PrintPurchaseOrderPage: React.FC = () => {
    const { poId } = useParams<{ poId: string }>();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { purchaseOrders, suppliers, facilities, itemMasters, users } = data;

    const po = useMemo(() => purchaseOrders.find(p => p.id === poId), [purchaseOrders, poId]);
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    if (!po) return <PrintLayout title="PO Not Found"><NotFound /></PrintLayout>;

    const supplier = suppliers.find(s => s.id === po.supplierId);
    const facility = facilities.find(f => f.id === po.facilityId);
    const createdBy = users.find(u => u.uid === po.createdBy);

    return (
        <PrintLayout title={`Purchase Order - ${po.poNumber}`}>
            <header className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                <h1 className="text-3xl font-bold text-gray-800">{settings.organizationName}</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mt-1">Purchase Order</h2>
            </header>

            <div className="grid grid-cols-2 gap-x-8 text-sm mb-8">
                <div>
                    <h3 className="font-bold text-base mb-2">Supplier</h3>
                    <p>{supplier?.name}</p>
                    <p>{supplier?.contactPerson}</p>
                    <p>{supplier?.email}</p>
                    <p>{supplier?.phone}</p>
                </div>
                <div className="text-right">
                    <p><strong>PO Number:</strong> {po.poNumber}</p>
                    <p><strong>Control Number:</strong> {po.controlNumber}</p>
                    <p><strong>Order Date:</strong> {new Date(po.orderDate).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> {po.status}</p>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold text-base mb-2">Ship To</h3>
                <p>{facility?.name}</p>
                <p>{facility?.location}</p>
            </div>

            <table className="w-full text-sm border-collapse border border-gray-400">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 border border-gray-400 text-left">Item Description</th>
                        <th className="p-2 border border-gray-400 text-right">Quantity</th>
                        <th className="p-2 border border-gray-400 text-right">Unit Cost</th>
                        <th className="p-2 border border-gray-400 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {po.items.map((item, index) => {
                        const master = itemMasters.find(im => im.id === item.itemMasterId);
                        const total = (item.orderedQuantity || 0) * (item.unitCost || 0);
                        return (
                            <tr key={index} className="border-t border-gray-300">
                                <td className="p-2 border border-gray-400">
                                    <p className="font-medium">{master?.name || 'Unknown Item'}</p>
                                    <p className="text-xs text-gray-600">{master?.description}</p>
                                </td>
                                <td className="p-2 border border-gray-400 text-right">{item.orderedQuantity} {master?.unit}</td>
                                <td className="p-2 border border-gray-400 text-right">{formatCurrency(item.unitCost)}</td>
                                <td className="p-2 border border-gray-400 text-right">{formatCurrency(total)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-gray-600 bg-gray-100">
                        <td colSpan={3} className="p-2 text-right font-bold">Grand Total:</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(po.totalValue)}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="mt-8 text-sm">
                <h3 className="font-bold text-base mb-2">Notes</h3>
                <p className="p-2 border border-gray-300 min-h-[50px]">{po.notes || 'No additional notes.'}</p>
            </div>

            <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center text-sm">
                <div>
                    <p className="mb-8 h-8">Created By: <span className="font-semibold">{createdBy?.name || 'N/A'}</span></p>
                    <div className="border-t border-gray-400 pt-2 text-gray-600">Authorized Signature</div>
                </div>
                 <div>
                    <p className="mb-8 h-8">&nbsp;</p>
                    <div className="border-t border-gray-400 pt-2 text-gray-600">Noted By (Head of Office)</div>
                </div>
            </div>
        </PrintLayout>
    );
};

export default PrintPurchaseOrderPage;
