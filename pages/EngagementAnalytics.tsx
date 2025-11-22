

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { Role, AuditLog, User } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import DashboardCard from '../components/DashboardCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { GoogleGenAI, Type } from "@google/genai";
import { logAuditEvent } from '../services/audit';
import { downloadStringAsFile } from '../../utils/download';

// --- ICONS ---
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const TrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L 14.5 9.5 L 22 12 L 14.5 14.5 L 12 22 L 9.5 14.5 L 2 12 L 9.5 9.5 Z"/></svg>;

const formatLogForAI = (log: AuditLog): string => {
    const simpleDetails = Object.entries(log.details || {})
      .map(([key, value]) => {
          if (typeof value === 'string' && value.length > 50) return `${key}: ${value.substring(0, 50)}...`;
          if (typeof value === 'object') return `${key}: [Object]`;
          return `${key}: ${value}`;
      })
      .slice(0, 3).join(', ');
      
    return `User: ${log.user}, Action: ${log.action}, Details: ${simpleDetails || 'N/A'}`;
};

const EngagementAnalyticsTab: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { auditLogs, users } = data;
    const navigate = useNavigate();

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<{ summary: string; keyInsights: string[]; actionableRecommendations: string[]; } | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    
    const thirtyDaysAgo = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
    }, []);

    const engagementData = useMemo(() => {
        const logsLast30Days = auditLogs.filter(log => new Date(log.timestamp).getTime() >= thirtyDaysAgo.getTime());
        
        const activeUserIds = new Set(logsLast30Days.map(log => log.uid));
        const activeUsersCount = activeUserIds.size;
        const totalUsersCount = users.length > 0 ? users.length : 1;
        const adoptionRate = (activeUsersCount / totalUsersCount) * 100;
        const inactiveUsersCount = totalUsersCount - activeUsersCount;

        const userMap = new Map(users.map(u => [u.uid, u]));

        const activityByRole = logsLast30Days.reduce((acc, log) => {
            const userRole = userMap.get(log.uid)?.role;
            if (userRole) {
                acc[userRole] = (acc[userRole] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const activityByRoleData = Object.entries(activityByRole)
            .map(([name, count]) => ({ name, count }))
            .sort((a,b) => b.count - a.count);

        const dailyActivity = logsLast30Days.reduce((acc, log) => {
            const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
            acc[dateStr] = (acc[dateStr] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const dailyActivityData = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            return {
                date: dateStr,
                actions: dailyActivity[dateStr] || 0,
            };
        }).reverse();

        return { activeUsers: activeUsersCount, adoptionRate, inactiveUsersCount, activityByRoleData, dailyActivityData };
    }, [auditLogs, users, thirtyDaysAgo]);

    const userActivityData = useMemo(() => {
        const facilityMap = new Map(data.facilities.map(f => [f.id, f.name]));
        
        const activityByUser = users.map(u => {
            const userLogs = auditLogs.filter(log => log.uid === u.uid);
            if (userLogs.length === 0) return { ...u, facilityName: u.facilityId ? facilityMap.get(u.facilityId) || 'N/A' : 'N/A', totalActions: 0, lastActivity: null };
            
            const totalActions = userLogs.length;
            const lastActivity = new Date(userLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp);
            
            return {
                ...u,
                facilityName: u.facilityId ? facilityMap.get(u.facilityId) || 'N/A' : 'N/A',
                totalActions,
                lastActivity
            };
        }).sort((a,b) => b.totalActions - a.totalActions);
          
        return activityByUser;
    }, [users, auditLogs, data.facilities]);

    const handlePrint = () => {
        const printData = { engagementData, userActivityData, generatedDate: new Date().toISOString() };
        sessionStorage.setItem('printData-engagement', JSON.stringify(printData));
        window.open(`/#/print/engagement-report`, '_blank');
    };
    
    const handleExport = () => {
        let csvContent = "";
        
        csvContent += "Metric,Value\n";
        csvContent += `User Adoption Rate,${engagementData.adoptionRate.toFixed(1)}%\n`;
        csvContent += `Active Users (Last 30 Days),${engagementData.activeUsers}\n`;
        csvContent += `Inactive Users,${engagementData.inactiveUsersCount}\n\n`;

        csvContent += "User Activity\n";
        csvContent += "User,Facility,Total Actions,Last Activity\n";
        userActivityData.forEach(user => {
            const row = [`"${user.name}"`, `"${user.facilityName}"`, user.totalActions, user.lastActivity ? `"${new Date(user.lastActivity).toLocaleString()}"` : 'N/A'].join(',');
            csvContent += row + "\n";
        });
        csvContent += "\n";
        
        csvContent += "Activity by Role (Last 30 Days)\n";
        csvContent += "Role,Total Actions\n";
        engagementData.activityByRoleData.forEach(row => {
            csvContent += `"${row.name}",${row.count}\n`;
        });
        csvContent += "\n";
        
        csvContent += "Daily Activity (Last 30 Days)\n";
        csvContent += "Date,Total Actions\n";
        engagementData.dailyActivityData.forEach(row => {
            csvContent += `${row.date},${row.actions}\n`;
        });

        downloadStringAsFile(csvContent, 'engagement_analytics.csv', 'text/csv;charset=utf-8;');
    };

    const handleAnalyzeEngagement = async () => {
        if (!user) return;
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiResult(null);
        setAiError(null);
        
        try {
            const logsToAnalyze = auditLogs.filter(log => new Date(log.timestamp).getTime() >= thirtyDaysAgo.getTime());
            if (logsToAnalyze.length < 10) {
                setAiError("Not enough activity in the last 30 days to generate a meaningful analysis.");
                setIsAiLoading(false);
                return;
            }
            
            const formattedLogs = logsToAnalyze.slice(0, 500).map(formatLogForAI).join('\n');
            const prompt = `As an expert operations analyst for a provincial health office inventory system, analyze the following recent user activity logs. Provide a concise summary, key insights about usage patterns or potential issues, and actionable recommendations to improve system efficiency or user training.

            Logs:
            ${formattedLogs}
    
            Return your analysis as a single JSON object.`;
    
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A brief, high-level summary of the user's activity." },
                    keyInsights: { type: Type.ARRAY, description: "A list of 3-5 key insights, trends, or anomalies found in the data.", items: { type: Type.STRING } },
                    actionableRecommendations: { type: Type.ARRAY, description: "A list of 2-3 concrete recommendations to improve user engagement or system efficiency.", items: { type: Type.STRING } }
                },
                required: ["summary", "keyInsights", "actionableRecommendations"]
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: responseSchema },
            });
    
            setAiResult(JSON.parse(response.text));
            await logAuditEvent(user, 'AI Engagement Analysis', { logsAnalyzed: logsToAnalyze.length });

        } catch (error) {
            console.error("AI Analysis Error:", error);
            setAiError("Failed to generate AI analysis. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 p-4">
                    <div>
                        <h3 className="font-semibold text-secondary-800">AI-Powered Engagement Summary</h3>
                        <p className="text-sm text-secondary-500">Get an instant analysis of recent user activity to identify trends and opportunities.</p>
                    </div>
                    <Button onClick={handleAnalyzeEngagement} leftIcon={<SparklesIcon />} disabled={isAiLoading}>
                        {isAiLoading ? 'Analyzing...' : 'Analyze with AI'}
                    </Button>
                </div>
                {isAiLoading && <div className="p-4 flex justify-center"><Spinner /></div>}
                {aiError && <div className="p-4 bg-red-50 text-red-700 rounded-b-lg text-sm">{aiError}</div>}
                {aiResult && (
                    <div className="p-4 border-t rounded-b-lg bg-secondary-50 space-y-3 text-sm">
                        <p><strong className="text-secondary-800">Summary:</strong> {aiResult.summary}</p>
                        <div><strong className="text-green-700">Key Insights:</strong><ul className="list-disc list-inside ml-4">{aiResult.keyInsights.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                        <div><strong className="text-primary-700">Recommendations:</strong><ul className="list-disc list-inside ml-4">{aiResult.actionableRecommendations.map((w,i) => <li key={i}>{w}</li>)}</ul></div>
                    </div>
                )}
            </Card>
            
            <Card>
                <div className="p-4 flex justify-between items-center border-b">
                    <h3 className="font-semibold text-secondary-800">Adoption & Engagement Metrics</h3>
                    <div className="flex gap-2">
                        <Button onClick={handlePrint} variant="secondary" size="sm">Print</Button>
                        <Button onClick={handleExport} variant="secondary" size="sm">Export CSV</Button>
                    </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DashboardCard title="User Adoption Rate" value={`${engagementData.adoptionRate.toFixed(1)}%`} subtitle="Users with any activity" icon={<UsersIcon/>} color="sky" />
                    <DashboardCard title="Active Users" value={engagementData.activeUsers} subtitle="Last 30 days" icon={<UsersIcon/>} color="green" />
                    <DashboardCard title="Inactive Users" value={engagementData.inactiveUsersCount} subtitle="Have never logged an action" icon={<UsersIcon/>} color="yellow" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-secondary-700 text-center">System Activity by Role (Last 30 days)</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={engagementData.activityByRoleData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3b82f6" name="Actions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold text-secondary-700 text-center">Daily Engagement Trends (Last 30 Days)</h4>
                         <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={engagementData.dailyActivityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', {day:'numeric'})} />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="actions" stroke="#1d4ed8" strokeWidth={2} name="Total Actions" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>

            <Card title="User Activity">
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-secondary-200">
                         <thead className="bg-secondary-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">User</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Facility</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500 uppercase">Total Actions</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Last Activity</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {userActivityData.map(u => (
                                <tr key={u.uid}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-secondary-900">{u.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary-500">{u.facilityName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary-500 text-right">{u.totalActions}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary-500">{u.lastActivity ? u.lastActivity.toLocaleString() : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="AI Engagement Analysis">
                {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center h-48"><Spinner /><p className="mt-4 text-secondary-600">Analyzing recent activity...</p></div>
                ) : aiError ? (
                    <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700"><p className="font-bold">Error</p><p>{aiError}</p></div>
                ) : aiResult ? (
                    <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-2">
                        <div>
                            <h4 className="font-semibold text-secondary-800">Summary</h4>
                            <p className="text-secondary-600 mt-1">{aiResult.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-secondary-800">Key Insights</h4>
                            <ul className="list-disc list-inside space-y-1 mt-1 text-secondary-600">
                                {aiResult.keyInsights.map((insight, index) => <li key={index}>{insight}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-secondary-800">Actionable Recommendations</h4>
                            <ul className="list-disc list-inside space-y-1 mt-1 text-secondary-600">
                                {aiResult.actionableRecommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                            </ul>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default EngagementAnalyticsTab;