
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/DatePicker';
import { Spinner } from '../components/ui/Spinner';
import { TablePagination } from '../components/ui/TablePagination';
import { PurchaseOrder, TransferLog, AuditLog, ItemMaster, Role, InternalReturnLog } from '../types';
import { downloadStringAsFile } from '../utils/download';
import DashboardCard from '../components/DashboardCard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { GoogleGenAI, Type } from "@google/genai";
import { Modal } from '../components/ui/Modal';
import { logAuditEvent } from '../services/audit';
import { db } from '../services/firebase';

const ActionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const ItemsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const ManagementIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L 14.5 9.5 L 22 12 L 14.5 14.5 L 12 22 L 9.5 14.5 L 2 12 L 9.5 9.5 Z"/></svg>;


interface ActivityLogItem {
    timestamp: string;
    type: string;
    controlNumber: string;
    summary: string;
    logId: string;
    printPath: string;
    itemMasterIds?: string[];
}

interface SummaryStats {
    totalActions: number;
    uniqueItemCount: number;
    managementActionCount: number;
}

const formatLogDetails = (log: AuditLog): string => {
    const { action, details } = log;
  
    if (!details || Object.keys(details).length === 0) {
        switch(action) {
            case 'User Login': return 'User logged in successfully.';
            case 'User Logout': return 'User logged out successfully.';
            case 'User Impersonation Stop': return 'Returned to original admin account.';
            default: return 'No additional details provided.';
        }
    }
  
    try {
        switch (action) {
            case 'User Create': return `Created user ${details.newUserEmail} with role "${details.role}".`;
            case 'User Update':
                let changesStr = 'No changes logged.';
                if (details.changes && typeof details.changes === 'object') {
                    changesStr = Object.entries(details.changes)
                        .map(([key, value]) => `${key} to "${value}"`)
                        .join(', ');
                } else if (details.changes) {
                    changesStr = details.changes; 
                }
                return `Updated user ${details.targetUser}: Changed ${changesStr}.`;
            case 'User Delete': return `Deleted user: ${details.deletedUser}.`;
            case 'User Suspend': return `Suspended user account: ${details.targetUser}.`;
            case 'User Reactivate': return `Reactivated user account: ${details.targetUser}.`;
            case 'User Impersonation Start': return `Started impersonating user: ${details.impersonatedUser}.`;
            case 'Forced Password Change': return `User changed their initial password.`;
            case 'Facility Create': return `Created facility: "${details.facilityName}".`;
            case 'Facility Update': return `Updated facility name to: "${details.facilityName}".`;
            case 'Facility Deactivate': return `Deactivated facility: "${details.facilityName}".`;
            case 'Facility Activate': return `Activated facility: "${details.facilityName}".`;
            case 'Facility Delete': return `Deleted facility: "${details.facilityName}".`;
            case 'Storage Location Create': return `Created location "${details.locationName}" in facility "${details.facilityName}".`;
            case 'Storage Location Update': return `Updated location to "${details.locationName}" in facility "${details.facilityName}".`;
            case 'Storage Location Delete': return `Deleted location "${details.locationName}" from facility "${details.facilityName}".`;
            case 'Item Master Create': return `Created master item: "${details.itemName}".`;
            case 'Item Master Update': return `Updated master item: "${details.itemName}".`;
            case 'Item Master Delete': return `Deleted master item: "${details.itemName}".`;
            case 'Stock Item Update': return `Updated stock details for ${details.itemName} (Batch: ${details.batchNumber}).`;
            case 'Category Create': return `Created category: "${details.categoryName}".`;
            case 'Category Update': return `Updated category to: "${details.categoryName}".`;
            case 'Category Delete': return `Deleted category: "${details.categoryName}".`;
            case 'Supplier Create': return `Created supplier: "${details.supplierName}".`;
            case 'Supplier Update': return `Updated supplier: "${details.supplierName}".`;
            case 'Supplier Delete': return `Deleted supplier: "${details.supplierName}".`;
            case 'Supplier Activate': return `Activated supplier: "${details.supplierName}".`;
            case 'Supplier Deactivate': return `Deactivated supplier: "${details.supplierName}".`;
            case 'Program Create': return `Created program: "${details.programName}".`;
            case 'Program Update': return `Updated program: "${details.programName}".`;
            case 'Program Delete': return `Deleted program: "${details.programName}".`;
            case 'Service Provider Create': return `Created provider: "${details.providerName}".`;
            case 'Service Provider Update': return `Updated provider: "${details.providerName}".`;
            case 'Service Provider Delete': return `Deleted provider: "${details.providerName}".`;
            case 'Service Provider Activate': return `Activated provider: "${details.providerName}".`;
            case 'Service Provider Deactivate': return `Deactivated provider: "${details.providerName}".`;
            case 'Settings Update': return `System settings were updated: ${Object.keys(details.changes).join(', ')}.`;
            case 'Broadcast Sent': return `Sent broadcast message: "${details.message}"`;
            case 'Stock Dispense': return `Dispensed items from "${details.facilityName}" to "${details.dispensedTo}" (Ref: ${details.controlNumber}).`;
            case 'Stock Receive': return `Received items at "${details.facilityName}" from "${details.supplier}" (Ref: ${details.controlNumber}).`;
            case 'Consignment Stock Receive': return `Received consignment items at "${details.facilityName}" from "${details.supplier}" (Ref: ${details.controlNumber}).`;
            case 'Stock Write-Off': return `Wrote off items from "${details.facilityName}" due to ${details.reason} (Ref: ${details.controlNumber}).`;
            case 'Consignment Stock Write-Off': return `Wrote off consignment items from "${details.facilityName}" due to ${details.reason} (Ref: ${details.controlNumber}).`;
            case 'Stock Issuance (RIS)': return `Issued items from "${details.facilityName}" to "${details.requestedBy}" for ${details.purpose} (Ref: ${details.controlNumber}).`;
            case 'Release Order Create': return `Created release order from "${details.facilityName}" to "${details.orderedTo}" (Ref: ${details.controlNumber}).`;
            case 'Stock Transfer Initiate': return `Initiated transfer from "${details.from}" to "${details.to}" (Ref: ${details.controlNumber}).`;
            case 'Stock Transfer Acknowledge': return `Acknowledged transfer at "${details.to}" from "${details.from}" (Ref: ${details.controlNumber}, Status: ${details.status}).`;
            case 'Consignment Stock Transfer Initiate': return `Initiated consignment transfer from "${details.from}" to "${details.to}" (Ref: ${details.controlNumber}).`;
            case 'Consignment Stock Transfer Acknowledge': return `Acknowledged consignment transfer at "${details.to}" from "${details.from}" (Ref: ${details.controlNumber}, Status: ${details.status}).`;
            case 'Physical Count Initiate': return `Initiated count "${details.countName}".`;
            case 'Physical Count Cancel': return `Cancelled count "${details.countName}".`;
            case 'Physical Count Approve': return `Approved and finalized count "${details.countName}".`;
            case 'Physical Count Reject': return `Rejected count "${details.countName}" with reason: ${details.details}.`;
            default:
                return Object.entries(details).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('; ');
        }
    } catch (e) {
        return "Could not format log details.";
    }
  };

const MyActivityReportTab: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const navigate = useNavigate();
    
    // Admins get logs from context, Encoders fetch their own
    const [encoderAuditLogs, setEncoderAuditLogs] = useState<AuditLog[]>([]);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [minDate, setMinDate] = useState<Date | null>(null);
    const [maxDate, setMaxDate] = useState<Date | null>(null);

    const [reportData, setReportData] = useState<ActivityLogItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    
    const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
    const [activityTypeFilter, setActivityTypeFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiResult, setAiResult] = useState<{ summary: string; observations: string[]; } | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const {
        suppliers, facilities, dispenseLogs, receiveLogs, transferLogs,
        returnLogs, writeOffLogs, risLogs, roLogs, adjustmentLogs,
        purchaseOrders, physicalCounts, auditLogs, inventoryItems, internalReturnLogs
    } = data;
    
    const inventoryItemMasterMap = useMemo(() => new Map(inventoryItems.map(i => [i.id, i.itemMasterId])), [inventoryItems]);

    useEffect(() => {
        if (user?.role === Role.Encoder) {
            const fetchEncoderLogs = async () => {
                try {
                    const snapshot = await db.ref('auditLogs').orderByChild('uid').equalTo(user.uid).once('value');
                    if (snapshot.exists()) {
                        const logsData = snapshot.val();
                        const logsArray = Object.entries(logsData).map(([id, data]: [string, any]) => ({...data, id}));
                        setEncoderAuditLogs(logsArray);
                    }
                } catch (error) {
                    console.error("Could not fetch encoder's audit logs:", error);
                }
            };
            fetchEncoderLogs();
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        
        const relevantLogs = user.role === Role.Encoder ? encoderAuditLogs : auditLogs;
        
        let allTimestamps: number[] = (relevantLogs || [])
            .filter(log => log.uid === user.uid)
            .map(log => new Date(log.timestamp).getTime());
        
        if (allTimestamps.length > 0) {
            const min = new Date(Math.min(...allTimestamps));
            const max = new Date(Math.max(...allTimestamps));
            setMinDate(min);
            setMaxDate(max);
            setStartDate(max);
            setEndDate(max);
        }

    }, [user, auditLogs, encoderAuditLogs]);

    const handleGenerateReport = useCallback(() => {
        if (!user) return;
        setIsLoading(true);
        setReportData(null);
        setSummaryStats(null);
        setCurrentPage(1);

        const sDate = startDate ? new Date(startDate) : null;
        if (sDate) sDate.setHours(0, 0, 0, 0);

        const eDate = endDate ? new Date(endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

        const allLogs: ActivityLogItem[] = [];
        const uniqueItemMasterIds = new Set<string>();

        const extractItemMasterIds = (items: any[]) => {
            const ids: string[] = [];
            items.forEach(item => {
                const masterId = item.itemMasterId || inventoryItemMasterMap.get(item.inventoryItemId);
                if (masterId) {
                    ids.push(masterId);
                    uniqueItemMasterIds.add(masterId);
                }
            });
            return ids;
        };
        
        const transactionalActions = new Set([
            'Stock Dispense', 'Stock Receive', 'Consignment Stock Receive', 
            'Stock Write-Off', 'Consignment Stock Write-Off', 'Stock Issuance (RIS)',
            'Release Order Create', 'Stock Transfer Initiate', 'Stock Transfer Acknowledge',
            'Consignment Stock Transfer Initiate', 'Consignment Stock Transfer Acknowledge',
            'Stock Return', 'Consignment Stock Return', 'Purchase Order Create', 'Stock Adjustment',
            'Internal Return'
        ]);

        const processTransactionLogs = (logs: any[], type: string, userIdField: string, printPrefix: string, getSummary: (log: any) => string) => {
            (logs || []).forEach((log: any) => {
                const logDate = new Date(log.timestamp || log.createdAt);
                if (log[userIdField] === user.uid && (!sDate || logDate >= sDate) && (!eDate || logDate <= eDate)) {
                    allLogs.push({
                        timestamp: log.timestamp || log.createdAt,
                        type: log.isConsignment ? `${type} (Consignment)` : type,
                        controlNumber: log.controlNumber || log.poNumber || log.name,
                        summary: getSummary(log),
                        logId: log.id,
                        printPath: `${printPrefix}${log.id}`,
                        itemMasterIds: 'items' in log ? extractItemMasterIds(log.items) : [],
                    });
                }
            });
        };
        
        processTransactionLogs(dispenseLogs, 'Dispense', 'userId', '/print/dispense/', log => `Dispensed to ${log.dispensedTo}.`);
        processTransactionLogs(receiveLogs, 'Receive', 'userId', '/print/receive/', log => `Received from ${suppliers.find(s => s.id === log.supplierId)?.name || 'N/A'}.`);
        processTransactionLogs(returnLogs, 'Return to Supplier', 'userId', '/print/return/', log => `Returned to ${suppliers.find(s => s.id === log.supplierId)?.name || 'N/A'}.`);
        processTransactionLogs(internalReturnLogs, 'Internal Return', 'userId', '/print/return-internal/', log => `Received return from ${log.returnedBy}.`);
        processTransactionLogs(writeOffLogs, 'Write-Off', 'userId', '/print/write-off/', log => `Wrote off for ${log.reason}.`);
        processTransactionLogs(risLogs, 'RIS', 'userId', '/print/ris/', log => `Issued to ${log.requestedBy}.`);
        processTransactionLogs(roLogs, 'RO', 'userId', '/print/ro/', log => `Released to ${log.orderedTo}.`);
        processTransactionLogs(adjustmentLogs, 'Adjustment', 'userId', '', log => `Adjusted stock for ${log.reason}.`);
        processTransactionLogs(purchaseOrders, 'Purchase Order', 'createdBy', '/print/po/', log => `Created PO for ${suppliers.find(s => s.id === log.supplierId)?.name || 'N/A'}.`);
        processTransactionLogs(physicalCounts, 'Physical Count', 'initiatedByUserId', '/print/physical-count-report/', log => `Initiated count: ${log.name}.`);

        (transferLogs || []).forEach((log: TransferLog) => {
            const logDate = new Date(log.timestamp);
            if (log.initiatedByUserId === user.uid && (!sDate || logDate >= sDate) && (!eDate || logDate <= eDate)) {
                allLogs.push({ timestamp: log.timestamp, type: 'Transfer (Initiated)', controlNumber: log.controlNumber, summary: `Initiated transfer to ${facilities.find(f => f.id === log.toFacilityId)?.name || 'N/A'}.`, logId: log.id, printPath: log.isConsignment ? `/print/consignment-transfer/${log.id}` : `/print/transfer/${log.id}`, itemMasterIds: extractItemMasterIds(log.items) });
            }
            if (log.acknowledgedByUserId === user.uid && log.acknowledgementTimestamp) {
                const ackDate = new Date(log.acknowledgementTimestamp);
                if ((!sDate || ackDate >= sDate) && (!eDate || ackDate <= eDate)) {
                    allLogs.push({ timestamp: log.acknowledgementTimestamp, type: 'Transfer (Acknowledged)', controlNumber: log.controlNumber, summary: `Acknowledged transfer from ${facilities.find(f => f.id === log.fromFacilityId)?.name || 'N/A'}. Status: ${log.status}`, logId: log.id, printPath: log.isConsignment ? `/print/consignment-transfer/${log.id}` : `/print/transfer/${log.id}`, itemMasterIds: extractItemMasterIds(log.items) });
                }
            }
        });

        const relevantAuditLogs = user.role === Role.Encoder ? encoderAuditLogs : auditLogs;
        
        (relevantAuditLogs || []).forEach((log: AuditLog) => {
            const logDate = new Date(log.timestamp);
            if (log.uid === user.uid && (!sDate || logDate >= sDate) && (!eDate || logDate <= eDate)) {
                if (!transactionalActions.has(log.action)) {
                    allLogs.push({
                        timestamp: log.timestamp,
                        type: 'Management',
                        controlNumber: log.action,
                        summary: formatLogDetails(log),
                        logId: log.id,
                        printPath: '',
                    });
                }
            }
        });
        
        const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setReportData(sortedLogs);
        
        setSummaryStats({
            totalActions: sortedLogs.length,
            uniqueItemCount: uniqueItemMasterIds.size,
            managementActionCount: sortedLogs.filter(log => log.type === 'Management').length,
        });

        setIsLoading(false);
    }, [user, startDate, endDate, data, inventoryItemMasterMap, encoderAuditLogs]);
    
    const filteredReportData = useMemo(() => {
        if (!reportData) return [];
        return reportData.filter(log => {
            const typeMatch = !activityTypeFilter || log.type.toLowerCase().includes(activityTypeFilter.toLowerCase());
            const searchMatch = !searchTerm || log.summary.toLowerCase().includes(searchTerm.toLowerCase()) || log.controlNumber.toLowerCase().includes(searchTerm.toLowerCase());
            return typeMatch && searchMatch;
        });
    }, [reportData, activityTypeFilter, searchTerm]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReportData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReportData, currentPage, itemsPerPage]);

    const totalPages = filteredReportData ? Math.ceil(filteredReportData.length / itemsPerPage) : 0;
    
    const handlePrint = () => {
        if (!reportData || !user) return;
        
        const reportState = {
            reportData: filteredReportData,
            user,
            facility: facilities.find(f => f.id === user.facilityId),
            dateRange: { startDate, endDate },
            generatedDate: new Date().toISOString()
        };
    
        navigate('/print/my-activity', { state: reportState });
    };
    
    const handleDownload = () => {
        if (!reportData) return;
        const headers = ['Timestamp', 'Type', 'Reference', 'Summary'];
        const csvRows = [
            headers.join(','),
            ...reportData.map(log => {
                const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
                return [
                    escape(new Date(log.timestamp).toLocaleString()),
                    escape(log.type),
                    escape(log.controlNumber),
                    escape(log.summary),
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        downloadStringAsFile(csvContent, `my_activity_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    };

    const handleAnalyzeActivity = async () => {
        if (!reportData || !user) return;
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiResult(null);
        setAiError(null);

        try {
            const logsToAnalyze = reportData.slice(0, 100); // Limit to 100 logs for performance
            const formattedLogs = logsToAnalyze.map(log => `- ${log.type} (${log.controlNumber}): ${log.summary}`).join('\n');
            const prompt = `As a performance analyst, review the following activity log for user "${user.name}". Provide a concise summary and a few key observations about their work patterns, efficiency, or notable tasks.

            Activity Log:
            ${formattedLogs}
    
            Return your analysis as a single JSON object.`;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A brief, high-level summary of the user's activity." },
                    observations: { type: Type.ARRAY, description: "A list of 2-4 key observations or patterns.", items: { type: Type.STRING } }
                },
                required: ["summary", "observations"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: responseSchema },
            });
            
            const parsedResponse = JSON.parse(response.text);
            setAiResult(parsedResponse);
            await logAuditEvent(user, 'AI Activity Analysis', { logsAnalyzed: logsToAnalyze.length });
        } catch (error) {
            console.error("AI Analysis Error:", error);
            setAiError("Failed to generate AI analysis. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const getTypeBadge = (type: string) => {
        if (type.toLowerCase().includes('receive')) return 'bg-green-100 text-green-800';
        if (type.toLowerCase().includes('dispense') || type.toLowerCase().includes('return') || type.toLowerCase().includes('write-off') || type.toLowerCase().includes('out')) return 'bg-red-100 text-red-800';
        if (type.toLowerCase().includes('transfer')) return 'bg-blue-100 text-blue-800';
        if (type.toLowerCase().includes('management')) return 'bg-secondary-200 text-secondary-800';
        return 'bg-indigo-100 text-indigo-800';
    };

    return (
        <Card>
            <div className="p-4 border-b">
                <h3 className="text-lg font-medium text-secondary-900">Generate Your Activity Report</h3>
                <p className="text-sm text-secondary-500 mt-1">Select a date range to generate a list of all transactions and management actions you've performed.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <DatePicker label="Start Date" selectedDate={startDate} onSelectDate={setStartDate} minDate={minDate} maxDate={endDate || maxDate} />
                    <DatePicker label="End Date" selectedDate={endDate} onSelectDate={setEndDate} minDate={startDate || minDate} maxDate={maxDate} />
                    <div className="md:col-span-2 flex gap-2">
                        <Button onClick={handleGenerateReport} disabled={isLoading || !startDate || !endDate} className="w-full">
                            {isLoading ? <Spinner size="sm" /> : 'Generate Report'}
                        </Button>
                    </div>
                </div>
            </div>
            
            {summaryStats && (
                 <div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-4">
                     <DashboardCard title="Total Actions" value={summaryStats.totalActions} icon={<ActionsIcon />} color="blue" />
                     <DashboardCard title="Unique Items Handled" value={summaryStats.uniqueItemCount} icon={<ItemsIcon />} color="teal" />
                     <DashboardCard title="Management Actions" value={summaryStats.managementActionCount} icon={<ManagementIcon />} color="indigo" />
                 </div>
            )}

            {reportData && (
                <>
                <div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input placeholder="Search results..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Select value={activityTypeFilter} onChange={e => setActivityTypeFilter(e.target.value)}>
                        <option value="">All Action Types</option>
                        {[...new Set(reportData.map(r => r.type))].sort().map(type => <option key={type} value={type}>{type}</option>)}
                    </Select>
                    <div className="flex gap-2">
                        <Button onClick={handleDownload} disabled={filteredReportData.length === 0} variant="secondary">Download</Button>
                        <Button onClick={handlePrint} disabled={filteredReportData.length === 0} variant="secondary">Print</Button>
                        <Button onClick={handleAnalyzeActivity} disabled={filteredReportData.length === 0 || isAiLoading} leftIcon={<SparklesIcon/>}>Analyze</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Reference #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Summary</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {paginatedItems.map(log => (
                                <tr key={log.logId + log.timestamp}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-800">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadge(log.type)}`}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                        {log.printPath ? (
                                            <button onClick={() => window.open(`/#${log.printPath}`, '_blank')} className="text-primary-600 hover:underline">
                                                {log.controlNumber}
                                            </button>
                                        ) : (
                                            <span className="text-secondary-700">{log.controlNumber}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-secondary-600">{log.summary}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredReportData.length === 0 && (
                        <p className="p-8 text-center text-secondary-500">No activity found for the selected filters.</p>
                    )}
                     {filteredReportData.length > 0 && (
                        <div className="p-4 border-t">
                            <TablePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                itemsPerPage={itemsPerPage}
                                totalItems={filteredReportData.length}
                                startItemIndex={(currentPage - 1) * itemsPerPage}
                                endItemIndex={Math.min(((currentPage - 1) * itemsPerPage) + itemsPerPage, filteredReportData.length)}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </div>
                    )}
                </div>
                </>
            )}
             <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="AI Activity Analysis">
                {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center h-48"><Spinner /><p className="mt-4 text-secondary-600">Analyzing your activity...</p></div>
                ) : aiError ? (
                    <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700"><p className="font-bold">Error</p><p>{aiError}</p></div>
                ) : aiResult ? (
                    <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-2">
                        <div>
                            <h4 className="font-semibold text-secondary-800">Summary</h4>
                            <p className="text-secondary-600 mt-1">{aiResult.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-secondary-800">Key Observations</h4>
                            <ul className="list-disc list-inside space-y-1 mt-1 text-secondary-600">
                                {aiResult.observations.map((obs, index) => <li key={index}>{obs}</li>)}
                            </ul>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </Card>
    );
};
export default MyActivityReportTab;
