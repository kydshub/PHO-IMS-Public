import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { InfoModal, InfoModalType } from '../components/ui/InfoModal';

interface InfoModalOptions {
  title: string;
  message: React.ReactNode;
}

interface InfoModalContextType {
  showSuccess: (options: InfoModalOptions) => void;
  showError: (options: InfoModalOptions) => void;
  showInfo: (options: InfoModalOptions) => void;
}

const InfoModalContext = createContext<InfoModalContextType | undefined>(undefined);

export const InfoModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type: InfoModalType;
  } | null>(null);

  const handleClose = useCallback(() => {
    setModalState(null);
  }, []);

  const showModal = useCallback((type: InfoModalType, { title, message }: InfoModalOptions) => {
    setModalState({ isOpen: true, title, message, type });
  }, []);

  const showSuccess = useCallback((options: InfoModalOptions) => showModal('success', options), [showModal]);
  const showError = useCallback((options: InfoModalOptions) => showModal('error', options), [showModal]);
  const showInfo = useCallback((options: InfoModalOptions) => showModal('info', options), [showModal]);

  return (
    <InfoModalContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}
      {modalState?.isOpen && (
        <InfoModal
          isOpen={modalState.isOpen}
          onClose={handleClose}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
        />
      )}
    </InfoModalContext.Provider>
  );
};

export const useInfoModal = () => {
  const context = useContext(InfoModalContext);
  if (context === undefined) {
    throw new Error('useInfoModal must be used within an InfoModalProvider');
  }
  return context;
};
