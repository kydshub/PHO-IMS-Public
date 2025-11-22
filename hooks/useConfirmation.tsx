import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

interface ConfirmationOptions {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}

type ConfirmFunction = (options: ConfirmationOptions) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmFunction | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(options);
      setResolvePromise({ resolve });
    });
  }, []);

  const handleClose = () => {
    if (resolvePromise) {
      resolvePromise.resolve(false);
    }
    setOptions(null);
    setResolvePromise(null);
  };

  const handleConfirm = () => {
    if (resolvePromise) {
      resolvePromise.resolve(true);
    }
    setOptions(null);
    setResolvePromise(null);
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          isOpen={true}
          onClose={handleClose}
          title={options.title}
          footer={
            <div className="space-x-2">
              <Button variant="secondary" onClick={handleClose}>
                {options.cancelText || 'Cancel'}
              </Button>
              <Button
                variant={options.variant || 'primary'}
                onClick={handleConfirm}
                autoFocus
              >
                {options.confirmText || 'Confirm'}
              </Button>
            </div>
          }
        >
          <div>{options.message}</div>
        </Modal>
      )}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};
