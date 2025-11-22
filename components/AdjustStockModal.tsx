import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { InventoryItem, ItemMaster, AdjustmentReason } from '../types';
import { useConfirmation } from '../hooks/useConfirmation';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (inventoryItemId: string, newQuantity: number, reason: AdjustmentReason, notes: string) => void;
  item: InventoryItem & { master?: ItemMaster };
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [newQuantity, setNewQuantity] = useState<string>('');
    const [reason, setReason] = useState<AdjustmentReason | ''>('');
    const [notes, setNotes] = useState('');
    const confirm = useConfirmation();

    useEffect(() => {
        if (isOpen) {
            setNewQuantity(String(item.quantity));
            setReason('');
            setNotes('');
        }
    }, [isOpen, item]);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const numNewQuantity = parseInt(newQuantity, 10);
        if (!reason || isNaN(numNewQuantity) || numNewQuantity < 0) {
            alert('Please provide a new quantity and a reason for the adjustment.');
            return;
        }

        const change = numNewQuantity - item.quantity;
        if (change === 0) {
            onClose();
            return;
        }

        const isConfirmed = await confirm({
            title: "Confirm Stock Adjustment",
            message: (
                <div>
                    <p>You are about to adjust the stock for <strong>{item.master?.name}</strong> (Batch: {item.batchNumber}).</p>
                    <ul className="list-disc list-inside bg-secondary-50 p-3 my-3 rounded-md text-sm">
                        <li>From: <strong>{item.quantity}</strong></li>
                        <li>To: <strong>{numNewQuantity}</strong></li>
                        <li className={`font-bold ${change > 0 ? 'text-green-700' : 'text-red-700'}`}>
                            Change: {change > 0 ? '+' : ''}{change}
                        </li>
                        <li>Reason: <strong>{reason}</strong></li>
                    </ul>
                    <p className="font-semibold">This action cannot be undone. Are you sure you want to proceed?</p>
                </div>
            ),
            confirmText: "Confirm Adjustment",
            variant: "danger"
        });

        if (isConfirmed) {
            onSave(item.id, numNewQuantity, reason, notes);
        }
    };

    const quantityChange = (parseInt(newQuantity, 10) || 0) - item.quantity;
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Adjust Stock Quantity"
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} type="submit">Confirm Adjustment</Button>
                </div>
            }
        >
            <form onSubmit={handleSave} className="space-y-4">
                <div className="p-3 bg-secondary-50 rounded-md">
                    <p className="font-semibold text-secondary-800">{item.master?.name}</p>
                    <p className="text-sm text-secondary-600">Batch: {item.batchNumber}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 items-end">
                    <Input label="Current Quantity" value={item.quantity} readOnly disabled />
                    <Input label="New Quantity" type="number" min="0" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} required autoFocus />
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Change</label>
                        <p className={`p-2 rounded-md font-bold text-center ${quantityChange === 0 ? 'bg-secondary-100' : quantityChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {quantityChange > 0 ? '+' : ''}{quantityChange}
                        </p>
                    </div>
                </div>

                <Select label="Reason for Adjustment" value={reason} onChange={e => setReason(e.target.value as AdjustmentReason)} required>
                    <option value="">Select a reason...</option>
                    {Object.values(AdjustmentReason).map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </Select>
                
                <Textarea
                    label="Notes (Optional)"
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Provide additional details if necessary"
                />
            </form>
        </Modal>
    );
};
