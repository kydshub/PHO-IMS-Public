
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import Analytics from './Analytics';
import Inventory from './Inventory';
import { PhysicalCounts } from './PhysicalCounts';
import Dispense from './Dispense';
import Receiving from './Receiving';
import RO from './RO';
import RIS from './RIS';
import Transfers from './Transfers';
import Returns from './Returns';
import WriteOffs from './WriteOffs';
import ConsignmentInventory from './ConsignmentInventory';
import ConsignmentReceiving from './ConsignmentReceiving';
import ConsignmentReports from './ConsignmentReports';
import ConsignmentReturns from './ConsignmentReturns';
import ConsignmentTransfers from './ConsignmentTransfers';
import ConsignmentWriteOffs from './ConsignmentWriteOffs';
import FacilityManagement from './FacilityManagement';
import ProgramManagement from './ProgramManagement';
import CategoryManagement from './CategoryManagement';
import ItemManagement from './ItemManagement';
import AssetManagement from './AssetManagement';
import SupplierManagement from './SupplierManagement';
import ServiceProviderManagement from './ServiceProviderManagement';
import FundSourceManagement from './FundSourceManagement';
import Settings from './Settings';
import AuditTrail from './AuditTrail';
import UserManagement from './UserManagement';
import SupplyLedger from './SupplyLedger';
import ConsignmentSupplyLedger from './ConsignmentSupplyLedger';
import StorageLocationManagement from './StorageLocationManagement';
import PerformCountPage from './PerformCountPage';
import ReviewCountPage from './ReviewCountPage';
import { ItemType } from '../types';
import ForcePasswordChange from './ForcePasswordChange';
import NotFound from './NotFound';
import BulletinBoard from './BulletinBoard';
import PurchaseOrderManagement from './PurchaseOrderManagement';
import PurchaseOrderDetailPage from './PurchaseOrderDetailPage';
import PurchaseOrderFormPage from './PurchaseOrderFormPage';
import PatientWardReturns from './PatientWardReturns';

const HomePage: React.FC = () => {
    const { user } = useAuth();
    if (user?.requiresPasswordChange) {
        return <ForcePasswordChange user={user} />;
    }

    return (
        <Layout>
            <Routes>
                <Route path="/dashboard" element={<Navigate to="/analytics" />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/bulletin-board" element={<BulletinBoard />} />

                {/* Inventory Routes */}
                <Route path="/inventory/ppe" element={<Inventory itemTypes={[ItemType.Asset]} />} />
                <Route path="/inventory/commodities" element={<Inventory itemTypes={[ItemType.Consumable, ItemType.Equipment]} />} />
                <Route path="/physical-counts" element={<PhysicalCounts />} />
                <Route path="/physical-counts/:countId/perform" element={<PerformCountPage />} />
                <Route path="/physical-counts/:countId/review" element={<ReviewCountPage />} />
                <Route path="/supply-ledger/:itemMasterId" element={<SupplyLedger />} />

                {/* Transaction Routes */}
                <Route path="/dispense" element={<Dispense />} />
                <Route path="/receiving" element={<Receiving />} />
                <Route path="/release-order" element={<RO />} />
                <Route path="/returns" element={<Returns />} />
                <Route path="/returns-internal" element={<PatientWardReturns />} />
                <Route path="/ris" element={<RIS />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/write-offs" element={<WriteOffs />} />
                <Route path="/purchase-orders" element={<PurchaseOrderManagement />} />
                <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
                <Route path="/purchase-orders/edit/:poId" element={<PurchaseOrderFormPage />} />
                <Route path="/purchase-orders/:poId" element={<PurchaseOrderDetailPage />} />

                {/* Consignment Routes */}
                <Route path="/consignment/inventory" element={<ConsignmentInventory />} />
                <Route path="/consignment/receiving" element={<ConsignmentReceiving />} />
                <Route path="/consignment/reports" element={<ConsignmentReports />} />
                <Route path="/consignment/returns" element={<ConsignmentReturns />} />
                <Route path="/consignment/transfers" element={<ConsignmentTransfers />} />
                <Route path="/consignment/write-offs" element={<ConsignmentWriteOffs />} />
                <Route path="/consignment/supply-ledger/:itemMasterId" element={<ConsignmentSupplyLedger />} />


                {/* Management Routes */}
                <Route path="/facilities" element={<FacilityManagement />} />
                <Route path="/facilities/:facilityId/locations" element={<StorageLocationManagement />} />
                <Route path="/programs" element={<ProgramManagement />} />
                <Route path="/categories" element={<CategoryManagement />} />
                <Route path="/items" element={<ItemManagement />} />
                <Route path="/ppe-management" element={<AssetManagement />} />
                <Route path="/suppliers" element={<SupplierManagement />} />
                <Route path="/service-providers" element={<ServiceProviderManagement />} />
                <Route path="/fund-sources" element={<FundSourceManagement />} />
                <Route path="/settings" element={<Settings />} />

                {/* User Access & Audit */}
                <Route path="/audit-trail" element={<AuditTrail />} />
                <Route path="/users" element={<UserManagement />} />
                
                {/* Default and Not Found */}
                <Route path="/" element={<Navigate to="/analytics" />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Layout>
    );
}

export default HomePage;
