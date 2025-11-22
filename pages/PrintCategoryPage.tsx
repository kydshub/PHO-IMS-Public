import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Category, ItemMaster } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import { Spinner } from '../components/ui/Spinner';
import PrintLayout from '../components/ui/PrintLayout';

const PrintCategoryPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    
    const { categories, itemMasters } = data;

    const searchTerm = searchParams.get('searchTerm') || '';

    const items = useMemo(() => {
        if (loading) return [];
        return categories
            .filter(item => !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [loading, categories, searchTerm]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">Category List Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Filters Applied:</strong> Search Term: "{searchTerm || 'None'}"</p>
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
        <PrintLayout title={`Category Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                <StandardTable headers={["Category Name", "Items In Use"]}>
                   {items.map((category: Category) => {
                       const itemsInUse = itemMasters.filter((im: ItemMaster) => im.categoryId === category.id).length;
                       return (
                        <tr key={category.id} className="border-t">
                            <td className="p-2 border font-medium">{category.name}</td>
                            <td className="p-2 border text-right">{itemsInUse}</td>
                        </tr>
                       );
                   })}
                </StandardTable>
                {items.length === 0 && <p className="text-gray-600 text-sm p-2">No items match the selected criteria.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintCategoryPage;