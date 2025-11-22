import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import PrintLayout from '../components/ui/PrintLayout';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, formatNumber } from '../utils/formatters';

const PrintFacilityPerformancePage: React.FC = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { reportData, facility, generatedDate } = location.state || {};

    if (!reportData || !facility) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a report from the Facility Performance page first.</p>
                    <Link to="/analytics" state={{ preselectedTab: 'facility-performance' }}>
                        <Button className="mt-6">Go to Facility Performance</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }

    const { kpis, systemAverageKpis, aiResult } = reportData;

    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Facility Performance Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Facility:</strong> {facility.name}</p>
                <p><strong>Date Generated:</strong> {new Date(generatedDate).toLocaleString()}</p>
            </div>
        </div>
    );

    return (
        <PrintLayout title={`Facility Performance - ${facility.name}`}>
            <ReportHeader />
            
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-bold text-gray-800 mb-2 p-2 bg-gray-200">Key Performance Indicators (KPIs)</h3>
                <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left text-xs font-bold uppercase text-gray-600">Metric</th>
                            <th className="p-2 border text-right text-xs font-bold uppercase text-gray-600">This Facility</th>
                            <th className="p-2 border text-right text-xs font-bold uppercase text-gray-600">System Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-t">
                            <td className="p-2 border font-medium">Commodity Value</td>
                            <td className="p-2 border text-right">{formatCurrency(kpis.commodityValue)}</td>
                            <td className="p-2 border text-right">{formatCurrency(systemAverageKpis.commodityValue)}</td>
                        </tr>
                        <tr className="border-t">
                            <td className="p-2 border font-medium">Depreciated PPE Value</td>
                            <td className="p-2 border text-right">{formatCurrency(kpis.ppeValue)}</td>
                            <td className="p-2 border text-right">{formatCurrency(systemAverageKpis.ppeValue)}</td>
                        </tr>
                        <tr className="border-t">
                            <td className="p-2 border font-medium">Stockout Rate</td>
                            <td className="p-2 border text-right">{kpis.stockoutRate.toFixed(2)}%</td>
                            <td className="p-2 border text-right">{systemAverageKpis.stockoutRate.toFixed(2)}%</td>
                        </tr>
                         <tr className="border-t">
                            <td className="p-2 border font-medium">Inventory Turnover Rate</td>
                            <td className="p-2 border text-right">{kpis.turnoverRate.toFixed(2)}</td>
                            <td className="p-2 border text-right">{systemAverageKpis.turnoverRate.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </section>
            
            {aiResult && (
                <section className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 p-2 bg-gray-200">AI-Powered Analysis</h3>
                    <div className="p-4 border rounded-lg bg-secondary-50 space-y-3 text-sm">
                        <p><strong className="text-secondary-800">Summary:</strong> {aiResult.summary}</p>
                        <div><strong className="text-green-700">Strengths:</strong><ul className="list-disc list-inside ml-4">{aiResult.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                        <div><strong className="text-red-700">Weaknesses:</strong><ul className="list-disc list-inside ml-4">{aiResult.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
                        <div><strong className="text-primary-700">Recommendations:</strong><ul className="list-disc list-inside ml-4">{aiResult.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
                    </div>
                </section>
            )}
        </PrintLayout>
    );
};

export default PrintFacilityPerformancePage;