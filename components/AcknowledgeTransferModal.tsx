import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { TransferLog, ItemMaster, InventoryItem } from '../types';
import { useConfirmation } from '../hooks/useConfirmation';
import { Spinner } from './ui/Spinner';

interface AcknowledgeTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logId: string, receivedItems: { inventoryItemId: string, quantity: number }[], notes: string, isDiscrepancy: boolean) => Promise<void>;
  log: TransferLog;
  getItemDetails: (inventoryItemId: string) => { item?: InventoryItem, master?: ItemMaster };
}

const AcknowledgeTransferModal: React.FC<AcknowledgeTransferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  log,
  getItemDetails
}) => {
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isDiscrepancy, setIsDiscrepancy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirm = useConfirmation();

  useEffect(() => {
    if (isOpen) {
      const initialQuantities: Record<string, string> = {};
      log.items.forEach(item => {
        initialQuantities[item.inventoryItemId] = String(item.quantity);
      });
      setReceivedQuantities(initialQuantities);
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, log]);

  useEffect(() => {
    if (!isOpen) return;

    const hasDiscrepancy = log.items.some(item => {
        const receivedQty = parseInt(receivedQuantities[item.inventoryItemId], 10) || 0;
        return item.quantity !== receivedQty;
    });
    setIsDiscrepancy(hasDiscrepancy);
  }, [isOpen, log.items, receivedQuantities]);

  const handleQuantityChange = (inventoryItemId: string, value: string) => {
    setReceivedQuantities(prev => ({ ...prev, [inventoryItemId]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReceivedItems = log.items.map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantity: parseInt(receivedQuantities[item.inventoryItemId], 10) || 0,
    }));

    const hasDiscrepancy = log.items.some(item => 
        item.quantity !== (parseInt(receivedQuantities[item.inventoryItemId], 10) || 0)
    );

    const isConfirmed = await confirm({
        title: "Confirm Transfer Receipt",
        message: (
            <div>
                <p className="mb-4">Please review the received quantities before confirming. This action will update inventory levels.</p>
                <h4 className="font-semibold text-secondary-700 mb-2">Items:</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-secondary-50/50">
                    {finalReceivedItems.map(receivedItem => {
                        const originalItem = log.items.find(i => i.inventoryItemId === receivedItem.inventoryItemId);
                        const { master } = getItemDetails(receivedItem.inventoryItemId);
                        const isDifferent = originalItem?.quantity !== receivedItem.quantity;
                        return (
                            <li key={receivedItem.inventoryItemId} className={`text-sm p-1 rounded ${isDifferent ? 'bg-yellow-100' : ''}`}>
                                <p className="font-medium text-secondary-800">{master?.name || 'Unknown Item'}</p>
                                <div className="flex justify-between">
                                    <span className="text-secondary-600">Expected: {originalItem?.quantity}</span>
                                    <span className={`font-bold ${isDifferent ? 'text-yellow-700' : 'text-primary-700'}`}>Received: {receivedItem.quantity}</span>
                                </div>
                            </li>
                        )
                    })}
                </ul>
                {hasDiscrepancy && <p className="mt-3 text-sm font-semibold text-yellow-700">Note: One or more items have a discrepancy and will be flagged.</p>}
            </div>
        ),
        confirmText: "Confirm Receipt",
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
        await onSave(log.id, finalReceivedItems, notes, hasDiscrepancy);
        onClose();
    } catch (error) {
        console.error("Failed to save acknowledgement:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Acknowledge Transfer: ${log.controlNumber}`}
      footer={
        <div className="space-x-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : 'Confirm Receipt'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-secondary-600">
          Please confirm the quantities of the items received. If the quantity is different from what was expected, update the value below.
        </p>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
          {log.items.map(item => {
            const { master } = getItemDetails(item.inventoryItemId);
            return (
              <div key={item.inventoryItemId} className="grid grid-cols-3 gap-4 items-center">
                <div className="col-span-2">
                  <p className="font-semibold text-secondary-800">{master?.name || 'Unknown Item'}</p>
                  <p className="text-xs text-secondary-500">Expected: {item.quantity} {master?.unit}</p>
                </div>
                <Input
                  label="Received Qty"
                  type="number"
                  value={receivedQuantities[item.inventoryItemId] || ''}
                  onChange={e => handleQuantityChange(item.inventoryItemId, e.target.value)}
                  max={item.quantity}
                  min="0"
                  required
                />
              </div>
            );
          })}
        </div>
        <Textarea
          label="Notes (Optional)"
          id="notes"
          name="notes"
          rows={3}
          placeholder="Add any notes about the condition of items or the transfer process..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        {isDiscrepancy && (
          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
            <p className="font-bold">Discrepancy Detected</p>
            <p className="text-sm">You have changed one or more quantities. This will be recorded as a transfer with a discrepancy.</p>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default AcknowledgeTransferModal;
