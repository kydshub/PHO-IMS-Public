

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InventoryItem, ItemMaster, Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';
import { SortableHeader } from './ui/SortableHeader';
import { SortConfig } from '../hooks/useSort';
import { formatCurrency } from '../utils/formatters';

type AugmentedInventoryItem = InventoryItem & {
    master?: ItemMaster;
    facilityId?: string;
    facilityName?: string;
    locationName?: string;
    categoryName?: string;
    programName?: string;
    totalValue?: number;
    isFrozen?: boolean;
    fundSourceName?: string;
};

interface InventoryTableProps {
  items: AugmentedInventoryItem[];
  requestSort: (key: keyof AugmentedInventoryItem | string) => void;
  sortConfig: SortConfig<AugmentedInventoryItem>;
  onEdit: (item: InventoryItem) => void;
  onAdjust: (item: AugmentedInventoryItem) => void;
  onPurge: (item: AugmentedInventoryItem) => void;
}

const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary-500 inline-block ml-2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const LedgerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>;
const AdjustIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6m0-4V4m6 16v-2m0-4V4m-6 16v-8m0-4V4"/></svg>;

const getStatus = (item: AugmentedInventoryItem) => {
    if (!item.master) return { text: 'Unknown', color: 'bg-secondary-100 text-secondary-800' };
    if (item.isFrozen) return { text: 'On Count', color: 'bg-blue-100 text-blue-800' };
    if (item.quantity === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (item.master.lowStockThreshold && item.master.lowStockThreshold > 0 && item.quantity <= item.master.lowStockThreshold) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
};

const StockLevelIndicator: React.FC<{ item: AugmentedInventoryItem }> = ({ item }) => {
    const status = getStatus(item);
    const { quantity, master } = item;
    const threshold = master?.lowStockThreshold;

    // Render text pills for non-stock level statuses or if there's no threshold
    if (status.text !== 'In Stock' && status.text !== 'Low Stock' || threshold === null || threshold === undefined || threshold <= 0) {
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                {status.text}
            </span>
        );
    }
    
    // At this point, we know it's either 'In Stock' or 'Low Stock'
    // and threshold must be defined and greater than 0.
    
    const max = threshold * 2;
    const percentage = Math.min((quantity / max) * 100, 100);

    return (
        <div className="flex flex-col items-center w-28" title={`Stock: ${quantity} | Threshold: ${threshold}`}>
            <div className="w-full bg-secondary-200 rounded-full h-2 relative">
                <div 
                    className={`h-2 rounded-full ${status.text === 'Low Stock' ? 'bg-yellow-400' : 'bg-green-500'}`}
                    style={{ width: `${percentage}%` }}
                />
                <div 
                    className="absolute h-2 w-0.5 bg-red-500 top-0"
                    style={{ left: '50%' }}
                    title={`Low stock threshold: ${threshold}`}
                />
            </div>
            <span className={`text-xs mt-1 font-semibold ${status.text === 'Low Stock' ? 'text-yellow-700' : 'text-secondary-600'}`}>
                {quantity.toLocaleString()} / {threshold.toLocaleString()}
            </span>
        </div>
    );
};

const InventoryTable: React.FC<InventoryTableProps> = ({ items, requestSort, sortConfig, onEdit, onAdjust, onPurge }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role === Role.Admin || user?.role === Role.SystemAdministrator || user?.role === Role.Encoder;
  const canAdjust = user?.role === Role.Admin || user?.role === Role.SystemAdministrator;
  const canPurge = user?.role === Role.SystemAdministrator;
  
  const isExpired = (expiryDate: string) => expiryDate && new Date(expiryDate) < new Date();

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-secondary-200">
        <thead className="bg-secondary-50">
          <tr>
            {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
            <SortableHeader sortKey="master.name" requestSort={requestSort} sortConfig={sortConfig} isSticky>Name</SortableHeader>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Location</th>
            <SortableHeader sortKey="quantity" requestSort={requestSort} sortConfig={sortConfig}>Quantity</SortableHeader>
            <SortableHeader sortKey="purchaseCost" requestSort={requestSort} sortConfig={sortConfig}>Unit Cost</SortableHeader>
            <SortableHeader sortKey="fundSourceName" requestSort={requestSort} sortConfig={sortConfig}>Fund Source</SortableHeader>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
            <SortableHeader sortKey="expiryDate" requestSort={requestSort} sortConfig={sortConfig}>Expiry Date</SortableHeader>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Batch No.</th>
            {(canEdit || canAdjust) && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-200">
          {items.map((item, index) => {
            const ledgerPath = item.isConsignment
                ? `/consignment/supply-ledger/${item.master?.id}`
                : `/supply-ledger/${item.master?.id}`;
            const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50';
            return (
              <tr key={item.id} className={`${rowBgClass} hover:bg-primary-50`}>
                <td className={`sticky left-0 px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 shadow-md z-10 ${rowBgClass}`}>
                  {item.master?.name || 'Unknown Item'}
                  {item.isFrozen && <LockIcon />}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.facilityName} / {item.locationName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{item.quantity.toLocaleString()} {item.master?.unit || ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 text-right">{formatCurrency(item.purchaseCost)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.fundSourceName || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StockLevelIndicator item={item} />
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isExpired(item.expiryDate) ? 'text-red-600 font-bold' : 'text-secondary-500'}`}>
                  {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.batchNumber}</td>
                {(canEdit || canAdjust) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate(ledgerPath)}
                      title="View Ledger"
                    >
                      <LedgerIcon />
                    </Button>
                    {canAdjust && 
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onAdjust(item)}
                        disabled={item.isFrozen}
                        title={item.isFrozen ? "This item is part of an active physical count and cannot be adjusted." : "Adjust Quantity"}
                      >
                        <AdjustIcon />
                      </Button>
                    }
                    {canEdit && 
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onEdit(item)}
                        disabled={item.isFrozen}
                        title={item.isFrozen ? "This item is part of an active physical count and cannot be edited." : "Edit Item"}
                      >
                        Edit
                      </Button>
                    }
                    {canPurge && 
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPurge(item)}
                        disabled={item.isFrozen}
                        className="text-red-600 hover:bg-red-100"
                        title={item.isFrozen ? "This item is part of an active physical count and cannot be purged." : "Purge Item"}
                      >
                        Purge
                      </Button>
                    }
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
        {items.length === 0 && <p className="text-center text-secondary-500 py-8">No items match the current filters.</p>}
    </div>
  );
};

export default InventoryTable;