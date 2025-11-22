
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { PurchaseOrder } from '../../types';
import { Spinner } from './Spinner';

interface PurgePOConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  poToPurge: PurchaseOrder | null;
  isSubmitting?: boolean;
}

export const PurgePOConfirmationModal: React.FC<PurgePOConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  poToPurge,
  isSubmitting,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput(''); // Reset input when modal opens
    }
  }, [isOpen]);

  if (!poToPurge) return null;

  const poNumber = poToPurge.poNumber;
  const isConfirmed = confirmationInput === poNumber;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Purge Purchase Order"
      footer={
        <div className="space-x-2">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button
                variant="danger"
                onClick={onConfirm}
                disabled={!isConfirmed || isSubmitting}
            >
                {isSubmitting ? <Spinner size="sm" /> : 'Permanently Purge'}
            </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-bold text-lg text-red-700">Warning: This action is irreversible.</p>
        <p className="mt-2 text-sm text-secondary-600">
            You are about to permanently purge the Purchase Order <strong className="text-secondary-800">{poNumber}</strong>. 
            This will delete the PO record and cannot be undone. This action should only be used to correct significant data entry errors and does not revert any received stock.
        </p>
        <p className="text-sm text-secondary-600">
          To proceed, please type the PO number <strong className="text-red-600">{poNumber}</strong> into the box below to confirm.
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
