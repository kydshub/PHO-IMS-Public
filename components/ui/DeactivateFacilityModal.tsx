
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Facility } from '../../types';

interface DeactivateFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  facility: Facility | null;
}

export const DeactivateFacilityModal: React.FC<DeactivateFacilityModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  facility,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput(''); // Reset input when modal opens
    }
  }, [isOpen]);

  if (!facility) return null;

  const isConfirmed = confirmationInput === facility.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Deactivate Facility: ${facility.name}`}
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
                Deactivate
            </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
            <p className="font-bold">Warning: This is a major action with the following consequences:</p>
            <ul className="list-disc list-inside text-sm mt-2">
                <li>All inventory items in this facility will be **frozen** and unavailable for transactions.</li>
                <li>All non-admin users assigned to this facility will have their roles **demoted to 'User'**.</li>
            </ul>
        </div>
        <p className="text-sm text-secondary-600">
          This action can be reversed. Upon reactivation, user roles will be automatically restored to their previous state.
        </p>
        <p className="text-sm text-secondary-600">
          Please type <strong className="text-red-600">{facility.name}</strong> into the box below to confirm.
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
