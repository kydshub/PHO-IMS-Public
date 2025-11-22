import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '../services/firebase';
import { User, Facility, StorageLocation, AssetItem, AuditLog, Category, DispenseLog, InventoryItem, ItemMaster, PhysicalCount, Program, ReceiveLog, ServiceProvider, Supplier, TransferLog, WriteOffLog, ConsignmentConsumptionLog, RISLog, ROLog, ReturnLog, FundSource, UserPresence, AdjustmentLog, PurchaseOrder, BulletinPage, InternalReturnLog } from '../types';
import { AppSettings } from './useSettings';
import { useAuth } from './useAuth';

export interface DatabaseData {
    users: User[];
    facilities: Facility[];
    storageLocations: StorageLocation[];
    categories: Category[];
    programs: Program[];
    suppliers: Supplier[];
    serviceProviders: ServiceProvider[];
    itemMasters: ItemMaster[];
    inventoryItems: InventoryItem[];
    assetItems: AssetItem[];
    auditLogs: AuditLog[];
    writeOffLogs: WriteOffLog[];
    dispenseLogs: DispenseLog[];
    risLogs: RISLog[];
    roLogs: ROLog[];
    receiveLogs: ReceiveLog[];
    transferLogs: TransferLog[];
    returnLogs: ReturnLog[];
    internalReturnLogs: InternalReturnLog[];
    physicalCounts: PhysicalCount[];
    consignmentConsumptionLogs: ConsignmentConsumptionLog[];
    adjustmentLogs: AdjustmentLog[];
    fundSources: FundSource[];
    presences: Record<string, UserPresence>;
    settings: AppSettings | null;
    purchaseOrders: PurchaseOrder[];
    bulletinBoard: BulletinPage[];
    fiscalYears: Record<string, boolean>;
    fiscalYearEndBalances: Record<string, any>;
}

interface DatabaseState {
  loading: boolean;
  data: DatabaseData;
  initializeDatabase: (adminUser: User, firstFacility: Omit<Facility, 'id'>, facilityId: string) => Promise<void>;
}

const initialDataState: DatabaseData = {
    users: [],
    facilities: [],
    storageLocations: [],
    categories: [],
    programs: [],
    suppliers: [],
    serviceProviders: [],
    itemMasters: [],
    inventoryItems: [],
    assetItems: [],
    auditLogs: [],
    writeOffLogs: [],
    dispenseLogs: [],
    risLogs: [],
    roLogs: [],
    receiveLogs: [],
    transferLogs: [],
    returnLogs: [],
    internalReturnLogs: [],
    physicalCounts: [],
    consignmentConsumptionLogs: [],
    adjustmentLogs: [],
    fundSources: [],
    presences: {},
    settings: null,
    purchaseOrders: [],
    bulletinBoard: [],
    fiscalYears: {},
    fiscalYearEndBalances: {},
};

const DatabaseContext = createContext<DatabaseState | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<DatabaseData>(initialDataState);
    const [loading, setLoading] = useState(true);
    const activeListeners = useRef<{ ref: firebase.database.Reference; listener: (snapshot: firebase.database.DataSnapshot) => void }[]>([]);

    useEffect(() => {
        const cleanup = () => {
            activeListeners.current.forEach(({ ref, listener }) => ref.off('value', listener));
            activeListeners.current = [];
        };

        if (authLoading) {
            setLoading(true);
            return;
        }

        if (!user) {
            setLoading(false);
            setData(initialDataState);
            cleanup();
            return;
        }

        const processSnapshot = (snapshot: firebase.database.DataSnapshot, key: keyof DatabaseData) => {
            const val = snapshot.val();
            let formattedData: any;

            if (val && typeof val === 'object' && !Array.isArray(val)) {
                if (key === 'settings' || key === 'presences' || key === 'fiscalYears' || key === 'fiscalYearEndBalances') {
                    formattedData = val;
                } else {
                    const idKey = key === 'users' ? 'uid' : 'id';
                    formattedData = Object.entries(val).map(([id, dataObj]: [string, any]) => ({ ...dataObj, [idKey]: id }));
                }
            } else {
                formattedData = initialDataState[key];
            }
            
            setData(prevData => ({ ...prevData, [key]: formattedData }));
        };
        
        const baseKeys: (keyof DatabaseData)[] = [
            'users', 'facilities', 'storageLocations', 'categories', 'programs', 'suppliers', 
            'serviceProviders', 'itemMasters', 'inventoryItems', 'assetItems', 
            'writeOffLogs', 'dispenseLogs', 'risLogs', 'roLogs', 'receiveLogs', 
            'transferLogs', 'physicalCounts', 'consignmentConsumptionLogs', 'returnLogs', 'internalReturnLogs',
            'adjustmentLogs', 'settings', 'fundSources', 'presences', 'purchaseOrders', 'bulletinBoard',
            'fiscalYears', 'fiscalYearEndBalances'
        ];
        
        const isAdminOrAuditor = user.role === 'System Administrator' || user.role === 'Auditor';
        
        const keysToFetch = [...baseKeys];
        if (isAdminOrAuditor) {
            keysToFetch.push('auditLogs');
        } else {
            setData(prev => ({ ...prev, auditLogs: [] }));
        }

        setLoading(true);
        let loadedCount = 0;
        const totalKeysToLoad = keysToFetch.length;
        let allListenersSet = false;

        cleanup();

        keysToFetch.forEach(key => {
            const dbRef = db.ref(key);
            const listener = (snapshot: firebase.database.DataSnapshot) => {
                processSnapshot(snapshot, key);
                
                if (!allListenersSet) {
                    loadedCount++;
                    if (loadedCount >= totalKeysToLoad) {
                        setLoading(false);
                        allListenersSet = true;
                    }
                }
            };
            dbRef.on('value', listener, (error) => {
                console.error(`Firebase read failed at /${key}:`, error);
                if (!allListenersSet) {
                    loadedCount++;
                    if (loadedCount >= totalKeysToLoad) {
                        setLoading(false);
                        allListenersSet = true;
                    }
                }
            });
            activeListeners.current.push({ ref: dbRef, listener: listener });
        });
        
        return cleanup;
    }, [user, authLoading]);

    const initializeDatabase = async (adminUser: User, firstFacility: Omit<Facility, 'id'>, facilityId: string) => {
        const adminUserWithFacility = { ...adminUser, facilityId: facilityId };
        const { uid, ...adminData } = adminUserWithFacility;

        const updates: Record<string, any> = {};
        updates[`/users/${adminUser.uid}`] = adminData;
        updates[`/facilities/${facilityId}`] = firstFacility;
        updates['/public/setupComplete'] = true;
        
        await db.ref().update(updates);
    };

    const value = {
        loading,
        data,
        initializeDatabase,
    };

    return (
        <DatabaseContext.Provider value={value}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabase = () => {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
};
