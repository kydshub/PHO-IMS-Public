
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';
import { TransferLog } from '../types';

// The data passed from the Transfers page has these extra fields
type AugmentedTransferLog = TransferLog & {
    fromFacilityName: string;
    toFacilityName: string;
    initiatedByUserName: string;
    acknowledgedByUserName?: string;
};

const PrintTransferHistoryPage: React.FC = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { items: transferLogs } = (location.state as { items: AugmentedTransferLog[] }) || {};

    if (!transferLogs) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center no-print">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page cannot be accessed directly. Please generate a report from the Transfers page first.</p>
                    <Link to="/transfers">
                        <Button className="mt-6">Go to Transfers Page</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Stock Transfer History Report</h2>
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
        <PrintLayout title={`Transfer History Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Date", "Control #", "Status", "From Facility", "To Facility", "User", "Acknowledged By"]}>
                   {transferLogs.map((log: AugmentedTransferLog) => (
                       <tr key={log.id} className="border-t">
                            <td className="p-2 border">{new Date(log.timestamp).toLocaleDateString()}</td>
                            <td className="p-2 border font-mono">{log.controlNumber}</td>
                            <td className="p-2 border">{log.status}</td>
                            <td className="p-2 border">{log.fromFacilityName}</td>
                            <td className="p-2 border">{log.toFacilityName}</td>
                            <td className="p-2 border">{log.initiatedByUserName}</td>
                            <td className="p-2 border">{log.acknowledgedByUserName || 'N/A'}</td>
                        </tr>
                   ))}
                </StandardTable>
                {transferLogs.length === 0 && <p className="text-gray-600 text-sm p-2">No transfer history records to display.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintTransferHistoryPage;
