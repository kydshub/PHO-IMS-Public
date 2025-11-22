import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

// Icons
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const InformationCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export type InfoModalType = 'success' | 'error' | 'info';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  type: InfoModalType;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type,
}) => {
  const iconMap: Record<InfoModalType, React.ReactNode> = {
    success: <CheckCircleIcon />,
    error: <ExclamationCircleIcon />,
    info: <InformationCircleIcon />,
  };

  const titleColorMap: Record<InfoModalType, string> = {
    success: 'text-green-700',
    error: 'text-red-700',
    info: 'text-blue-700',
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <Button onClick={onClose} autoFocus>
          OK
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
            {iconMap[type]}
        </div>
        <h3 className={`text-lg font-semibold ${titleColorMap[type]}`}>{title}</h3>
        <div className="mt-2 text-sm text-secondary-600">
          {message}
        </div>
      </div>
    </Modal>
  );
};
