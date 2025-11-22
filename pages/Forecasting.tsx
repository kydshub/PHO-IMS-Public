

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from 'recharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { ItemType, InventoryItem, ItemMaster, FacilityStatus, Facility, Program, Role, DispenseLog, Category } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { downloadStringAsFile } from '../utils/download';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../utils/formatters';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const ViewDetailsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;

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
        level: number; // For sorting
    };
    currentStock: number;
    consumptionHistory: { date: string; quantity: number }[];
    primarySupplierId?: string;
}

interface AiForecastResult {
    itemName: string;
    analysis: string;
    recommendation: string;
    suggestedOrderQuantity?: number;
    riskLevel?: 'Low' | 'Medium' | 'High';
}

type SortableKeys = keyof SimpleForecastResult | 'itemName' | 'runOutDateSort' | 'recommendationSort';

const Forecasting: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { itemMasters, inventoryItems, dispenseLogs, facilities, programs, storageLocations, categories } = data;
    const navigate = useNavigate();
    
    const canViewAllFacilities = useMemo(() => user?.role === Role.SystemAdministrator || user?.role === Role.Admin, [user]);
    
    const [selectedFacilityId, setSelectedFacilityId] = useState<string>(canViewAllFacilities ? '' : user?.facilityId || '');
    const [selectedProgramId, setSelectedProgramId] = useState<string>('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [historyDays, setHistoryDays] = useState<number>(90);

    const [simpleForecastResults, setSimpleForecastResults] = useState<SimpleForecastResult[] | null>(null);
    const [aiForecastResults, setAiForecastResults] = useState<AiForecastResult[] | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiError, setAiError] = useState<string | null>(null);
    
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'recommendationSort', direction: 'ascending' });
    const [chartFilter, setChartFilter] = useState<string | null>(null);
    const [detailsModalItem, setDetailsModalItem] = useState<SimpleForecastResult | null>(null);

    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
    
    const inventoryItemDetailsMap = useMemo(() => {
        const map = new Map<string, { itemMasterId: string, facilityId?: string, programId?: string, supplierId?: string }>();
        const storageFacilityMap = new Map<string, string>();
        storageLocations.forEach(sl => storageFacilityMap.set(sl.id, sl.facilityId));

        inventoryItems.forEach(item => {
            map.set(item.id, {
                itemMasterId: item.itemMasterId,
                facilityId: storageFacilityMap.get(item.storageLocationId),
                programId: item.programId,
                supplierId: item.supplierId
            });
        });
        return map;
    }, [inventoryItems, storageLocations]);

    const runForecastingLogic = useCallback(() => {
        // 1. Map storage locations to facilities for efficient lookup
        const storageFacilityMap = new Map<string, string>();
        storageLocations.forEach(sl => storageFacilityMap.set(sl.id, sl.facilityId));

        // 2. Get all unique item master IDs that exist in the selected facility/scope.
        // This ensures we only forecast for items relevant to the selected facility.
        const relevantItemMasterIds = new Set<string>();
        inventoryItems.forEach(item => {
            const itemFacilityId = storageFacilityMap.get(item.storageLocationId);
            if (!selectedFacilityId || itemFacilityId === selectedFacilityId) {
                relevantItemMasterIds.add(item.itemMasterId);
            }
        });

        // 3. Filter item masters based on relevance, category, and type.
        const consumableItems = itemMasters.filter(item => 
            relevantItemMasterIds.has(item.id) &&
            item.itemType === ItemType.Consumable &&
            (!selectedCategoryId || item.categoryId === selectedCategoryId)
        );
        
        const results: SimpleForecastResult[] = [];
        
        const historyCutoffDate = new Date();
        historyCutoffDate.setDate(historyCutoffDate.getDate() - historyDays);

        for (const itemMaster of consumableItems) {
            const relevantBatches = inventoryItems.filter(item => {
                const details = inventoryItemDetailsMap.get(item.id);
                if (details?.itemMasterId !== itemMaster.id) return false;
                if (selectedFacilityId && details.facilityId !== selectedFacilityId) return false;
                if (selectedProgramId && details.programId !== selectedProgramId) return false;
                return true;
            });

            const currentStock = relevantBatches.reduce((sum, item) => sum + item.quantity, 0);
            if (currentStock === 0 && !selectedFacilityId && !selectedProgramId && !selectedCategoryId) continue;

            const relevantBatchIds = new Set(relevantBatches.map(item => item.id));
            const relevantDispenseLogs = dispenseLogs.filter(log => new Date(log.timestamp) >= historyCutoffDate);
            
            const consumptionByDate: Record<string, number> = {};
            const totalDispensed = relevantDispenseLogs.reduce((total, log) => {
                const quantityInLog = log.items.reduce((logTotal, logItem) => {
                    if (relevantBatchIds.has(logItem.inventoryItemId)) {
                        const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
                        consumptionByDate[dateStr] = (consumptionByDate[dateStr] || 0) + logItem.quantity;
                        return logTotal + logItem.quantity;
                    }
                    return logTotal;
                }, 0);
                return total + quantityInLog;
            }, 0);
            
            const consumptionHistory = Object.entries(consumptionByDate)
                .map(([date, quantity]) => ({ date, quantity }))
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const avgDailyConsumption = historyDays > 0 ? totalDispensed / historyDays : 0;
            
            const { lowStockThreshold } = itemMaster;
            let daysUntilRunOut: number | null = null, runOutDate: Date | null = null;
            let daysUntilLowStock: number | null = null, lowStockDate: Date | null = null;

            if (avgDailyConsumption > 0) {
                daysUntilRunOut = currentStock / avgDailyConsumption;
                runOutDate = new Date();
                runOutDate.setDate(runOutDate.getDate() + daysUntilRunOut);
                if (lowStockThreshold !== null && lowStockThreshold > 0) {
                    daysUntilLowStock = (currentStock > lowStockThreshold) ? (currentStock - lowStockThreshold) / avgDailyConsumption : 0;
                    lowStockDate = new Date();
                    lowStockDate.setDate(lowStockDate.getDate() + daysUntilLowStock);
                }
            }

            let recommendation = { text: 'Sufficient Stock', color: 'text-green-600', level: 3 };
            if (currentStock === 0) recommendation = { text: 'Out of Stock', color: 'text-red-700 font-extrabold', level: 0 };
            else if (lowStockDate) {
                const daysDiff = (lowStockDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                if (daysDiff <= 0) recommendation = { text: 'Order Immediately', color: 'text-red-600 font-bold', level: 0 };
                else if (daysDiff <= 14) recommendation = { text: 'Order Soon', color: 'text-red-600', level: 1 };
                else if (daysDiff <= 30) recommendation = { text: 'Monitor Stock', color: 'text-yellow-600', level: 2 };
            }
            
            const primarySupplierId = relevantBatches.length > 0 ? relevantBatches[0].supplierId : undefined;

            results.push({ itemMaster, avgDailyConsumption, daysUntilRunOut, runOutDate, daysUntilLowStock, lowStockDate, recommendation, currentStock, consumptionHistory, primarySupplierId });
        }
        return results;
    }, [itemMasters, inventoryItems, dispenseLogs, historyDays, selectedFacilityId, selectedProgramId, selectedCategoryId, inventoryItemDetailsMap, storageLocations]);

    const handleGenerateSimpleForecast = useCallback(() => {
        setIsLoading(true);
        setSimpleForecastResults(null);
        setAiForecastResults(null);
        setAiError(null);
        setTimeout(() => {
            const results = runForecastingLogic();
            setSimpleForecastResults(results);
            setIsLoading(false);
        }, 500);
    }, [runForecastingLogic]);

    const handleGenerateAiForecast = async () => {
        if (!simpleForecastResults) {
            alert("Please generate a simple forecast first.");
            return;
        }
        setIsAiLoading(true);
        setAiError(null);
        setAiForecastResults(null);
    
        try {
            const itemsToAnalyze = simpleForecastResults
                .filter(item => item.recommendation.level < 3 || item.avgDailyConsumption > 0)
                .sort((a,b) => a.recommendation.level - b.recommendation.level)
                .slice(0, 15);
    
            if (itemsToAnalyze.length === 0) {
                setAiError("No items with significant activity found to analyze. All stock levels appear sufficient.");
                setIsAiLoading(false);
                return;
            }
    
            const itemDataForPrompt = itemsToAnalyze.map(item =>
                `- Item: "${item.itemMaster.name}"\n  - Current Stock: ${item.currentStock} ${item.itemMaster.unit}\n  - Low Stock Threshold: ${item.itemMaster.lowStockThreshold || 'N/A'}\n  - Average Daily Consumption (last ${historyDays} days): ${item.avgDailyConsumption.toFixed(2)} units`
            ).join('\n');
            
            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
            const facilityContext = selectedFacilityId ? `for the facility "${facilities.find(f=>f.id===selectedFacilityId)?.name}"` : "across all facilities";
            const programContext = selectedProgramId ? `for the program "${programs.find(p=>p.id===selectedProgramId)?.name}"` : "";
            const categoryContext = selectedCategoryId ? `within the category "${categories.find(c => c.id === selectedCategoryId)?.name}"` : "";
    
            const prompt = `
            Act as an expert public health logistics and inventory analyst. Today is ${new Date().toLocaleDateString()}. The current month is ${currentMonth}.
            Analyze the following list of medical supplies ${facilityContext} ${programContext} ${categoryContext}. Your analysis should be concise, data-driven, and actionable. Consider potential seasonal demand spikes (e.g., flu season in colder months, dengue season in rainy months) or public health events.

            Data:
            ${itemDataForPrompt}

            Return the response as a single JSON object with a key "forecasts". This key should contain an array of objects. Each object must have the keys: "itemName", "analysis" (a brief explanation of the situation), "recommendation" (a clear action), "suggestedOrderQuantity" (an integer, suggest 0 if no order is needed), and "riskLevel" ('Low', 'Medium', or 'High').
            `;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    forecasts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                itemName: { type: Type.STRING },
                                analysis: { type: Type.STRING },
                                recommendation: { type: Type.STRING },
                                suggestedOrderQuantity: { type: Type.INTEGER },
                                riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                            },
                            required: ["itemName", "analysis", "recommendation", "suggestedOrderQuantity", "riskLevel"],
                        },
                    },
                },
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
            if (parsedResponse.forecasts) {
                setAiForecastResults(parsedResponse.forecasts);
            } else {
                throw new Error("AI response was not in the expected format.");
            }
    
        } catch (error) {
            console.error("AI Forecast Error:", error);
            setAiError("Failed to generate AI forecast. The model may have returned an unexpected response. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const filteredAndSortedResults = useMemo(() => {
        if (!simpleForecastResults) return [];
        const filtered = chartFilter ? simpleForecastResults.filter(item => item.itemMaster.name === chartFilter) : simpleForecastResults;
        return [...filtered].sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue: any, bValue: any;
            switch (key) {
                case 'itemName': aValue = a.itemMaster.name; bValue = b.itemMaster.name; break;
                case 'runOutDateSort': aValue = a.runOutDate?.getTime() || Infinity; bValue = b.runOutDate?.getTime() || Infinity; break;
                case 'recommendationSort': aValue = a.recommendation.level; bValue = b.recommendation.level; break;
                default: aValue = a[key as keyof SimpleForecastResult]; bValue = b[key as keyof SimpleForecastResult]; break;
            }
            if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [simpleForecastResults, sortConfig, chartFilter]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const chartData = useMemo(() => {
        if (!simpleForecastResults) return [];
        return simpleForecastResults
            .filter(item => item.daysUntilRunOut !== null && item.daysUntilRunOut < 365)
            .sort((a,b) => a.daysUntilRunOut!)
            .slice(0, 10)
            .map(item => ({
                name: item.itemMaster.name,
                days: Math.round(item.daysUntilRunOut!)
            }));
    }, [simpleForecastResults]);
    
    const exportToCSV = useCallback(() => {
        if (!simpleForecastResults) return;

        const headers = ['Item Name', 'Current Stock', 'Unit', 'Avg Daily Use', 'Low Stock At', 'Est. Low Stock Date', 'Est. Run Out Date', 'Recommendation'];
        
        const csvRows = [
            headers.join(','),
            ...filteredAndSortedResults.map(item => {
                const escape = (str: any) => `"${(str || '').toString().replace(/"/g, '""')}"`;
                return [
                    escape(item.itemMaster.name),
                    item.currentStock,
                    escape(item.itemMaster.unit),
                    item.avgDailyConsumption.toFixed(2),
                    item.itemMaster.lowStockThreshold || 0,
                    item.lowStockDate ? escape(item.lowStockDate.toLocaleDateString()) : 'N/A',
                    item.runOutDate ? escape(item.runOutDate.toLocaleDateString()) : 'N/A',
                    escape(item.recommendation.text)
                ].join(',');
            })
        ];
        
        downloadStringAsFile(csvRows.join('\n'), 'demand_forecast.csv', 'text/csv;charset=utf-8;');
    }, [filteredAndSortedResults, simpleForecastResults]);

    const handlePrint = useCallback(() => {
        if (!simpleForecastResults) return;

        const params = new URLSearchParams();
        if (selectedFacilityId) params.set('facilityId', selectedFacilityId);
        if (selectedProgramId) params.set('programId', selectedProgramId);
        params.set('historyDays', String(historyDays));
        
        const printState = {
            items: filteredAndSortedResults,
            filters: { selectedFacilityId, selectedProgramId, historyDays },
            generatedDate: new Date().toISOString()
        };
        sessionStorage.setItem('printData-forecast', JSON.stringify(printState));

        window.open(`/#/print/forecast?${params.toString()}`, '_blank');
    }, [navigate, filteredAndSortedResults, simpleForecastResults, selectedFacilityId, selectedProgramId, historyDays]);
    
    const SortableHeader: React.FC<{ sortKey: SortableKeys; children: React.ReactNode; }> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                <span>{children}</span>
                {sortConfig.key === sortKey && <span className="ml-2">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>}
            </div>
        </th>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h2 className="text-3xl font-semibold text-secondary-800">Demand Forecasting</h2>
                <div className="flex gap-2">
                    <Button onClick={handlePrint} leftIcon={<PrintIcon />} variant="secondary" disabled={!simpleForecastResults || isLoading || isAiLoading}>Print Report</Button>
                    <Button onClick={exportToCSV} leftIcon={<DownloadIcon />} variant="secondary" disabled={!simpleForecastResults || isLoading || isAiLoading}>Export CSV</Button>
                </div>
            </div>
             <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <Select label="Facility" value={selectedFacilityId} onChange={e => setSelectedFacilityId(e.target.value)} disabled={!canViewAllFacilities}>
                        {canViewAllFacilities ? (
                            <>
                                <option value="">All Facilities</option>
                                {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </>
                        ) : (
                            activeFacilities.filter(f => f.id === user?.facilityId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                        )}
                    </Select>
                    <Select label="Program" value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)}>
                        <option value="">All Programs</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                    <Select label="Category" value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Select label="Historical Data" value={historyDays} onChange={e => setHistoryDays(Number(e.target.value))}>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="180">Last 180 Days</option>
                        <option value="365">Last 365 Days</option>
                    </Select>
                    <Button onClick={handleGenerateSimpleForecast} disabled={isLoading || isAiLoading} variant="secondary" className="w-full">
                        {isLoading ? <Spinner size="sm" /> : 'Generate Forecast'}
                    </Button>
                    <Button onClick={handleGenerateAiForecast} disabled={isLoading || isAiLoading || !simpleForecastResults} className="w-full">
                        {isAiLoading ? <Spinner size="sm" /> : 'AI Analysis'}
                    </Button>
                </div>
            </Card>

            {isLoading && <div className="text-center p-8"><Spinner /><p className="text-secondary-600 mt-2">Analyzing data...</p></div>}
            
            {simpleForecastResults && !isLoading && (
                 <Card 
                    title="Forecast Results" 
                    actions={chartFilter && <Button variant="secondary" size="sm" onClick={() => setChartFilter(null)}>Clear Filter</Button>}
                 >
                    {chartData.length > 0 && (
                        <div className="mb-8 border-b pb-4">
                             <h4 className="font-semibold text-secondary-800 mb-2">Top 10 Items with Lowest Days of Supply</h4>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value) => [`${value} days`, "Supply"]}/>
                                    <Bar dataKey="days" name="Days of Supply" onClick={(data) => setChartFilter(data.name)} style={{ cursor: 'pointer' }}>
                                         {chartData.map((entry) => (
                                            <Cell key={`cell-${entry.name}`} fill={entry.days < 30 ? '#ef4444' : entry.days < 60 ? '#f59e0b' : '#22c55e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                             <thead className="bg-secondary-50">
                                <tr>
                                    <SortableHeader sortKey="itemName">Item</SortableHeader>
                                    <SortableHeader sortKey="currentStock">Stock</SortableHeader>
                                    <SortableHeader sortKey="avgDailyConsumption">Avg. Daily Use</SortableHeader>
                                    <SortableHeader sortKey="runOutDateSort">Est. Run Out</SortableHeader>
                                    <SortableHeader sortKey="recommendationSort">Recommendation</SortableHeader>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {filteredAndSortedResults.map((result) => (
                                    <tr key={result.itemMaster.id} className="hover:bg-secondary-50">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-secondary-900">{result.itemMaster.name}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{result.currentStock.toLocaleString()} {result.itemMaster.unit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{result.avgDailyConsumption.toFixed(2)} / day</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{result.runOutDate ? result.runOutDate.toLocaleDateString() : 'N/A'}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}><span className={result.recommendation.color}>{result.recommendation.text}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => setDetailsModalItem(result)} title="View Details"><ViewDetailsIcon/></Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredAndSortedResults.length === 0 && (<div className="text-center p-8 text-secondary-500">No items match the selected filters.</div>)}
                    </div>
                </Card>
            )}

            {isAiLoading && <Card className="mt-6 text-center p-8 flex flex-col items-center justify-center gap-4"><Spinner /><p className="text-secondary-600">Generating AI analysis...</p></Card>}
            {aiError && <Card className="mt-6 text-center p-8 bg-red-50 border-l-4 border-red-200"><p className="font-semibold text-red-700">An Error Occurred</p><p className="text-red-600 mt-1">{aiError}</p></Card>}
            {aiForecastResults && !isAiLoading && (
                 <Card title="AI-Powered Forecast Analysis" className="mt-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                             <thead className="bg-secondary-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Item</th><th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Analysis</th><th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Recommendation</th><th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Suggested Order</th></tr></thead>
                             <tbody className="bg-white divide-y divide-secondary-200">{aiForecastResults.map(r => (<tr key={r.itemName}><td className="px-6 py-4 align-top text-sm font-medium text-secondary-900">{r.itemName}</td><td className="px-6 py-4 align-top text-sm text-secondary-600">{r.analysis}</td><td className="px-6 py-4 align-top text-sm font-medium text-secondary-800">{r.recommendation}</td><td className="px-6 py-4 align-top text-sm">{r.suggestedOrderQuantity}</td></tr>))}</tbody>
                        </table>
                    </div>
                </Card>
            )}

            {detailsModalItem && (
                <Modal isOpen={!!detailsModalItem} onClose={() => setDetailsModalItem(null)} title={`Details for ${detailsModalItem.itemMaster.name}`}>
                    <div className="space-y-4">
                        <h4 className="font-semibold text-secondary-800">Consumption History (Last {historyDays} Days)</h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={detailsModalItem.consumptionHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="quantity" name="Dispensed" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>

                        {aiForecastResults && aiForecastResults.find(res => res.itemName === detailsModalItem.itemMaster.name) && (
                            <div>
                                <h4 className="font-semibold text-secondary-800 mt-4">AI Analysis</h4>
                                <div className="p-3 bg-secondary-50 rounded-md mt-2 text-sm">
                                    <p><strong>Analysis:</strong> {aiForecastResults.find(res => res.itemName === detailsModalItem.itemMaster.name)?.analysis}</p>
                                    <p className="mt-2"><strong>Recommendation:</strong> {aiForecastResults.find(res => res.itemName === detailsModalItem.itemMaster.name)?.recommendation}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Forecasting;