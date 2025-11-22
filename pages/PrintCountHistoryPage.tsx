import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Category, ItemMaster, PhysicalCount, StorageLocation, Facility, PhysicalCountStatus } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import { Spinner } from '../components/ui/Spinner';
import PrintLayout from '../components/ui/PrintLayout';
import { getStorageLocationPath } from '../utils/locationHelpers';

const PrintCountHistoryPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    
    const { categories, itemMasters, facilities, storageLocations, users, physicalCounts } = data;

    const searchTerm = searchParams.get('searchTerm') || '';
    const statusFilter = searchParams.get('status') || '';
    const facilityFilter = searchParams.get('facilityId') || '';
    const startDateFilter = searchParams.get('startDate');
    const endDateFilter = searchParams.get('endDate');
    
    const filters = {
        searchTerm,
        facilityId: facilityFilter,
        status: statusFilter,
        startDate: startDateFilter ? new Date(startDateFilter) : null,
        endDate: endDateFilter ? new Date(endDateFilter) : null,
    };

    const getUserName = (id: string | undefined) => users.find(u => u.uid === id)?.name || 'N/A';
    
    const historyCounts = useMemo(() => {
        if (loading) return [];
        const historyStatuses = [PhysicalCountStatus.Completed, PhysicalCountStatus.Cancelled];
        const augmented = physicalCounts
            .filter(c => historyStatuses.includes(c.status))
            .map(count => {
                const finalizedTimestamp = count.status === 'Completed' ? count.reviewedTimestamp : count.cancellationTimestamp;
                const finalizedByUserId = count.status === 'Completed' ? count.reviewedByUserId : count.cancelledByUserId;
                return {
                    ...count,
                    locationPath: getStorageLocationPath(count.storageLocationId, storageLocations, facilities),
                    finalizedDate: finalizedTimestamp ? new Date(finalizedTimestamp) : null,
                    finalizedBy: getUserName(finalizedByUserId!),
                };
            });
        
        return augmented.filter(count => {
            const searchMatch = !filters.searchTerm || count.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) || count.locationPath.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const facilityMatch = !filters.facilityId || count.facilityId === filters.facilityId;
            const statusMatch = !filters.status || count.status === filters.status;
            
            const sDate = filters.startDate ? filters.startDate : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            
            const eDate = filters.endDate ? filters.endDate : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);
            
            const dateMatch = count.finalizedDate && (!sDate || count.finalizedDate >= sDate) && (!eDate || count.finalizedDate <= eDate);

            return searchMatch && facilityMatch && statusMatch && (!filters.startDate || !filters.endDate || dateMatch);
        }).sort((a,b) => (b.finalizedDate?.getTime() || 0) - (a.finalizedDate?.getTime() || 0));

    }, [loading, physicalCounts, storageLocations, facilities, users, filters]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    if (!historyCounts) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-secondary-100 p-4 no-print">
                <div className="text-center bg-white p-10 rounded-lg shadow-xl">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">Please generate a report from the Physical Counts page first.</p>
                    <Link to="/physical-counts">
                        <Button className="mt-6">Go to Physical Counts</Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Physical Count History Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Date Generated:</strong> {new Date().toLocaleString()}</p>
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
        <PrintLayout title={`Physical Count History - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Count Name", "Location", "Status", "Date Finalized", "Finalized By"]}>
                   {historyCounts.map((count: any) => (
                        <tr key={count.id} className="border-t">
                            <td className="p-2 border font-medium">{count.name}</td>
                            <td className="p-2 border">{count.locationPath}</td>
                            <td className="p-2 border">{count.status}</td>
                            <td className="p-2 border">{count.finalizedDate ? count.finalizedDate.toLocaleString() : 'N/A'}</td>
                            <td className="p-2 border">{count.finalizedBy}</td>
                        </tr>
                   ))}
                </StandardTable>
                {historyCounts.length === 0 && <p className="text-gray-600 text-sm p-2">No items match the selected criteria.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintCountHistoryPage;
