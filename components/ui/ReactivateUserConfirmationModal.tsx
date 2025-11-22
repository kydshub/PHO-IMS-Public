
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { User } from '../../types';

interface ReactivateUserConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userToReactivate: User | null;
}

export const ReactivateUserConfirmationModal: React.FC<ReactivateUserConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userToReactivate,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput(''); // Reset input when modal opens
    }
  }, [isOpen]);

  if (!userToReactivate) return null;

  const isConfirmed = confirmationInput === 'reactivate';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reactivate User: ${userToReactivate.name}`}
      footer={
        <div className="space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={!isConfirmed}
          >
            Confirm Reactivation
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-green-50 border-l-4 border-green-400 text-green-700">
          <p className="font-bold">You are about to reactivate this user account.</p>
          <ul className="list-disc list-inside text-sm mt-2">
            <li>The user will be able to log in to the system again.</li>
            <li>Their original role will be restored if it was changed upon facility deactivation.</li>
          </ul>
        </div>
        <p className="text-sm text-secondary-600">
          To proceed, please type <strong className="text-primary-600">reactivate</strong> into the box below to confirm.
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
