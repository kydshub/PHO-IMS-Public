import React, { useState, useMemo, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { Input } from './Input';
import { User, Role, UserStatus, Facility } from '../../types';
import { downloadStringAsFile } from '../../utils/download';
import { sampleUsersCsv } from '../../data/sampleCsvData';

interface UserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: (Omit<User, 'uid' | 'status'> & { password?: string })[]) => void;
  facilities: Facility[];
}

const REQUIRED_HEADERS = ['name', 'email', 'password', 'role', 'facilityName'];

interface ParsedItem {
    data: (Omit<User, 'uid' | 'status'> & { password?: string });
    rowIndex: number;
    errors: string[];
}

const UserImportModal: React.FC<UserImportModalProps> = ({ isOpen, onClose, onImport, facilities }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const facilityMap = useMemo(() => new Map(facilities.map(f => [f.name.toLowerCase(), f.id])), [facilities]);

    const resetState = useCallback(() => {
        setFile(null);
        setParsedData([]);
        setIsLoading(false);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseAndValidateCsv(selectedFile);
        }
    };

    const parseAndValidateCsv = (csvFile: File) => {
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                setParsedData([{ rowIndex: 0, errors: ['CSV file is empty or has no data rows.'], data: {} as any }]);
                setIsLoading(false);
                return;
            }

            const header = lines[0].split(',').map(h => h.trim());
            const missingHeaders = REQUIRED_HEADERS.filter(rh => !header.includes(rh));
            if (missingHeaders.length > 0) {
                 setParsedData([{ rowIndex: 0, errors: [`Missing required columns: ${missingHeaders.join(', ')}`], data: {} as any }]);
                 setIsLoading(false);
                 return;
            }

            const results: ParsedItem[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const rowData: any = {};
                header.forEach((h, index) => {
                    rowData[h] = values[index] || '';
                });

                const errors: string[] = [];
                // Validation logic
                REQUIRED_HEADERS.forEach(h => {
                    if (!rowData[h]) errors.push(`"${h}" is required.`);
                });
                
                if (rowData.password && rowData.password.length < 6) {
                    errors.push('Password must be at least 6 characters.');
                }
                
                const facilityId = facilityMap.get(rowData.facilityName?.toLowerCase());
                if (rowData.facilityName && !facilityId) errors.push(`Facility "${rowData.facilityName}" not found.`);

                if (rowData.role && !Object.values(Role).includes(rowData.role as Role)) {
                    errors.push(`Invalid role "${rowData.role}". Must be one of: ${Object.values(Role).join(', ')}`);
                }

                const finalItemData: (Omit<User, 'uid' | 'status'> & { password?: string }) = {
                    name: rowData.name || '',
                    email: rowData.email || '',
                    password: rowData.password || '',
                    position: rowData.position || '',
                    role: rowData.role as Role,
                    facilityId: facilityId || '',
                };

                results.push({
                    rowIndex: i + 1,
                    data: finalItemData,
                    errors: errors,
                });
            }
            setParsedData(results);
            setIsLoading(false);
        };
        reader.readAsText(csvFile);
    };

    const handleImportClick = () => {
        const validItems = parsedData.filter(p => p.errors.length === 0).map(p => p.data);
        onImport(validItems);
    };

    const validRowCount = parsedData.filter(p => p.errors.length === 0).length;
    const errorRowCount = parsedData.length - validRowCount;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => { onClose(); resetState(); }} 
            title="Import Users from CSV"
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => { onClose(); resetState(); }}>Cancel</Button>
                    <Button onClick={handleImportClick} disabled={isLoading || validRowCount === 0}>
                        {isLoading ? <Spinner size="sm" /> : `Import ${validRowCount} Valid Users`}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {!file && (
                    <>
                        <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-md">
                            <h4 className="font-semibold text-secondary-800">CSV Format Instructions</h4>
                            <p className="text-sm text-secondary-600 mt-1">
                                Your CSV file must contain a header row. Bold columns are required.
                            </p>
                            <p className="text-xs text-secondary-500 mt-1">Required: <strong>{REQUIRED_HEADERS.join(', ')}</strong></p>
                            <p className="text-xs text-secondary-500">Optional: position</p>
                             <a 
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    downloadStringAsFile(sampleUsersCsv, 'sample-users.csv', 'text/csv;charset=utf-8;');
                                }}
                                className="inline-block mt-3 text-sm font-semibold text-primary-600 hover:text-primary-800 underline"
                             >
                                Download Sample CSV File
                            </a>
                        </div>
                        <Input type="file" accept=".csv" onChange={handleFileChange} />
                    </>
                )}

                {isLoading && (
                    <div className="text-center p-8">
                        <Spinner />
                        <p className="mt-2 text-secondary-600">Parsing and validating file...</p>
                    </div>
                )}
                
                {file && !isLoading && (
                    <>
                        <div className={`p-4 rounded-md ${errorRowCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border`}>
                            <h4 className={`font-semibold ${errorRowCount > 0 ? 'text-red-800' : 'text-green-800'}`}>Validation Complete</h4>
                            <p className={`text-sm ${errorRowCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                Found {validRowCount} valid users and {errorRowCount} items with errors.
                            </p>
                        </div>

                        <div className="text-sm max-h-60 overflow-auto border rounded-md">
                             <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-1 text-left text-xs font-medium text-secondary-500 uppercase">Row</th>
                                        <th className="px-2 py-1 text-left text-xs font-medium text-secondary-500 uppercase">Name</th>
                                        <th className="px-2 py-1 text-left text-xs font-medium text-secondary-500 uppercase">Errors</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {parsedData.map(item => (
                                        <tr key={item.rowIndex} className={item.errors.length > 0 ? 'bg-red-50' : ''}>
                                            <td className="px-2 py-1 whitespace-nowrap">{item.rowIndex}</td>
                                            <td className="px-2 py-1 whitespace-nowrap">{item.data.name || '(No Name)'}</td>
                                            <td className="px-2 py-1 text-red-600 font-medium">
                                                {item.errors.join(', ')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default UserImportModal;
