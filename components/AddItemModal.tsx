import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { ItemMaster, Supplier, Program, Facility, StorageLocation, FacilityStatus, Role, FundSource } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useConfirmation } from '../hooks/useConfirmation';
import { buildIndentedLocationOptions } from '../utils/locationHelpers';
import SearchableSelect from './ui/SearchableSelect';
import { formatCurrency } from '../utils/formatters';

export interface NewItemData {
    itemMasterId: string;
    quantity: number;
    unitCost: number;
    expiryDate: string;
    batchNumber: string;
    supplierId: string;
    facilityId: string;
    storageLocationId: string;
    programId?: string;
    purchaseOrder?: string;
    fundSourceId?: string;
    icsNumber?: string;
}

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newItem: NewItemData) => void;
    itemMasters: ItemMaster[];
    suppliers: Supplier[];
    programs: Program[];
    facilities: Facility[];
    storageLocations: StorageLocation[];
    fundSources: FundSource[];
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onSave, itemMasters, suppliers, programs, facilities, storageLocations, fundSources }) => {
    const { user } = useAuth();
    const confirm = useConfirmation();
    const isEncoder = user?.role === Role.Encoder;

    const [formData, setFormData] = useState<Partial<NewItemData>>({});
    const [facilityId, setFacilityId] = useState(isEncoder ? user?.facilityId || '' : '');
    const [noExpiry, setNoExpiry] = useState(false);

    const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
    
    const itemMasterOptions = useMemo(() => {
        return itemMasters.map(im => ({
            value: im.id,
            label: im.name,
            brand: im.brand || 'N/A',
            unit: im.unit,
        }));
    }, [itemMasters]);

    const availableStorageLocationOptions = useMemo(() => {
        if (!facilityId) return [];
        const locationsForFacility = storageLocations.filter(sl => sl.facilityId === facilityId);
        return buildIndentedLocationOptions(locationsForFacility);
    }, [facilityId, storageLocations]);

    useEffect(() => {
        if (isOpen) {
            const encoderFacilityId = isEncoder ? user?.facilityId || '' : '';
            setFormData({
                itemMasterId: '',
                quantity: undefined,
                unitCost: undefined,
                expiryDate: '',
                batchNumber: '',
                supplierId: '',
                storageLocationId: '',
                programId: '',
                purchaseOrder: '',
                facilityId: encoderFacilityId,
                fundSourceId: '',
                icsNumber: '',
            });
            setFacilityId(encoderFacilityId);
            setNoExpiry(false);
        }
    }, [isOpen, isEncoder, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'quantity' || name === 'unitCost') {
            const num = parseFloat(value);
            // This logic ensures that empty strings become `undefined` for validation,
            // "0" becomes the number 0, and invalid text like "abc" also becomes `undefined`.
            setFormData(prev => ({ ...prev, [name]: (value === '' || Number.isNaN(num)) ? undefined : num }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleItemSelect = (value: string | null) => {
        const selectedMaster = itemMasters.find(im => im.id === value);
        setFormData(prev => ({
            ...prev,
            itemMasterId: value || '',
            unitCost: selectedMaster?.unitCost ?? 0,
        }));
    };

    const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newFacilityId = e.target.value;
        setFacilityId(newFacilityId);
        setFormData(prev => ({ ...prev, facilityId: newFacilityId, storageLocationId: '' }));
    };
    
    const handleNoExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setNoExpiry(isChecked);
        if (isChecked) {
            setFormData(prev => ({ ...prev, expiryDate: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { itemMasterId, quantity, unitCost, expiryDate, batchNumber, storageLocationId, supplierId } = formData;
        if (!itemMasterId || quantity === undefined || quantity < 0 || unitCost === undefined || unitCost < 0 || (!noExpiry && !expiryDate) || !batchNumber || !storageLocationId || !supplierId || !facilityId) {
            alert('Please fill all required fields including a valid non-negative quantity and unit cost.');
            return;
        }

        const itemMaster = itemMasters.find(im => im.id === itemMasterId);
        const supplier = suppliers.find(s => s.id === supplierId);
        const facility = facilities.find(f => f.id === facilityId);
        const location = storageLocations.find(sl => sl.id === storageLocationId);
        const fundSource = fundSources.find(fs => fs.id === formData.fundSourceId);

        const isConfirmed = await confirm({
            title: "Confirm New Stock",
            message: (
                <div>
                    <p className="mb-4">Please review the new stock item details before adding it to the inventory.</p>
                    <div className="bg-secondary-50 p-3 rounded-md space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-secondary-600">Item:</span><span className="font-medium text-secondary-900 text-right">{itemMaster?.name}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Quantity:</span><span className="font-medium text-secondary-900">{quantity} {itemMaster?.unit}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Unit Cost:</span><span className="font-medium text-secondary-900">{formatCurrency(unitCost)}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Batch #:</span><span className="font-medium text-secondary-900">{batchNumber}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Expiry:</span><span className="font-medium text-secondary-900">{noExpiry ? 'N/A' : expiryDate}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Supplier:</span><span className="font-medium text-secondary-900">{supplier?.name}</span></div>
                        <div className="flex justify-between"><span className="text-secondary-600">Fund Source:</span><span className="font-medium text-secondary-900">{fundSource?.name || 'N/A'}</span></div>
                        {formData.icsNumber && <div className="flex justify-between"><span className="text-secondary-600">ICS #:</span><span className="font-medium text-secondary-900">{formData.icsNumber}</span></div>}
                        <div className="flex justify-between"><span className="text-secondary-600">Location:</span><span className="font-medium text-secondary-900 text-right">{facility?.name} / {location?.name}</span></div>
                    </div>
                </div>
            ),
            confirmText: "Add to Inventory",
        });

        if (!isConfirmed) return;
        
        onSave(formData as NewItemData);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Add New Stock Item"
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">Add to Inventory</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <SearchableSelect
                    label="Item Name"
                    options={itemMasterOptions}
                    value={formData.itemMasterId || null}
                    onChange={handleItemSelect}
                    placeholder="Search for an item..."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Quantity"
                        name="quantity"
                        type="number"
                        min="0"
                        value={formData.quantity ?? ''}
                        onChange={handleChange}
                        required
                    />
                     <Input
                        label="Unit Cost"
                        name="unitCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.unitCost ?? ''}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Batch Number"
                        name="batchNumber"
                        type="text"
                        value={formData.batchNumber || ''}
                        onChange={handleChange}
                        required
                    />
                </div>
                
                <div>
                    <Input
                        label="Expiry Date"
                        name="expiryDate"
                        type="date"
                        value={formData.expiryDate || ''}
                        onChange={handleChange}
                        required={!noExpiry}
                        disabled={noExpiry}
                    />
                     <div className="flex items-center mt-2">
                        <input id="no-expiry" type="checkbox" checked={noExpiry} onChange={handleNoExpiryChange} className="h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500" />
                        <label htmlFor="no-expiry" className="ml-2 block text-sm text-secondary-900">No Expiry Date</label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="Facility" value={facilityId} onChange={handleFacilityChange} required disabled={isEncoder}>
                        {!isEncoder && <option value="">Select facility...</option>}
                        {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                    <Select label="Storage Location" name="storageLocationId" value={formData.storageLocationId || ''} onChange={handleChange} disabled={!facilityId} required>
                        <option value="">Select location...</option>
                        {availableStorageLocationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select>
                </div>
                 <Select label="Supplier" name="supplierId" value={formData.supplierId || ''} onChange={handleChange} required>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Purchase Order (Optional)" name="purchaseOrder" value={formData.purchaseOrder || ''} onChange={handleChange} />
                    <Input label="ICS Number (Optional)" name="icsNumber" value={formData.icsNumber || ''} onChange={handleChange} />
                 </div>
                 <Select label="Program (Optional)" name="programId" value={formData.programId || ''} onChange={handleChange}>
                    <option value="">None</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <Select label="Fund Source (Optional)" name="fundSourceId" value={formData.fundSourceId || ''} onChange={handleChange}>
                    <option value="">None</option>
                    {fundSources.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
            </form>
        </Modal>
    );
};

export default AddItemModal;