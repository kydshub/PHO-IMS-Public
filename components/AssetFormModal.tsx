import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { AssetItem, ItemMaster, ItemType, StorageLocation, Facility, AssetStatus, User, FundSource, Role } from '../types';
import { buildIndentedLocationOptions } from '../utils/locationHelpers';
import { useConfirmation } from '../hooks/useConfirmation';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatters';

interface AssetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (assetItem: AssetItem) => void;
    assetItem: AssetItem | null;
    itemMasters: ItemMaster[];
    storageLocations: StorageLocation[];
    facilities: Facility[];
    fundSources: FundSource[];
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    assetItem,
    itemMasters,
    storageLocations,
    facilities,
    fundSources,
}) => {
    const { user } = useAuth();
    const isEncoder = user?.role === Role.Encoder;
    const [formData, setFormData] = useState<Partial<AssetItem>>({});
    const confirm = useConfirmation();
    
    const assetItemMasters = useMemo(() => itemMasters.filter(im => im.itemType === ItemType.Asset), [itemMasters]);
    
    const [selectedFacility, setSelectedFacility] = useState('');
    
    const availableStorageLocationOptions = useMemo(() => {
        if (!selectedFacility) return [];
        const locationsForFacility = storageLocations.filter(sl => sl.facilityId === selectedFacility);
        return buildIndentedLocationOptions(locationsForFacility);
    }, [selectedFacility, storageLocations]);


    useEffect(() => {
        if (isOpen) {
            const initialData = assetItem 
                ? { ...assetItem } 
                : {
                    itemMasterId: '',
                    propertyNumber: '',
                    serialNumber: '',
                    purchaseDate: new Date().toISOString().split('T')[0],
                    acquisitionPrice: 0,
                    warrantyEndDate: '',
                    status: AssetStatus.InStock,
                    assignedTo: '',
                    propertyCustodian: '',
                    condition: 'New',
                    storageLocationId: '',
                    notes: '',
                    fundSourceId: '',
                    usefulLife: undefined,
                    salvageValue: 0,
                  };
            setFormData(initialData);

            if (assetItem) {
                const sl = storageLocations.find(loc => loc.id === assetItem.storageLocationId);
                if (sl) {
                    setSelectedFacility(sl.facilityId);
                }
            } else if (isEncoder) {
                setSelectedFacility(user?.facilityId || '');
            } else {
                 setSelectedFacility('');
            }
        }
    }, [isOpen, assetItem, storageLocations, isEncoder, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        let processedValue: any = value;
        if (name === 'acquisitionPrice' || name === 'usefulLife' || name === 'salvageValue') {
            processedValue = value ? parseFloat(value) : '';
        }

        setFormData(prev => {
            const updatedData = { ...prev, [name]: processedValue };

            // When item master changes, pre-fill useful life
            if (name === 'itemMasterId') {
                const selectedMaster = assetItemMasters.find(im => im.id === value);
                updatedData.usefulLife = selectedMaster?.usefulLife;
            }

            return updatedData;
        });
    };

    const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedFacility(e.target.value);
        setFormData(prev => ({ ...prev, storageLocationId: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.itemMasterId || !formData.propertyNumber || !formData.purchaseDate || !formData.storageLocationId || !formData.acquisitionPrice || formData.acquisitionPrice <= 0) {
            alert('Please fill out all required fields: Item Name, Property Number, Purchase Date, Acquisition Price, and Storage Location.');
            return;
        }

        if ((formData.salvageValue || 0) > (formData.acquisitionPrice || 0)) {
            alert('Salvage Value cannot be greater than Acquisition Price.');
            return;
        }
        
        const itemMaster = itemMasters.find(im => im.id === formData.itemMasterId);
        
        const isConfirmed = await confirm({
            title: assetItem ? "Confirm Asset Update" : "Confirm New Asset",
            message: (
                <div>
                    <p className="mb-4">Please review the Asset details before saving.</p>
                     <div className="bg-secondary-50 p-3 rounded-md space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-secondary-600">Asset Type:</span><span className="font-medium text-secondary-900 text-right">{itemMaster?.name}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Property #:</span><span className="font-medium text-secondary-900">{formData.propertyNumber}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Status:</span><span className="font-medium text-secondary-900">{formData.status}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Price:</span><span className="font-medium text-secondary-900">{formatCurrency(formData.acquisitionPrice || 0)}</span></div>
                    </div>
                </div>
            ),
            confirmText: assetItem ? "Save Changes" : "Add Asset",
        });

        if (!isConfirmed) return;

        const dataToSave: AssetItem = {
            id: assetItem?.id || `asset-${Date.now()}`,
            ...formData,
            salvageValue: Number(formData.salvageValue || 0),
            usefulLife: Number(formData.usefulLife || 0) > 0 ? Number(formData.usefulLife) : undefined,
        } as AssetItem;

        onSave(dataToSave);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={assetItem ? 'Edit Asset' : 'Add New Asset'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{assetItem ? 'Save Changes' : 'Add Asset'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Item Name"
                    name="itemMasterId"
                    value={formData.itemMasterId}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select an asset type...</option>
                    {assetItemMasters.map(im => (
                        <option key={im.id} value={im.id}>{im.name}</option>
                    ))}
                </Select>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Property Number"
                        name="propertyNumber"
                        value={formData.propertyNumber}
                        onChange={handleChange}
                        required
                        placeholder="e.g., PHO-IT-001"
                    />
                     <Input
                        label="Serial Number (Optional)"
                        name="serialNumber"
                        value={formData.serialNumber}
                        onChange={handleChange}
                    />
                </div>
                
                 <Input
                    label="Property Custodian (Optional)"
                    name="propertyCustodian"
                    value={formData.propertyCustodian || ''}
                    onChange={handleChange}
                    placeholder="e.g., Juan Dela Cruz"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Facility"
                        value={selectedFacility}
                        onChange={handleFacilityChange}
                        required
                        disabled={isEncoder}
                    >
                        <option value="">Select a facility...</option>
                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                    <Select
                        label="Storage Location"
                        name="storageLocationId"
                        value={formData.storageLocationId}
                        onChange={handleChange}
                        disabled={!selectedFacility}
                        required
                    >
                        <option value="">Select a location...</option>
                         {availableStorageLocationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Purchase Date"
                        name="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Acquisition Price (PHP)"
                        name="acquisitionPrice"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.acquisitionPrice || ''}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Useful Life (Years)"
                        name="usefulLife"
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 5"
                        value={formData.usefulLife ?? ''}
                        onChange={handleChange}
                    />
                    <Input
                        label="Salvage Value (PHP)"
                        name="salvageValue"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.salvageValue ?? ''}
                        onChange={handleChange}
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Select
                        label="Status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                    >
                        {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                     <Input
                        label="Condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        placeholder="e.g., New, Good, Needs Repair"
                    />
                </div>

                 <Select label="Fund Source (Optional)" name="fundSourceId" value={formData.fundSourceId || ''} onChange={handleChange}>
                    <option value="">None</option>
                    {fundSources.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Warranty End Date (Optional)"
                        name="warrantyEndDate"
                        type="date"
                        value={formData.warrantyEndDate}
                        onChange={handleChange}
                    />
                    <Input
                        label="Assigned To (Optional)"
                        name="assignedTo"
                        value={formData.assignedTo}
                        onChange={handleChange}
                        placeholder="e.g., Dr. Smith, IT Department"
                    />
                </div>
               
                <Textarea
                    label="Notes (Optional)"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                />
            </form>
        </Modal>
    );
};

export default AssetFormModal;