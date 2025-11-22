

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import PrintLayout from '../components/ui/PrintLayout';
import { useSettings } from '../hooks/useSettings';
import { User, Facility } from '../types';

interface ActivityLogItem {
    timestamp: string;
    type: string;
    controlNumber: string;
    summary: string;
    logId: string;
    printPath: string;
}

interface PrintState {
    reportData: ActivityLogItem[];
    user: User;
    facility?: Facility;
    dateRange: {
        startDate: Date | null;
        endDate: Date | null;
    };
    generatedDate: string;
}

const PrintMyActivityReportPage: React.FC = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { reportData, user, facility, dateRange, generatedDate } = (location.state as PrintState) || {};

    if (!reportData || !user) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page may have been accessed directly. Please generate a report from the Analytics page first.</p>
                    <Link to="/analytics">
                        <Button className="mt-6">Go to Analytics Hub</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }

    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">User Activity Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>User:</strong> {user.name} ({user.email})</p>
                <p><strong>Facility:</strong> {facility?.name || 'N/A'}</p>
                <p><strong>Period:</strong> {dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString() : 'Start'} - {dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString() : 'End'}</p>
                <p><strong>Date Generated:</strong> {new Date(generatedDate).toLocaleString()}</p>
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
        <PrintLayout title={`Activity Report - ${user.name}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Timestamp", "Type", "Reference #", "Summary"]}>
                   {reportData.map((log) => (
                        <tr key={log.timestamp + log.controlNumber} className="border-t">
                            <td className="p-2 border whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-2 border font-medium">{log.type}</td>
                            <td className="p-2 border font-mono">{log.controlNumber}</td>
                            <td className="p-2 border">{log.summary}</td>
                        </tr>
                   ))}
                </StandardTable>
                {reportData.length === 0 && <p className="text-gray-600 text-sm p-2">No activity found for the selected date range.</p>}
            </section>

             <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center text-sm">
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Encoder's Signature</div>
                </div>
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Verified By (Name & Signature)</div>
                </div>
            </div>
        </PrintLayout>
    );
};

export default PrintMyActivityReportPage;