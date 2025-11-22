import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ServiceProvider } from '../types';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';

const PrintServiceProviderPage: React.FC = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { items, filterCriteria, generatedDate } = location.state || {};

    
    if (!items) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page cannot be accessed directly. Please generate a report from the Service Provider Management page first.</p>
                    <Link to="/service-providers">
                        <Button className="mt-6">Go to Service Provider Management</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Service Provider List Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Filters Applied:</strong> Search: "{filterCriteria.searchTerm || 'None'}" | Status: {filterCriteria.status} | Service Type: {filterCriteria.serviceType}</p>
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
        <PrintLayout title={`Service Provider Report - ${new Date(generatedDate).toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Provider Name", "Service Type", "Contact Person", "Email", "Phone", "Status"]}>
                   {items.map((provider: ServiceProvider) => (
                        <tr key={provider.id} className="border-t">
                            <td className="p-2 border font-medium">{provider.name}</td>
                            <td className="p-2 border">{provider.serviceType}</td>
                            <td className="p-2 border">{provider.contactPerson || 'N/A'}</td>
                            <td className="p-2 border">{provider.email || 'N/A'}</td>
                            <td className="p-2 border">{provider.phone || 'N/A'}</td>
                            <td className="p-2 border">{provider.status}</td>
                        </tr>
                   ))}
                </StandardTable>
                {items.length === 0 && <p className="text-gray-600 text-sm p-2">No items match the selected criteria.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintServiceProviderPage;
