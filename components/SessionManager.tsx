
import React from 'react';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { SessionTimeoutModal } from './ui/SessionTimeoutModal';

interface SessionManagerProps {
    children: React.ReactNode;
}

const SessionManager: React.FC<SessionManagerProps> = ({ children }) => {
    const { isWarningModalOpen, countdown, extendSession, handleLogout } = useSessionTimeout();

    return (
        <>
            {children}
            <SessionTimeoutModal 
                isOpen={isWarningModalOpen}
                countdown={countdown}
                onExtend={extendSession}
                onLogout={handleLogout}
            />
        </>
    );
};

export default SessionManager;
