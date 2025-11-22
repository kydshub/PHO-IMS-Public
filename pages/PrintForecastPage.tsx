import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ItemMaster } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import { Spinner } from '../components/ui/Spinner';
import PrintLayout from '../components/ui/PrintLayout';

interface SimpleForecastResult {
    itemMaster: ItemMaster;
    avgDailyConsumption: number;
    daysUntilRunOut: number | null;
    runOutDate: Date | null;
    daysUntilLowStock: number | null;
    lowStockDate: Date | null;
    recommendation: {
        text: string;
        color: string;
        level: number;
    };
    currentStock: number;
}

const PrintForecastPage: React.FC = () => {
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { facilities, programs } = data;
    const [printData, setPrintData] = useState<any>(null);

    useEffect(() => {
        const dataString = sessionStorage.getItem('printData-forecast');
        if (dataString) {
            setPrintData(JSON.parse(dataString));
        }
    }, []);

    const { items: forecastResults, filters, generatedDate } = printData || {};

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    if (!forecastResults) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Forecast Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a forecast from the Forecasting page first.</p>
                    <Link to="/analytics" state={{ preselectedTab: 'forecasting' }}>
                        <Button className="mt-6">Go to Forecasting Page</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Demand Forecasting Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Facility:</strong> {filters.selectedFacilityId ? facilities.find(f => f.id === filters.selectedFacilityId)?.name : 'All Facilities'}</p>
                <p><strong>Program:</strong> {filters.selectedProgramId ? programs.find(p => p.id === filters.selectedProgramId)?.name : 'All Programs'}</p>
                <p><strong>Based on Consumption from Last:</strong> {filters.historyDays} days</p>
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
        <PrintLayout title={`Forecast Report - ${new Date(generatedDate).toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Item", "Current Stock", "Avg. Daily Use", "Low Stock At", "Est. Run Out", "Recommendation"]}>
                   {forecastResults.map((result: SimpleForecastResult) => (
                        <tr key={result.itemMaster.id} className="border-t">
                            <td className="p-2 border">
                                <div className="font-medium">{result.itemMaster.name}</div>
                                <div className="text-xs text-gray-500">{result.itemMaster.brand || 'N/A'}</div>
                            </td>
                            <td className="p-2 border text-right">{result.currentStock.toLocaleString()} {result.itemMaster.unit}</td>
                            <td className="p-2 border text-right">{result.avgDailyConsumption.toFixed(2)} / day</td>
                            <td className="p-2 border text-right">{result.itemMaster.lowStockThreshold || 0} {result.itemMaster.unit}</td>
                            <td className="p-2 border text-right">{result.runOutDate ? new Date(result.runOutDate).toLocaleDateString() : 'N/A'}</td>
                            <td className={`p-2 border font-bold ${result.recommendation.color}`}>{result.recommendation.text}</td>
                        </tr>
                    ))}
                </StandardTable>
                {forecastResults.length === 0 && <p className="text-gray-600 text-sm p-2">No items to forecast based on selected criteria.</p>}
            </section>

             <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center text-sm">
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Generated By (Name & Signature)</div>
                </div>
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-gray-600">Reviewed By (Name & Signature)</div>
                </div>
            </div>
        </PrintLayout>
    );
};

export default PrintForecastPage;