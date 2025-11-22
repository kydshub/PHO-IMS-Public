

import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useDatabase } from './useDatabase';
import { db } from '../services/firebase';
import { logAuditEvent } from '../services/audit';
import { User } from '../types';

export interface AppSettings {
    appName: string;
    organizationName: string;
    sessionTimeoutMinutes: number;
    fiscalYearStartMonth: number; // 1 for Jan, 12 for Dec
    currentFiscalYear: number;
    enableChat: boolean;
    enableChatSounds: boolean;
    enableBarcodeScanner: boolean;
    sidebarBadgeText: string;
    disabledNavItems: Record<string, boolean>;
    enableChatRetention: boolean;
    chatRetentionDays: number;
    enableAuditLogRetention: boolean;
    auditLogRetentionDays: number;
    notificationRetentionDays: number;
    notificationPreferences: Record<string, boolean>;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>, user: User) => void;
  loading: boolean;
}

const defaultSettings: AppSettings = {
    appName: 'Batangas PHO-IMS',
    organizationName: 'Provincial Health Office',
    sessionTimeoutMinutes: 15,
    fiscalYearStartMonth: 1, // January
    currentFiscalYear: new Date().getFullYear(),
    enableChat: true,
    enableChatSounds: true,
    enableBarcodeScanner: true,
    sidebarBadgeText: 'Alpha Test',
    disabledNavItems: {},
    enableChatRetention: false,
    chatRetentionDays: 30,
    enableAuditLogRetention: false,
    auditLogRetentionDays: 90,
    notificationRetentionDays: 90,
    notificationPreferences: {
        stockTransfer: true,
        physicalCountReview: true,
    },
    maintenanceMode: false,
    maintenanceMessage: "We are currently performing system maintenance and will be back online shortly. Thank you for your patience.",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { data, loading } = useDatabase();

    const settings = useMemo(() => {
        // Explicitly type dbSettings to inform TypeScript about potential partial data
        const dbSettings: Partial<AppSettings> = data.settings || {};
        
        return {
            ...defaultSettings,
            ...dbSettings,
            notificationPreferences: {
                ...defaultSettings.notificationPreferences,
                ...(dbSettings.notificationPreferences || {})
            }
        };
    }, [data.settings]);

    const updateSettings = useCallback(async (newSettings: Partial<AppSettings>, user: User) => {
        const settingsRef = db.ref('settings');
        await settingsRef.update(newSettings);
        await logAuditEvent(user, 'Settings Update', { changes: newSettings });
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};