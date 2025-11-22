import React, { useMemo, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatters';
import { Facility, PhysicalCountStatus, ItemType, Role } from '../types';
import { calculateDepreciation } from '../utils/depreciation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Spinner } from '../components/ui/Spinner';
import { GoogleGenAI, Type } from "@google/genai";
import { logAuditEvent } from '../services/audit';
import DashboardCard from '../components/DashboardCard';
import { useNavigate } from 'react-router-dom';
import { downloadStringAsFile } from '../utils/download';

const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L 14.5 9.5 L 22 12 L 14.5 14.5 L 12 22 L 9.5 14.5 L 2 12 L 9.5 9.5 Z"/></svg>;
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;

interface KpiData {
    commodityValue: number;
    ppeValue: number;
    stockoutRate: number;
    turnoverRate: number;
}

const FacilityPerformance: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data } = useDatabase();
    const { facilities, inventoryItems, assetItems, dispenseLogs, itemMasters, storageLocations } = data;
    const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<{ summary: string; strengths: string[]; weaknesses: string[]; recommendations: string[]; } | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    
    const facilityKpis = useMemo(() => {
        const kpiMap = new Map<string, KpiData>();
        const storageFacilityMap = new Map(storageLocations.map(sl => [sl.id, sl.facilityId]));
        const itemMasterMap = new Map(itemMasters.map(im => [im.id, im]));

        facilities.forEach(f => kpiMap.set(f.id, { commodityValue: 0, ppeValue: 0, stockoutRate: 0, turnoverRate: 0 }));

        inventoryItems.forEach(item => {
            const facilityId = storageFacilityMap.get(item.storageLocationId);
            if (!facilityId) return;
            
            const kpis = kpiMap.get(facilityId);
            if (kpis) {
                const master = itemMasterMap.get(item.itemMasterId);
                if (master) {
                    const cost = item.purchaseCost ?? master.unitCost ?? 0;
                    kpis.commodityValue += item.quantity * cost;
                }
            }
        });

        assetItems.forEach(asset => {
            const facilityId = storageFacilityMap.get(asset.storageLocationId);
            if (!facilityId) return;
            const kpis = kpiMap.get(facilityId);
            if (kpis) {
                const { depreciatedValue } = calculateDepreciation(asset);
                kpis.ppeValue += depreciatedValue;
            }
        });
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const costOfGoodsDispensed = new Map<string, number>();
        dispenseLogs.forEach(log => {
            if (new Date(log.timestamp) > thirtyDaysAgo) {
                log.items.forEach(dispensedItem => {
                    const invItem = inventoryItems.find(i => i.id === dispensedItem.inventoryItemId);
                    if (invItem) {
                        const facilityId = storageFacilityMap.get(invItem.storageLocationId);
                        if (facilityId) {
                            const master = itemMasterMap.get(invItem.itemMasterId);
                            const cost = invItem.purchaseCost ?? master?.unitCost ?? 0;
                            costOfGoodsDispensed.set(facilityId, (costOfGoodsDispensed.get(facilityId) || 0) + (dispensedItem.quantity * cost));
                        }
                    }
                });
            }
        });

        kpiMap.forEach((kpis, facilityId) => {
            const itemsInFacility = inventoryItems.filter(i => storageFacilityMap.get(i.storageLocationId) === facilityId);
            const stockoutCount = itemsInFacility.filter(i => i.quantity === 0).length;
            const totalItems = itemsInFacility.length;
            kpis.stockoutRate = totalItems > 0 ? (stockoutCount / totalItems) * 100 : 0;
            
            const cogs = costOfGoodsDispensed.get(facilityId) || 0;
            const avgInventoryValue = kpis.commodityValue;
            kpis.turnoverRate = avgInventoryValue > 0 ? cogs / avgInventoryValue : 0;
        });

        return kpiMap;
    }, [facilities, inventoryItems, assetItems, storageLocations, itemMasters, dispenseLogs]);

    const systemAverageKpis = useMemo(() => {
        const totals = { commodityValue: 0, ppeValue: 0, stockoutRate: 0, turnoverRate: 0 };
        const count = facilityKpis.size || 1;
        facilityKpis.forEach(kpi => {
            Object.keys(totals).forEach(key => {
                totals[key as keyof KpiData] += kpi[key as keyof KpiData];
            });
        });
        return {
            commodityValue: totals.commodityValue / count,
            ppeValue: totals.ppeValue / count,
            stockoutRate: totals.stockoutRate / count,
            turnoverRate: totals.turnoverRate / count,
        };
    }, [facilityKpis]);

    const selectedFacilityData = useMemo(() => {
        if (!selectedFacilityId) return null;
        return {
            facility: facilities.find(f => f.id === selectedFacilityId),
            kpis: facilityKpis.get(selectedFacilityId)
        };
    }, [selectedFacilityId, facilities, facilityKpis]);

    const chartData = useMemo(() => {
        if (!selectedFacilityData?.kpis) return [];
        return [
            { name: 'Stockout Rate (%)', facility: selectedFacilityData.kpis.stockoutRate, average: systemAverageKpis.stockoutRate },
            { name: 'Turnover Rate', facility: selectedFacilityData.kpis.turnoverRate, average: systemAverageKpis.turnoverRate },
        ];
    }, [selectedFacilityData, systemAverageKpis]);

    const handleGenerateAiReview = async () => {
        if (!selectedFacilityData || !selectedFacilityData.kpis || !user) return;
        setIsAiLoading(true);
        setAiResult(null);
        setAiError(null);

        const { facility, kpis } = selectedFacilityData;
        
        const prompt = `
        As a public health supply chain consultant, analyze the following performance metrics for "${facility?.name}". The goal is to identify strengths, weaknesses, and provide actionable recommendations.

        Metrics:
        - Total Commodity Value: ${formatCurrency(kpis.commodityValue)}
        - Total Depreciated PPE Value: ${formatCurrency(kpis.ppeValue)}
        - Stockout Rate: ${kpis.stockoutRate.toFixed(2)}% (Percentage of unique items with zero stock)
        - Inventory Turnover Rate (last 30 days): ${kpis.turnoverRate.toFixed(2)} (A higher number indicates faster-moving stock)

        System-wide Averages for Comparison:
        - Average Stockout Rate: ${systemAverageKpis.stockoutRate.toFixed(2)}%
        - Average Turnover Rate: ${systemAverageKpis.turnoverRate.toFixed(2)}

        Analyze these metrics in context. A low stockout rate is good. A high turnover rate is generally good but could indicate under-stocking. A low turnover rate could indicate overstocking or slow-moving items.
        
        Provide your analysis as a single JSON object.
        `;
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A one-sentence overall performance summary." },
                    strengths: { type: Type.ARRAY, description: "A list of 2-3 key positive points based on the data.", items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, description: "A list of 2-3 key areas for improvement or concern.", items: { type: Type.STRING } },
                    recommendations: { type: Type.ARRAY, description: "A list of 2-3 concrete, actionable recommendations.", items: { type: Type.STRING } },
                },
                required: ["summary", "strengths", "weaknesses", "recommendations"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            const parsedResult = JSON.parse(response.text);
            setAiResult(parsedResult);
            await logAuditEvent(user, 'AI Facility Performance Analysis', { facilityName: facility?.name });
        } catch (error) {
            console.error("AI Analysis Error:", error);
            setAiError("Failed to generate AI analysis. The model may have returned an unexpected response. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handlePrint = () => {
        if (!selectedFacilityData) return;
        const reportData = {
            kpis: selectedFacilityData.kpis,
            systemAverageKpis: systemAverageKpis,
            aiResult: aiResult,
        };
        navigate('/print/facility-performance', { 
            state: { 
                reportData, 
                facility: selectedFacilityData.facility,
                generatedDate: new Date().toISOString()
            } 
        });
    };

    const handleExport = () => {
        if (!selectedFacilityData) return;

        const { facility, kpis } = selectedFacilityData;
        let csvContent = "";
        csvContent += `Facility Performance Report for ${facility?.name}\n\n`;

        csvContent += "Metric,This Facility,System Average\n";
        csvContent += `Commodity Value (PHP),${kpis!.commodityValue},${systemAverageKpis.commodityValue}\n`;
        csvContent += `PPE Value (PHP),${kpis!.ppeValue},${systemAverageKpis.ppeValue}\n`;
        csvContent += `Stockout Rate (%),${kpis!.stockoutRate.toFixed(2)},${systemAverageKpis.stockoutRate.toFixed(2)}\n`;
        csvContent += `Inventory Turnover Rate,${kpis!.turnoverRate.toFixed(2)},${systemAverageKpis.turnoverRate.toFixed(2)}\n`;
        
        downloadStringAsFile(csvContent, `facility_performance_${facility?.name}.csv`, 'text/csv;charset=utf-8;');
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
                <Card title="Facilities">
                    <nav className="space-y-1">
                        {facilities.map(facility => (
                             <button
                                key={facility.id}
                                onClick={() => {
                                    setSelectedFacilityId(facility.id);
                                    setAiResult(null); // Clear previous AI result
                                    setAiError(null);
                                }}
                                className={`w-full text-left p-2 rounded-md text-sm font-medium ${selectedFacilityId === facility.id ? 'bg-primary-100 text-primary-700' : 'text-secondary-700 hover:bg-secondary-100'}`}
                            >
                                {facility.name}
                            </button>
                        ))}
                    </nav>
                </Card>
            </div>
            <div className="md:col-span-3">
                {!selectedFacilityData ? (
                    <Card><div className="p-12 text-center text-secondary-500">Select a facility to view its performance data.</div></Card>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-secondary-900">{selectedFacilityData.facility?.name}</h3>
                            <div className="flex gap-2">
                                <Button onClick={handlePrint} variant="secondary" leftIcon={<PrintIcon />}>Print</Button>
                                <Button onClick={handleExport} variant="secondary" leftIcon={<DownloadIcon />}>Export</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card><div className="p-4"><p className="text-sm text-secondary-500">Commodity Value</p><p className="text-2xl font-bold">{formatCurrency(selectedFacilityData.kpis!.commodityValue)}</p></div></Card>
                            <Card><div className="p-4"><p className="text-sm text-secondary-500">PPE Value</p><p className="text-2xl font-bold">{formatCurrency(selectedFacilityData.kpis!.ppeValue)}</p></div></Card>
                            <Card><div className="p-4"><p className="text-sm text-secondary-500">Stockout Rate</p><p className="text-2xl font-bold">{selectedFacilityData.kpis!.stockoutRate.toFixed(2)}%</p></div></Card>
                            <Card><div className="p-4"><p className="text-sm text-secondary-500">Turnover Rate</p><p className="text-2xl font-bold">{selectedFacilityData.kpis!.turnoverRate.toFixed(2)}</p></div></Card>
                        </div>
                        <Card title="Performance vs. System Average">
                             <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => value.toFixed(2)}/>
                                    <Tooltip formatter={(value) => (value as number).toFixed(2)} />
                                    <Legend />
                                    <Bar dataKey="facility" name="This Facility" fill="#3b82f6" />
                                    <Bar dataKey="average" name="System Average" fill="#64748b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                        <Card>
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <h3 className="font-semibold text-secondary-800">AI Performance Review</h3>
                                    <p className="text-sm text-secondary-500">Get an instant, data-driven analysis of this facility's performance.</p>
                                </div>
                                <Button onClick={handleGenerateAiReview} disabled={isAiLoading} leftIcon={<SparklesIcon />}>
                                    {isAiLoading ? 'Analyzing...' : 'Generate Review'}
                                </Button>
                            </div>
                            {isAiLoading && <div className="mt-4 flex justify-center"><Spinner /></div>}
                            {aiError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{aiError}</div>}
                            {aiResult && (
                                <div className="mt-4 p-4 border rounded-lg bg-secondary-50 space-y-3 text-sm">
                                    <p><strong className="text-secondary-800">Summary:</strong> {aiResult.summary}</p>
                                    <div><strong className="text-green-700">Strengths:</strong><ul className="list-disc list-inside ml-4">{aiResult.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                    <div><strong className="text-red-700">Weaknesses:</strong><ul className="list-disc list-inside ml-4">{aiResult.weaknesses.map((w,i) => <li key={i}>{w}</li>)}</ul></div>
                                    <div><strong className="text-primary-700">Recommendations:</strong><ul className="list-disc list-inside ml-4">{aiResult.recommendations.map((r,i) => <li key={i}>{r}</li>)}</ul></div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacilityPerformance;