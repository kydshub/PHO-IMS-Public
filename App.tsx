
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DatabaseProvider } from './hooks/useDatabase';
import InitialSetup from './pages/InitialSetup';
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import { Spinner } from './components/ui/Spinner';
import { db } from './services/firebase';
import { InfoModalProvider } from './hooks/useInfoModal';
import { ConfirmationProvider } from './hooks/useConfirmation';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import { NotificationProvider } from './hooks/useNotifications';
import { ChatProvider } from './hooks/useChat';
import SessionManager from './components/SessionManager';
import AudioUnlocker from './components/AudioUnlocker';
import MaintenancePage from './pages/MaintenancePage';
import { Role } from './types';

// Import all print pages
import PrintAssetPage from './pages/PrintAssetPage';
import PrintCategoryPage from './pages/PrintCategoryPage';
import PrintConsignmentReportPage from './pages/PrintConsignmentReportPage';
import PrintCountHistoryPage from './pages/PrintCountHistoryPage';
import PrintDispenseHistoryPage from './pages/PrintDispenseHistoryPage';
import PrintFacilityPage from './pages/PrintFacilityPage';
import PrintForecastPage from './pages/PrintForecastPage';
import PrintInventoryPage from './pages/PrintInventoryPage';
import PrintItemMasterPage from './pages/PrintItemMasterPage';
import PrintMonthlyDetailedReportPage from './pages/PrintMonthlyDetailedReportPage';
import PrintPage from './pages/PrintPage';
import PrintPhysicalCountReportPage from './pages/PrintPhysicalCountReportPage';
import PrintProgramPage from './pages/PrintProgramPage';
import PrintReceiveHistoryPage from './pages/PrintReceiveHistoryPage';
import PrintReportPage from './pages/PrintReportPage';
import PrintReturnPage from './pages/PrintReturnPage';
import PrintConsignmentReturnPage from './pages/PrintConsignmentReturnPage';
import PrintReturnHistoryPage from './pages/PrintReturnHistoryPage';
import PrintConsignmentReturnHistoryPage from './pages/PrintConsignmentReturnHistoryPage';
import PrintRISHistoryPage from './pages/PrintRISHistoryPage';
import PrintRISPage from './pages/PrintRISPage';
import PrintROHistoryPage from './pages/PrintROHistoryPage';
import PrintROPage from './pages/PrintROPage';
import PrintServiceProviderPage from './pages/PrintServiceProviderPage';
import PrintSupplierPage from './pages/PrintSupplierPage';
import PrintSupplyLedgerPage from './pages/PrintSupplyLedgerPage';
import PrintConsignmentSupplyLedgerPage from './pages/PrintConsignmentSupplyLedgerPage';
import PrintUserManagementPage from './pages/PrintUserManagementPage';
import PrintWriteOffHistoryPage from './pages/PrintWriteOffHistoryPage';
import PrintFundSourcePage from './pages/PrintFundSourcePage';
import PrintDispensePage from './pages/PrintDispensePage';
import PrintConsignmentTransferPage from './pages/PrintConsignmentTransferPage';
import PrintConsignmentTransferHistoryPage from './pages/PrintConsignmentTransferHistoryPage';
import PrintTransferHistoryPage from './pages/PrintTransferHistoryPage';
import PrintPurchaseOrderPage from './pages/PrintPurchaseOrderPage';
import PrintPurchaseOrderHistoryPage from './pages/PrintPurchaseOrderHistoryPage';
import PrintMyActivityReportPage from './pages/PrintMyActivityReportPage';
import PrintPatientWardReturnPage from './pages/PrintPatientWardReturnPage';
import PrintReceivePage from './pages/PrintReceivePage';
import PrintTransferPage from './pages/PrintTransferPage';
import PrintWriteOffPage from './pages/PrintWriteOffPage';
import PrintCostOfGoodsDispensedPage from './pages/PrintCostOfGoodsDispensedPage';
import PrintExpiryWasteAnalysisPage from './pages/PrintExpiryWasteAnalysisPage';
import PrintEngagementReportPage from './pages/PrintEngagementReportPage';
import PrintSupplierInsightsPage from './pages/PrintSupplierInsightsPage';
import PrintFacilityPerformancePage from './pages/PrintFacilityPerformancePage';


const AppContent: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { settings, loading: settingsLoading } = useSettings();
    const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
    const [checkingSetup, setCheckingSetup] = useState(true);

    useEffect(() => {
        const checkSetupStatus = async () => {
            try {
                const setupSnapshot = await db.ref('public/setupComplete').once('value');
                setIsSetupComplete(setupSnapshot.val() === true);
            } catch (error) {
                console.error("Error checking setup status:", error);
                setIsSetupComplete(false); // Default to setup if there's an error
            } finally {
                setCheckingSetup(false);
            }
        };
    
        checkSetupStatus();
    }, []);


    if (authLoading || checkingSetup || settingsLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-secondary-100">
                <Spinner size="lg" />
            </div>
        );
    }

    if (settings.maintenanceMode && user?.role !== Role.SystemAdministrator) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<MaintenancePage />} />
            </Routes>
        );
    }
    
    if (!isSetupComplete) {
        return (
            <Routes>
                <Route path="*" element={<InitialSetup onComplete={() => setIsSetupComplete(true)} />} />
            </Routes>
        );
    }

    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    return (
        <SessionManager>
            <Routes>
                {/* Print routes that should NOT have the main layout */}
                <Route path="/print/asset/:assetId" element={<PrintAssetPage />} />
                <Route path="/print/categories" element={<PrintCategoryPage />} />
                <Route path="/print/cogd-report" element={<PrintCostOfGoodsDispensedPage />} />
                <Route path="/print/consignment-report" element={<PrintConsignmentReportPage />} />
                <Route path="/print/consignment-return/:logId" element={<PrintConsignmentReturnPage />} />
                <Route path="/print/consignment-return-history" element={<PrintConsignmentReturnHistoryPage />} />
                <Route path="/print/consignment-supply-ledger" element={<PrintConsignmentSupplyLedgerPage />} />
                <Route path="/print/consignment-transfer/:logId" element={<PrintConsignmentTransferPage />} />
                <Route path="/print/consignment-transfer-history" element={<PrintConsignmentTransferHistoryPage />} />
                <Route path="/print/count-history" element={<PrintCountHistoryPage />} />
                <Route path="/print/dispense-history" element={<PrintDispenseHistoryPage />} />
                <Route path="/print/dispense/:logId" element={<PrintDispensePage />} />
                <Route path="/print/engagement-report" element={<PrintEngagementReportPage />} />
                <Route path="/print/expiry-waste-report" element={<PrintExpiryWasteAnalysisPage />} />
                <Route path="/print/facilities" element={<PrintFacilityPage />} />
                <Route path="/print/facility-performance" element={<PrintFacilityPerformancePage />} />
                <Route path="/print/forecast" element={<PrintForecastPage />} />
                <Route path="/print/fund-sources" element={<PrintFundSourcePage />} />
                <Route path="/print/inventory" element={<PrintInventoryPage />} />
                <Route path="/print/item-master" element={<PrintItemMasterPage />} />
                <Route path="/print/monthly-detailed-report" element={<PrintMonthlyDetailedReportPage />} />
                <Route path="/print/my-activity" element={<PrintMyActivityReportPage />} />
                <Route path="/print/physical-count-report/:countId" element={<PrintPhysicalCountReportPage />} />
                <Route path="/print/programs" element={<PrintProgramPage />} />
                <Route path="/print/po/:poId" element={<PrintPurchaseOrderPage />} />
                <Route path="/print/po-history" element={<PrintPurchaseOrderHistoryPage />} />
                <Route path="/print/receive-history" element={<PrintReceiveHistoryPage />} />
                <Route path="/print/receive/:logId" element={<PrintReceivePage />} />
                <Route path="/print/report" element={<PrintReportPage />} />
                <Route path="/print/return/:logId" element={<PrintReturnPage />} />
                <Route path="/print/return-internal/:logId" element={<PrintPatientWardReturnPage />} />
                <Route path="/print/return-history" element={<PrintReturnHistoryPage />} />
                <Route path="/print/transfer-history" element={<PrintTransferHistoryPage />} />
                <Route path="/print/ris-history" element={<PrintRISHistoryPage />} />
                <Route path="/print/ris/:logId" element={<PrintRISPage />} />
                <Route path="/print/ro-history" element={<PrintROHistoryPage />} />
                <Route path="/print/ro/:logId" element={<PrintROPage />} />
                <Route path="/print/service-providers" element={<PrintServiceProviderPage />} />
                <Route path="/print/suppliers" element={<PrintSupplierPage />} />
                <Route path="/print/supplier-insights" element={<PrintSupplierInsightsPage />} />
                <Route path="/print/supply-ledger" element={<PrintSupplyLedgerPage />} />
                <Route path="/print/transfer/:logId" element={<PrintTransferPage />} />
                <Route path="/print/users" element={<PrintUserManagementPage />} />
                <Route path="/print/write-off-history" element={<PrintWriteOffHistoryPage />} />
                <Route path="/print/write-off/:logId" element={<PrintWriteOffPage />} />
                <Route path="/print/:logId" element={<PrintPage />} />
                
                {/* Main App Routes */}
                <Route path="/login" element={<Navigate to="/analytics" />} />
                <Route path="/*" element={<HomePage />} />
            </Routes>
        </SessionManager>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <InfoModalProvider>
          <ConfirmationProvider>
            <SettingsProvider>
              <NotificationProvider>
                <ChatProvider>
                    <AudioUnlocker />
                    <HashRouter>
                      <AppContent />
                    </HashRouter>
                </ChatProvider>
              </NotificationProvider>
            </SettingsProvider>
          </ConfirmationProvider>
        </InfoModalProvider>
      </DatabaseProvider>
    </AuthProvider>
  );
};

export default App;
