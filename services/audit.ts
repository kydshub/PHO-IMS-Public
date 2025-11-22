import { AuditLog } from '../types';
import { db } from './firebase';

const getSessionInfo = async () => {
    try {
        // Use a timeout to prevent long waits if the network is slow or the service is down.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

        const response = await fetch('https://api.ipify.org?format=json', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`IPify API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            ipAddress: data.ip || 'UNKNOWN_FORMAT',
            userAgent: navigator.userAgent || 'N/A'
        };
    } catch (error) {
        // Don't log to console as an error, as this is an expected failure case.
        // It can be noisy for users with ad blockers.
        console.log("Could not fetch client IP address. This can be caused by network issues or ad-blockers. Falling back.", error);
        return {
            ipAddress: 'UNAVAILABLE',
            userAgent: navigator.userAgent || 'N/A'
        };
    }
};

export const logAuditEvent = (user: { uid: string; email: string; }, action: string, details: Record<string, any>): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!user || !user.uid || !user.email) {
            console.warn("Audit event skipped: A valid user object with uid and email must be provided.", { action, details });
            resolve(); // Resolve to not block execution
            return;
        }

        const info = await getSessionInfo();

        const newLog: Omit<AuditLog, 'id'> = {
            uid: user.uid,
            user: user.email,
            action,
            details,
            timestamp: new Date().toISOString(),
            ipAddress: info.ipAddress,
            userAgent: info.userAgent,
        };

        db.ref('auditLogs').push(newLog, (error) => {
            if (error) {
                console.error("Failed to log audit event to Firebase:", error, newLog);
                reject(error);
            } else {
                resolve();
            }
        });
    });
};
