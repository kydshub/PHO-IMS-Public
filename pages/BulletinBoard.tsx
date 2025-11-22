

import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

const BulletinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg>
);


const BulletinBoard: React.FC = () => {
    const { data, loading } = useDatabase();
    const { bulletinBoard } = data;

    const sortedPages = useMemo(() => {
        return [...(bulletinBoard || [])].sort((a, b) => a.order - b.order);
    }, [bulletinBoard]);

    const [activePageId, setActivePageId] = useState<string | null>(null);

    useEffect(() => {
        if (!activePageId && sortedPages.length > 0) {
            setActivePageId(sortedPages[0].id);
        }
    }, [sortedPages, activePageId]);

    const activePage = useMemo(() => sortedPages.find(p => p.id === activePageId), [sortedPages, activePageId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner size="lg" />
            </div>
        );
    }
    
    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                 <BulletinIcon />
                 <div>
                    <h2 className="text-3xl font-semibold text-secondary-800">Bulletin Board</h2>
                    <p className="text-secondary-600">Important announcements and information for all users.</p>
                </div>
            </div>

            {sortedPages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                        <Card noPadding>
                             <nav className="p-2 space-y-1">
                                {sortedPages.map(page => (
                                    <button
                                        key={page.id}
                                        onClick={() => setActivePageId(page.id)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                            activePageId === page.id
                                                ? 'bg-primary-100 text-primary-800'
                                                : 'text-secondary-700 hover:bg-secondary-100'
                                        }`}
                                    >
                                        {page.title}
                                    </button>
                                ))}
                            </nav>
                        </Card>
                    </div>
                    <div className="md:col-span-3">
                        {activePage ? (
                            <Card>
                                <div className="p-4 sm:p-6">
                                    <h3 className="text-2xl font-bold text-secondary-900 mb-4 pb-2 border-b">{activePage.title}</h3>
                                    <pre className="whitespace-pre-wrap font-sans text-secondary-700 text-base leading-relaxed">
                                        {activePage.content}
                                    </pre>
                                </div>
                            </Card>
                        ) : (
                             <Card>
                                <div className="p-8 text-center text-secondary-500">Select a page to view its content.</div>
                            </Card>
                        )}
                    </div>
                </div>
            ) : (
                <Card>
                    <div className="p-8 text-center text-secondary-500">
                        <h3 className="text-lg font-semibold">No Announcements</h3>
                        <p>There are currently no announcements on the bulletin board.</p>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default BulletinBoard;