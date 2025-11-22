import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useSettings } from '../hooks/useSettings';
import { AssetItem, ItemMaster } from '../types';
import PrintLayout from '../components/ui/PrintLayout';
import { Spinner } from '../components/ui/Spinner';
import NotFound from './NotFound';
import { formatCurrency } from '../utils/formatters';
import { getStorageLocationPath } from '../utils/locationHelpers';
import { calculateDepreciation } from '../utils/depreciation';
import { Button } from '../components/ui/Button';

const PrintAssetPage: React.FC = () => {
    const { assetId } = useParams<{ assetId: string }>();
    const { settings } = useSettings();
    const { data, loading } = useDatabase();
    const { assetItems, itemMasters, facilities, storageLocations, fundSources } = data;

    const asset = useMemo(() => assetItems.find(a => a.id === assetId), [assetId, assetItems]);
    const master = useMemo(() => asset ? itemMasters.find(im => im.id === asset.itemMasterId) : undefined, [asset, itemMasters]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>;
    }

    if (!asset || !master) {
        return (
            <PrintLayout title="Asset Not Found">
                <div className="flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-600">Error: Asset Not Found</h1>
                    <p className="mt-2 text-secondary-600">The requested asset could not be found.</p>
                    <Link to="/inventory/ppe">
                        <Button className="mt-6">Go to PPE Inventory</Button>
                    </Link>
                </div>
            </PrintLayout>
        );
    }
    
    const locationPath = getStorageLocationPath(asset.storageLocationId, storageLocations, facilities);
    const fundSourceName = fundSources.find(fs => fs.id === asset.fundSourceId)?.name || 'N/A';
    const depreciationInfo = calculateDepreciation(asset);

    const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between py-2 text-base border-b">
            <span className="font-semibold text-gray-600">{label}:</span>
            <span className="text-gray-800 text-right font-medium">{value || 'N/A'}</span>
        </div>
    );

    return (
        <PrintLayout title={`Asset Tag - ${asset.propertyNumber}`}>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">{settings.organizationName}</h1>
                <h2 className="text-xl font-semibold text-gray-700 mt-1">Property Accountability Receipt</h2>
            </div>

            <div className="grid grid-cols-2 gap-x-8 text-sm mb-6">
                <div>
                    <p><strong>Property Number:</strong></p>
                    <p className="text-2xl font-mono font-bold text-gray-800">{asset.propertyNumber}</p>
                </div>
                 <div className="text-right">
                    <p><strong>Date Printed:</strong> {new Date().toLocaleString()}</p>
                </div>
            </div>

            <div className="space-y-1">
                <DetailRow label="Item Description" value={`${master.name} (${master.brand || 'N/A'})`} />
                <DetailRow label="Serial Number" value={asset.serialNumber} />
                <DetailRow label="Category" value={data.categories.find(c => c.id === master.categoryId)?.name} />
                <DetailRow label="Current Status" value={asset.status} />
                <DetailRow label="Current Location" value={locationPath} />
                <DetailRow label="Property Custodian" value={asset.propertyCustodian} />
                <DetailRow label="Assigned To" value={asset.assignedTo} />
                <hr className="my-4"/>
                <DetailRow label="Purchase Date" value={new Date(asset.purchaseDate).toLocaleDateString()} />
                <DetailRow label="Acquisition Price" value={formatCurrency(asset.acquisitionPrice)} />
                <DetailRow label="Warranty End Date" value={asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : 'N/A'} />
                <DetailRow label="Fund Source" value={fundSourceName} />
                <hr className="my-4"/>
                <DetailRow label="Useful Life" value={asset.usefulLife ? `${asset.usefulLife} years` : 'N/A'} />
                <DetailRow label="Salvage Value" value={formatCurrency(asset.salvageValue || 0)} />
                <DetailRow label="Current Age" value={`${depreciationInfo.age.toFixed(2)} years`} />
                <DetailRow label="Depreciated Value" value={formatCurrency(depreciationInfo.depreciatedValue)} />
                <hr className="my-4"/>
                 <DetailRow label="Condition" value={asset.condition} />
                 <DetailRow label="Notes" value={<div className="text-left pl-4">{asset.notes || 'No notes.'}</div>} />
            </div>

            <div className="mt-16 pt-8 border-t-2 border-gray-300 border-dashed grid grid-cols-2 gap-12 text-center">
                <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Issued By (Name & Signature)</div>
                </div>
                 <div>
                    <div className="border-t border-gray-400 mt-8 pt-2 text-sm text-gray-600">Received By (Name & Signature)</div>
                </div>
            </div>

        </PrintLayout>
    );
};

export default PrintAssetPage;