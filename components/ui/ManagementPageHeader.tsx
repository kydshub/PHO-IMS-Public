
import React from 'react';
import { Button } from './Button';

const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

interface ManagementPageHeaderProps {
    title: string;
    onPrint: () => void;
    onExport?: () => void;
    onImport?: () => void;
    onAddNew?: () => void;
    addNewText?: string;
}

export const ManagementPageHeader: React.FC<ManagementPageHeaderProps> = ({ title, onPrint, onExport, onImport, onAddNew, addNewText }) => {
    return (
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h2 className="text-3xl font-semibold text-secondary-800">{title}</h2>
            <div className="flex gap-2 flex-wrap">
                <Button onClick={onPrint} leftIcon={<PrintIcon />} variant="secondary">Print</Button>
                {onExport && <Button onClick={onExport} leftIcon={<DownloadIcon />} variant="secondary">Export CSV</Button>}
                {onImport && <Button onClick={onImport} leftIcon={<UploadIcon />} variant="secondary">Import CSV</Button>}
                {onAddNew && addNewText && <Button onClick={onAddNew} leftIcon={<PlusIcon />} className="w-full md:w-auto">{addNewText}</Button>}
            </div>
        </div>
    );
};
