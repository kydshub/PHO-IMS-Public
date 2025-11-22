
import { useState, useMemo } from 'react';

type SortDirection = 'ascending' | 'descending';

export interface SortConfig<T> {
  key: keyof T | string; // Allow string for nested properties
  direction: SortDirection;
}

// Helper function for nested property access, handles potential nulls gracefully.
const getNestedValue = (obj: any, path: string): any => {
    try {
        return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj);
    } catch (e) {
        return null;
    }
}

export const useSort = <T extends Record<string, any>>(
  items: T[],
  initialConfig: SortConfig<T>
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(initialConfig);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    
    const sortableItems = [...items];
    sortableItems.sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key as string);
      const bValue = getNestedValue(b, sortConfig.key as string);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // Generic comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      } 
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      
      return 0;
    });
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: keyof T | string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { sortedItems, requestSort, sortConfig };
};
