import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import PrintLayout from '../components/ui/PrintLayout';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Spinner } from '../components/ui/Spinner';

interface PrintState {
    reportData: any;
    filters: any;
    generatedDate: string;
}

const PrintExpiryWasteAnalysisPage: React.FC = () => {
    const [printState, setPrintState] = useState<PrintState | null>(null);
    const [loading, setLoading] = useState(true);
    const { settings } = useSettings();
    const { data, loading: dbLoading } = useDatabase();
    const { facilities, categories } = data;

    useEffect(() => {
        const dataString = sessionStorage.getItem('printData');
        if (dataString) {
            try {
                setPrintState(JSON.parse(dataString));
            } catch (e) {
                console.error("Failed to parse print data from session storage", e);
            }
        }
        setLoading(false);
    }, []);

    if (loading || dbLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }
    
    if (!printState || !printState.reportData) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a report from the Analytics page first.</p>
                    <Link to="/analytics" state={{ preselectedTab: 'waste-analysis' }}>
                        <Button className="mt-6">Go to Expiry Waste Analysis</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }

    const { reportData, filters, generatedDate } = printState;
    const { totalValue, totalTransactions, totalItemsWasted, topWastedItems } = reportData;
    
    const ReportHeader = () => {
        const facilityName = filters.facilityId ? facilities.find(f => f.id === filters.facilityId)?.name : 'All';
        const categoryName = filters.categoryId ? categories.find(c => c.id === filters.categoryId)?.name : 'All';

        return (
            <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mt-1">Expiry Waste Analysis Report</h2>
                <div className="mt-2 text-sm text-gray-500">
                    <p><strong>Filters:</strong> Facility: {facilityName} | Category: {categoryName}</p>
                    <p><strong>Date Range:</strong> {filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'Start'} - {filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'End'}</p>
                    <p><strong>Date Generated:</strong> {new Date(generatedDate).toLocaleString()}</p>
                </div>
            </div>
        );
    };
    
    const StandardTable: React.FC<{headers: string[], children: React.ReactNode}> = ({ headers, children }) => (
        <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100">
                <tr>{headers.map(h => <th key={h} className="p-2 border text-left text-xs font-bold uppercase text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    );
    
    return (
        <PrintLayout title={`Expiry Waste Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-3 bg-red-100 border rounded"><span className="text-xs uppercase">Total Value Wasted</span><br/><span className="text-xl font-bold text-red-800">{formatCurrency(totalValue)}</span></div>
                <div className="p-3 bg-orange-100 border rounded"><span className="text-xs uppercase">Total Write-Offs</span><br/><span className="text-xl font-bold text-orange-800">{formatNumber(totalTransactions)}</span></div>
                <div className="p-3 bg-yellow-100 border rounded"><span className="text-xs uppercase">Total Items Wasted</span><br/><span className="text-xl font-bold text-yellow-800">{formatNumber(totalItemsWasted)}</span></div>
            </div>
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Top Wasted Items by Value</h3>
                <StandardTable headers={["Item Name", "Value Wasted", "Quantity Wasted"]}>
                   {topWastedItems.map((item: any) => (
                        <tr key={item.name} className="border-t">
                            <td className="p-2 border font-medium">{item.name}</td>
                            <td className="p-2 border text-right">{formatCurrency(item.value)}</td>
                            <td className="p-2 border text-right">{formatNumber(item.items)}</td>
                        </tr>
                   ))}
                </StandardTable>
                {topWastedItems.length === 0 && <p className="text-center text-sm text-gray-500 p-4">No expired items were written off in this period.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintExpiryWasteAnalysisPage;
