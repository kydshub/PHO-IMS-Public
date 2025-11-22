import React, { useState, useMemo, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { Input } from './Input';
import { ServiceProvider, ServiceProviderStatus, ServiceType } from '../../types';
import { downloadStringAsFile } from '../../utils/download';
import { sampleServiceProvidersCsv } from '../../data/sampleCsvData';

interface ServiceProviderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Omit<ServiceProvider, 'id'>[]) => void;
}

const REQUIRED_HEADERS = ['name', 'serviceType'];

interface ParsedItem {
    data: Omit<ServiceProvider, 'id'>;
    rowIndex: number;
    errors: string[];
}

const ServiceProviderImportModal: React.FC<ServiceProviderImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
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
                const values = lines[i].split(',');
                const rowData: any = {};
                header.forEach((h, index) => {
                    rowData[h] = values[index]?.trim() || '';
                });

                const errors: string[] = [];
                if (!rowData.name) errors.push('"name" is required.');
                if (!rowData.serviceType) errors.push('"serviceType" is required.');
                if (rowData.serviceType && !Object.values(ServiceType).includes(rowData.serviceType as ServiceType)) {
                    errors.push(`Invalid serviceType "${rowData.serviceType}".`);
                }

                
                const finalItemData: Omit<ServiceProvider, 'id'> = { 
                    name: rowData.name || '',
                    serviceType: rowData.serviceType as ServiceType,
                    contactPerson: rowData.contactPerson || '',
                    email: rowData.email || '',
                    phone: rowData.phone || '',
                    status: ServiceProviderStatus.Active
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
            title="Import Service Providers from CSV"
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => { onClose(); resetState(); }}>Cancel</Button>
                    <Button onClick={handleImportClick} disabled={isLoading || validRowCount === 0}>
                        {isLoading ? <Spinner size="sm" /> : `Import ${validRowCount} Valid Items`}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {!file && (
                    <>
                        <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-md">
                            <h4 className="font-semibold text-secondary-800">CSV Format Instructions</h4>
                             <p className="text-sm text-secondary-600 mt-1">Your CSV file must contain a header row with the following columns. Bold columns are required.</p>
                            <ul className="list-disc list-inside text-sm mt-2 text-secondary-600">
                                <li><strong>name</strong></li>
                                <li><strong>serviceType</strong></li>
                                <li>contactPerson</li>
                                <li>email</li>
                                <li>phone</li>
                            </ul>
                            <p className="text-sm text-secondary-600 mt-1">All imported providers will be set to 'Active' status by default.</p>
                            <p className="text-xs text-secondary-500 mt-1">Valid service types: {Object.values(ServiceType).join(', ')}</p>
                             <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  downloadStringAsFile(sampleServiceProvidersCsv, 'sample-service-providers.csv', 'text/csv;charset=utf-8;');
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
                                Found {validRowCount} valid items and {errorRowCount} items with errors.
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

export default ServiceProviderImportModal;
