import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSettings } from '../hooks/useSettings';
import PrintLayout from '../components/ui/PrintLayout';
import { formatNumber, formatCurrency } from '../utils/formatters';
import { ItemMaster } from '../types';
import { Spinner } from '../components/ui/Spinner';

interface ComprehensiveItem {
    id: string; // inventory item id
    master: ItemMaster;
    categoryName: string;
    facilityName: string;
    locationName: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    daysOfSupply: number | typeof Infinity;
    abcClass: 'A' | 'B' | 'C' | 'N/A';
}

interface PrintState {
    items: ComprehensiveItem[];
    facilityName: string;
    generatedDate: string;
}

const PrintReportPage: React.FC = () => {
    const { settings } = useSettings();
    const [printState, setPrintState] = useState<PrintState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const dataString = sessionStorage.getItem('printData-inventoryDeepDive');
        if (dataString) {
            try {
                setPrintState(JSON.parse(dataString));
            } catch (e) {
                console.error("Failed to parse print data", e);
            }
        }
        setLoading(false);
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    const { items, facilityName, generatedDate } = printState || {};

    if (!items) {
        return (
            <PrintLayout title="Error: Report Data Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Report Data Not Found</h1>
                    <p className="mt-2 text-secondary-600">This page may have been accessed directly. Please generate a report from the Reports page first.</p>
                    <Link to="/analytics" state={{ preselectedTab: 'inventory-deep-dive' }}>
                        <Button className="mt-6">Go to Inventory Deep Dive</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Inventory Deep Dive Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Facility:</strong> {facilityName}</p>
                <p><strong>Date Generated:</strong> {new Date(generatedDate).toLocaleString()}</p>
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
        <PrintLayout title={`Inventory Deep Dive - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />

            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={['Item', 'Category', 'Facility', 'Location', 'Qty', 'Value', 'Status', 'Days of Supply', 'ABC Class']}>
                    {items.map((item: ComprehensiveItem) => (
                        <tr key={item.id} className="border-t">
                            <td className="p-2 border font-medium">{item.master.name}</td>
                            <td className="p-2 border">{item.categoryName}</td>
                            <td className="p-2 border">{item.facilityName}</td>
                            <td className="p-2 border print-small-text">{item.locationName}</td>
                            <td className="p-2 border text-right">{formatNumber(item.quantity)}</td>
                            <td className="p-2 border text-right">{formatCurrency(item.totalValue)}</td>
                            <td className="p-2 border">{item.status}</td>
                            <td className="p-2 border text-right">{item.daysOfSupply === Infinity ? '∞' : Math.round(item.daysOfSupply)}</td>
                            <td className="p-2 border text-center font-bold">{item.abcClass}</td>
                        </tr>
                    ))}
                </StandardTable>
                {items.length === 0 && <p className="text-gray-600 text-sm">No items match the selected criteria.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintReportPage;