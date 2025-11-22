import React, { useState, useMemo, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { Input } from './ui/Input';
import { AssetItem, AssetStatus, Facility, ItemMaster, ItemType, StorageLocation, FundSource } from '../../types';
import { downloadStringAsFile } from '../../utils/download';
import { sampleAssetsCsv } from '../../data/sampleCsvData';

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Omit<AssetItem, 'id'>[]) => void;
  itemMasters: ItemMaster[];
  storageLocations: StorageLocation[];
  facilities: Facility[];
  fundSources: FundSource[];
  assetItems: AssetItem[];
}

const REQUIRED_HEADERS = ['propertyNumber', 'itemMasterName', 'purchaseDate', 'acquisitionPrice', 'facilityName', 'storageLocationName'];

interface ParsedItem {
    data: Omit<AssetItem, 'id'>;
    rowIndex: number;
    errors: string[];
}

const AssetImportModal: React.FC<AssetImportModalProps> = ({ isOpen, onClose, onImport, itemMasters, storageLocations, facilities, fundSources, assetItems }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const itemMasterMap = useMemo(() => new Map(itemMasters.filter(im => im.itemType === ItemType.Asset).map(im => [im.name.toLowerCase(), im.id])), [itemMasters]);
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
            const propertyNumbersInCsv = new Set<string>();
            const existingPropertyNumbers = new Set(assetItems.map(item => item.propertyNumber.trim().toLowerCase()));

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const rowData: any = {};
                header.forEach((h, index) => {
                    rowData[h] = values[index]?.trim() || '';
                });

                const errors: string[] = [];
                // Validation logic
                if (!rowData.propertyNumber) {
                    errors.push('"propertyNumber" is required.');
                } else {
                    const currentPropNum = rowData.propertyNumber.trim().toLowerCase();
                    if (propertyNumbersInCsv.has(currentPropNum)) {
                        errors.push(`Duplicate "propertyNumber" found in the CSV file.`);
                    }
                    if (existingPropertyNumbers.has(currentPropNum)) {
                        errors.push(`"propertyNumber" already exists in the system.`);
                    }
                    propertyNumbersInCsv.add(currentPropNum);
                }
                
                if (!rowData.itemMasterName) errors.push('"itemMasterName" is required.');
                if (!rowData.purchaseDate) errors.push('"purchaseDate" is required.');
                if (!rowData.acquisitionPrice) errors.push('"acquisitionPrice" is required.');
                if (!rowData.facilityName) errors.push('"facilityName" is required.');
                if (!rowData.storageLocationName) errors.push('"storageLocationName" is required.');
                
                const itemMasterId = itemMasterMap.get(rowData.itemMasterName?.toLowerCase());
                if (rowData.itemMasterName && !itemMasterId) errors.push(`Item Master "${rowData.itemMasterName}" not found or is not an Asset type.`);
                
                const storageLocationId = storageLocationMap.get(`${rowData.facilityName?.toLowerCase()}|${rowData.storageLocationName?.toLowerCase()}`);
                if (rowData.facilityName && rowData.storageLocationName && !storageLocationId) errors.push(`Storage Location "${rowData.storageLocationName}" in Facility "${rowData.facilityName}" not found.`);

                if (rowData.status && !Object.values(AssetStatus).includes(rowData.status as AssetStatus)) {
                    errors.push(`Invalid status "${rowData.status}".`);
                }

                const acquisitionPrice = parseFloat(rowData.acquisitionPrice);
                if (isNaN(acquisitionPrice) || acquisitionPrice <= 0) errors.push('Invalid "acquisitionPrice".');
                
                let fundSourceId;
                if (rowData.fundSourceName) {
                    fundSourceId = fundSourceMap.get(rowData.fundSourceName.toLowerCase());
                    if (!fundSourceId) {
                        errors.push(`Fund Source "${rowData.fundSourceName}" not found.`);
                    }
                }

                const finalItemData: Omit<AssetItem, 'id'> = {
                    itemMasterId: itemMasterId || '',
                    propertyNumber: rowData.propertyNumber || '',
                    serialNumber: rowData.serialNumber || '',
                    purchaseDate: new Date(rowData.purchaseDate).toISOString(),
                    acquisitionPrice: isNaN(acquisitionPrice) ? 0 : acquisitionPrice,
                    warrantyEndDate: rowData.warrantyEndDate ? new Date(rowData.warrantyEndDate).toISOString() : '',
                    status: (rowData.status as AssetStatus) || AssetStatus.InStock,
                    assignedTo: rowData.assignedTo || '',
                    propertyCustodian: rowData.propertyCustodian || '',
                    condition: rowData.condition || '',
                    storageLocationId: storageLocationId || '',
                    notes: rowData.notes || '',
                    fundSourceId: fundSourceId || '',
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
            title="Import Assets from CSV"
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={() => { onClose(); resetState(); }}>Cancel</Button>
                    <Button onClick={handleImportClick} disabled={isLoading || validRowCount === 0}>
                        {isLoading ? <Spinner size="sm" /> : `Import ${validRowCount} Valid Assets`}
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
                            <p className="text-xs text-secondary-500">Optional: serialNumber, warrantyEndDate, status, assignedTo, propertyCustodian, condition, notes, fundSourceName</p>
                             <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  downloadStringAsFile(sampleAssetsCsv, 'sample-assets.csv', 'text/csv;charset=utf-8;');
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
                                Found {validRowCount} valid assets and {errorRowCount} items with errors.
                            </p>
                        </div>

                        <div className="text-sm max-h-60 overflow-auto border rounded-md">
                             <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-1 text-left text-xs font-medium text-secondary-500 uppercase">Row</th>
                                        <th className="px-2 py-1 text-left text-xs font-medium text-secondary-500 uppercase">Property #</th>
                                        <th className="px-2 py-1 text-left text-xs font-medium text-secondary-500 uppercase">Errors</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {parsedData.map(item => (
                                        <tr key={item.rowIndex} className={item.errors.length > 0 ? 'bg-red-50' : ''}>
                                            <td className="px-2 py-1 whitespace-nowrap">{item.rowIndex}</td>
                                            <td className="px-2 py-1 whitespace-nowrap">{item.data.propertyNumber || '(No Number)'}</td>
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

export default AssetImportModal;
