import React, { useState } from 'react';
import { Button } from './Button';
import { Select } from './Select';
import { Input } from './Input';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  startItemIndex: number;
  endItemIndex: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startItemIndex,
  endItemIndex,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const [goToPage, setGoToPage] = useState('');

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(goToPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
    setGoToPage('');
  };

  return (
    <div className="flex items-center justify-between text-sm text-secondary-600 flex-wrap gap-4">
      <span className="flex-shrink-0">
        {totalItems > 0 ? `Showing ${startItemIndex + 1} - ${endItemIndex} of ${totalItems} results` : 'No results found'}
      </span>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="items-per-page" className="text-secondary-700">Rows:</label>
          <Select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onItemsPerPageChange(Number(e.target.value))}
            className="!w-20"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
            <form onSubmit={handleGoToPage} className="flex items-center gap-2">
                 <Input 
                    type="number"
                    value={goToPage}
                    onChange={e => setGoToPage(e.target.value)}
                    className="w-20 py-1"
                    placeholder="Page #"
                    min="1"
                    max={totalPages}
                 />
                 <Button type="submit" size="sm" variant="secondary">Go</Button>
            </form>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>&lt;</Button>
          <span>Page {currentPage} of {totalPages || 1}</span>
          <Button size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>&gt;</Button>
        </div>
      </div>
    </div>
  );
};
