import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PhysicalCount, StorageLocation, Facility } from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { Spinner } from '../components/ui/Spinner';
import { downloadStringAsFile } from '../../utils/download';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';
import { getStorageLocationPath } from '../utils/locationHelpers';

const PrintPhysicalCountReportPage: React.FC = () => {
    const { countId } = useParams<{ countId: string }>();
    const { settings } = useSettings();
    const { data, loading: dbLoading } = useDatabase();
    const { facilities, storageLocations, users, inventoryItems, itemMasters, physicalCounts } = data;

    const count = useMemo(() => physicalCounts.find(c => c.id === countId), [physicalCounts, countId]);

    if (dbLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    if (!count) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-secondary-100 p-4 no-print">
                <div className="text-center bg-white p-10 rounded-lg shadow-xl">
                    <h1 className="text-2xl font-bold text-red-600">Error: Count Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page may have been refreshed or accessed directly. Please go back and generate the report again.</p>
                    <Link to="/physical-counts">
                        <Button className="mt-6">Go to Physical Counts</Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    const getItemDetails = (inventoryItemId: string) => {
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        const master = item ? itemMasters.find(im => im.id === item.itemMasterId) : undefined;
        return { item, master };
    };

    const getUserName = (id: string | undefined) => users.find(u => u.uid === id)?.name || 'N/A';
    
    const variances = (count.items || []).filter(item => (item.countedQuantity ?? item.systemQuantity) - item.systemQuantity !== 0);

    const downloadCSV = () => {
        const headers = ['Item Name', 'Brand', 'Batch Number', 'Expiry Date', 'System Quantity', 'Counted Quantity', 'Variance', 'Reason', 'Notes'];
        const csvRows = [headers.join(',')];
        
        (count.items || []).forEach(item => {
            const details = getItemDetails(item.inventoryItemId);
            const variance = (item.countedQuantity ?? item.systemQuantity) - item.systemQuantity;
            const row = [
                `"${details.master?.name || 'N/A'}"`,
                `"${details.master?.brand || 'N/A'}"`,
                `"${details.item?.batchNumber || 'N/A'}"`,
                `"${details.item?.expiryDate ? new Date(details.item.expiryDate).toLocaleDateString() : 'N/A'}"`,
                item.systemQuantity,
                item.countedQuantity ?? 'N/A',
                variance,
                `"${item.reasonCode || ''}"`,
                `"${item.notes?.replace(/"/g, '""') || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        downloadStringAsFile(csvRows.join('\n'), `physical_count_report_${count.name.replace(/ /g, '_')}.csv`, 'text/csv;charset=utf-8;');
    };

    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Physical Count Adjustment Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Count Name:</strong> {count.name}</p>
                <p><strong>Location:</strong> {getStorageLocationPath(count.storageLocationId, storageLocations, facilities)}</p>
                <p><strong>Date Completed:</strong> {count.completedTimestamp ? new Date(count.completedTimestamp).toLocaleString() : 'N/A'}</p>
                <p><strong>Date Reviewed:</strong> {count.reviewedTimestamp ? new Date(count.reviewedTimestamp).toLocaleString() : 'N/A'}</p>
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

    const pageActions = (
        <Button variant="secondary" onClick={downloadCSV}>Download CSV</Button>
    );

    return (
        <PrintLayout title={`Count Report - ${count.name}`} actions={pageActions}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Variance Details</h3>
                {variances.length > 0 ? (
                    <StandardTable headers={["Item", "Batch #", "System Qty", "Counted Qty", "Variance", "Reason", "Notes"]}>
                       {variances.map((item) => {
                           const { master } = getItemDetails(item.inventoryItemId);
                           const variance = (item.countedQuantity ?? item.systemQuantity) - item.systemQuantity;
                           const isShortage = variance < 0;
                           return (
                            <tr key={item.inventoryItemId} className={`border-t ${isShortage ? 'bg-red-50' : 'bg-green-50'}`}>
                                <td className="p-2 border font-medium">{master?.name}</td>
                                <td className="p-2 border">{getItemDetails(item.inventoryItemId).item?.batchNumber}</td>
                                <td className="p-2 border text-right">{item.systemQuantity}</td>
                                <td className="p-2 border text-right">{item.countedQuantity ?? 'N/A'}</td>
                                <td className={`p-2 border text-right font-bold ${isShortage ? 'text-red-600' : 'text-green-700'}`}>{variance > 0 ? '+' : ''}{variance}</td>
                                <td className="p-2 border">{item.reasonCode || 'N/A'}</td>
                                <td className="p-2 border">{item.notes || ''}</td>
                            </tr>
                           );
                       })}
                    </StandardTable>
                ) : (
                    <p className="text-gray-600 text-sm p-4 text-center bg-gray-50 rounded-md">No discrepancies were found in this count.</p>
                )}
            </section>
            <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center text-sm">
                <div>
                    <p className="mb-8 h-8">Counted By: <span className="font-semibold">{getUserName(count.assignedToUserId)}</span></p>
                    <div className="border-t border-gray-400 pt-2 text-gray-600">Signature Over Printed Name</div>
                </div>
                <div>
                    <p className="mb-8 h-8">Reviewed & Approved By: <span className="font-semibold">{getUserName(count.reviewedByUserId)}</span></p>
                    <div className="border-t border-gray-400 pt-2 text-gray-600">Signature Over Printed Name</div>
                </div>
            </div>
        </PrintLayout>
    );
};

export default PrintPhysicalCountReportPage;