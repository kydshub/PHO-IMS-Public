
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

interface PurgeLedgerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryDetails: {
    type: string;
    reference: string;
    details: string;
  };
  downstreamTransactions?: { type: string, reference: string }[];
}

export const PurgeLedgerEntryModal: React.FC<PurgeLedgerEntryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  entryDetails,
  downstreamTransactions,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  const isConfirmed = confirmationInput === 'PURGE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Permanent Deletion"
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
                Purge Transaction
            </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="font-bold text-lg text-red-700">Warning: This action is irreversible.</p>
        <p className="mt-2 text-sm text-secondary-600">You are about to permanently purge the following transaction log and reverse its effect on stock levels.</p>
        <div className="bg-red-50 p-3 mt-4 rounded-md border border-red-200 text-sm">
            <p><strong>Type:</strong> {entryDetails.type}</p>
            <p><strong>Reference:</strong> {entryDetails.reference}</p>
            <p><strong>Details:</strong> {entryDetails.details}</p>
        </div>

        {downstreamTransactions && downstreamTransactions.length > 0 && (
            <div className="bg-yellow-50 p-3 mt-4 rounded-md border border-yellow-200 text-sm">
                <p className="font-bold text-yellow-800">This action will also delete the following {downstreamTransactions.length} related transaction(s):</p>
                <ul className="list-disc list-inside max-h-32 overflow-y-auto mt-2 text-yellow-700">
                    {downstreamTransactions.map((tx, index) => (
                        <li key={index}><strong>{tx.type}:</strong> {tx.reference}</li>
                    ))}
                </ul>
            </div>
        )}

        <p className="text-sm text-secondary-600">
          To proceed, please type <strong className="text-red-600">PURGE</strong> into the box below to confirm.
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
