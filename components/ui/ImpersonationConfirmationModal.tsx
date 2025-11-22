
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { User } from '../../types';

interface ImpersonationConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userToImpersonate: User | null;
}

export const ImpersonationConfirmationModal: React.FC<ImpersonationConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userToImpersonate,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput(''); // Reset input when modal opens
    }
  }, [isOpen]);

  if (!userToImpersonate) return null;

  const isConfirmed = confirmationInput === userToImpersonate.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Impersonate User: ${userToImpersonate.name}`}
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
            Confirm & Impersonate
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
            <p className="font-bold">Warning: You are about to view the application as another user.</p>
            <ul className="list-disc list-inside text-sm mt-2">
                <li>You will have the same permissions and see the same data as this user.</li>
                <li>A banner at the top of the screen will indicate you are in impersonation mode.</li>
            </ul>
        </div>
        <p className="text-sm text-secondary-600">
          To proceed, please type the user's full name <strong className="text-primary-600">{userToImpersonate.name}</strong> into the box below to confirm.
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
