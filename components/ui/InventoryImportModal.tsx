import React, { useState, useMemo, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { Input } from './Input';
import { InventoryItem, ItemMaster, ItemType, StorageLocation, Facility, Supplier, Program, FundSource } from '../../types';
import { downloadStringAsFile } from '../../utils/download';
import { sampleCommoditiesCsv } from '../../data/sampleCsvData';

interface InventoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Omit<InventoryItem, 'id'>[]) => void;
  itemMasters: ItemMaster[];
  storageLocations: StorageLocation[];
  facilities: Facility[];
  suppliers: Supplier[];
  programs: Program[];
  fundSources: FundSource[];
}

const REQUIRED_HEADERS = ['itemMasterName', 'quantity', 'expiryDate', 'batchNumber', 'facilityName', 'storageLocationName', 'supplierName'];

interface ParsedItem {
    data: Omit<InventoryItem, 'id'>;
    rowIndex: number;
    errors: string[];
}

const InventoryImportModal: React.FC<InventoryImportModalProps> = ({ isOpen, onClose, onImport, itemMasters, storageLocations, facilities, suppliers, programs, fundSources }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const itemMasterMap = useMemo(() => new Map(itemMasters.filter(im => im.itemType === ItemType.Consumable || im.itemType === ItemType.Equipment).map(im => [im.name.toLowerCase(), im.id])), [itemMasters]);
    const storageLocationMap = useMemo(() => {
        const map = new Map<string, string>();
        storageLocations.forEach(sl => {
            const facility = facilities.find(f => f.id === sl.facilityId);
            if (facility) {
                map.set(`${facility.name.toLowerCase()}|${sl.name.toLowerCase()}`, sl.id);
            }
        });
        return map;
    }, [storageLocations, facilities]);
    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.name.toLowerCase(), s.id])), [suppliers]);
    const programMap = useMemo(() => new Map(programs.map(p => [p.name.toLowerCase(), p.id])), [programs]);
    const fundSourceMap = useMemo(() => new Map(fundSources.map(fs => [fs.name.toLowerCase(), fs.id])), [fundSources]);

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
                
                // Validation logic
                REQUIRED_HEADERS.forEach(h => {
                    if (!rowData[h]) errors.push(`"${h}" is required.`);
                });
                
                const itemMasterId = itemMasterMap.get(rowData.itemMasterName?.toLowerCase());
                if (rowData.itemMasterName && !itemMasterId) errors.push(`Item Master "${rowData.itemMasterName}" not found or is not a Consumable/Equipment.`);
                
                const itemMaster = itemMasters.find(im => im.id === itemMasterId);

                const storageLocationId = storageLocationMap.get(`${rowData.facilityName?.toLowerCase()}|${rowData.storageLocationName?.toLowerCase()}`);
                if (rowData.facilityName && rowData.storageLocationName && !storageLocationId) errors.push(`Location "${rowData.storageLocationName}" in Facility "${rowData.facilityName}" not found.`);

                const supplierId = supplierMap.get(rowData.supplierName?.toLowerCase());
                if (rowData.supplierName && !supplierId) errors.push(`Supplier "${rowData.supplierName}" not found.`);
                
                let programId;
                if (rowData.programName) {
                    programId = programMap.get(rowData.programName.toLowerCase());
                    if (!programId) errors.push(`Program "${rowData.programName}" not found.`);
                }

                let fundSourceId;
                if (rowData.fundSourceName) {
                    fundSourceId = fundSourceMap.get(rowData.fundSourceName.toLowerCase());
                    if (!fundSourceId) {
                        errors.push(`Fund Source "${rowData.fundSourceName}" not found.`);
                    }
                }
                
                const quantity = parseInt(rowData.quantity, 10);
                if (isNaN(quantity) || quantity < 0) errors.push('Invalid "quantity". Must be a non-negative integer.');

                const expiryDate = new Date(rowData.expiryDate);
                if (isNaN(expiryDate.getTime())) errors.push('Invalid "expiryDate". Use YYYY-MM-DD format.');

                const finalItemData: Omit<InventoryItem, 'id'> = {
                    itemMasterId: itemMasterId || '',
                    quantity: isNaN(quantity) ? 0 : quantity,
                    purchaseCost: itemMaster?.unitCost ?? 0,
                    expiryDate: !isNaN(expiryDate.getTime()) ? expiryDate.toISOString() : '',
                    batchNumber: rowData.batchNumber || '',
                    storageLocationId: storageLocationId || '',
                    supplierId: supplierId || '',
                    programId: programId || undefined,
                    purchaseOrder: rowData.purchaseOrder || '',
                    fundSourceId: fundSourceId || undefined,
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
            title={`Import Commodities from CSV`}
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
                            <p className="text-sm text-secondary-600 mt-1">
                                Your CSV file must contain a header row. Bold columns are required.
                            </p>
                            <p className="text-xs text-secondary-500 mt-1">Required: <strong>{REQUIRED_HEADERS.join(', ')}</strong></p>
                            <p className="text-xs text-secondary-500">Optional: programName, purchaseOrder, fundSourceName</p>
                             <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  downloadStringAsFile(sampleCommoditiesCsv, 'sample-commodities.csv', 'text/csv;charset=utf-8;');
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
                                            <td className="px-2 py-1 whitespace-nowrap">{item.data.itemMasterId || '(No Name)'}</td>
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

export default InventoryImportModal;