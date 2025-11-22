
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Logout"
      footer={
        <div className="space-x-2">
            <Button variant="secondary" onClick={onClose}>
                Cancel
            </Button>
            <Button
                variant="danger"
                onClick={onConfirm}
            >
                Logout
            </Button>
        </div>
      }
    >
        <p className="text-sm text-secondary-600">Are you sure you want to log out of your account?</p>
    </Modal>
  );
};
