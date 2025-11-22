import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { ItemMaster, InventoryItem } from '../../types';

type AugmentedInventoryItem = InventoryItem & {
    master?: ItemMaster;
};

interface PurgeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemToPurge: AugmentedInventoryItem | null;
}

export const PurgeConfirmationModal: React.FC<PurgeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemToPurge,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput(''); // Reset input when modal opens
    }
  }, [isOpen]);

  if (!itemToPurge || !itemToPurge.master) return null;

  const itemName = itemToPurge.master.name;
  const isConfirmed = confirmationInput === itemName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Permanent Deletion"
      footer={
        <div className="space-x-2">
            <Button variant="secondary" onClick={onClose}>
                Cancel
            </Button>
            <Button
                variant="danger"
                onClick={onConfirm}
                disabled={!isConfirmed}
            >
                Purge Item
            </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-bold text-lg text-red-700">Warning: This action is irreversible.</p>
        <p className="mt-2 text-sm text-secondary-600">You are about to permanently purge the following item from the inventory. This will delete the item record and cannot be undone. This action should only be used to correct significant data entry errors.</p>
        <div className="bg-red-50 p-3 mt-4 rounded-md border border-red-200 text-sm">
            <p><strong>Item:</strong> {itemName}</p>
            <p><strong>Batch:</strong> {itemToPurge.batchNumber}</p>
            <p><strong>Quantity:</strong> {itemToPurge.quantity}</p>
        </div>
        <p className="text-sm text-secondary-600">
          To proceed, please type the item's full name <strong className="text-red-600">{itemName}</strong> into the box below to confirm.
        </p>
        <Input
          value={confirmationInput}
          onChange={(e) => setConfirmationInput(e.target.value)}
          autoFocus
          autoComplete="off"
        />
      </div>
    </Modal>
  );
};
