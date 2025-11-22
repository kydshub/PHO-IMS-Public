import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useSettings } from './useSettings';

const WARNING_TIME_MS = 60 * 1000; // 1 minute

export const useSessionTimeout = () => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [countdown, setCountdown] = useState(WARNING_TIME_MS / 1000);

    const INACTIVITY_TIMEOUT_MS = (settings.sessionTimeoutMinutes || 15) * 60 * 1000;

    const timeoutRef = useRef<number | null>(null);
    const warningTimeoutRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);

    const handleLogout = useCallback(() => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);

        logout().then(() => {
            localStorage.setItem('session-expired', 'true');
        });
    }, [logout]);
    
    const stopWarning = useCallback(() => {
        setIsWarningModalOpen(false);
        if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    }, []);

    const startWarning = useCallback(() => {
        setIsWarningModalOpen(true);
        setCountdown(WARNING_TIME_MS / 1000);

        countdownIntervalRef.current = window.setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        warningTimeoutRef.current = window.setTimeout(() => {
            handleLogout();
        }, WARNING_TIME_MS);
    }, [handleLogout]);

    const resetTimeout = useCallback(() => {
        stopWarning();
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

        timeoutRef.current = window.setTimeout(() => {
            startWarning();
        }, INACTIVITY_TIMEOUT_MS - WARNING_TIME_MS);
    }, [stopWarning, startWarning, INACTIVITY_TIMEOUT_MS]);


    const extendSession = useCallback(() => {
        stopWarning();
        resetTimeout();
    }, [stopWarning, resetTimeout]);

    useEffect(() => {
        const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        
        const eventHandler = () => {
            resetTimeout();
        };

        if (user) {
            events.forEach(event => {
                window.addEventListener(event, eventHandler);
            });
            resetTimeout();
        }

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, eventHandler);
            });
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
            stopWarning();
        };
    }, [user, resetTimeout, stopWarning]);

    return {
        isWarningModalOpen,
        countdown,
        extendSession,
        handleLogout,
    };
};