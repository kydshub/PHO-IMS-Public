import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { useDatabase } from '../hooks/useDatabase';
import { AuditLog, Facility, User } from '../types';
import { TablePagination } from '../components/ui/TablePagination';
import { downloadStringAsFile } from '../utils/download';
import { GoogleGenAI, Type } from "@google/genai";
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { logAuditEvent } from '../services/audit';

const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const AnalyzeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;

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


const LogDetailModal: React.FC<{ log: AuditLog | null, onClose: () => void }> = ({ log, onClose }) => {
    if (!log) return null;

    const renderValue = (value: any) => {
        if (value === null) return <span className="text-secondary-500 italic">null</span>;
        if (value === undefined) return <span className="text-secondary-500 italic">undefined</span>;
        if (typeof value === 'boolean') return <span className="font-mono text-purple-600">{value.toString()}</span>;
        if (typeof value === 'number') return <span className="font-mono text-blue-600">{value}</span>;
        return `"${value}"`;
    };

    const renderDiff = () => {
        const changes = log.details.changes || {};
        const oldData = log.details.oldData || {};
        const newData = log.details.newData || {};
        
        let allKeys: string[] = [];
        if (Object.keys(changes).length > 0) {
            allKeys = Object.keys(changes);
        } else if (Object.keys(oldData).length > 0 || Object.keys(newData).length > 0) {
            allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
        } else {
            return null; // No diffable data
        }
        
        return (
            <div>
                <h4 className="font-semibold text-secondary-800 mb-2">Changes</h4>
                <div className="grid grid-cols-12 gap-x-4 p-2 bg-secondary-50 rounded">
                    <div className="col-span-3 font-medium text-xs uppercase text-secondary-500">Field</div>
                    <div className="col-span-4 font-medium text-xs uppercase text-secondary-500">Before</div>
                    <div className="col-span-1 text-center font-medium text-xs uppercase text-secondary-500">→</div>
                    <div className="col-span-4 font-medium text-xs uppercase text-secondary-500">After</div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {allKeys.map(key => {
                        const beforeValue = oldData[key] ?? 'N/A';
                        const afterValue = newData[key] ?? changes[key] ?? 'N/A';
                        
                        return (
                            <div key={key} className="grid grid-cols-12 gap-x-4 p-2 border-b text-sm items-start">
                                <div className="col-span-3 font-semibold text-secondary-700 break-words">{key}</div>
                                <div className="col-span-4 text-red-700 bg-red-50 p-1 rounded font-mono text-xs break-words">{renderValue(beforeValue)}</div>
                                <div className="col-span-1 text-center text-secondary-500">→</div>
                                <div className="col-span-4 text-green-700 bg-green-50 p-1 rounded font-mono text-xs break-words">{renderValue(afterValue)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const isDiffable = log.details && (log.details.changes || log.details.oldData || log.details.newData);

    return (
        <Modal isOpen={!!log} onClose={onClose} title={`Log Details: ${log.action}`}>
            <div className="space-y-4 text-sm">
                <div className="grid grid-cols-3 gap-4">
                    <div><span className="font-semibold">User:</span> {log.user}</div>
                    <div className="col-span-2"><span className="font-semibold">Timestamp:</span> {new Date(log.timestamp).toLocaleString()}</div>
                    <div><span className="font-semibold">IP Address:</span> {log.ipAddress}</div>
                </div>
                <div className="font-mono text-xs bg-secondary-100 p-2 rounded break-all"><span className="font-semibold">User Agent:</span> {log.userAgent}</div>
                
                {isDiffable ? renderDiff() : (
                    <div>
                        <h4 className="font-semibold text-secondary-800 mb-2">Details</h4>
                        <pre className="bg-secondary-50 p-3 rounded-md text-xs whitespace-pre-wrap max-h-64 overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const AuditTrail: React.FC = () => {
  const { data } = useDatabase();
  const { user } = useAuth();
  const { auditLogs, users, facilities } = data;

  const [filters, setFilters] = useState({
    searchText: '',
    action: '',
    facilityId: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ summary: string; observations: { finding: string, implication: string }[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analysisLogCount, setAnalysisLogCount] = useState(0);
  const [analysisDateRange, setAnalysisDateRange] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const userMap = useMemo(() => new Map(users.map(u => [u.uid, u.name])), [users]);
  const userFacilityMap = useMemo(() => new Map(users.map(u => [u.email, u.facilityId])), [users]);

  const uniqueActions = useMemo(() => [...new Set(auditLogs.map(log => log.action))].sort(), [auditLogs]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (name: 'startDate' | 'endDate', date: Date | null) => {
    setFilters(prev => ({ ...prev, [name]: date }));
  };
  
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);

      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);

      const formattedDetails = formatLogDetails(log).toLowerCase();
      const searchTextLower = filters.searchText.toLowerCase();
      const userName = userMap.get(log.uid)?.toLowerCase() || '';
      
      const searchMatch = !filters.searchText || log.user.toLowerCase().includes(searchTextLower) || userName.includes(searchTextLower) || formattedDetails.includes(searchTextLower) || log.action.toLowerCase().includes(searchTextLower);
      const actionMatch = !filters.action || log.action === filters.action;
      const startDateMatch = !startDate || logDate >= startDate;
      const endDateMatch = !endDate || logDate <= endDate;
      
      const facilityMatch = (() => {
        if (!filters.facilityId) return true;
        if (log.details?.facilityId === filters.facilityId) return true;
        if (log.details?.fromFacilityId === filters.facilityId) return true;
        if (log.details?.toFacilityId === filters.facilityId) return true;
        if (log.details?.facilityName === facilities.find(f => f.id === filters.facilityId)?.name) return true;
        const userFacilityId = userFacilityMap.get(log.user);
        if (userFacilityId === filters.facilityId) return true;
        return false;
      })();

      return searchMatch && actionMatch && startDateMatch && endDateMatch && facilityMatch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filters, auditLogs, userFacilityMap, facilities, userMap]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const startItemIndex = (currentPage - 1) * itemsPerPage;
  const endItemIndex = Math.min(startItemIndex + itemsPerPage, filteredLogs.length);

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User Name', 'User Email', 'IP Address', 'Action', 'Summary', 'User Agent'];
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(log => {
        const detailsString = formatLogDetails(log);
        return [
          `"${new Date(log.timestamp).toLocaleString()}"`,
          `"${userMap.get(log.uid) || 'N/A'}"`,
          `"${log.user}"`,
          `"${log.ipAddress || 'N/A'}"`,
          `"${log.action}"`,
          `"${detailsString.replace(/"/g, '""')}"`,
          `"${log.userAgent || 'N/A'}"`,
        ].join(',');
      })
    ].join('\n');
    
    downloadStringAsFile(csvRows, 'audit_trail.csv', 'text/csv;charset=utf-8;');
  };
  
  const handleAnalyzeActivity = async () => {
    if (!user) return;

    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiResult(null);
    setAiError(null);
    setAnalysisLogCount(0);
    setAnalysisDateRange('');

    try {
        if (filteredLogs.length === 0) {
            setAiError("There are no logs in the current view to analyze.");
            setIsAiLoading(false);
            return;
        }

        const MAX_LOGS = 500;
        const logsToAnalyze = filteredLogs.slice(0, MAX_LOGS);
        
        const firstLogDate = new Date(logsToAnalyze[logsToAnalyze.length - 1].timestamp).toLocaleDateString();
        const lastLogDate = new Date(logsToAnalyze[0].timestamp).toLocaleDateString();

        setAnalysisLogCount(logsToAnalyze.length);
        setAnalysisDateRange(`${firstLogDate} to ${lastLogDate}`);

        const formattedLogs = logsToAnalyze.map(log => 
            `- User: ${log.user}, Action: ${log.action}, Timestamp: ${log.timestamp}, Details: ${formatLogDetails(log)}`
        ).join('\n');

        const prompt = `
        As a security and system audit expert for a health office inventory system, analyze the following ${logsToAnalyze.length} audit logs, spanning from ${firstLogDate} to ${lastLogDate}. Provide a concise summary and a list of key observations. Focus on unusual patterns, potential security risks, high-frequency actions, or significant administrative changes.

        Logs:
        ${formattedLogs}

        Return the response as a single JSON object.
        `;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING, description: "A brief, high-level summary of the user activity." },
                observations: {
                    type: Type.ARRAY,
                    description: "A list of 3-5 key findings or potential issues.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            finding: { type: Type.STRING, description: "A specific observation from the logs." },
                            implication: { type: Type.STRING, description: "The potential impact or meaning of this finding." }
                        },
                        required: ["finding", "implication"]
                    }
                }
            },
            required: ["summary", "observations"]
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
        await logAuditEvent(user, 'AI Audit Analysis', { 
            filters,
            logsAnalyzed: logsToAnalyze.length,
            logDateRange: `${firstLogDate} - ${lastLogDate}`
        });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        setAiError("Failed to generate AI analysis. The model may be overloaded or the request was invalid. Please try again.");
    } finally {
        setIsAiLoading(false);
    }
};

  const handlePrintReport = () => {
    if (!aiResult) return;

    const reportTitle = "AI Audit Analysis Report";
    const context = `Analyzed ${analysisLogCount} logs from ${analysisDateRange}`;
    const summary = aiResult.summary.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
    const observations = aiResult.observations.map(obs => `<li><strong>Finding:</strong> ${obs.finding}<br/><strong>Implication:</strong> ${obs.implication}</li>`).join('');

    const printContent = `
        <html>
            <head>
                <title>${reportTitle}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; line-height: 1.6; margin: 2rem; color: #333; }
                    h1, h2 { color: #111; }
                    h1 { font-size: 1.75rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; margin-bottom: 1rem;}
                    h2 { font-size: 1.25rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; margin-top: 2rem; margin-bottom: 1rem; }
                    .context { background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; font-size: 0.9rem; }
                    ul { list-style-type: none; padding-left: 0; }
                    li { margin-bottom: 1rem; border-left: 3px solid #3b82f6; padding-left: 1rem; }
                    strong { color: #111; }
                </style>
            </head>
            <body>
                <h1>${reportTitle}</h1>
                <div class="context">${context}</div>
                <h2>Summary</h2>
                ${summary}
                <h2>Key Observations</h2>
                <ul>${observations}</ul>
            </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'height=600,width=800');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    } else {
        alert('Please allow pop-ups for this website to print the report.');
    }
  };
  
  const handleDownloadReport = () => {
      if (!aiResult) return;
      
      let reportText = `AI Audit Analysis Report\n`;
      reportText += `=========================\n`;
      reportText += `Analyzed ${analysisLogCount} logs from ${analysisDateRange}\n\n`;
      reportText += `Summary:\n`;
      reportText += `${aiResult.summary}\n\n`;
      reportText += `Key Observations:\n`;
      aiResult.observations.forEach(obs => {
          reportText += `- Finding: ${obs.finding}\n`;
          reportText += `  Implication: ${obs.implication}\n\n`;
      });
      
      downloadStringAsFile(reportText, 'ai_audit_analysis.txt', 'text/plain;charset=utf-8;');
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h2 className="text-3xl font-semibold text-secondary-800">Audit Trail</h2>
        <div className="flex gap-2">
            <Button onClick={handleAnalyzeActivity} leftIcon={<AnalyzeIcon />} disabled={filteredLogs.length === 0}>
                Analyze Activity
            </Button>
            <Button onClick={exportToCSV} leftIcon={<DownloadIcon />} variant="secondary">Download CSV</Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input 
            label="Search Details"
            name="searchText"
            placeholder="Search user, action, details..."
            value={filters.searchText}
            onChange={handleFilterChange}
          />
          <Select
            label="Filter by Action"
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
          >
            <option value="">All Actions</option>
            {uniqueActions.map(action => <option key={action} value={action}>{action}</option>)}
          </Select>
          <Select
            label="Filter by Facility"
            name="facilityId"
            value={filters.facilityId}
            onChange={handleFilterChange}
          >
            <option value="">All Facilities</option>
            {facilities.map(facility => (
                <option key={facility.id} value={facility.id}>{facility.name}</option>
            ))}
          </Select>
          <DatePicker 
            label="Start Date"
            selectedDate={filters.startDate}
            onSelectDate={(date) => handleDateChange('startDate', date)}
            maxDate={filters.endDate || new Date()}
          />
           <DatePicker 
            label="End Date"
            selectedDate={filters.endDate}
            onSelectDate={(date) => handleDateChange('endDate', date)}
            minDate={filters.startDate || undefined}
            maxDate={new Date()}
          />
        </div>
      </Card>

      <Card noPadding footer={
        <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredLogs.length}
            startItemIndex={startItemIndex}
            endItemIndex={endItemIndex}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
        />
      }>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Action</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Summary</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {paginatedLogs.map((log, index) => (
                <tr key={log.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50'} hover:bg-primary-50`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-secondary-900">{userMap.get(log.uid) || 'Unknown User'}</div>
                    <button onClick={() => setFilters({ ...filters, searchText: log.user, action: '', facilityId: '', startDate: null, endDate: null })} className="text-primary-600 hover:underline text-xs">
                      {log.user}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{log.action}</td>
                  <td className="px-6 py-4 whitespace-normal break-words text-sm text-secondary-500 max-w-md truncate" title={formatLogDetails(log)}>
                    {formatLogDetails(log)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
           {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-secondary-500">
              No audit logs match the current filters.
            </div>
          )}
        </div>
      </Card>
      
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />

      <Modal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            title="AI Audit Analysis"
            footer={aiResult &&
                <div className="flex justify-between w-full items-center">
                    <div>
                        <Button onClick={handlePrintReport} variant="secondary" leftIcon={<PrintIcon />}>
                            Print Report
                        </Button>
                        <Button onClick={handleDownloadReport} variant="secondary" leftIcon={<DownloadIcon />} className="ml-2">
                            Download Report
                        </Button>
                    </div>
                    <Button onClick={() => setIsAiModalOpen(false)}>Close</Button>
                </div>
            }
        >
            {isAiLoading ? (
                <div className="flex flex-col items-center justify-center h-48">
                    <Spinner />
                    <p className="mt-4 text-secondary-600">Analyzing logs...</p>
                </div>
            ) : aiError ? (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <p className="font-bold">Error</p>
                    <p>{aiError}</p>
                </div>
            ) : aiResult ? (
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-4 text-sm">
                        <div className="p-3 bg-secondary-50 border border-secondary-200 rounded-md">
                            <p className="font-semibold text-secondary-700">Analysis Context</p>
                            <p className="text-xs text-secondary-600">
                                Based on <strong>{analysisLogCount} logs</strong> from the period of <strong>{analysisDateRange}</strong>.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-secondary-800">Summary</h4>
                            {aiResult.summary.split('\n').filter(p => p.trim() !== '').map((paragraph, index) => (
                                <p key={index} className="text-secondary-600 mt-1">{paragraph}</p>
                            ))}
                        </div>
                        <div>
                            <h4 className="font-semibold text-secondary-800 mt-4">Key Observations</h4>
                            <ul className="list-none space-y-3 mt-2">
                                {aiResult.observations.map((obs, index) => (
                                    <li key={index} className="text-secondary-600 border-l-4 border-primary-300 pl-3">
                                        <span className="font-medium text-secondary-700 block">{obs.finding}</span>
                                        <span className="text-xs italic text-secondary-500">{obs.implication}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : null}
        </Modal>
    </div>
  );
};

export default AuditTrail;