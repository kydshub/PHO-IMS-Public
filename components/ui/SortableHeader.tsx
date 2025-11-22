
import React from 'react';
import { SortConfig } from '../../hooks/useSort';

interface SortableHeaderProps<T> {
  children: React.ReactNode;
  sortKey: keyof T | string;
  requestSort: (key: keyof T | string) => void;
  sortConfig: SortConfig<T>;
  isSticky?: boolean;
}

export const SortableHeader = <T,>({ children, sortKey, requestSort, sortConfig, isSticky }: SortableHeaderProps<T>) => {
  const isSorted = sortConfig.key === sortKey;
  const directionIcon = sortConfig.direction === 'ascending' ? '▲' : '▼';

  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 transition-colors ${isSticky ? 'sticky left-0 bg-secondary-50 z-20 shadow-md' : ''}`}
      onClick={() => requestSort(sortKey)}
      aria-sort={isSorted ? sortConfig.direction : 'none'}
    >
      <div className="flex items-center">
        <span>{children}</span>
        {isSorted && <span className="ml-2 text-primary-600 text-base">{directionIcon}</span>}
      </div>
    </th>
  );
};
