import React, { useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import NotFound from './NotFound';
import { TransferLog, InventoryItem, ItemMaster } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/formatters';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

const PrintTransferPage: React.FC = () => {
    const { logId } = useParams<{ logId: string }>();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { transferLogs, inventoryItems, itemMasters, users, facilities } = data;

    const log = useMemo(() => transferLogs.find(l => l.id === logId && !l.isConsignment), [logId, transferLogs]);

    const getItemDetails = useCallback((inventoryItemId: string): { item: InventoryItem | undefined, master: ItemMaster | undefined } => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    }, [inventoryItems, itemMasters]);

    const totalValue = useMemo(() => {
        if (!log) return 0;
        return log.items.reduce((acc, currentItem) => {
            const { item, master } = getItemDetails(currentItem.inventoryItemId);
            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
            return acc + (currentItem.quantity * cost);
        }, 0);
    }, [log, getItemDetails]);


    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
    }

    if (!log) {
        return (
            <PrintLayout title="Voucher Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page may have been accessed directly. Please generate a voucher from the Transfers page first.</p>
                    <Link to="/transfers">
                        <Button className="mt-6">Go to Transfers Page</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const userInitiated = users.find(u => u.uid === log.initiatedByUserId);
    const fromFacility = facilities.find(f => f.id === log.fromFacilityId);
    const toFacility = facilities.find(f => f.id === log.toFacilityId);
    const userAcknowledged = users.find(u => u.uid === log.acknowledgedByUserId);

    const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between py-1 text-base">
            <span className="font-semibold text-gray-600">{label}:</span>
            <span className="text-gray-800 text-right font-medium">{value || 'N/A'}</span>
        </div>
    );
    
    const renderHeader = (title: string, controlNumber: string) => (
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-xl font-semibold text-gray-700 mt-1">{title}</h2>
            <div className="mt-2">
                <p className="text-sm text-gray-600">Control No: <span className="font-mono font-bold">{controlNumber}</span></p>
                <p className="text-sm text-gray-500">Date Printed: {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
    
    const renderFooter = () => (
        <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center">
            <div>
                <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Prepared By (Name & Signature)</div>
            </div>
             <div>
                <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Received By (Name & Signature)</div>
            </div>
        </div>
    );

    return (
        <PrintLayout title={`Transfer Slip - ${log.controlNumber}`}>
            {renderHeader("Stock Transfer Slip", log.controlNumber)}
            <div className="space-y-1">
                <DetailRow label="Transaction Date" value={new Date(log.timestamp).toLocaleString()} />
                <DetailRow label="From Facility" value={fromFacility?.name} />
                <DetailRow label="To Facility" value={toFacility?.name} />
                <DetailRow label="Initiated By" value={userInitiated?.name} />
                <DetailRow label="Status" value={<span className="font-bold">{log.status}</span>} />
                {log.acknowledgedByUserId && <DetailRow label="Acknowledged By" value={userAcknowledged?.name} />}
                {log.acknowledgementTimestamp && <DetailRow label="Date Acknowledged" value={new Date(log.acknowledgementTimestamp).toLocaleString()} />}
                <DetailRow label="Notes" value={log.notes} />
            </div>
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Items Transferred</h3>
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
                    <tbody>
                        {log.items.map((transferredItem, idx) => {
                            const { item, master } = getItemDetails(transferredItem.inventoryItemId);
                            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
                            const subtotal = cost * transferredItem.quantity;
                            return (
                                <tr key={idx}>
                                    <td className="p-2 border">{master?.name || 'Unknown Item'}</td>
                                    <td className="p-2 border">{master?.brand || 'N/A'}</td>
                                    <td className="p-2 border">{item?.batchNumber || 'N/A'}</td>
                                    <td className="p-2 border text-right">{formatCurrency(cost)}</td>
                                    <td className="p-2 border text-right">{transferredItem.quantity} {master?.unit}</td>
                                    <td className="p-2 border text-right">{formatCurrency(subtotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="p-2 border text-right font-bold">Total Value:</td>
                            <td className="p-2 border text-right font-bold">{formatCurrency(totalValue)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            {renderFooter()}
        </PrintLayout>
    );
};

export default PrintTransferPage;