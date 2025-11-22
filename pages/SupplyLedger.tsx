import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Spinner } from '../components/ui/Spinner';
import { useDatabase } from '../hooks/useDatabase';
import { TablePagination } from '../components/ui/TablePagination';
import { Facility, FacilityStatus, ItemMaster, PhysicalCountStatus, Role, TransferStatus, LedgerEntry, ItemType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { logAuditEvent } from '../services/audit';
import { PurgeLedgerEntryModal } from '../components/ui/PurgeLedgerEntryModal';
import { useInfoModal } from '../hooks/useInfoModal';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const RightArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

type DownstreamTransaction = {
    table: string;
    id: string;
    type: string;
    reference: string;
};

const SupplyLedger: React.FC = () => {
    const { itemMasterId } = useParams<{ itemMasterId: string }>();
    const navigate = useNavigate();
    const { data, loading: dbLoading } = useDatabase();
    const { user } = useAuth();
    const { showError, showSuccess } = useInfoModal();
    const isEncoder = user?.role === Role.Encoder;
    
    const [filters, setFilters] = useState({
        facilityId: isEncoder ? user?.facilityId || '' : '',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
    const [entryToPurge, setEntryToPurge] = useState<LedgerEntry | null>(null);
    const [downstreamTransactions, setDownstreamTransactions] = useState<DownstreamTransaction[]>([]);

    const navigableItems = useMemo(() => {
        const baseItems = data.itemMasters
            .filter(im => im.itemType === ItemType.Consumable || im.itemType === ItemType.Equipment);

        if (user?.role === Role.Encoder && user.facilityId) {
            const storageLocationToFacilityMap = new Map(data.storageLocations.map(sl => [sl.id, sl.facilityId]));
            
            const itemMasterIdsInFacility = new Set(
                data.inventoryItems
                    .filter(item => {
                        const facilityId = storageLocationToFacilityMap.get(item.storageLocationId);
                        return facilityId === user.facilityId && !item.isConsignment;
                    })
                    .map(item => item.itemMasterId)
            );

            return baseItems
                .filter(im => itemMasterIdsInFacility.has(im.id))
                .sort((a, b) => a.name.localeCompare(b.name));
        }

        return baseItems.sort((a, b) => a.name.localeCompare(b.name));
    }, [data.itemMasters, data.inventoryItems, data.storageLocations, user]);
    
    const { currentIndex, prevItem, nextItem } = useMemo(() => {
        if (!itemMasterId || navigableItems.length === 0) {
            return { currentIndex: -1, prevItem: null, nextItem: null };
        }
        const currentIndex = navigableItems.findIndex(item => item.id === itemMasterId);
        if (currentIndex === -1) {
            return { currentIndex: -1, prevItem: null, nextItem: null };
        }
        const prevItem = currentIndex > 0 ? navigableItems[currentIndex - 1] : null;
        const nextItem = currentIndex < navigableItems.length - 1 ? navigableItems[currentIndex + 1] : null;
        return { currentIndex, prevItem, nextItem };
    }, [itemMasterId, navigableItems]);

    const { itemMaster, allTransactions } = useMemo(() => {
        if (!itemMasterId || dbLoading) return { itemMaster: null, allTransactions: [] };
        
        const targetItemMaster = data.itemMasters.find(im => im.id === itemMasterId);
        if (!targetItemMaster) return { itemMaster: null, allTransactions: [] };

        const facilityNameMap = new Map(data.facilities.map(f => [f.id, f.name]));
        const inventoryItemDetailsMap = new Map(data.inventoryItems.map(ii => [ii.id, { itemMasterId: ii.itemMasterId, isConsignment: !!ii.isConsignment }]));
        
        const transactions: Omit<LedgerEntry, 'balance'>[] = [];
        
        const PURGEABLE_TYPES = ['dispenseLogs', 'risLogs', 'roLogs', 'writeOffLogs', 'returnLogs', 'adjustmentLogs', 'receiveLogs', 'internalReturnLogs'];

        const processLogs = <T extends { id: string; controlNumber: string; timestamp: string; items: any[]; facilityId: string }>(
            logs: T[],
            type: string,
            logTable: string,
            detailsFn: (log: any) => string,
            inOrOut: 'in'|'out'
        ) => {
            (logs || []).forEach(log => {
                const isPurgeable = PURGEABLE_TYPES.includes(logTable);
                (log.items || []).forEach((item: any) => {
                    const details = inventoryItemDetailsMap.get(item.inventoryItemId);
                    if (details && details.itemMasterId === itemMasterId && !details.isConsignment) {
                        transactions.push({
                            logId: log.id,
                            logTable,
                            date: new Date(log.timestamp),
                            type,
                            reference: log.controlNumber,
                            details: detailsFn(log),
                            facilityId: log.facilityId,
                            facilityName: facilityNameMap.get(log.facilityId) || 'N/A',
                            quantityIn: inOrOut === 'in' ? item.quantity : 0,
                            quantityOut: inOrOut === 'out' ? item.quantity : 0,
                            isPurgeable,
                            transactionItems: log.items
                        });
                    }
                });
            });
        };
        
        data.receiveLogs.forEach(log => {
            if (log.isConsignment) return;
            log.items.forEach(item => {
                if(item.itemMasterId === itemMasterId) {
                    transactions.push({
                        logId: log.id,
                        logTable: 'receiveLogs',
                        date: new Date(log.timestamp),
                        type: 'Receiving',
                        reference: log.controlNumber,
                        details: `From: ${data.suppliers.find(s => s.id === log.supplierId)?.name || 'N/A'}`,
                        facilityId: log.facilityId,
                        facilityName: facilityNameMap.get(log.facilityId) || 'N/A',
                        quantityIn: item.quantity,
                        quantityOut: 0,
                        isPurgeable: true,
                        transactionItems: [],
                        affectedInventoryItemIds: log.affectedInventoryItemIds
                    });
                }
            })
        });

        processLogs(data.internalReturnLogs, 'Internal Return', 'internalReturnLogs', log => `From: ${log.returnedBy}`, 'in');
        processLogs(data.dispenseLogs, 'Dispense', 'dispenseLogs', log => `To: ${log.dispensedTo}`, 'out');
        processLogs(data.risLogs, 'RIS', 'risLogs', log => `To: ${log.requestedBy}`, 'out');
        processLogs(data.roLogs, 'RO', 'roLogs', log => `To: ${log.orderedTo}`, 'out');
        processLogs(data.writeOffLogs.filter(l => !l.controlNumber.startsWith('C-WO-')), 'Write-Off', 'writeOffLogs', log => `Reason: ${log.reason}`, 'out');
        processLogs(data.returnLogs.filter(l => !l.isConsignmentReturn), 'Return', 'returnLogs', log => `To Supplier`, 'out');

        data.transferLogs.forEach(log => {
            if (log.isConsignment) return;
            log.items.forEach(item => {
                if (inventoryItemDetailsMap.get(item.inventoryItemId)?.itemMasterId === itemMasterId) {
                    transactions.push({ logId: log.id, logTable: 'transferLogs', date: new Date(log.timestamp), type: 'Transfer Out', reference: log.controlNumber, details: `To: ${facilityNameMap.get(log.toFacilityId) || 'N/A'}`, facilityId: log.fromFacilityId, facilityName: facilityNameMap.get(log.fromFacilityId) || 'N/A', quantityIn: 0, quantityOut: item.quantity, isPurgeable: false, transactionItems: [] });
                    if (log.status !== TransferStatus.Pending && log.acknowledgementTimestamp) {
                        const receivedQty = log.status === TransferStatus.Discrepancy ? log.receivedItems?.find(ri => ri.inventoryItemId === item.inventoryItemId)?.quantity ?? 0 : item.quantity;
                         if (receivedQty > 0) {
                            transactions.push({ logId: log.id, logTable: 'transferLogs', date: new Date(log.acknowledgementTimestamp), type: `Transfer In`, reference: log.controlNumber, details: `From: ${facilityNameMap.get(log.fromFacilityId) || 'N/A'}`, facilityId: log.toFacilityId, facilityName: facilityNameMap.get(log.toFacilityId) || 'N/A', quantityIn: receivedQty, quantityOut: 0, isPurgeable: false, transactionItems: [] });
                        }
                    }
                }
            });
        });
        
        data.adjustmentLogs.forEach(log => {
             if (log.itemMasterId === itemMasterId && !log.isConsignment) {
                const variance = log.toQuantity - log.fromQuantity;
                transactions.push({ logId: log.id, logTable: 'adjustmentLogs', date: new Date(log.timestamp), type: 'Adjustment', reference: log.controlNumber, details: `Reason: ${log.reason}`, facilityId: log.facilityId, facilityName: facilityNameMap.get(log.facilityId) || 'N/A', quantityIn: variance > 0 ? variance : 0, quantityOut: variance < 0 ? -variance : 0, isPurgeable: true, transactionItems: [{inventoryItemId: log.inventoryItemId, quantity: variance}] });
            }
        });
        
        data.physicalCounts.forEach(count => {
            if (count.status === PhysicalCountStatus.Completed && count.reviewedTimestamp) {
                const reviewDate = new Date(count.reviewedTimestamp);
                (count.items || []).forEach(item => {
                    const itemMasterIdForCount = inventoryItemDetailsMap.get(item.inventoryItemId)?.itemMasterId;
                    if (itemMasterIdForCount === itemMasterId) {
                        const variance = (item.countedQuantity ?? item.systemQuantity) - item.systemQuantity;
                        if (variance !== 0) {
                            transactions.push({
                                logId: count.id,
                                logTable: 'physicalCounts',
                                date: reviewDate,
                                type: 'Count Adjustment',
                                reference: count.name,
                                details: `Variance Reason: ${item.reasonCode || 'N/A'}`,
                                facilityId: count.facilityId,
                                facilityName: facilityNameMap.get(count.facilityId) || 'N/A',
                                quantityIn: variance > 0 ? variance : 0,
                                quantityOut: variance < 0 ? -variance : 0,
                                isPurgeable: false,
                                transactionItems: [],
                            });
                        }
                    }
                });
            }
        });

        return { itemMaster: targetItemMaster, allTransactions: transactions };
    }, [itemMasterId, dbLoading, data]);

    const ledgerEntries = useMemo(() => {
        const sorted = [...allTransactions].sort((a, b) => a.date.getTime() - b.date.getTime());
        let filtered = sorted;
        if (filters.facilityId) filtered = sorted.filter(t => t.facilityId === filters.facilityId);
        
        const startDate = filters.startDate ? new Date(filters.startDate).setHours(0,0,0,0) : null;
        const endDate = filters.endDate ? new Date(filters.endDate).setHours(23,59,59,999) : null;

        const transactionsBeforeStartDate = sorted.filter(t => {
            const facilityMatch = !filters.facilityId || t.facilityId === filters.facilityId;
            return facilityMatch && startDate && t.date.getTime() < startDate;
        });
        
        let startingBalance = transactionsBeforeStartDate.reduce((balance, t) => balance + t.quantityIn - t.quantityOut, 0);

        const visibleTransactions = filtered.filter(t => {
            const transactionDate = t.date.getTime();
            return (!startDate || transactionDate >= startDate) && (!endDate || transactionDate <= endDate);
        });

        return visibleTransactions.map(t => {
            startingBalance += t.quantityIn - t.quantityOut;
            return { ...t, balance: startingBalance };
        }).reverse();
    }, [allTransactions, filters]);
    
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return ledgerEntries.slice(startIndex, startIndex + itemsPerPage);
    }, [ledgerEntries, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(ledgerEntries.length / itemsPerPage);

    const handlePurgeClick = (entry: LedgerEntry) => {
        setEntryToPurge(entry);

        if (entry.logTable === 'receiveLogs') {
            const receiveLog = data.receiveLogs.find(l => l.id === entry.logId);
            const itemIdsToCheck = new Set(receiveLog?.affectedInventoryItemIds || []);
            
            if(itemIdsToCheck.size === 0) {
                setIsPurgeModalOpen(true);
                return;
            }

            const hardDependency = data.transferLogs.some(log => 
                log.status !== TransferStatus.Pending && 
                log.items.some(item => itemIdsToCheck.has(item.inventoryItemId))
            );

            if (hardDependency) {
                showError({ title: 'Purge Blocked', message: 'Cannot purge this receiving voucher. An item from this batch was part of a transfer that has already been acknowledged by another facility. This action would corrupt data integrity across facilities.' });
                return;
            }
            
            const downstream: DownstreamTransaction[] = [];
            const logTypesToScan = [
                { table: 'dispenseLogs', logs: data.dispenseLogs, type: 'Dispense' },
                { table: 'risLogs', logs: data.risLogs, type: 'RIS' },
                { table: 'roLogs', logs: data.roLogs, type: 'RO' },
                { table: 'writeOffLogs', logs: data.writeOffLogs, type: 'Write-Off' },
                { table: 'returnLogs', logs: data.returnLogs, type: 'Return' },
                { table: 'transferLogs', logs: data.transferLogs, type: 'Transfer' },
            ];

            logTypesToScan.forEach(({ table, logs, type }) => {
                (logs || []).forEach(log => {
                    if ((log.items || []).some((item: any) => itemIdsToCheck.has(item.inventoryItemId))) {
                        downstream.push({ table, id: log.id, type, reference: log.controlNumber });
                    }
                });
            });

            setDownstreamTransactions(downstream);
        }

        setIsPurgeModalOpen(true);
    };

    const handleConfirmPurge = async () => {
        if (!entryToPurge || !user) return;
        const { logId, logTable, transactionItems, type, reference, details } = entryToPurge;
    
        try {
            const updates: Record<string, any> = {};
            updates[`/${logTable}/${logId}`] = null;
    
            if (logTable === 'receiveLogs') {
                const receiveLog = data.receiveLogs.find(l => l.id === logId);
                const itemIdsToDelete = receiveLog?.affectedInventoryItemIds || [];
                itemIdsToDelete.forEach(id => {
                    updates[`/inventoryItems/${id}`] = null;
                });
                downstreamTransactions.forEach(tx => {
                    updates[`/${tx.table}/${tx.id}`] = null;
                });
                await db.ref().update(updates);
            } else {
                await db.ref().update(updates); 
    
                for (const item of transactionItems) {
                    const quantityChange = (logTable === 'adjustmentLogs' ? -item.quantity : item.quantity);
                    const itemRef = db.ref(`/inventoryItems/${item.inventoryItemId}/quantity`);
                    await itemRef.transaction(currentQty => (currentQty || 0) + quantityChange);
                }
            }
    
            await logAuditEvent(user, 'Transaction Purge', { purgedLog: { type, reference, details } });
            showSuccess({ title: 'Success', message: 'Transaction and all related logs purged successfully.' });
        } catch (error: any) {
            console.error('Failed to purge transaction:', error);
            showError({ title: "Purge Failed", message: `An error occurred: ${error.message}` });
        } finally {
            setIsPurgeModalOpen(false);
            setEntryToPurge(null);
            setDownstreamTransactions([]);
        }
    };
    
    if (dbLoading) return <div className="text-center p-8"><Spinner size="lg" /></div>;
    if (!itemMaster) return <div className="text-center p-8">Item not found.</div>;

    const exportToCSV = () => { /* ... implementation ... */ };
    const handlePrint = () => navigate('/print/supply-ledger', { state: { itemMaster, ledgerEntries, filters, facilities: data.facilities } });

    return (
        <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/inventory/commodities')} className="mb-2 -ml-3 text-secondary-600 hover:text-secondary-900">
                        <BackIcon />
                        <span className="ml-2">Back to Inventory</span>
                    </Button>
                    <h2 className="text-3xl font-semibold text-secondary-800">Supply Ledger</h2>
                    <div className="flex items-center gap-2 mt-2 bg-secondary-50 p-2 rounded-lg border">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/supply-ledger/${prevItem!.id}`)} disabled={!prevItem} title={prevItem ? `Previous: ${prevItem.name}` : 'No previous item'}>
                            <BackIcon />
                        </Button>
                        <div className="text-center flex-grow overflow-hidden">
                            <p className="text-xl font-medium text-secondary-900 truncate" title={itemMaster.name}>
                                {itemMaster.name}
                            </p>
                            <p className="text-xs text-secondary-500">{currentIndex >= 0 ? `${currentIndex + 1} of ${navigableItems.length} items` : ''}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/supply-ledger/${nextItem!.id}`)} disabled={!nextItem} title={nextItem ? `Next: ${nextItem.name}` : 'No next item'}>
                            <RightArrowIcon />
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 self-start mt-8 md:mt-0">
                    <Button onClick={exportToCSV} leftIcon={<DownloadIcon />} variant="secondary">Export CSV</Button>
                    <Button onClick={handlePrint} leftIcon={<PrintIcon />} variant="secondary">Print</Button>
                </div>
            </div>
            
             <Card className="mb-6">
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                     <Select label="Filter by Facility" value={filters.facilityId} onChange={e => setFilters(prev => ({...prev, facilityId: e.target.value}))} disabled={isEncoder}>
                        {!isEncoder && <option value="">All Facilities</option>}
                        {data.facilities.filter(f => f.status === FacilityStatus.Active && (!isEncoder || f.id === user?.facilityId)).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                     <DatePicker label="Start Date" selectedDate={filters.startDate} onSelectDate={(date) => setFilters(prev => ({...prev, startDate: date}))} />
                    <DatePicker label="End Date" selectedDate={filters.endDate} onSelectDate={(date) => setFilters(prev => ({...prev, endDate: date}))} />
                </div>
            </Card>

            <Card footer={ <TablePagination currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={ledgerEntries.length} startItemIndex={(currentPage - 1) * itemsPerPage} endItemIndex={Math.min(((currentPage - 1) * itemsPerPage) + itemsPerPage, ledgerEntries.length)} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} /> }>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                             <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Facility</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Reference</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Details</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">In</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Out</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Balance</th>
                                 {user?.role === Role.SystemAdministrator && <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                           {paginatedItems.map((entry, index) => (
                               <tr key={`${entry.logId}-${index}`}>
                                   <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-500">{entry.date.toLocaleString()}</td>
                                   <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-800 font-medium">{entry.type}</td>
                                   <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-500">{entry.facilityName}</td>
                                   <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-500 font-mono">{entry.reference}</td>
                                   <td className="px-4 py-3 text-sm text-secondary-500 max-w-xs">{entry.details}</td>
                                   <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">{entry.quantityIn > 0 ? `+${entry.quantityIn}` : ''}</td>
                                   <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">{entry.quantityOut > 0 ? `-${entry.quantityOut}` : ''}</td>
                                   <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-secondary-900">{entry.balance}</td>
                                   {user?.role === Role.SystemAdministrator && (
                                       <td className="px-4 py-3 whitespace-nowrap text-right">
                                           {entry.isPurgeable && (
                                               <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => handlePurgeClick(entry)} title="Purge Transaction"><TrashIcon /></Button>
                                           )}
                                       </td>
                                   )}
                               </tr>
                           ))}
                        </tbody>
                    </table>
                     {ledgerEntries.length === 0 && <div className="text-center p-8 text-secondary-500">No transactions found for this item in the selected period.</div>}
                </div>
            </Card>

            {isPurgeModalOpen && entryToPurge && (
                <PurgeLedgerEntryModal
                    isOpen={isPurgeModalOpen}
                    onClose={() => setIsPurgeModalOpen(false)}
                    onConfirm={handleConfirmPurge}
                    entryDetails={{ type: entryToPurge.type, reference: entryToPurge.reference, details: entryToPurge.details }}
                    downstreamTransactions={downstreamTransactions}
                />
            )}
        </div>
    );
};

export default SupplyLedger;
