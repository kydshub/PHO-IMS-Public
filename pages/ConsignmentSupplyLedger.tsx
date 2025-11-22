import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Spinner } from '../components/ui/Spinner';
import { useDatabase } from '../hooks/useDatabase';
import { TablePagination } from '../components/ui/TablePagination';
import { Facility, FacilityStatus, ItemMaster, PhysicalCountStatus, Role, TransferStatus, LedgerEntry, ItemType, ReceiveLog, WriteOffLog, ReturnLog } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { logAuditEvent } from '../services/audit';
import { PurgeLedgerEntryModal } from '../components/ui/PurgeLedgerEntryModal';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const RightArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const ConsignmentSupplyLedger: React.FC = () => {
    const { itemMasterId } = useParams<{ itemMasterId: string }>();
    const navigate = useNavigate();
    const { data, loading: dbLoading } = useDatabase();
    const { user } = useAuth();
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

    const navigableItems = useMemo(() => {
        let consignmentItems = data.inventoryItems.filter(i => i.isConsignment);
    
        if (user?.role === Role.Encoder && user.facilityId) {
            const storageLocationToFacilityMap = new Map(data.storageLocations.map(sl => [sl.id, sl.facilityId]));
            consignmentItems = consignmentItems.filter(item => {
                const facilityId = storageLocationToFacilityMap.get(item.storageLocationId);
                return facilityId === user.facilityId;
            });
        }
    
        const consignmentItemMasterIds = new Set(consignmentItems.map(i => i.itemMasterId));
    
        return data.itemMasters
            .filter(im => (im.itemType === ItemType.Consumable || im.itemType === ItemType.Equipment) && consignmentItemMasterIds.has(im.id))
            .sort((a, b) => a.name.localeCompare(b.name));
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
        const PURGEABLE_TYPES = ['writeOffLogs', 'returnLogs', 'adjustmentLogs'];
        
        const consumptionLogMap = new Map<string, string[]>();
        data.consignmentConsumptionLogs.forEach(log => {
            const sourceLogId = log.dispenseLogId.replace(/^(dispense|ris|ro|woff)-/, '');
            if (!consumptionLogMap.has(sourceLogId)) {
                consumptionLogMap.set(sourceLogId, []);
            }
            consumptionLogMap.get(sourceLogId)!.push(log.id);
        });

        const processOutboundLogs = (logs: any[], type: string, logTable: string, getDetails: (log: any) => string) => {
            (logs || []).forEach(log => {
                (log.items || []).forEach((item: { inventoryItemId: string, quantity: number }) => {
                    const details = inventoryItemDetailsMap.get(item.inventoryItemId);
                    if (details && details.itemMasterId === itemMasterId && details.isConsignment) {
                        transactions.push({ logId: log.id, logTable, date: new Date(log.timestamp), type, reference: log.controlNumber, details: getDetails(log), facilityId: log.facilityId, facilityName: facilityNameMap.get(log.facilityId) || 'N/A', quantityIn: 0, quantityOut: item.quantity, isPurgeable: PURGEABLE_TYPES.includes(logTable), transactionItems: log.items, affectedInventoryItemIds: consumptionLogMap.get(log.id) });
                    }
                });
            });
        };

        data.receiveLogs.forEach((log: ReceiveLog) => {
            if (!log.isConsignment) return;
            log.items.forEach(item => {
                if(item.itemMasterId === itemMasterId) {
                    transactions.push({ logId: log.id, logTable: 'receiveLogs', date: new Date(log.timestamp), type: 'Receive', reference: log.controlNumber, details: `From: ${data.suppliers.find(s => s.id === log.supplierId)?.name || 'N/A'}`, facilityId: log.facilityId, facilityName: facilityNameMap.get(log.facilityId) || 'N/A', quantityIn: item.quantity, quantityOut: 0, isPurgeable: false, transactionItems: [] });
                }
            })
        });

        processOutboundLogs(data.writeOffLogs, 'Write-Off', 'writeOffLogs', (log: WriteOffLog) => `Reason: ${log.reason}`);
        processOutboundLogs(data.returnLogs.filter(l => l.isConsignmentReturn), 'Return', 'returnLogs', (log: ReturnLog) => `To Supplier`);
        
        return { itemMaster: targetItemMaster, allTransactions: transactions };
    }, [itemMasterId, dbLoading, data]);

    const ledgerEntries = useMemo(() => {
        const sorted = [...allTransactions].sort((a, b) => a.date.getTime() - b.date.getTime());
        let filtered = sorted;
        if (filters.facilityId) filtered = sorted.filter(t => t.facilityId === filters.facilityId);
        
        const startDate = filters.startDate ? new Date(filters.startDate).setHours(0,0,0,0) : null;
        const endDate = filters.endDate ? new Date(filters.endDate).setHours(23,59,59,999) : null;

        const transactionsBeforeStartDate = sorted.filter(t => ( !filters.facilityId || t.facilityId === filters.facilityId ) && startDate && t.date.getTime() < startDate);
        let startingBalance = transactionsBeforeStartDate.reduce((bal, t) => bal + t.quantityIn - t.quantityOut, 0);

        const visibleTransactions = filtered.filter(t => (!startDate || t.date.getTime() >= startDate) && (!endDate || t.date.getTime() <= endDate));

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

    const handlePurge = async () => {
        if (!entryToPurge || !user) return;
        const { logId, logTable, transactionItems, type, reference, details, affectedInventoryItemIds } = entryToPurge;
    
        try {
            const updates: Record<string, any> = {};
            updates[`/${logTable}/${logId}`] = null;
    
            if (affectedInventoryItemIds) { // These are the consumption log IDs
                affectedInventoryItemIds.forEach(id => {
                    updates[`/consignmentConsumptionLogs/${id}`] = null;
                });
            }
    
            await db.ref().update(updates); // first, delete the logs
    
            // Then, reverse the quantity changes using atomic transactions
            for (const item of transactionItems) {
                const itemRef = db.ref(`/inventoryItems/${item.inventoryItemId}/quantity`);
                await itemRef.transaction(currentQty => (currentQty || 0) + item.quantity);
            }
    
            await logAuditEvent(user, 'Transaction Purge (Consignment)', { purgedLog: { type, reference, details } });
            alert('Transaction purged successfully.');
        } catch (error) {
            console.error('Failed to purge transaction:', error);
            alert('An error occurred during the purge operation.');
        } finally {
            setIsPurgeModalOpen(false);
            setEntryToPurge(null);
        }
    };
    
    if (dbLoading) return <div className="text-center p-8"><Spinner size="lg" /></div>;
    if (!itemMaster) return <div className="text-center p-8">Item not found.</div>;

    const exportToCSV = () => { /* ... implementation ... */ };
    const handlePrint = () => navigate('/print/consignment-supply-ledger', { state: { itemMaster, ledgerEntries, filters, facilities: data.facilities } });

    return (
        <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/consignment/inventory')} className="mb-2 -ml-3 text-secondary-600 hover:text-secondary-900">
                        <BackIcon />
                        <span className="ml-2">Back to Inventory</span>
                    </Button>
                    <h2 className="text-3xl font-semibold text-secondary-800">Consignment Supply Ledger</h2>
                    <div className="flex items-center gap-2 mt-2 bg-secondary-50 p-2 rounded-lg border">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/consignment/supply-ledger/${prevItem!.id}`)} disabled={!prevItem} title={prevItem ? `Previous: ${prevItem.name}` : 'No previous item'}>
                            <BackIcon />
                        </Button>
                        <div className="text-center flex-grow overflow-hidden">
                            <p className="text-xl font-medium text-secondary-900 truncate" title={itemMaster.name}>
                                {itemMaster.name}
                            </p>
                            <p className="text-xs text-secondary-500">{currentIndex >= 0 ? `${currentIndex + 1} of ${navigableItems.length} items` : ''}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/consignment/supply-ledger/${nextItem!.id}`)} disabled={!nextItem} title={nextItem ? `Next: ${nextItem.name}` : 'No next item'}>
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
                                               <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => { setEntryToPurge(entry); setIsPurgeModalOpen(true); }} title="Purge Transaction"><TrashIcon /></Button>
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
                    onConfirm={handlePurge}
                    entryDetails={{ type: entryToPurge.type, reference: entryToPurge.reference, details: entryToPurge.details }}
                />
            )}
        </div>
    );
};

export default ConsignmentSupplyLedger;