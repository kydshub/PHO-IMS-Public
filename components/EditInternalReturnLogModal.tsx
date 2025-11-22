import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { InternalReturnLog } from '../types';
import { useConfirmation } from '../hooks/useConfirmation';
import { Spinner } from './ui/Spinner';

interface EditInternalReturnLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logId: string, newTimestamp: string, newNotes: string) => Promise<void>;
  log: InternalReturnLog;
}

export const EditInternalReturnLogModal: React.FC<EditInternalReturnLogModalProps> = ({ isOpen, onClose, onSave, log }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const confirm = useConfirmation();

    useEffect(() => {
        if (isOpen && log) {
            const logDate = new Date(log.timestamp);
            setDate(logDate.toISOString().split('T')[0]);
            setTime(logDate.toTimeString().split(' ')[0].substring(0, 5));
            setNotes(log.notes || '');
            setIsSubmitting(false);
        }
    }, [isOpen, log]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const newTimestamp = new Date(`${date}T${time}`).toISOString();
        
        const isConfirmed = await confirm({
            title: "Confirm Voucher Update",
            message: "Are you sure you want to save these changes? This will permanently alter the transaction record.",
            confirmText: "Save Changes",
        });

        if (isConfirmed) {
            setIsSubmitting(true);
            try {
                await onSave(log.id, newTimestamp, notes);
                onClose();
            } catch (error) {
                console.error("Failed to save changes:", error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit Return Voucher: ${log.controlNumber}`}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSave} type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="sm" /> : 'Save Changes'}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Transaction Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    <Input label="Transaction Time" type="time" value={time} onChange={e => setTime(e.target.value)} required />
                </div>
                <Textarea label="Notes" rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
            </form>
        </Modal>
    );
};
