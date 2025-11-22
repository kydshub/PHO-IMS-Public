import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { useConfirmation } from '../../hooks/useConfirmation';

interface RejectCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  countName: string;
}

export const RejectCountModal: React.FC<RejectCountModalProps> = ({ isOpen, onClose, onConfirm, countName }) => {
  const [reason, setReason] = useState('');
  const confirm = useConfirmation();

  useEffect(() => {
    if (isOpen) {
      setReason(''); // Reset reason when modal opens
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (reason.trim()) {
      const isConfirmed = await confirm({
        title: "Confirm Rejection",
        message: `Are you sure you want to reject this count and send it back for a recount? The reason provided will be recorded.`,
        confirmText: "Yes, Reject",
        variant: "danger"
      });
      if(isConfirmed) {
        onConfirm(reason.trim());
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reject Count: ${countName}`}
      footer={
        <div className="space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!reason.trim()}>
            Confirm Rejection
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary-600">
          You are about to reject this count and send it back for a recount. Please provide a clear reason for the rejection below. This reason will be recorded.
        </p>
        <Textarea
          label="Reason for Rejection"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          required
          autoFocus
        />
      </div>
    </Modal>
  );
};