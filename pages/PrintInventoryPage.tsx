

import React, { useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AssetItem, InventoryItem, ItemType, PhysicalCountStatus } from '../types';
import { calculateDepreciation } from '../utils/depreciation';
import { useSettings } from '../hooks/useSettings';
import { useDatabase } from '../hooks/useDatabase';
import { getStorageLocationPath } from '../utils/locationHelpers';
import { Spinner } from '../components/ui/Spinner';
import PrintLayout from '../components/ui/PrintLayout';

const PrintInventoryPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { storageLocations, facilities } = data;

    const filters = {
        itemType: searchParams.get('itemType'),
        facilityId: searchParams.get('facilityId'),
        storageLocationId: searchParams.get('storageLocationId'),
        programId: searchParams.get('programId'),
        categoryId: searchParams.get('categoryId'),
        assetStatus: searchParams.get('assetStatus'),
        propertyCustodian: searchParams.get('propertyCustodian'),
        fundSourceId: searchParams.get('fundSourceId'),
        supplierId: searchParams.get('supplierId'),
        purchaseOrder: searchParams.get('purchaseOrder'),
        icsNumber: searchParams.get('icsNumber'),
        status: searchParams.get('status'),
        expiration: searchParams.get('expiration'),
        searchTerm: searchParams.get('searchTerm') || '',
    };
    
    const isAssetView = filters.itemType === ItemType.Asset;

    const { items, itemType, facilityName } = useMemo(() => {
        if (loading) return { items: [], itemType: filters.itemType, facilityName: 'All Facilities' };

        const { inventoryItems, assetItems, facilities, programs, storageLocations, categories, itemMasters, physicalCounts, fundSources, suppliers } = data;

        const facility = filters.facilityId ? facilities.find(f => f.id === filters.facilityId) : null;
        const facilityNameStr = facility ? facility.name : 'All Facilities';

        const activeCountStatuses = [PhysicalCountStatus.Pending, PhysicalCountStatus.InProgress, PhysicalCountStatus.PendingReview];
        const frozenItemIds = new Set<string>();
        physicalCounts.filter(c => activeCountStatuses.includes(c.status)).forEach(c => c.items?.forEach(i => i && frozenItemIds.add(i.inventoryItemId)));
        const storageFacilityMap = new Map(storageLocations.map(sl => [sl.id, sl.facilityId]));
        const itemMasterMap = new Map(itemMasters.map(im => [im.id, im]));
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        let processedItems: any[];

        if (isAssetView) {
             processedItems = assetItems.map(asset => {
                const master = itemMasterMap.get(asset.itemMasterId);
                if (!master) return null;
                const { age, depreciatedValue } = calculateDepreciation(asset);
                return {
                    ...asset, master,
                    facilityId: storageFacilityMap.get(asset.storageLocationId),
                    locationName: getStorageLocationPath(asset.storageLocationId, storageLocations, facilities),
                    age, depreciatedValue
                };
            }).filter(Boolean);
        } else {
            const getStatus = (item: any) => {
                if (item.isFrozen) return 'On Count';
                if (item.quantity === 0) return 'Out of Stock';
                if (item.master.lowStockThreshold && item.master.lowStockThreshold > 0 && item.quantity <= item.master.lowStockThreshold) return 'Low Stock';
                return 'In Stock';
            };
            processedItems = inventoryItems
                .filter(item => !item.isConsignment)
                .map(item => {
                    const master = itemMasterMap.get(item.itemMasterId);
                    if (!master) return null;
                    return { ...item, master, facilityId: storageFacilityMap.get(item.storageLocationId), isFrozen: frozenItemIds.has(item.id) };
                })
                .filter((item): item is any => item !== null && (filters.itemType === 'Commodities' ? [ItemType.Consumable, ItemType.Equipment].includes(item.master.itemType) : true))
                .map(item => ({ ...item, statusText: getStatus(item) }));
        }

        const filtered = processedItems.filter(item => {
            if (isAssetView) {
                const searchMatch = !filters.searchTerm ||
                    item.master.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                    (item.master.brand && item.master.brand.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                    (item.propertyNumber && item.propertyNumber.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                    (item.serialNumber && item.serialNumber.toLowerCase().includes(filters.searchTerm.toLowerCase()));

                const facilityMatch = !filters.facilityId || item.facilityId === filters.facilityId;
                const storageLocationMatch = !filters.storageLocationId || item.storageLocationId === filters.storageLocationId;
                const categoryMatch = !filters.categoryId || item.master.categoryId === filters.categoryId;
                const statusMatch = !filters.assetStatus || item.status === filters.assetStatus;
                const custodianMatch = !filters.propertyCustodian || (item.propertyCustodian && item.propertyCustodian.toLowerCase().includes(filters.propertyCustodian.toLowerCase()));
                const fundSourceMatch = !filters.fundSourceId || item.fundSourceId === filters.fundSourceId;
                return searchMatch && facilityMatch && storageLocationMatch && categoryMatch && statusMatch && custodianMatch && fundSourceMatch;

            } else {
                const searchMatch = !filters.searchTerm ||
                    item.master!.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                    (item.master!.brand && item.master!.brand.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                    (item.batchNumber && item.batchNumber.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                    (item.purchaseOrder && item.purchaseOrder.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                    (item.icsNumber && item.icsNumber.toLowerCase().includes(filters.searchTerm.toLowerCase()));

                const facilityMatch = !filters.facilityId || item.facilityId === filters.facilityId;
                const storageLocationMatch = !filters.storageLocationId || item.storageLocationId === filters.storageLocationId;
                const categoryMatch = !filters.categoryId || item.master!.categoryId === filters.categoryId;
                const programMatch = !filters.programId || item.programId === filters.programId;
                const fundSourceMatch = !filters.fundSourceId || item.fundSourceId === filters.fundSourceId;
                const supplierMatch = !filters.supplierId || item.supplierId === filters.supplierId;
                const poMatch = !filters.purchaseOrder || (item.purchaseOrder && item.purchaseOrder.toLowerCase().includes(filters.purchaseOrder.toLowerCase()));
                const icsMatch = !filters.icsNumber || (item.icsNumber && item.icsNumber.toLowerCase().includes(filters.icsNumber.toLowerCase()));
                const statusMatch = (() => {
                  if (!filters.status) return true;
                  return item.statusText === filters.status;
                })();
    
                const expirationMatch = (() => {
                    if (!filters.expiration) return true;
                    if (!item.expiryDate) return false;
                    
                    const now = new Date();
                    const expiry = new Date(item.expiryDate);
                    now.setHours(0,0,0,0);
    
                    if (filters.expiration === 'expired') {
                        return expiry < now;
                    }
                    if (filters.expiration === 'expiringSoon') {
                        const ninetyDaysFromNow = new Date();
                        ninetyDaysFromNow.setDate(now.getDate() + 90);
                        return expiry >= now && expiry <= ninetyDaysFromNow;
                    }
                    return true;
                })();
                
                return searchMatch && facilityMatch && storageLocationMatch && categoryMatch && programMatch && fundSourceMatch && supplierMatch && poMatch && icsMatch && statusMatch && expirationMatch;
            }
        });

        return { items: filtered, itemType: filters.itemType, facilityName: facilityNameStr };

    }, [loading, data, filters, isAssetView]);
    
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>;
    }

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
    
    const ReportHeader = () => (
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800">{settings.appName}</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1">{itemType} Inventory Report</h2>
            <div className="mt-2 text-sm text-gray-500">
                <p><strong>Facility:</strong> {facilityName}</p>
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

    const renderContent = () => {
        if (itemType === ItemType.Asset) {
            return (
                <StandardTable headers={["Property #", "Name", "Status", "Location", "Age (Yrs)", "Depreciated Value"]}>
                   {(items as any[]).map((asset) => (
                        <tr key={asset.id} className="border-t">
                            <td className="p-2 border font-mono">{asset.propertyNumber}</td>
                            <td className="p-2 border font-medium">{asset.master?.name}</td>
                            <td className="p-2 border">{asset.status}</td>
                            <td className="p-2 border print-small-text">{getStorageLocationPath(asset.storageLocationId, storageLocations, facilities)}</td>
                            <td className="p-2 border text-right">{asset.age.toFixed(1)}</td>
                            <td className="p-2 border text-right">{formatCurrency(asset.depreciatedValue)}</td>
                        </tr>
                       )
                   )}
                </StandardTable>
            );
        } else {
            return (
                 <StandardTable headers={["Name", "Brand", "Location", "Qty", "Unit", "Batch #", "Expiry"]}>
                   {(items as any[]).map((item) => (
                        <tr key={item.id} className="border-t">
                            <td className="p-2 border font-medium">{item.master?.name}</td>
                            <td className="p-2 border">{item.master?.brand || 'N/A'}</td>
                            <td className="p-2 border print-small-text">{getStorageLocationPath(item.storageLocationId, storageLocations, facilities)}</td>
                            <td className="p-2 border text-right">{item.quantity.toLocaleString()}</td>
                            <td className="p-2 border">{item.master?.unit}</td>
                            <td className="p-2 border">{item.batchNumber}</td>
                            <td className="p-2 border">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                   ))}
                </StandardTable>
            );
        }
    };
    
    return (
        <PrintLayout title={`${itemType} Report - ${new Date().toLocaleDateString()}`}>
            <ReportHeader />
            <section className="mb-8 break-inside-avoid">
                {renderContent()}
                {items.length === 0 && <p className="text-gray-600 text-sm p-2">No items match the selected criteria.</p>}
            </section>
        </PrintLayout>
    );
};

export default PrintInventoryPage;