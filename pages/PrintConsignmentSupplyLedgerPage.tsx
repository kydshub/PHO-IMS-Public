
import React, { useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ItemMaster, Facility } from '../types';
import { useSettings } from '../hooks/useSettings';

interface LedgerEntry {
  date: Date;
  type: string;
  reference: string;
  details: string;
  facilityId: string;
  facilityName: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
}

const PrintConsignmentSupplyLedgerPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { itemMaster, ledgerEntries, filters, facilities } = (location.state as {
        itemMaster: ItemMaster,
        ledgerEntries: LedgerEntry[],
        filters: { facilityId: string, startDate: Date | null, endDate: Date | null },
        facilities: Facility[],
    }) || {};

    useEffect(() => {
        if (itemMaster) {
            document.title = `Consignment Supply Ledger - ${itemMaster.name}`;
            const timeoutId = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timeoutId);
        }
    }, [itemMaster]);

    if (!itemMaster || !ledgerEntries) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-secondary-100 p-4 no-print">
                <div className="text-center bg-white p-10 rounded-lg shadow-xl">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page cannot be accessed directly. Please generate a report from the Supply Ledger page first.</p>
                    <Link to="/consignment/inventory">
                        <Button className="mt-6">Go to Consignment Inventory</Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    const ReportHeader = () => (
        <div className="mb-8 pb-4 border-b-2 border-gray-800">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{settings.appName}</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mt-1">Consignment Supply Ledger / Stock Card</h2>
                </div>
                <div className="text-right text-xs text-gray-500">
                    <p><strong>Date Printed:</strong> {new Date().toLocaleString()}</p>
                </div>
            </div>
             <div className="mt-4 grid grid-cols-2 gap-x-8 text-sm">
                <div>
                    <p><strong>Item:</strong> <span className="font-semibold">{itemMaster.name}</span></p>
                    <p><strong>Brand:</strong> {itemMaster.brand || 'N/A'}</p>
                    <p><strong>Unit:</strong> {itemMaster.unit}</p>
                </div>
                 <div>
                    <p><strong>Facility:</strong> {filters.facilityId ? facilities.find(f => f.id === filters.facilityId)?.name : 'All Facilities'}</p>
                    <p><strong>Date Range:</strong> {filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'Start'} to {filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'End'}</p>
                </div>
            </div>
        </div>
    );

    const StandardTable: React.FC<{headers: string[], children: React.ReactNode}> = ({ headers, children }) => (
        <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100">
                <tr>
                    {headers.map(h => <th key={h} className="p-2 border text-left text-xs font-bold uppercase text-gray-600">{h}</th>)}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    );
    
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print { display: none !important; }
                    .printable-area {
                        box-shadow: none !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 1.5rem !important;
                    }
                    @page { size: landscape; }
                }
            `}</style>
             <div className="bg-gray-200 p-4 sm:p-8 no-print">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex justify-between items-center">
                        <h3 className="font-semibold">Print Preview</h3>
                        <div>
                            <Button variant="secondary" onClick={() => window.print()} className="mr-2">Print</Button>
                            <Button variant="danger" onClick={() => window.history.back()}>Close</Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-6xl mx-auto p-8 sm:p-12 bg-white font-[Roboto,sans-serif] printable-area shadow-lg">
                <ReportHeader />
                <section className="mb-8 break-inside-avoid">
                     <StandardTable headers={['Date', 'Type', 'Facility', 'Reference', 'Details', 'In', 'Out', 'Balance']}>
                       {ledgerEntries.map((entry, index) => (
                           <tr key={index} className="border-t">
                               <td className="p-2 border whitespace-nowrap">{new Date(entry.date).toLocaleString()}</td>
                               <td className="p-2 border whitespace-nowrap font-medium">{entry.type}</td>
                               <td className="p-2 border whitespace-nowrap">{entry.facilityName}</td>
                               <td className="p-2 border whitespace-nowrap font-mono">{entry.reference}</td>
                               <td className="p-2 border">{entry.details}</td>
                               <td className="p-2 border text-right text-green-700">{entry.quantityIn > 0 ? `+${entry.quantityIn}` : ''}</td>
                               <td className="p-2 border text-right text-red-600">{entry.quantityOut > 0 ? `-${entry.quantityOut}` : ''}</td>
                               <td className="p-2 border text-right font-bold">{entry.balance}</td>
                           </tr>
                       ))}
                    </StandardTable>
                    {ledgerEntries.length === 0 && <p className="text-gray-600 text-sm p-2">No records match the selected criteria.</p>}
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

export default PrintConsignmentSupplyLedgerPage;