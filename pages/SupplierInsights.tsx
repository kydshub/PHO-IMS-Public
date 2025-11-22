import React, { useMemo, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDatabase } from '../hooks/useDatabase';
import { PurchaseOrder, PurchaseOrderStatus, ReceiveLog, ReturnLog, Supplier, SupplierStatus, ItemMaster, StorageLocation } from '../types';
import SearchableSelect from '../components/ui/SearchableSelect';
import { formatCurrency } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import { GoogleGenAI, Type } from "@google/genai";
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { logAuditEvent } from '../services/audit';
import { Select } from '../components/ui/Select';
import { useNavigate } from 'react-router-dom';
import { downloadStringAsFile } from '../../utils/download';

const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
const CheckBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.78l.22.22a.68.68 0 0 0 .96.96l.22.22a4 4 0 0 1 4.78-4.78l.22.22a.68.68 0 0 0 .96.96l.22.22a4 4 0 0 1 4.78-4.78l.22.22a.68.68 0 0 0 .96.96l.22.22a4 4 0 0 1-4.78 4.78l-.22-.22a.68.68 0 0 0-.96-.96l-.22-.22a4 4 0 0 1-4.78 4.78l-.22-.22a.68.68 0 0 0-.96-.96l-.22-.22a4 4 0 0 1-4.78 4.78l-.22-.22a.68.68 0 0 0-.96-.96l-.22-.22a4 4 0 0 1-4.78-4.78l.22-.22a.68.68 0 0 0 .96-.96l.22-.22z"/><path d="m9 12 2 2 4-4"/></svg>;
const ReturnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>;
const PesoSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="bold" fontFamily="sans-serif">₱</text></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L 14.5 9.5 L 22 12 L 14.5 14.5 L 12 22 L 9.5 14.5 L 2 12 L 9.5 9.5 Z"/></svg>;
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;


const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const SupplierInsights: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { suppliers, receiveLogs, returnLogs, inventoryItems, itemMasters, purchaseOrders, storageLocations } = data;
    const navigate = useNavigate();
    
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<number>(180); // Default to last 6 months

    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<{ summary: string; strengths: string[]; weaknesses: string[]; recommendation: string; } | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const activeSuppliers = useMemo(() => suppliers.filter(s => s.status === SupplierStatus.Active), [suppliers]);
    
    const reportData = useMemo(() => {
        if (!selectedSupplierId) return null;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRange);

        // Filter data for the selected supplier and date range
        const supplierPOs = purchaseOrders.filter(po => po.supplierId === selectedSupplierId && new Date(po.orderDate) >= cutoffDate);
        const supplierReceiveLogs = receiveLogs.filter(log => log.supplierId === selectedSupplierId && new Date(log.timestamp) >= cutoffDate);
        const supplierReturnLogs = returnLogs.filter(log => log.supplierId === selectedSupplierId && new Date(log.timestamp) >= cutoffDate);

        // KPI Calculations
        let totalLeadTimeSeconds = 0;
        let poWithReceiptsCount = 0;
        supplierPOs.forEach(po => {
            const firstReceipt = receiveLogs.find(log => log.purchaseOrderId === po.id);
            if (firstReceipt) {
                const leadTime = new Date(firstReceipt.timestamp).getTime() - new Date(po.orderDate).getTime();
                totalLeadTimeSeconds += leadTime / 1000;
                poWithReceiptsCount++;
            }
        });
        const avgLeadTimeDays = poWithReceiptsCount > 0 ? (totalLeadTimeSeconds / poWithReceiptsCount) / (60 * 60 * 24) : 0;
        
        const totalOrdered = supplierPOs.reduce((sum, po) => sum + po.items.reduce((itemSum, i) => itemSum + i.orderedQuantity, 0), 0);
        const totalReceivedFromPOs = supplierPOs.reduce((sum, po) => sum + po.items.reduce((itemSum, i) => itemSum + i.receivedQuantity, 0), 0);
        const fillRate = totalOrdered > 0 ? (totalReceivedFromPOs / totalOrdered) * 100 : 100;
        
        const totalReceivedAll = supplierReceiveLogs.reduce((sum, log) => sum + log.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0);
        const totalReturned = supplierReturnLogs.reduce((sum, log) => sum + log.items.reduce((itemSum, i) => itemSum + i.quantity, 0), 0);
        const returnRate = totalReceivedAll > 0 ? (totalReturned / totalReceivedAll) * 100 : 0;

        const totalPurchaseValue = supplierPOs.reduce((sum, po) => sum + po.totalValue, 0);

        // Chart Data
        const returnReasons = supplierReturnLogs.reduce((acc, log) => {
            acc[log.reason] = (acc[log.reason] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const returnReasonsData = Object.entries(returnReasons).map(([name, value]) => ({ name, value }));
        
        const topItems = supplierReceiveLogs
            .flatMap(log => log.items)
            .reduce((acc, item) => {
                const master = itemMasters.find(im => im.id === item.itemMasterId);
                if (master) {
                    acc[master.name] = (acc[master.name] || 0) + item.quantity;
                }
                return acc;
            }, {} as Record<string, number>);
        const topItemsData = Object.entries(topItems).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

        return {
            avgLeadTimeDays, fillRate, returnRate, totalPurchaseValue,
            returnReasonsData, topItemsData,
            purchaseOrderHistory: supplierPOs.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 10),
        };

    }, [selectedSupplierId, dateRange, purchaseOrders, receiveLogs, returnLogs, itemMasters]);
    
    const handleGenerateAiAnalysis = async () => {
        if (!reportData || !user) return;
        setIsAiLoading(true);
        setAiResult(null);
        setAiError(null);

        const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name;

        const prompt = `
        As a procurement analyst for a public health office, analyze the following performance data for the medical supplier "${supplierName}" over the last ${dateRange} days. 
        
        Key Metrics:
        - Average Lead Time: ${reportData.avgLeadTimeDays.toFixed(1)} days
        - Order Fill Rate: ${reportData.fillRate.toFixed(1)}%
        - Return Rate: ${reportData.returnRate.toFixed(2)}%
        - Return Reasons: ${reportData.returnReasonsData.map(r => `${r.name} (${r.value})`).join(', ') || 'None'}
        - Total Purchase Value: ${formatCurrency(reportData.totalPurchaseValue)}

        Provide a concise, professional analysis in a JSON object.
        `;
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A brief, high-level summary of the supplier's overall performance." },
                    strengths: { type: Type.ARRAY, description: "A list of 2-3 key positive points.", items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, description: "A list of 2-3 key areas for improvement or concern.", items: { type: Type.STRING } },
                    recommendation: { type: Type.STRING, description: "A final, actionable recommendation for managing this supplier relationship." },
                },
                required: ["summary", "strengths", "weaknesses", "recommendation"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            const parsedResponse = JSON.parse(response.text);
            setAiResult(parsedResponse);
            await logAuditEvent(user, 'AI Supplier Analysis', { supplierName });

        } catch (error) {
            console.error("AI Analysis Error:", error);
            setAiError("Failed to generate AI analysis. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handlePrint = () => {
        if (!reportData || !selectedSupplierId) return;
        const printData = {
            reportData,
            supplier: suppliers.find(s => s.id === selectedSupplierId),
            dateRange,
            aiResult,
            generatedDate: new Date().toISOString()
        };
        navigate('/print/supplier-insights', { state: printData });
    };

    const handleExport = () => {
        if (!reportData || !selectedSupplierId) return;
        const supplierName = suppliers.find(s => s.id === selectedSupplierId)?.name;
        const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
        
        let csvContent = "";
        csvContent += `Supplier Performance Insights Report for ${supplierName}\n`;
        csvContent += `Date Range: Last ${dateRange} days\n\n`;

        csvContent += "Key Metrics\n";
        csvContent += `Average Lead Time (days),${reportData.avgLeadTimeDays.toFixed(1)}\n`;
        csvContent += `Order Fill Rate (%),${reportData.fillRate.toFixed(1)}\n`;
        csvContent += `Return Rate (%),${reportData.returnRate.toFixed(2)}\n`;
        csvContent += `Total Purchase Value (PHP),${reportData.totalPurchaseValue}\n\n`;

        csvContent += "Top 5 Supplied Items (by Quantity)\n";
        csvContent += "Item Name,Quantity Received\n";
        reportData.topItemsData.forEach(item => {
            csvContent += `${escape(item.name)},${item.value}\n`;
        });
        csvContent += "\n";

        csvContent += "Return Reasons\n";
        csvContent += "Reason,Count\n";
        reportData.returnReasonsData.forEach(item => {
            csvContent += `${escape(item.name)},${item.value}\n`;
        });
        csvContent += "\n";

        csvContent += "Recent Purchase Order History\n";
        csvContent += "PO Number,Order Date,Status,Value\n";
        reportData.purchaseOrderHistory.forEach(po => {
            csvContent += `${escape(po.poNumber)},${new Date(po.orderDate).toLocaleDateString()},${po.status},${po.totalValue}\n`;
        });

        downloadStringAsFile(csvContent, `supplier_insights_${supplierName}.csv`, 'text/csv;charset=utf-8;');
    };
    
    return (
        <div className="space-y-6">
             <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <SearchableSelect
                            label="Select Supplier to Analyze"
                            options={activeSuppliers.map(s => ({ value: s.id, label: s.name }))}
                            value={selectedSupplierId}
                            onChange={(value) => {
                                setSelectedSupplierId(value);
                                setAiResult(null); 
                                setAiError(null);
                            }}
                            placeholder="Search for a supplier..."
                        />
                    </div>
                     <Select label="Date Range" value={dateRange} onChange={e => setDateRange(Number(e.target.value))}>
                        <option value="90">Last 90 Days</option>
                        <option value="180">Last 6 Months</option>
                        <option value="365">Last Year</option>
                    </Select>
                </div>
            </Card>

            {!selectedSupplierId && (
                <Card><p className="text-center p-8 text-secondary-500">Please select a supplier to view their performance insights.</p></Card>
            )}

            {selectedSupplierId && !reportData && (
                <Card><p className="text-center p-8 text-secondary-500">No data available for this supplier in the selected period.</p></Card>
            )}

            {selectedSupplierId && reportData && (
                <div className="space-y-6">
                    <Card>
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                                <h3 className="font-semibold text-secondary-800">Performance Tools</h3>
                                <p className="text-sm text-secondary-500">Generate an AI summary or export the data for offline analysis.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handlePrint} variant="secondary" leftIcon={<PrintIcon />}>Print</Button>
                                <Button onClick={handleExport} variant="secondary" leftIcon={<DownloadIcon />}>Export</Button>
                                <Button onClick={handleGenerateAiAnalysis} disabled={isAiLoading} leftIcon={<SparklesIcon />}>
                                    {isAiLoading ? 'Analyzing...' : 'AI Analysis'}
                                </Button>
                            </div>
                        </div>
                        {isAiLoading && <div className="mt-4 flex justify-center"><Spinner /></div>}
                        {aiError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{aiError}</div>}
                        {aiResult && (
                            <div className="mt-4 p-4 border rounded-lg bg-secondary-50 space-y-3 text-sm">
                                <p><strong className="text-secondary-800">Summary:</strong> {aiResult.summary}</p>
                                <div><strong className="text-green-700">Strengths:</strong><ul className="list-disc list-inside ml-4">{aiResult.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                <div><strong className="text-red-700">Weaknesses:</strong><ul className="list-disc list-inside ml-4">{aiResult.weaknesses.map((w,i) => <li key={i}>{w}</li>)}</ul></div>
                                <p><strong className="text-primary-700">Recommendation:</strong> {aiResult.recommendation}</p>
                            </div>
                        )}
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DashboardCard title="Average Lead Time" value={`${reportData.avgLeadTimeDays.toFixed(1)} days`} icon={<TruckIcon/>} color="blue" />
                        <DashboardCard title="Order Fill Rate" value={`${reportData.fillRate.toFixed(1)}%`} icon={<CheckBadgeIcon/>} color="green" />
                        <DashboardCard title="Return Rate" value={`${reportData.returnRate.toFixed(2)}%`} icon={<ReturnIcon/>} color="orange" />
                        <DashboardCard title="Total Purchase Value" value={formatCurrency(reportData.totalPurchaseValue)} icon={<PesoSignIcon/>} color="teal" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Top 5 Supplied Items (by Quantity)">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={reportData.topItemsData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Qty Received" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                        <Card title="Return Reasons">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={reportData.returnReasonsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {reportData.returnReasonsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    <Card title="Recent Purchase Order History">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-secondary-200 text-sm">
                                <thead className="bg-secondary-50"><tr>
                                    <th className="px-4 py-2 text-left">PO Number</th>
                                    <th className="px-4 py-2 text-left">Order Date</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-right">Value</th>
                                </tr></thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {reportData.purchaseOrderHistory.map(po => (
                                        <tr key={po.id}>
                                            <td className="px-4 py-2 font-mono text-primary-600">{po.poNumber}</td>
                                            <td className="px-4 py-2">{new Date(po.orderDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-2">{po.status}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(po.totalValue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {reportData.purchaseOrderHistory.length === 0 && <p className="text-center p-4 text-secondary-500">No purchase orders found in this period.</p>}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SupplierInsights;
