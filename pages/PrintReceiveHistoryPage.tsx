import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ReceiveLog, ItemMaster } from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';

const PrintReceiveHistoryPage: React.FC = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { items: receiveLogs } = location.state || {};
    const { data } = useDatabase();
    const { users, facilities, suppliers, itemMasters } = data;

    const getItemMasterName = (imId: string) => itemMasters.find(im => im.id === imId)?.name || 'N/A';
    const getUserName = (userId: string) => users.find(u => u.uid === userId)?.name || 'Unknown';
    const getFacilityName = (facilityId: string) => facilities.find(f => f.id === facilityId)?.name || 'N/A';
    const getSupplierName = (supplierId: string) => suppliers.find(s => s.id === supplierId)?.name || 'N/A';

    
    if (!receiveLogs) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page cannot be accessed directly. Please generate a report from the Receiving page first.</p>
                    <Link to="/receiving">
                        <Button className="mt-6">Go to Receiving Page</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Receiving History Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Date Generated:</strong> {new Date().toLocaleString()}</p>
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
        <PrintLayout title={`Receiving History Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                    <StandardTable headers={["Date", "Control #", "Items Summary", "Supplier", "User", "Facility"]}>
                       {receiveLogs.map((log: ReceiveLog) => {
                           const itemSummary = log.items.map(item => `${item.quantity} x ${getItemMasterName(item.itemMasterId)}`).join('; ');
                           return (
                                <tr key={log.id} className="border-t">
                                    <td className="p-2 border">{new Date(log.timestamp).toLocaleDateString()}</td>
                                    <td className="p-2 border font-mono">{log.controlNumber}</td>
                                    <td className="p-2 border">{itemSummary}</td>
                                    <td className="p-2 border">{getSupplierName(log.supplierId)}</td>
                                    <td className="p-2 border">{getUserName(log.userId)}</td>
                                    <td className="p-2 border">{getFacilityName(log.facilityId)}</td>
                                </tr>
                           );
                       })}
                    </StandardTable>
                    {receiveLogs.length === 0 && <p className="text-gray-600 text-sm p-2">No receiving records to display.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintReceiveHistoryPage;