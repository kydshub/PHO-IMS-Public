import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface CancelCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  countName: string;
}

export const CancelCountModal: React.FC<CancelCountModalProps> = ({ isOpen, onClose, onConfirm, countName }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel Physical Count: ${countName}`}
      footer={
        <div className="space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirm Cancellation
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary-600">
          Are you sure you want to cancel this physical count?
        </p>
        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
          <p className="font-bold">This action cannot be undone.</p>
          <ul className="list-disc list-inside text-sm mt-2">
            <li>The count status will be set to 'Cancelled'.</li>
            <li>All items associated with this count will be unfrozen and available for transactions again.</li>
            <li>Any counted quantities will be discarded.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
