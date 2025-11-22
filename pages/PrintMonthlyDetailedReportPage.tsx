import React, { useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useDatabase } from '../hooks/useDatabase';
import { ItemMaster, PhysicalCountStatus, TransferStatus, ReceiveLog, DispenseLog, WriteOffLog, ReturnLog, TransferLog as TransferLogType, PhysicalCount, AdjustmentLog, InventoryItem, RISLog, ROLog } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { useSettings } from '../hooks/useSettings';

interface MonthlyReportData {
    itemMaster: ItemMaster;
    beginningBalance: number;
    received: number;
    dispensed: number;
    transferredIn: number;
    transferredOut: number;
    writeOff: number;
    adjusted: number;
    endingBalance: number;
}

const PrintMonthlyDetailedReportPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { data, loading: dbLoading } = useDatabase();
    const { settings } = useSettings();
    const { reportDateRange, facilityId, categoryId, generatedDate } = location.state || {};

    const reportData = useMemo(() => {
        if (dbLoading || !reportDateRange) return null;

        const { month, year } = reportDateRange;
        const startDate = new Date(year, month, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const facilityName = facilityId ? data.facilities.find(f => f.id === facilityId)?.name : 'All Facilities';
        const categoryName = categoryId ? data.categories.find(c => c.id === categoryId)?.name : 'All Categories';
        const itemMovements = new Map<string, Omit<MonthlyReportData, 'itemMaster' | 'endingBalance'>>();
        
        const inventoryItemMasterMap = new Map(data.inventoryItems.map((ii: InventoryItem) => [ii.id, ii.itemMasterId]));

        const initializeItem = (itemMasterId: string) => {
            if (!itemMovements.has(itemMasterId)) {
                itemMovements.set(itemMasterId, { beginningBalance: 0, received: 0, dispensed: 0, transferredIn: 0, transferredOut: 0, writeOff: 0, adjusted: 0 });
            }
        };

        const processTransactions = <T extends { timestamp: string; items: any[]; facilityId: string }>(
            logs: T[],
            type: 'in' | 'out',
            field: keyof Omit<MonthlyReportData, 'itemMaster' | 'endingBalance' | 'beginningBalance'>,
            getLogData: (log: T, item: T['items'][number]) => { itemMasterId: string; quantity: number; logFacilityId: string } | null
        ) => {
            (logs || []).forEach((log: T) => {
                const logDate = new Date(log.timestamp);
                (log.items || []).forEach((item: any) => {
                    const logData = getLogData(log, item);
                    if (!logData) return;
        
                    const { itemMasterId, quantity, logFacilityId } = logData;
                    if (!itemMasterId) return;
                    initializeItem(itemMasterId);
                    const movement = itemMovements.get(itemMasterId)!;
                    
                    if (facilityId && logFacilityId !== facilityId) return;
        
                    if (logDate < startDate) {
                        movement.beginningBalance += (type === 'in' ? quantity : -quantity);
                    } else if (logDate >= startDate && logDate <= endDate) {
                        (movement[field] as number) += quantity;
                    }
                });
            });
        };

        processTransactions(data.receiveLogs, 'in', 'received', (log: ReceiveLog, item: any) => ({ itemMasterId: item.itemMasterId, quantity: item.quantity, logFacilityId: log.facilityId }));
        const outboundLogs = [...data.dispenseLogs, ...data.risLogs, ...data.roLogs];
        // FIX: Add explicit types to resolve 'unknown' to 'string' assignment errors.
        processTransactions(outboundLogs, 'out', 'dispensed', (log: DispenseLog | RISLog | ROLog, item: any) => ({ itemMasterId: inventoryItemMasterMap.get(item.inventoryItemId) as string, quantity: item.quantity, logFacilityId: log.facilityId }));
        processTransactions(data.writeOffLogs, 'out', 'writeOff', (log: WriteOffLog, item: any) => ({ itemMasterId: inventoryItemMasterMap.get(item.inventoryItemId) as string, quantity: item.quantity, logFacilityId: log.facilityId }));
        processTransactions(data.returnLogs, 'out', 'writeOff', (log: ReturnLog, item: any) => ({ itemMasterId: inventoryItemMasterMap.get(item.inventoryItemId) as string, quantity: item.quantity, logFacilityId: log.facilityId }));


        data.transferLogs.forEach((log: TransferLogType) => {
            const transferDate = new Date(log.timestamp);
            (log.items || []).forEach((item: any) => {
                // FIX: Add explicit types to resolve 'unknown' to 'string' assignment errors.
                const itemMasterId = inventoryItemMasterMap.get(item.inventoryItemId) as string;
                if(!itemMasterId) return;
                initializeItem(itemMasterId);
                const movement = itemMovements.get(itemMasterId)!;

                if (!facilityId || log.fromFacilityId === facilityId) {
                    if (transferDate < startDate) movement.beginningBalance -= item.quantity;
                    else if (transferDate <= endDate) movement.transferredOut += item.quantity;
                }
                
                if (!facilityId || log.toFacilityId === facilityId) {
                    const ackDate = log.acknowledgementTimestamp ? new Date(log.acknowledgementTimestamp) : null;
                    if (ackDate) {
                        const receivedQty = log.status === TransferStatus.Discrepancy ? log.receivedItems?.find((ri: any) => ri.inventoryItemId === item.inventoryItemId)?.quantity ?? item.quantity : item.quantity;
                         if (ackDate < startDate) movement.beginningBalance += receivedQty;
                         else if (ackDate <= endDate) movement.transferredIn += receivedQty;
                    }
                }
            });
        });
        
        data.physicalCounts.forEach((count: PhysicalCount) => {
            if (count.status === PhysicalCountStatus.Completed && count.reviewedTimestamp) {
                const reviewDate = new Date(count.reviewedTimestamp);
                (count.items || []).forEach((item: any) => {
                    // FIX: Add explicit types to resolve 'unknown' to 'string' assignment errors.
                    const itemMasterId = inventoryItemMasterMap.get(item.inventoryItemId) as string;
                    if(!itemMasterId) return;
                    initializeItem(itemMasterId);
                    const movement = itemMovements.get(itemMasterId)!;
                    if(facilityId && count.facilityId !== facilityId) return;
                    const variance = (item.countedQuantity ?? item.systemQuantity) - item.systemQuantity;
                    if (reviewDate < startDate) movement.beginningBalance += variance;
                    else if (reviewDate <= endDate) movement.adjusted += variance;
                });
            }
        });

        data.adjustmentLogs.forEach((log: AdjustmentLog) => {
             initializeItem(log.itemMasterId);
             const movement = itemMovements.get(log.itemMasterId)!;
             if(facilityId && log.facilityId !== facilityId) return;
             const variance = log.toQuantity - log.fromQuantity;
             const logDate = new Date(log.timestamp);
             if (logDate < startDate) movement.beginningBalance += variance;
             else if (logDate <= endDate) movement.adjusted += variance;
        });

        const report: MonthlyReportData[] = [];
        itemMovements.forEach((mov, id) => {
            const itemMaster = data.itemMasters.find(im => im.id === id);
            if(!itemMaster) return;

            if (categoryId && itemMaster.categoryId !== categoryId) return;
            
            const totalIn = mov.received + mov.transferredIn + (mov.adjusted > 0 ? mov.adjusted : 0);
            const totalOut = mov.dispensed + mov.transferredOut + mov.writeOff + (mov.adjusted < 0 ? -mov.adjusted : 0);
            
            if (mov.beginningBalance !== 0 || totalIn !== 0 || totalOut !== 0) {
                 report.push({
                    itemMaster, ...mov,
                    endingBalance: mov.beginningBalance + totalIn - totalOut,
                });
            }
        });

        return { report, facilityName, categoryName, reportDateRange, generatedDate };

    }, [dbLoading, reportDateRange, facilityId, categoryId, data]);


    useEffect(() => {
        if (reportData) {
            document.title = `Monthly Report - ${reportData.facilityName}`;
            const timeoutId = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timeoutId);
        }
    }, [reportData]);

    if (dbLoading) {
        return <div className="p-8 text-center"><Spinner size="lg" /></div>;
    }

    if (!reportData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-secondary-100 p-4 no-print">
                <div className="text-center bg-white p-10 rounded-lg shadow-xl">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page may have been accessed directly. Please generate a report from the Reports page first.</p>
                    <Link to="/reports">
                        <Button className="mt-6">Go to Reports Page</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const { report, facilityName, categoryName, reportDateRange: { month, year } } = reportData;
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Monthly Inventory Movement Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Facility:</strong> {facilityName}</p>
                <p><strong>Category:</strong> {categoryName}</p>
                <p><strong>Period:</strong> {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                <p><strong>Date Generated:</strong> {new Date(generatedDate).toLocaleString()}</p>
            </div>
        </div>
    );
    
    return (
        <>
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; margin: 0 !important; }
                    .no-print { display: none !important; }
                    .printable-area { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 1.5rem !important; }
                    @page { size: landscape; }
                }
            `}</style>
             <div className="bg-gray-200 p-4 sm:p-8 no-print">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center">
                        <h3 className="font-semibold">Print Preview</h3>
                        <div>
                            <Button variant="secondary" onClick={() => window.print()} className="mr-2">Print</Button>
                            <Button variant="danger" onClick={() => navigate(-1)}>Close</Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto p-8 sm:p-12 bg-white font-sans printable-area shadow-lg">
                <ReportHeader />
                <section className="mb-8 break-inside-avoid">
                    <table className="min-w-full text-xs border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th rowSpan={2} className="p-1 border text-left font-bold uppercase text-gray-600 align-bottom">Item Name</th>
                                <th rowSpan={2} className="p-1 border text-right font-bold uppercase text-gray-600 align-bottom">Beginning Balance</th>
                                <th colSpan={2} className="p-1 border text-center font-bold uppercase text-gray-600">Transferred</th>
                                <th rowSpan={2} className="p-1 border text-right font-bold uppercase text-gray-600 align-bottom">Received</th>
                                <th rowSpan={2} className="p-1 border text-right font-bold uppercase text-gray-600 align-bottom">Dispensed</th>
                                <th rowSpan={2} className="p-1 border text-right font-bold uppercase text-gray-600 align-bottom">Written-Off</th>
                                <th rowSpan={2} className="p-1 border text-right font-bold uppercase text-gray-600 align-bottom">Adjusted</th>
                                <th rowSpan={2} className="p-1 border text-right font-bold uppercase text-gray-600 align-bottom">Ending Balance</th>
                            </tr>
                            <tr>
                                <th className="p-1 border text-right font-bold uppercase text-gray-600">In</th>
                                <th className="p-1 border text-right font-bold uppercase text-gray-600">Out</th>
                            </tr>
                        </thead>
                        <tbody>
                           {report.sort((a,b) => a.itemMaster.name.localeCompare(b.itemMaster.name)).map(item => (
                               <tr key={item.itemMaster.id} className="border-t">
                                   <td className="p-1 border font-medium">{item.itemMaster.name}</td>
                                   <td className="p-1 border text-right">{item.beginningBalance}</td>
                                   <td className="p-1 border text-right text-green-600">{item.transferredIn || ''}</td>
                                   <td className="p-1 border text-right text-red-600">{item.transferredOut || ''}</td>
                                   <td className="p-1 border text-right text-green-600">{item.received || ''}</td>
                                   <td className="p-1 border text-right text-red-600">{item.dispensed || ''}</td>
                                   <td className="p-1 border text-right text-red-600">{item.writeOff || ''}</td>
                                   <td className="p-1 border text-right text-blue-600">{item.adjusted !== 0 ? item.adjusted > 0 ? `+${item.adjusted}`: item.adjusted : ''}</td>
                                   <td className="p-1 border text-right font-bold">{item.endingBalance}</td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                    {report.length === 0 && <p className="text-gray-600 text-sm p-4 text-center bg-gray-50 rounded-md">No inventory movements recorded for the selected period.</p>}
                </section>
                <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center text-sm">
                    <div>
                        <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Prepared By (Name & Signature)</div>
                    </div>
                    <div>
                        <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Reviewed By (Name & Signature)</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrintMonthlyDetailedReportPage;