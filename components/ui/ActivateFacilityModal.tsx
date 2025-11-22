import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Facility } from '../../types';

interface ActivateFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  facility: Facility | null;
}

export const ActivateFacilityModal: React.FC<ActivateFacilityModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  facility,
}) => {

  if (!facility) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Activate Facility: ${facility.name}`}
      footer={
        <div className="space-x-2">
            <Button variant="secondary" onClick={onClose}>
                Cancel
            </Button>
            <Button
                variant="primary"
                onClick={onConfirm}
            >
                Activate Facility
            </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary-600">
          Are you sure you want to activate this facility?
        </p>
        <div className="p-3 bg-green-50 border-l-4 border-green-400 text-green-700">
            <p className="font-bold">This will have the following effects:</p>
            <ul className="list-disc list-inside text-sm mt-2">
                <li>All inventory items in this facility will be **unfrozen** and become available for transactions.</li>
                <li>All users assigned to this facility will have their **original roles automatically restored**.</li>
            </ul>
        </div>
      </div>
    </Modal>
  );
};
