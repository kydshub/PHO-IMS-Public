import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';
import { formatNumber } from '../utils/formatters';
import { Spinner } from '../components/ui/Spinner';

interface PrintState {
    engagementData: any;
    userActivityData: any[];
    generatedDate: string;
}

const PrintEngagementReportPage: React.FC = () => {
    const [printState, setPrintState] = useState<PrintState | null>(null);
    const [loading, setLoading] = useState(true);
    const { settings } = useSettings();

    useEffect(() => {
        const dataString = sessionStorage.getItem('printData-engagement');
        if (dataString) {
            try {
                setPrintState(JSON.parse(dataString));
            } catch (e) {
                console.error("Failed to parse print data from session storage", e);
            }
        }
        setLoading(false);
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }
    
    if (!printState) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a report from the Analytics Hub first.</p>
                    <Link to="/analytics" state={{ preselectedTab: 'engagement' }}>
                        <Button className="mt-6">Go to Engagement Analytics</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const { engagementData, userActivityData, generatedDate } = printState;

    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Engagement & Adoption Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Period:</strong> Last 30 Days</p>
                <p><strong>Date Generated:</strong> {new Date(generatedDate).toLocaleString()}</p>
            </div>
        </div>
    );
    
    const StandardTable: React.FC<{headers: string[], children: React.ReactNode}> = ({ headers, children }) => (
        <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100">
                <tr>{headers.map(h => <th key={h} className="p-2 border text-left text-xs font-bold uppercase text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    );
    
    return (
        <PrintLayout title={`Engagement Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-3 bg-blue-100 border rounded"><span className="text-xs uppercase">User Adoption Rate</span><br/><span className="text-xl font-bold text-blue-800">{engagementData.adoptionRate.toFixed(1)}%</span></div>
                <div className="p-3 bg-green-100 border rounded"><span className="text-xs uppercase">Active Users</span><br/><span className="text-xl font-bold text-green-800">{formatNumber(engagementData.activeUsers)}</span></div>
                <div className="p-3 bg-yellow-100 border rounded"><span className="text-xs uppercase">Inactive Users</span><br/><span className="text-xl font-bold text-yellow-800">{formatNumber(engagementData.inactiveUsersCount)}</span></div>
            </div>
            
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">User Activity</h3>
                <StandardTable headers={["User", "Facility", "Total Actions", "Last Activity"]}>
                   {userActivityData.map((user: any) => (
                        <tr key={user.uid} className="border-t">
                            <td className="p-2 border font-medium">{user.name}</td>
                            <td className="p-2 border">{user.facilityName}</td>
                            <td className="p-2 border text-right">{formatNumber(user.totalActions)}</td>
                            <td className="p-2 border">{user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                   ))}
                </StandardTable>
            </section>
            
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Activity by Role (Last 30 Days)</h3>
                <StandardTable headers={["Role", "Total Actions"]}>
                   {engagementData.activityByRoleData.map((row: any) => (
                        <tr key={row.name} className="border-t">
                            <td className="p-2 border font-medium">{row.name}</td>
                            <td className="p-2 border text-right">{formatNumber(row.count)}</td>
                        </tr>
                   ))}
                </StandardTable>
            </section>
            
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Daily Activity (Last 30 Days)</h3>
                <StandardTable headers={["Date", "Total Actions"]}>
                   {engagementData.dailyActivityData.map((row: any) => (
                        <tr key={row.date} className="border-t">
                            <td className="p-2 border font-medium">{new Date(row.date).toLocaleDateString()}</td>
                            <td className="p-2 border text-right">{formatNumber(row.actions)}</td>
                        </tr>
                   ))}
                </StandardTable>
            </section>

        </PrintLayout>
    );
};

export default PrintEngagementReportPage;