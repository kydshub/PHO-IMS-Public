
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { User } from '../../types';

interface SuspendUserConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userToSuspend: User | null;
}

export const SuspendUserConfirmationModal: React.FC<SuspendUserConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userToSuspend,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput(''); // Reset input when modal opens
    }
  }, [isOpen]);

  if (!userToSuspend) return null;

  const isConfirmed = confirmationInput === 'suspend';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Suspend User: ${userToSuspend.name}`}
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
            Confirm Suspension
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
          <p className="font-bold">Warning: You are about to suspend this user account.</p>
          <ul className="list-disc list-inside text-sm mt-2">
            <li>The user will be unable to log in to the system.</li>
            <li>This action can be reversed later by reactivating the account.</li>
          </ul>
        </div>
        <p className="text-sm text-secondary-600">
          To proceed, please type <strong className="text-red-600">suspend</strong> into the box below to confirm.
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
