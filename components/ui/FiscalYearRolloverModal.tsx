import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Spinner } from './Spinner';

interface FiscalYearRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (yearToClose: number) => void;
  currentFiscalYear: number;
}

export const FiscalYearRolloverModal: React.FC<FiscalYearRolloverModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentFiscalYear,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmationPhrase = `ROLLOVER ${currentFiscalYear}`;

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
      setIsSubmitting(true);
      await onConfirm(currentFiscalYear);
      // isSubmitting will be reset by parent component closing modal
  };

  const isConfirmed = confirmationInput === confirmationPhrase;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Fiscal Year Rollover"
      footer={
        <div className="space-x-2">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button
                variant="danger"
                onClick={handleConfirm}
                disabled={!isConfirmed || isSubmitting}
            >
                {isSubmitting ? <Spinner size="sm" /> : `Confirm & Rollover to ${currentFiscalYear + 1}`}
            </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-bold text-lg text-red-700">Warning: This action is irreversible.</p>
        <p className="mt-2 text-sm text-secondary-600">
            You are about to close fiscal year <strong>{currentFiscalYear}</strong> and start <strong>{currentFiscalYear + 1}</strong>.
        </p>
        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm">
            <p className="font-bold">This will perform the following actions:</p>
            <ul className="list-disc list-inside mt-2">
                <li>Create a permanent snapshot of all current inventory and asset levels.</li>
                <li>These snapshots will serve as the official closing balance for {currentFiscalYear} and the opening balance for {currentFiscalYear + 1}.</li>
                <li>Update the system-wide current fiscal year setting to {currentFiscalYear + 1}.</li>
            </ul>
        </div>
        <p className="text-sm text-secondary-600">
          To proceed, please type <strong className="text-red-600">{confirmationPhrase}</strong> into the box below to confirm.
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