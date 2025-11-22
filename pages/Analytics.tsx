import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role, AuditLog, User, TransferLog } from '../types';
import Dashboard from './Dashboard';
import Reports from './Reports';
import SupplierInsights from './SupplierInsights';
import Forecasting from './Forecasting';
import FacilityPerformance from './FacilityPerformance';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { DatePicker } from '../components/ui/DatePicker';
import { TablePagination } from '../components/ui/TablePagination';
import { GoogleGenAI, Type } from "@google/genai";
import { logAuditEvent } from '../services/audit';
import { useDatabase } from '../hooks/useDatabase';
import CostOfGoodsDispensedTab from './CostOfGoodsDispensed';
import ExpiryWasteAnalysisTab from './ExpiryWasteAnalysis';

// --- ICONS ---
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>;
const InventoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 8a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" /><path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm1 4a1 1 0 000 2h8a1 1 0 100-2H5z" clipRule="evenodd" /></svg>;
const ForecastIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L12 11.586l3.293-3.293a1 1 0 01.207-.293H12v-1z" clipRule="evenodd" /></svg>;
const SupplierIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v5.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1V8a1 1 0 00-1-1h-5z" /></svg>;
const FacilityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-2 0v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>;
const EngagementIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>;
const UserActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>;
const CogdIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H7zM6 14a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm5-1a1 1 0 100 2h.01a1 1 0 100-2H11z" clipRule="evenodd" /></svg>;
const WasteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;


// --- Sub-components for tabs ---
import EngagementAnalyticsTab from './EngagementAnalytics';
import MyActivityReportTab from './MyActivityReport';

const Analytics: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();

    const getInitialTab = () => {
        const state = location.state as { preselectedTab?: string };
        return state?.preselectedTab || 'dashboard';
    };
    
    const [activeTab, setActiveTab] = useState(getInitialTab);

    useEffect(() => {
        const state = location.state as { preselectedTab?: string };
        if (state?.preselectedTab) {
            setActiveTab(state.preselectedTab);
        }
    }, [location.state]);

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor, Role.User] },
        { id: 'inventory-deep-dive', label: 'Inventory Deep Dive', icon: <InventoryIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Auditor] },
        { id: 'forecasting', label: 'Forecasting', icon: <ForecastIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder, Role.Auditor] },
        { id: 'cogd', label: 'Cost of Goods Dispensed', icon: <CogdIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Auditor] },
        { id: 'waste-analysis', label: 'Expiry Waste Analysis', icon: <WasteIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Auditor] },
        { id: 'supplier-insights', label: 'Supplier Insights', icon: <SupplierIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Auditor] },
        { id: 'facility-performance', label: 'Facility Performance', icon: <FacilityIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Auditor] },
        { id: 'my-activity', label: 'My Activity Report', icon: <UserActivityIcon />, roles: [Role.SystemAdministrator, Role.Admin, Role.Encoder] },
        { id: 'engagement', label: 'Engagement Analytics', icon: <EngagementIcon />, roles: [Role.SystemAdministrator] },
    ];

    const accessibleTabs = tabs.filter(tab => user && tab.roles.includes(user.role));
    
    useEffect(() => {
        if (!accessibleTabs.some(tab => tab.id === activeTab)) {
            setActiveTab(accessibleTabs[0]?.id || 'dashboard');
        }
    }, [activeTab, accessibleTabs]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-secondary-900">Analytics Hub</h2>
                <p className="mt-1 text-secondary-600">
                    A centralized hub for viewing system dashboards, analyzing inventory data, and generating performance reports.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                    {accessibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                                activeTab === tab.id
                                    ? 'bg-primary-600 text-white shadow'
                                    : 'text-secondary-600 hover:bg-primary-100 hover:text-primary-700'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-2">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'inventory-deep-dive' && <Reports />}
                {activeTab === 'forecasting' && <Forecasting />}
                {activeTab === 'cogd' && <CostOfGoodsDispensedTab />}
                {activeTab === 'waste-analysis' && <ExpiryWasteAnalysisTab />}
                {activeTab === 'supplier-insights' && <SupplierInsights />}
                {activeTab === 'facility-performance' && <FacilityPerformance />}
                {activeTab === 'my-activity' && <MyActivityReportTab />}
                {activeTab === 'engagement' && <EngagementAnalyticsTab />}
            </div>
        </div>
    );
};

export default Analytics;
