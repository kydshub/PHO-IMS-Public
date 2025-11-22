import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FundSource } from '../types';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';

const PrintFundSourcePage: React.FC = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { items, filterCriteria, generatedDate } = location.state || {};
    
    if (!items) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page cannot be accessed directly. Please generate a report from the Fund Source Management page first.</p>
                    <Link to="/fund-sources">
                        <Button className="mt-6">Go to Fund Source Management</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Fund Source List Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Filters Applied:</strong> Search Term: "{filterCriteria.searchTerm || 'None'}"</p>
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
        <PrintLayout title={`Fund Source Report - ${new Date(generatedDate).toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Fund Source Name"]}>
                   {items.map((source: FundSource) => (
                        <tr key={source.id} className="border-t">
                            <td className="p-2 border font-medium">{source.name}</td>
                        </tr>
                   ))}
                </StandardTable>
                {items.length === 0 && <p className="text-gray-600 text-sm p-2">No items match the selected criteria.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintFundSourcePage;
