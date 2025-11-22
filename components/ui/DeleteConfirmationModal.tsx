
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Spinner } from './Spinner';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  isSubmitting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isSubmitting,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput(''); // Reset input when modal opens
    }
  }, [isOpen]);

  const isConfirmed = confirmationInput === itemName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${itemType}`}
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
                {isSubmitting ? <Spinner size="sm" /> : 'Delete'}
            </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary-600">
          This action is permanent and cannot be undone. This will permanently delete the {itemType} <strong className="text-secondary-800">{itemName}</strong>.
        </p>
        <p className="text-sm text-secondary-600">
          Please type <strong className="text-red-600">{itemName}</strong> into the box below to confirm.
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
