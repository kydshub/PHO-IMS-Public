import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { DispenseLog, InventoryItem, ItemMaster } from '../types';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';
import { formatCurrency } from '../utils/formatters';
import NotFound from './NotFound';

const PrintDispensePage: React.FC = () => {
    const { logId } = useParams<{ logId: string }>();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { dispenseLogs, inventoryItems, itemMasters, users, facilities } = data;

    const log = dispenseLogs.find(l => l.id === logId);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    if (!log) {
        return <PrintLayout title="Voucher Not Found"><NotFound /></PrintLayout>;
    }
    
    const user = users.find(u => u.uid === log.userId);
    const facility = facilities.find(f => f.id === log.facilityId);

    const getItemDetails = (inventoryItemId: string) => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    };

    const totalValue = log.isFreeOfCharge
        ? 0
        : log.items.reduce((acc, currentItem) => {
            const { item, master } = getItemDetails(currentItem.inventoryItemId);
            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
            return acc + (currentItem.quantity * cost);
        }, 0);

    const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between py-1 text-base">
            <span className="font-semibold text-gray-600">{label}:</span>
            <span className="text-gray-800 text-right font-medium">{value || 'N/A'}</span>
        </div>
    );
    
    const ItemsTable: React.FC<{ children: React.ReactNode; footer?: React.ReactNode }> = ({ children, footer }) => (
        <div className="mt-6">
           <h3 className="text-lg font-semibold text-gray-700 mb-2">Items Dispensed</h3>
           <table className="min-w-full text-sm border-collapse">
               <thead className="bg-gray-100">
                   <tr>
                       <th className="p-2 border text-left">Item Name</th>
                       <th className="p-2 border text-left">Brand</th>
                       <th className="p-2 border text-left">Batch No.</th>
                       <th className="p-2 border text-right">Unit Cost</th>
                       <th className="p-2 border text-right">Quantity</th>
                       <th className="p-2 border text-right">Subtotal</th>
                   </tr>
               </thead>
               <tbody>{children}</tbody>
               {footer && <tfoot>{footer}</tfoot>}
           </table>
        </div>
    );

    const StandardFooter = () => (
        <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center">
            <div>
                <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Issued By (Name & Signature)</div>
            </div>
             <div>
                <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Received By (Name & Signature)</div>
            </div>
        </div>
    );

    return (
        <PrintLayout title={`Dispense Voucher - ${log.controlNumber}`}>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">{settings.appName}</h1>
                <h2 className="text-xl font-semibold text-gray-700 mt-1">Dispense Voucher</h2>
                <div className="mt-2">
                    <p className="text-sm text-gray-600">Control No: <span className="font-mono font-bold">{log.controlNumber}</span></p>
                    <p className="text-sm text-gray-500">Date Printed: {new Date().toLocaleString()}</p>
                </div>
            </div>
            {log.isFreeOfCharge && (
                <div className="my-4 p-3 bg-gray-100 border-2 border-dashed border-gray-400 text-center font-bold text-gray-700 text-lg tracking-wider">
                    ITEMS DISPENSED FREE OF CHARGE
                </div>
            )}
            <div className="space-y-1">
                <DetailRow label="Transaction Date" value={new Date(log.timestamp).toLocaleString()} />
                <DetailRow label="Facility" value={facility?.name} />
                <DetailRow label="Dispensed To" value={log.dispensedTo} />
                <DetailRow label="Issued By" value={user?.name} />
                <DetailRow label="Notes" value={log.notes} />
            </div>
            <ItemsTable footer={
                 <tr>
                    <td colSpan={5} className="p-2 border text-right font-bold">Total Value:</td>
                    <td className="p-2 border text-right font-bold">{formatCurrency(totalValue)}</td>
                </tr>
            }>
                {log.items.map((dispensedItem, idx) => {
                    const { item, master } = getItemDetails(dispensedItem.inventoryItemId);
                    const cost = log.isFreeOfCharge ? 0 : (item?.purchaseCost ?? master?.unitCost ?? 0);
                    const subtotal = cost * dispensedItem.quantity;
                    return (
                         <tr key={idx}>
                            <td className="p-2 border">{master?.name || 'Unknown Item'}</td>
                            <td className="p-2 border">{master?.brand || 'N/A'}</td>
                            <td className="p-2 border">{item?.batchNumber || 'N/A'}</td>
                            <td className="p-2 border text-right">{formatCurrency(cost)}</td>
                            <td className="p-2 border text-right">{dispensedItem.quantity} {master?.unit}</td>
                            <td className="p-2 border text-right">{formatCurrency(subtotal)}</td>
                        </tr>
                    );
                })}
            </ItemsTable>
            <StandardFooter />
        </PrintLayout>
    );
};

export default PrintDispensePage;