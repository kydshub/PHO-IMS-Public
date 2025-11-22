import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import PrintLayout from '../components/ui/PrintLayout';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { PurchaseOrder } from '../types';

const PrintSupplierInsightsPage: React.FC = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { reportData, supplier, dateRange, aiResult, generatedDate } = location.state || {};

    if (!reportData || !supplier) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a report from the Supplier Insights page first.</p>
                    <Link to="/analytics" state={{ preselectedTab: 'supplier-insights' }}>
                        <Button className="mt-6">Go to Supplier Insights</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }

    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Supplier Performance Insights</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Supplier:</strong> {supplier.name}</p>
                <p><strong>Period Analyzed:</strong> Last {dateRange} days</p>
                <p><strong>Date Generated:</strong> {new Date(generatedDate).toLocaleString()}</p>
            </div>
        </div>
    );

    const StandardTable: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
        <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100">
                <tr>{headers.map(h => <th key={h} className="p-2 border text-left text-xs font-bold uppercase text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    );

    return (
        <PrintLayout title={`Supplier Insights - ${supplier.name}`}>
            <ReportHeader />
            <div className="grid grid-cols-4 gap-4 mb-6 text-center">
                <div className="p-3 bg-blue-100 border rounded"><span className="text-xs uppercase">Avg Lead Time</span><br/><span className="text-xl font-bold text-blue-800">{reportData.avgLeadTimeDays.toFixed(1)} days</span></div>
                <div className="p-3 bg-green-100 border rounded"><span className="text-xs uppercase">Order Fill Rate</span><br/><span className="text-xl font-bold text-green-800">{reportData.fillRate.toFixed(1)}%</span></div>
                <div className="p-3 bg-orange-100 border rounded"><span className="text-xs uppercase">Return Rate</span><br/><span className="text-xl font-bold text-orange-800">{reportData.returnRate.toFixed(2)}%</span></div>
                <div className="p-3 bg-teal-100 border rounded"><span className="text-xs uppercase">Total PO Value</span><br/><span className="text-xl font-bold text-teal-800">{formatCurrency(reportData.totalPurchaseValue)}</span></div>
            </div>
            
            {aiResult && (
                <section className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 p-2 bg-gray-200">AI-Powered Analysis</h3>
                    <div className="p-4 border rounded-lg bg-secondary-50 space-y-3 text-sm">
                        <p><strong className="text-secondary-800">Summary:</strong> {aiResult.summary}</p>
                        <div><strong className="text-green-700">Strengths:</strong><ul className="list-disc list-inside ml-4">{aiResult.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                        <div><strong className="text-red-700">Weaknesses:</strong><ul className="list-disc list-inside ml-4">{aiResult.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
                        <p><strong className="text-primary-700">Recommendation:</strong> {aiResult.recommendation}</p>
                    </div>
                </section>
            )}

            <div className="grid grid-cols-2 gap-8">
                <section className="mb-8 break-inside-avoid">
                    <h3 className="text-base font-semibold text-gray-700 mb-2">Top 5 Supplied Items</h3>
                    <StandardTable headers={["Item Name", "Quantity Received"]}>
                        {reportData.topItemsData.map((item: { name: string, value: number }) => (
                            <tr key={item.name} className="border-t">
                                <td className="p-2 border font-medium">{item.name}</td>
                                <td className="p-2 border text-right">{formatNumber(item.value)}</td>
                            </tr>
                        ))}
                    </StandardTable>
                </section>
                <section className="mb-8 break-inside-avoid">
                    <h3 className="text-base font-semibold text-gray-700 mb-2">Return Reasons</h3>
                    <StandardTable headers={["Reason", "# of Returns"]}>
                        {reportData.returnReasonsData.map((item: { name: string, value: number }) => (
                            <tr key={item.name} className="border-t">
                                <td className="p-2 border font-medium">{item.name}</td>
                                <td className="p-2 border text-right">{item.value}</td>
                            </tr>
                        ))}
                    </StandardTable>
                </section>
            </div>

            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Recent Purchase Order History</h3>
                <StandardTable headers={["PO Number", "Order Date", "Status", "Value"]}>
                    {reportData.purchaseOrderHistory.map((po: PurchaseOrder) => (
                        <tr key={po.id} className="border-t">
                            <td className="p-2 border font-mono">{po.poNumber}</td>
                            <td className="p-2 border">{new Date(po.orderDate).toLocaleDateString()}</td>
                            <td className="p-2 border">{po.status}</td>
                            <td className="p-2 border text-right">{formatCurrency(po.totalValue)}</td>
                        </tr>
                    ))}
                </StandardTable>
            </section>
        </PrintLayout>
    );
};

export default PrintSupplierInsightsPage;