
import React from 'react';
import { useSettings } from '../hooks/useSettings';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

const MaintenanceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
);

const MaintenancePage: React.FC = () => {
    const { settings, loading } = useSettings();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-secondary-100">
                <Spinner size="lg" />
            </div>
        );
    }

    const message = settings?.maintenanceMessage || "We are currently performing system maintenance and will be back online shortly. Thank you for your patience.";

    return (
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
            <Card className="max-w-xl w-full text-center">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <MaintenanceIcon />
                    </div>
                    <h1 className="text-3xl font-bold text-secondary-800">Under Maintenance</h1>
                    <p className="mt-4 text-secondary-600">
                        {message}
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default MaintenancePage;
