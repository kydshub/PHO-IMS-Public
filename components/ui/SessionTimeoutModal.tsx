
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onExtend: () => void;
  onLogout: () => void;
  countdown: number;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({ isOpen, onExtend, onLogout, countdown }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing with Esc or overlay click
      title="Session Timeout Warning"
    >
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mt-3">Are you still there?</h3>
        <p className="mt-2 text-sm text-secondary-600">
            Your session is about to expire due to inactivity. You will be logged out in:
        </p>
        <p className="text-3xl font-bold text-primary-600 my-4">
            {countdown}
        </p>
        <p className="text-sm text-secondary-600">
            Click the button below to stay logged in.
        </p>
      </div>
      <div className="mt-6 flex justify-center gap-4">
        <Button variant="secondary" onClick={onLogout}>
            Logout Now
        </Button>
        <Button onClick={onExtend} autoFocus>
            Stay Logged In
        </Button>
      </div>
    </Modal>
  );
};
