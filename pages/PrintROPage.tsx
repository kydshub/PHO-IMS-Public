import React, { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import NotFound from './NotFound';
import { ROLog, InventoryItem, ItemMaster } from '../types';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency } from '../utils/formatters';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';

const PrintROPage: React.FC = () => {
    const { logId } = useParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { roLogs, inventoryItems, itemMasters } = data;

    const log = useMemo(() => roLogs.find(l => l.id === logId), [logId, roLogs]);
    
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
        return <PrintLayout title="Voucher Not Found"><NotFound /></PrintLayout>;
    }
    
    return (
        <PrintLayout title={`Release Order - ${log.controlNumber}`}>
            <div className="border border-black p-4">
                <header className="flex flex-col items-center text-center mb-4">
                    <p className="text-sm">Republic of the Philippines</p>
                    <p className="text-sm font-bold">PROVINCE OF BATANGAS</p>
                    <p className="text-sm font-bold">{settings.organizationName.toUpperCase()}</p>
                </header>
                
                <div className="flex justify-between items-center border-y border-black py-1">
                    <p className="text-sm">Form No. <span className="font-semibold">22-064</span></p>
                </div>

                <div className="text-center my-4">
                    <h1 className="text-xl font-bold tracking-wider border-2 border-black inline-block px-8 py-1">RELEASE ORDER</h1>
                </div>

                <div className="flex justify-end mb-2">
                    <p className="text-sm">Date: <span className="font-semibold border-b border-black px-8">{new Date(log.timestamp).toLocaleDateString()}</span></p>
                </div>

                <p className="text-sm mb-2">THIS IS TO ORDER THE RELEASE OF THE FOLLOWING ITEM(S) TO: <span className="font-bold underline">{log.orderedTo}</span></p>

                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 text-center font-bold w-1/6">QUANTITY</th>
                            <th className="border border-black p-1 text-center font-bold w-4/6">PARTICULARS</th>
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
                                    <td className="border-r border-black p-1 text-center align-top">{dispensedItem.quantity}</td>
                                    <td className="border-r border-black p-1 align-top">
                                        <p className="font-bold">{master?.name || 'Unknown Item'}</p>
                                        {isFirstAidKit && (
                                            <div className="pl-4 text-xs">
                                                Content:<br/>
                                                1 pc. First Aid Bag<br/>
                                                1 pc. Digital Thermometer<br/>
                                                6 pcs. Alcohol swabs<br/>
                                                1 pair Sterile Gloves<br/>
                                                1 pc. Surgical Tape (1 inch)<br/>
                                                50 pcs. Band Aid<br/>
                                                5 pcs. Gauze Pads, 4x4<br/>
                                                5 pcs. Gauze Pads, 3x3<br/>
                                                1 pc. Cloth Triangular Bandage<br/>
                                                1 pc. Instant Ice Pack<br/>
                                                1 pc. Elastic Bandage, 2"<br/>
                                                1 pc. Tweezer<br/>
                                                1 pc. Scissor<br/>
                                                2 pcs. Rolled Gauze, 3"x5 yds<br/>
                                                2 pcs. Povidone Iodine Pads<br/>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-1 text-right align-top">{formatCurrency(itemValue)}</td>
                                </tr>
                            );
                        })}
                         {Array.from({ length: Math.max(0, 15 - log.items.length) }).map((_, idx) => (
                            <tr key={`blank-${idx}`}>
                                <td className="border-r border-black p-1 h-6">&nbsp;</td>
                                <td className="border-r border-black p-1"></td>
                                <td className="p-1"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="border-t-2 border-black p-1" colSpan={2}>PURPOSE: <span className="font-semibold">{log.purpose}</span></td>
                            <td className="border-t-2 border-black p-1 text-right font-bold">{formatCurrency(totalValue)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p>Recommending Approval:</p>
                        <p className="font-bold text-center mt-8 underline">{log.recommendingApproval}</p>
                    </div>
                     <div>
                        <p>Approved By:</p>
                        <p className="font-bold text-center mt-8 underline">{log.approvedBy}</p>
                    </div>
                </div>

            </div>
        </PrintLayout>
    );
};

export default PrintROPage;