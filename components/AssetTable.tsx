

import React from 'react';
import { AssetItem, FacilityStatus, ItemMaster, AssetStatus } from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { Button } from './ui/Button';
import { SortableHeader } from './ui/SortableHeader';
import { SortConfig } from '../hooks/useSort';
import { formatCurrency } from '../utils/formatters';

type AugmentedAssetItem = AssetItem & {
    master?: ItemMaster;
    facilityId?: string;
    facilityName?: string;
    locationName?: string;
    categoryName?: string;
    custodianName?: string;
    fundSourceName?: string;
    age: number;
    depreciatedValue: number;
};


interface AssetTableProps {
  assets: AugmentedAssetItem[];
  onEdit: (assetItem: AssetItem) => void;
  onDelete: (assetItem: AssetItem) => void;
  canModify: boolean;
  requestSort: (key: keyof AugmentedAssetItem | string) => void;
  sortConfig: SortConfig<AugmentedAssetItem>;
}

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const AssetTable: React.FC<AssetTableProps> = ({ assets, onEdit, onDelete, canModify, requestSort, sortConfig }) => {
  const { data } = useDatabase();
  const { facilities } = data;

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
        case AssetStatus.Deployed: return 'bg-blue-100 text-blue-800';
        case AssetStatus.InStock: return 'bg-green-100 text-green-800';
        case AssetStatus.InRepair: return 'bg-yellow-100 text-yellow-800';
        case AssetStatus.Borrowed: return 'bg-purple-100 text-purple-800';
        case AssetStatus.Disposed: return 'bg-secondary-200 text-secondary-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead className="bg-secondary-50">
          <tr>
            {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
            <SortableHeader sortKey="propertyNumber" requestSort={requestSort} sortConfig={sortConfig}>Property Number</SortableHeader>
            <SortableHeader sortKey="master.name" requestSort={requestSort} sortConfig={sortConfig} isSticky>Name</SortableHeader>
            <SortableHeader sortKey="depreciatedValue" requestSort={requestSort} sortConfig={sortConfig}>Depreciated Value</SortableHeader>
            <SortableHeader sortKey="age" requestSort={requestSort} sortConfig={sortConfig}>Age (Yrs)</SortableHeader>
            <SortableHeader sortKey="status" requestSort={requestSort} sortConfig={sortConfig}>Status</SortableHeader>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Location</th>
            {canModify && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-200">
          {assets.map((asset, index) => {
            const facility = facilities.find(f => f.id === asset.facilityId);
            const isFacilityInactive = facility?.status === FacilityStatus.Inactive;
            const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50';

            return (
              <tr key={asset.id} className={`${rowBgClass} hover:bg-primary-50`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-primary-600">{asset.propertyNumber}</td>
                <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 shadow-md ${rowBgClass}`}>{asset.master?.name || 'Unknown Item'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{formatCurrency(asset.depreciatedValue)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{asset.age.toFixed(1)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{asset.facilityName} / {asset.locationName}</td>
                {canModify && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => window.open(`/#/print/asset/${asset.id}`, '_blank')} aria-label="Print" title="Print Asset Tag">
                        <PrintIcon />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(asset)} aria-label="Edit" disabled={isFacilityInactive} title={isFacilityInactive ? "Cannot edit items in an inactive facility" : "Edit Asset"}>
                        <EditIcon />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(asset)} aria-label="Delete" className="text-red-600 hover:bg-red-100" disabled={isFacilityInactive} title={isFacilityInactive ? "Cannot delete items from an inactive facility" : "Delete Asset"}>
                        <TrashIcon />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
        {assets.length === 0 && <p className="text-center text-secondary-500 py-8">No Assets match the current filters.</p>}
    </div>
  );
};

export default AssetTable;