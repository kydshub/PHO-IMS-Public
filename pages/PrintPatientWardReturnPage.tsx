import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { InternalReturnLog, InventoryItem, ItemMaster, DispenseLog } from '../types';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';
import { formatCurrency } from '../utils/formatters';
import NotFound from './NotFound';
import { Button } from '../components/ui/Button';

const PrintPatientWardReturnPage: React.FC = () => {
    const { logId } = useParams<{ logId: string }>();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { internalReturnLogs, inventoryItems, itemMasters, users, facilities, dispenseLogs } = data;

    const log = useMemo(() => internalReturnLogs.find(l => l.id === logId), [logId, internalReturnLogs]);

    const originalDispenseLog = useMemo(() => {
        if (!log?.originalDispenseId) return null;
        return dispenseLogs.find(d => d.id === log.originalDispenseId);
    }, [log, dispenseLogs]);

    const totalValue = useMemo(() => {
        if (!log) return 0;
        return log.items.reduce((acc, currentItem) => {
            const item = inventoryItems.find(i => i.id === currentItem.inventoryItemId);
            const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
            return acc + (currentItem.quantity * cost);
        }, 0);
    }, [log, inventoryItems, itemMasters]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
    }

    if (!log) {
        return <PrintLayout title="Voucher Not Found"><NotFound /></PrintLayout>;
    }
    
    const getItemDetails = (inventoryItemId: string) => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    };
    
    const userRecorded = users.find(u => u.uid === log.userId);
    const facility = facilities.find(f => f.id === log.facilityId);

    const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between py-1 text-base">
            <span className="font-semibold text-gray-600">{label}:</span>
            <span className="text-gray-800 text-right font-medium">{value || 'N/A'}</span>
        </div>
    );

    return (
        <PrintLayout title={`Internal Return Voucher - ${log.controlNumber}`}>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">{settings.appName}</h1>
                <h2 className="text-xl font-semibold text-gray-700 mt-1">Patient & Ward Return Voucher</h2>
                <div className="mt-2">
                    <p className="text-sm text-gray-600">Control No: <span className="font-mono font-bold">{log.controlNumber}</span></p>
                    <p className="text-sm text-gray-500">Date Printed: {new Date().toLocaleString()}</p>
                </div>
            </div>
            <div className="space-y-1">
                <DetailRow label="Transaction Date" value={new Date(log.timestamp).toLocaleString()} />
                <DetailRow label="Facility" value={facility?.name || 'N/A'} />
                <DetailRow label="Returned By" value={log.returnedBy} />
                <DetailRow label="Reason" value={log.reason} />
                <DetailRow label="Original Dispense Control #" value={originalDispenseLog?.controlNumber} />
                <DetailRow label="Recorded By" value={userRecorded?.name || 'N/A'} />
                <DetailRow label="Notes" value={log.notes} />
            </div>
            
             <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Items Returned</h3>
                <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">Item Name</th>
                            <th className="p-2 border text-left">Batch No.</th>
                            <th className="p-2 border text-right">Quantity</th>
                            <th className="p-2 border text-right">Unit Cost</th>
                            <th className="p-2 border text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                         {log.items.map((returnedItem, idx) => {
                            const { item, master } = getItemDetails(returnedItem.inventoryItemId);
                            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
                            const subtotal = cost * returnedItem.quantity;
                            return (
                                <tr key={idx}>
                                    <td className="p-2 border">{master?.name || 'Unknown Item'}</td>
                                    <td className="p-2 border">{item?.batchNumber || 'N/A'}</td>
                                    <td className="p-2 border text-right">{returnedItem.quantity} {master?.unit}</td>
                                    <td className="p-2 border text-right">{formatCurrency(cost)}</td>
                                    <td className="p-2 border text-right">{formatCurrency(subtotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="p-2 border text-right font-bold">Total Value:</td>
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
                    <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Verified By (Name & Signature)</div>
                </div>
            </div>
        </PrintLayout>
    );
};

export default PrintPatientWardReturnPage;