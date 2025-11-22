import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { InventoryItem, ItemMaster, Program, Supplier, FundSource } from '../types';
import { useConfirmation } from '../hooks/useConfirmation';
import { formatCurrency } from '../utils/formatters';

interface EditStockItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: InventoryItem) => void;
    item: InventoryItem;
    programs: Program[];
    suppliers: Supplier[];
    itemMasters: ItemMaster[];
    fundSources: FundSource[];
}

const EditStockItemModal: React.FC<EditStockItemModalProps> = ({
    isOpen,
    onClose,
    onSave,
    item,
    programs,
    suppliers,
    itemMasters,
    fundSources
}) => {
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [noExpiry, setNoExpiry] = useState(false);
    const confirm = useConfirmation();
    
    const itemMaster = itemMasters.find(im => im.id === item.itemMasterId);

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...item });
            setNoExpiry(!item.expiryDate);
        }
    }, [isOpen, item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
        if (!noExpiry && !formData.expiryDate) {
            alert('Please provide an expiry date or check "No Expiry Date".');
            return;
        }

        if (formData.purchaseCost === undefined || Number(formData.purchaseCost) < 0) {
            alert('Please provide a valid, non-negative purchase cost.');
            return;
        }

        const changes: string[] = [];
        const newPurchaseCost = Number(formData.purchaseCost);

        if (item.batchNumber !== formData.batchNumber) changes.push(`Batch #: ${item.batchNumber} → ${formData.batchNumber}`);
        if (item.expiryDate !== formData.expiryDate) changes.push(`Expiry: ${item.expiryDate || 'N/A'} → ${formData.expiryDate || 'N/A'}`);
        if (item.purchaseCost !== newPurchaseCost) changes.push(`Purchase Cost: ${formatCurrency(item.purchaseCost)} → ${formatCurrency(newPurchaseCost)}`);
        if (item.supplierId !== formData.supplierId) changes.push(`Supplier changed`);
        if (item.programId !== formData.programId) changes.push(`Program changed`);
        if (item.fundSourceId !== formData.fundSourceId) changes.push(`Fund Source changed`);
        if ((item.purchaseOrder || '') !== (formData.purchaseOrder || '')) changes.push(`PO #: ${item.purchaseOrder || 'N/A'} → ${formData.purchaseOrder || 'N/A'}`);
        if ((item.icsNumber || '') !== (formData.icsNumber || '')) changes.push(`ICS #: ${item.icsNumber || 'N/A'} → ${formData.icsNumber || 'N/A'}`);


        if (changes.length === 0) {
            onClose();
            return;
        }

        const isConfirmed = await confirm({
            title: "Confirm Stock Item Update",
            message: (
                <div>
                    <p className="mb-4">You are about to update the following details for <strong>{itemMaster?.name}</strong>:</p>
                    <ul className="list-disc list-inside bg-secondary-50 p-3 rounded-md text-sm">
                        {changes.map((change, index) => <li key={index}>{change}</li>)}
                    </ul>
                </div>
            ),
            confirmText: "Save Changes",
        });

        if (isConfirmed) {
            const dataToSave = {
                ...formData,
                purchaseCost: newPurchaseCost,
            };
            onSave(dataToSave as InventoryItem);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Edit Stock: ${itemMaster?.name || ''}`}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">Save Changes</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-secondary-50 rounded-md">
                    <p className="font-semibold text-secondary-800">{itemMaster?.name}</p>
                    <p className="text-sm text-secondary-600">Brand: {itemMaster?.brand || 'N/A'}</p>
                    <p className="text-sm text-secondary-600">Current Quantity: <span className="font-bold">{item.quantity}</span> {itemMaster?.unit}</p>
                    <p className="text-xs text-secondary-500 mt-2">Note: Quantity cannot be edited here. Use the physical count or adjustment features for quantity changes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Input
                            label="Expiry Date"
                            name="expiryDate"
                            type="date"
                            value={formData.expiryDate ? new Date(formData.expiryDate).toISOString().split('T')[0] : ''}
                            onChange={handleChange}
                            required={!noExpiry}
                            disabled={noExpiry}
                        />
                        <div className="flex items-center mt-2">
                            <input id="no-expiry-edit" type="checkbox" checked={noExpiry} onChange={handleNoExpiryChange} className="h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500" />
                            <label htmlFor="no-expiry-edit" className="ml-2 block text-sm text-secondary-900">No Expiry Date</label>
                        </div>
                    </div>
                     <Input
                        label="Batch Number"
                        name="batchNumber"
                        type="text"
                        value={formData.batchNumber || ''}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Purchase Cost (PHP)"
                        name="purchaseCost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.purchaseCost ?? ''}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="PO Number (Optional)"
                        name="purchaseOrder"
                        value={formData.purchaseOrder || ''}
                        onChange={handleChange}
                    />
                    <Input
                        label="ICS Number (Optional)"
                        name="icsNumber"
                        value={formData.icsNumber || ''}
                        onChange={handleChange}
                    />
                </div>

                <Select
                    label="Program (Optional)"
                    name="programId"
                    value={formData.programId || ''}
                    onChange={handleChange}
                >
                    <option value="">None</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>

                <Select
                    label="Supplier"
                    name="supplierId"
                    value={formData.supplierId || ''}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select a supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>

                <Select
                    label="Fund Source (Optional)"
                    name="fundSourceId"
                    value={formData.fundSourceId || ''}
                    onChange={handleChange}
                >
                    <option value="">None</option>
                    {fundSources.map(fs => <option key={fs.id} value={fs.id}>{fs.name}</option>)}
                </Select>

            </form>
        </Modal>
    );
};

export default EditStockItemModal;