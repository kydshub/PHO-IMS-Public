import React, { useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import NotFound from './NotFound';
import { RISLog, InventoryItem, ItemMaster } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/formatters';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

const PrintRISPage: React.FC = () => {
    const { logId } = useParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { risLogs, inventoryItems, itemMasters, users, facilities } = data;

    const log = useMemo(() => risLogs.find(l => l.id === logId), [logId, risLogs]);
    
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
                    <p className="mt-2 text-secondary-600">This page may have been accessed directly. Please generate a voucher from the RIS page first.</p>
                    <Link to="/ris">
                        <Button className="mt-6">Go to RIS Page</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }

    const issuedByUser = users.find(u => u.uid === log.userId);
    const facility = facilities.find(f => f.id === log.facilityId);
    
    return (
        <PrintLayout title={`RIS - ${log.controlNumber}`}>
            <div className="border border-black p-4">
                <header className="text-center mb-4">
                    <h1 className="text-xl font-bold">REQUISITION AND ISSUANCE SLIP</h1>
                    <p className="font-semibold">{settings.organizationName}</p>
                    <p className="text-sm">{facility?.name}</p>
                </header>

                <div className="flex justify-between text-sm mb-2">
                    <span>RIS No: <span className="font-bold underline">{log.controlNumber}</span></span>
                    <span>Date: <span className="font-bold underline">{new Date(log.timestamp).toLocaleDateString()}</span></span>
                </div>
                
                <p className="text-sm mb-2">Purpose: <span className="font-bold underline">{log.purpose}</span></p>

                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1 text-center font-bold w-1/6">QUANTITY</th>
                            <th className="border border-black p-1 text-center font-bold w-4/6">ITEM DESCRIPTION</th>
                            <th className="border border-black p-1 text-center font-bold w-1/6">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {log.items.map((dispensedItem, idx) => {
                            const { item, master } = getItemDetails(dispensedItem.inventoryItemId);
                            const isFirstAidKit = master?.name.toLowerCase().includes('first aid');
                            const cost = item?.purchaseCost ?? master?.unitCost ?? 0;
                            const itemValue = cost * dispensedItem.quantity;
                            return (
                                <tr key={idx}>
                                    <td className="border border-black p-1 text-center align-top">{dispensedItem.quantity} {master?.unit}</td>
                                    <td className="border border-black p-1 align-top">
                                        <p className="font-bold">{master?.name || 'Unknown Item'}</p>
                                        <p className="text-xs text-gray-600">Brand: {master?.brand || 'N/A'} | Batch: {item?.batchNumber || 'N/A'}</p>
                                    </td>
                                    <td className="border border-black p-1 text-right align-top">{formatCurrency(itemValue)}</td>
                                </tr>
                            );
                        })}
                         {Array.from({ length: Math.max(0, 15 - log.items.length) }).map((_, idx) => (
                            <tr key={`blank-${idx}`}>
                                <td className="border border-black p-1 h-6">&nbsp;</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="border-t-2 border-black p-1 text-right font-bold" colSpan={2}>TOTAL:</td>
                            <td className="border-t-2 border-black p-1 text-right font-bold">{formatCurrency(totalValue)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
                    <div>
                        <p>Requested by:</p>
                        <p className="font-bold text-center mt-12 border-t border-black pt-1">{log.requestedBy}</p>
                        <p className="text-center text-xs">(Signature over Printed Name)</p>
                    </div>
                     <div>
                        <p>Issued by:</p>
                        <p className="font-bold text-center mt-12 border-t border-black pt-1">{issuedByUser?.name}</p>
                        <p className="text-center text-xs">(Signature over Printed Name)</p>
                    </div>
                </div>

            </div>
        </PrintLayout>
    );
};

export default PrintRISPage;