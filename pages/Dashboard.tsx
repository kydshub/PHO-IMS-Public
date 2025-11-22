import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import { Card } from '../components/ui/Card';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { Role, ItemMaster, InventoryItem, UserStatus, FacilityStatus, AssetItem, AssetStatus, Category, Facility, TransferStatus, PhysicalCountStatus } from '../types';
import { calculateDepreciation } from '../utils/depreciation';
import { formatCurrency, formatNumber } from '../utils/formatters';

// --- ICONS ---
const PesoSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="bold" fontFamily="sans-serif">₱</text></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const FacilityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 21V7L12 2 2 7v14h20z"/><path d="M16 14h-4v-4h4v4z"/></svg>;
const LowStockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
const ExpiryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const TransferIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12H3"/><path d="m18 15 3-3-3-3"/><path d="M6 9 3 12l3 3"/></svg>;
const CountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { facilities, inventoryItems, itemMasters, users, assetItems, transferLogs, physicalCounts, categories } = data;

    const isEncoder = user?.role === Role.Encoder;
    const isSysAdmin = user?.role === Role.SystemAdministrator;

    const stats = useMemo(() => {
        const facilityId = user?.facilityId;
        
        const storageFacilityMap = new Map<string, string>();
        data.storageLocations.forEach(sl => storageFacilityMap.set(sl.id, sl.facilityId));

        const itemMasterMap = new Map<string, ItemMaster>(itemMasters.map(im => [im.id, im]));

        const itemsInScope = inventoryItems.filter(item => !isEncoder || storageFacilityMap.get(item.storageLocationId) === facilityId);
        const assetsInScope = assetItems.filter(item => !isEncoder || storageFacilityMap.get(item.storageLocationId) === facilityId);

        const totalCommodityValue = itemsInScope.reduce((sum, item) => {
            const master = itemMasterMap.get(item.itemMasterId);
            const cost = item.purchaseCost ?? master?.unitCost ?? 0;
            return sum + (item.quantity * cost);
        }, 0);
        
        const totalPpeValue = assetsInScope.reduce((sum, asset) => sum + calculateDepreciation(asset).depreciatedValue, 0);

        const lowStockCount = itemsInScope.filter(item => {
            const master = itemMasterMap.get(item.itemMasterId);
            return master && master.lowStockThreshold !== null && master.lowStockThreshold > 0 && item.quantity > 0 && item.quantity <= master.lowStockThreshold;
        }).length;
        
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
        const expiringSoonCount = itemsInScope.filter(item => item.expiryDate && new Date(item.expiryDate) <= ninetyDaysFromNow).length;

        const systemStats = {
            totalUsers: users.length,
            activeFacilities: facilities.filter(f => f.status === FacilityStatus.Active).length,
            incomingTransfers: transferLogs.filter(t => t.toFacilityId === facilityId && t.status === TransferStatus.Pending).length,
            activeCounts: physicalCounts.filter(pc => pc.facilityId === facilityId && pc.status !== PhysicalCountStatus.Completed && pc.status !== PhysicalCountStatus.Cancelled).length,
        };

        return { totalCommodityValue, totalPpeValue, lowStockCount, expiringSoonCount, ...systemStats };
    }, [user, inventoryItems, itemMasters, users, facilities, assetItems, transferLogs, physicalCounts, data.storageLocations]);
    
    const valueByCategory = useMemo(() => {
        const facilityId = user?.facilityId;
        const storageFacilityMap = new Map<string, string>();
        data.storageLocations.forEach(sl => storageFacilityMap.set(sl.id, sl.facilityId));
        const itemMasterMap = new Map<string, ItemMaster>(itemMasters.map(im => [im.id, im]));
        const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));

        const valueMap = new Map<string, number>();

        inventoryItems.forEach(item => {
            const itemFacilityId = storageFacilityMap.get(item.storageLocationId);
            if(isEncoder && itemFacilityId !== facilityId) return;
            
            const master = itemMasterMap.get(item.itemMasterId);
            if(master) {
                const category = categoryMap.get(master.categoryId);
                const value = item.quantity * (item.purchaseCost ?? master.unitCost ?? 0);
                valueMap.set(category?.name || 'Uncategorized', (valueMap.get(category?.name || 'Uncategorized') || 0) + value);
            }
        });
        
        return Array.from(valueMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 10);
    }, [user, inventoryItems, itemMasters, categories, data.storageLocations]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard title="Total Commodity Value" value={formatCurrency(stats.totalCommodityValue)} icon={<PesoSignIcon/>} color="green" linkTo="/inventory/commodities"/>
                <DashboardCard title="Total Depreciated PPE Value" value={formatCurrency(stats.totalPpeValue)} icon={<PesoSignIcon/>} color="blue" linkTo="/inventory/ppe"/>
                {isSysAdmin ? (
                    <>
                    <DashboardCard title="Active Users" value={stats.totalUsers} icon={<UsersIcon/>} color="indigo" linkTo="/users" />
                    <DashboardCard title="Active Facilities" value={stats.activeFacilities} icon={<FacilityIcon/>} color="sky" linkTo="/facilities" />
                    </>
                ) : (
                    <>
                    <DashboardCard title="Incoming Transfers" value={stats.incomingTransfers} icon={<TransferIcon/>} color="indigo" linkTo="/transfers" />
                    <DashboardCard title="Active Physical Counts" value={stats.activeCounts} icon={<CountIcon/>} color="sky" linkTo="/physical-counts" />
                    </>
                )}
                <DashboardCard title="Low Stock Alerts" value={stats.lowStockCount} icon={<LowStockIcon/>} color="yellow" linkTo="/inventory/commodities" linkState={{ preselectedStatus: 'Low Stock' }} />
                <DashboardCard title="Items Expiring Soon" value={stats.expiringSoonCount} subtitle="in the next 90 days" icon={<ExpiryIcon/>} color="orange" linkTo="/inventory/commodities" linkState={{ preselectedExpiration: 'expiringSoon' }} />
            </div>
            
            <Card title="Inventory Value by Category">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={valueByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), "Value"]}/>
                        <Bar dataKey="value" name="Total Value" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};

export default Dashboard;
