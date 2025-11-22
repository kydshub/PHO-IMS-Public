import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Facility } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import { Spinner } from '../components/ui/Spinner';
import PrintLayout from '../components/ui/PrintLayout';

const PrintFacilityPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    
    const { facilities } = data;

    const searchTerm = searchParams.get('searchTerm') || '';
    const statusFilter = searchParams.get('status') || '';

    const items = useMemo(() => {
        if (loading) return [];
        return facilities
            .filter(item => {
                const searchMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.location.toLowerCase().includes(searchTerm.toLowerCase());
                const statusMatch = !statusFilter || item.status === statusFilter;
                return searchMatch && statusMatch;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [loading, facilities, searchTerm, statusFilter]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    if (!items) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a report from the Facility Management page first.</p>
                    <Link to="/facilities">
                        <Button className="mt-6">Go to Facility Management</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Facility List Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Filters Applied:</strong> Search Term: "{searchTerm || 'None'}" | Status: {statusFilter || 'All'}</p>
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
        <PrintLayout title={`Facility Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Facility Name", "Location", "Status"]}>
                   {items.map((facility: Facility) => (
                        <tr key={facility.id} className="border-t">
                            <td className="p-2 border font-medium">{facility.name}</td>
                            <td className="p-2 border">{facility.location}</td>
                            <td className="p-2 border">{facility.status}</td>
                        </tr>
                   ))}
                </StandardTable>
                {items.length === 0 && <p className="text-gray-600 text-sm p-2">No items match the selected criteria.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintFacilityPage;