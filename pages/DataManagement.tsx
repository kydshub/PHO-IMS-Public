
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { useSettings, AppSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { useDatabase } from '../hooks/useDatabase';
import { logAuditEvent } from '../services/audit';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { useInfoModal } from '../hooks/useInfoModal';
import { db } from '../services/firebase';
import { FiscalYearRolloverModal } from '../components/ui/FiscalYearRolloverModal';
import { PhysicalCountStatus } from '../types';
import { Modal } from '../components/ui/Modal';


const DataManagement: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { user } = useAuth();
    const { data } = useDatabase();
    const { physicalCounts, inventoryItems, assetItems, facilities, storageLocations, users, dispenseLogs, receiveLogs, transferLogs, writeOffLogs, returnLogs, risLogs, roLogs, adjustmentLogs, purchaseOrders } = data;
    const { showSuccess, showError, showInfo } = useInfoModal();
    const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [retentionSettings, setRetentionSettings] = useState({
        chatRetentionDays: settings.chatRetentionDays,
        auditLogRetentionDays: settings.auditLogRetentionDays,
        notificationRetentionDays: settings.notificationRetentionDays,
    });
    
    const [chatPurgeConfirmText, setChatPurgeConfirmText] = useState('');
    const [auditPurgeConfirmText, setAuditPurgeConfirmText] = useState('');
    const [notificationPurgeConfirmText, setNotificationPurgeConfirmText] = useState('');
    const [isPurging, setIsPurging] = useState<'chat' | 'audit' | 'notification' | 'orphaned' | null>(null);

    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [scanResults, setScanResults] = useState<Record<string, { id: string }[]>>({});
    const [isScanning, setIsScanning] = useState(false);
    const [purgeDataConfirmText, setPurgeDataConfirmText] = useState('');


    useEffect(() => {
        setRetentionSettings({
            chatRetentionDays: settings.chatRetentionDays || 30,
            auditLogRetentionDays: settings.auditLogRetentionDays || 90,
            notificationRetentionDays: settings.notificationRetentionDays || 90,
        });
    }, [settings]);

    const handleRetentionChange = (key: keyof typeof retentionSettings, value: any) => {
        setRetentionSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveRetention = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateSettings({
                chatRetentionDays: Number(retentionSettings.chatRetentionDays),
                auditLogRetentionDays: Number(retentionSettings.auditLogRetentionDays),
                notificationRetentionDays: Number(retentionSettings.notificationRetentionDays),
            }, user);
            showSuccess({ title: "Settings Saved", message: "Data retention settings have been updated." });
        } catch (error) {
            showError({ title: "Save Failed", message: "An error occurred while saving." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handlePurgeChat = async () => {
        if (!user) return;
        setIsPurging('chat');
        try {
            const cutoff = Date.now() - (retentionSettings.chatRetentionDays * 24 * 60 * 60 * 1000);
            const conversationsSnapshot = await db.ref('conversations').once('value');
            if (!conversationsSnapshot.exists()) {
                showInfo({ title: "No Chats Found", message: "There are no conversations to purge." });
                return;
            }
            const updates: Record<string, null> = {};
            let messagesPurged = 0;
            const promises = [];

            conversationsSnapshot.forEach(convoSnapshot => {
                const convoId = convoSnapshot.key;
                const messagesRef = db.ref(`chatMessages/${convoId}`);
                const promise = messagesRef.orderByChild('timestamp').endAt(cutoff).once('value').then(snapshot => {
                    if (snapshot.exists()) {
                        snapshot.forEach(msgSnapshot => {
                            updates[`chatMessages/${convoId}/${msgSnapshot.key}`] = null;
                            messagesPurged++;
                        });
                    }
                });
                promises.push(promise);
            });

            await Promise.all(promises);

            if (messagesPurged > 0) {
                await db.ref().update(updates);
                await logAuditEvent(user, 'Data Purge: Chat', { days: retentionSettings.chatRetentionDays, count: messagesPurged });
                showSuccess({ title: "Purge Complete", message: `${messagesPurged} chat messages were permanently deleted.` });
            } else {
                showInfo({ title: "No Data Purged", message: "No chat messages were found older than the specified retention period." });
            }
        } catch (error: any) {
            showError({ title: "Purge Failed", message: `An error occurred: ${error.message}` });
        } finally {
            setIsPurging(null);
            setChatPurgeConfirmText('');
        }
    };
    
    const handlePurgeAuditLogs = async () => {
        if (!user) return;
        
        setIsPurging('audit');
        try {
            const cutoff = new Date(Date.now() - (retentionSettings.auditLogRetentionDays * 24 * 60 * 60 * 1000)).toISOString();
            const auditLogsRef = db.ref('auditLogs');
            const oldLogsSnapshot = await auditLogsRef.orderByChild('timestamp').endAt(cutoff).once('value');
            if (!oldLogsSnapshot.exists()) {
                showInfo({ title: "No Data Purged", message: "No audit logs were found older than the specified retention period." });
                return;
            }
            
            const updates: Record<string, null> = {};
            let logsPurged = 0;
            oldLogsSnapshot.forEach(snapshot => {
                updates[`auditLogs/${snapshot.key}`] = null;
                logsPurged++;
            });
            await db.ref().update(updates);
            
            await logAuditEvent(user, 'Data Purge: Audit Logs', { days: retentionSettings.auditLogRetentionDays, count: logsPurged });
            showSuccess({ title: "Purge Complete", message: `${logsPurged} audit logs were permanently deleted.` });
        } catch (error: any) {
            showError({ title: "Purge Failed", message: `An error occurred: ${error.message}` });
        } finally {
             setIsPurging(null);
             setAuditPurgeConfirmText('');
        }
    };
    
    const handlePurgeNotifications = async () => {
        if (!user) return;

        setIsPurging('notification');
        try {
            const cutoffDate = new Date(Date.now() - (retentionSettings.notificationRetentionDays * 24 * 60 * 60 * 1000));
            const cutoffTimestamp = cutoffDate.toISOString();

            const notificationsRef = db.ref('notifications');
            const oldNotifsSnapshot = await notificationsRef.orderByChild('timestamp').endAt(cutoffTimestamp).once('value');

            if (!oldNotifsSnapshot.exists()) {
                showInfo({ title: "No Data Purged", message: "No notifications were found older than the specified retention period." });
                return;
            }

            const updates: Record<string, null> = {};
            let notifsPurged = 0;
            oldNotifsSnapshot.forEach(snapshot => {
                updates[`notifications/${snapshot.key}`] = null;
                notifsPurged++;
            });

            if (notifsPurged > 0) {
                await db.ref().update(updates);
                await logAuditEvent(user, 'Data Purge: Notifications', { days: retentionSettings.notificationRetentionDays, count: notifsPurged });
                showSuccess({ title: "Purge Complete", message: `${notifsPurged} notifications were permanently deleted.` });
            } else {
                 showInfo({ title: "No Data Purged", message: "No notifications were found older than the specified retention period." });
            }
        } catch (error: any) {
            showError({ title: "Purge Failed", message: `An error occurred: ${error.message}` });
        } finally {
            setIsPurging(null);
            setNotificationPurgeConfirmText('');
        }
    };

    const handleFiscalYearRollover = async (yearToClose: number) => {
        if (!user) return;
        
        const activeCounts = physicalCounts.filter(c => c.status !== PhysicalCountStatus.Completed && c.status !== PhysicalCountStatus.Cancelled);
        if (activeCounts.length > 0) {
            showError({ title: 'Action Blocked', message: 'Cannot perform rollover while physical counts are in progress. Please complete or cancel all active counts first.' });
            return;
        }

        setIsSaving(true);
        try {
            const updates: Record<string, any> = {};
            const newFiscalYear = yearToClose + 1;

            const inventorySnapshot: Record<string, any> = {};
            inventoryItems.forEach(item => {
                inventorySnapshot[item.id] = {
                    quantity: item.quantity,
                    itemMasterId: item.itemMasterId,
                    storageLocationId: item.storageLocationId,
                    isConsignment: item.isConsignment || false
                };
            });
            updates[`/fiscalYearEndBalances/${yearToClose}/inventory`] = inventorySnapshot;

            const assetSnapshot: Record<string, any> = {};
            assetItems.forEach(asset => {
                assetSnapshot[asset.id] = {
                    itemMasterId: asset.itemMasterId,
                    storageLocationId: asset.storageLocationId
                };
            });
            updates[`/fiscalYearEndBalances/${yearToClose}/assets`] = assetSnapshot;
            
            updates['/settings/currentFiscalYear'] = newFiscalYear;
            updates[`/fiscalYears/${newFiscalYear}`] = true;
            
            await db.ref().update(updates);
            
            await logAuditEvent(user, 'Fiscal Year Rollover', { closedYear: yearToClose, newYear: newFiscalYear });
            
            showSuccess({ title: 'Success', message: `Fiscal year ${yearToClose} has been closed. The current fiscal year is now ${newFiscalYear}.` });
        } catch (error: any) {
            showError({ title: 'Rollover Failed', message: `An error occurred: ${error.message}` });
        } finally {
            setIsSaving(false);
            setIsRolloverModalOpen(false);
        }
    };

    const handleScanForOrphanedData = useCallback(() => {
        setIsScanning(true);
        const validFacilityIds = new Set(facilities.map(f => f.id));
        const results: Record<string, { id: string }[]> = {};
    
        const findOrphans = (items: any[], facilityIdKey: string | string[], idKey = 'id') => {
            if (!items) return [];
            return items.filter(item => {
                if (Array.isArray(facilityIdKey)) {
                    return facilityIdKey.some(key => item[key] && !validFacilityIds.has(item[key]));
                }
                return item[facilityIdKey] && !validFacilityIds.has(item[facilityIdKey]);
            }).map(item => ({ id: item[idKey] }));
        };
    
        const orphanedStorageLocations = findOrphans(storageLocations, 'facilityId');
        if (orphanedStorageLocations.length > 0) {
            results['Storage Locations'] = orphanedStorageLocations;
        }
        const orphanedLocationIds = new Set(orphanedStorageLocations.map(l => l.id));
        const validLocationIds = new Set(storageLocations.map(l => l.id));
    
        const orphanedInventoryItems = (inventoryItems || []).filter(item => orphanedLocationIds.has(item.storageLocationId) || !validLocationIds.has(item.storageLocationId)).map(item => ({ id: item.id }));
        if (orphanedInventoryItems.length > 0) results['Inventory Items'] = orphanedInventoryItems;
        
        const orphanedAssetItems = (assetItems || []).filter(item => orphanedLocationIds.has(item.storageLocationId) || !validLocationIds.has(item.storageLocationId)).map(item => ({ id: item.id }));
        if (orphanedAssetItems.length > 0) results['Asset Items'] = orphanedAssetItems;
    
        // Fix: Add explicit type annotation to directOrphansMap to handle optional idKey
        const directOrphansMap: Record<string, { items: any[]; key: string | string[]; idKey?: string }> = {
            'Users': { items: users, key: 'facilityId', idKey: 'uid' }, 'Dispense Logs': { items: dispenseLogs, key: 'facilityId' },
            'Receive Logs': { items: receiveLogs, key: 'facilityId' }, 'Write-Off Logs': { items: writeOffLogs, key: 'facilityId' },
            'Return Logs': { items: returnLogs, key: 'facilityId' }, 'RIS Logs': { items: risLogs, key: 'facilityId' },
            'RO Logs': { items: roLogs, key: 'facilityId' }, 'Adjustment Logs': { items: adjustmentLogs, key: 'facilityId' },
            'Physical Counts': { items: physicalCounts, key: 'facilityId' }, 'Purchase Orders': { items: purchaseOrders, key: 'facilityId' },
            'Transfer Logs': { items: transferLogs, key: ['fromFacilityId', 'toFacilityId'] },
        };
        
        for (const [name, config] of Object.entries(directOrphansMap)) {
            const orphans = findOrphans(config.items, config.key, config.idKey || 'id');
            if (orphans.length > 0) {
                results[name] = orphans;
            }
        }
        
        setScanResults(results);
        setIsScanning(false);
        setIsScanModalOpen(true);
    }, [facilities, storageLocations, inventoryItems, assetItems, users, dispenseLogs, receiveLogs, writeOffLogs, returnLogs, risLogs, roLogs, adjustmentLogs, physicalCounts, purchaseOrders, transferLogs]);
    
    const handlePurgeOrphanedData = async () => {
        if (!user) return;
        setIsPurging('orphaned');
        const updates: Record<string, null> = {};
    
        const keyMap: Record<string, string> = {
            'Storage Locations': 'storageLocations', 'Inventory Items': 'inventoryItems', 'Asset Items': 'assetItems', 'Users': 'users',
            'Dispense Logs': 'dispenseLogs', 'Receive Logs': 'receiveLogs', 'Write-Off Logs': 'writeOffLogs', 'Return Logs': 'returnLogs',
            'RIS Logs': 'risLogs', 'RO Logs': 'roLogs', 'Adjustment Logs': 'adjustmentLogs', 'Physical Counts': 'physicalCounts',
            'Purchase Orders': 'purchaseOrders', 'Transfer Logs': 'transferLogs',
        };
        
        let totalPurged = 0;
        for (const [category, items] of Object.entries(scanResults)) {
            const dbKey = keyMap[category];
            if (dbKey) {
                items.forEach(item => {
                    updates[`/${dbKey}/${item.id}`] = null;
                    totalPurged++;
                });
            }
        }
        
        try {
            await db.ref().update(updates);
            await logAuditEvent(user, 'Data Purge: Orphaned Records', { count: totalPurged, details: Object.keys(scanResults) });
            showSuccess({ title: "Purge Complete", message: `${totalPurged} orphaned records were permanently deleted.` });
        } catch (error: any) {
            showError({ title: "Purge Failed", message: `An error occurred: ${error.message}` });
        } finally {
            setIsPurging(null);
            setIsScanModalOpen(false);
            setPurgeDataConfirmText('');
            setScanResults({});
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-secondary-800">Data Management</h2>

            <Card title="Fiscal Year Management">
                <div className="space-y-4">
                    <p className="text-sm text-secondary-600">
                        The current fiscal year is <strong>{settings.currentFiscalYear}</strong>. The rollover process will close the books on the current year, create a snapshot of all inventory levels for auditing, and set the system to the new fiscal year. This process is irreversible.
                    </p>
                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm">
                        <strong>Warning:</strong> Ensure all transactions for the year are complete before initiating the rollover. All active physical counts must be finalized or cancelled.
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => setIsRolloverModalOpen(true)} disabled={isSaving}>
                            {isSaving ? <Spinner size="sm" /> : 'Initiate Rollover Process'}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card title="Data Integrity">
                <div className="space-y-4">
                    <p className="text-sm text-secondary-600">
                        Scan for and remove orphaned data, such as records associated with deleted facilities. This helps maintain database health and prevent errors.
                    </p>
                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm">
                        <strong>Warning:</strong> Purging data is a permanent and irreversible action. Proceed with caution.
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleScanForOrphanedData} disabled={isScanning}>
                            {isScanning ? <Spinner size="sm" /> : 'Scan for Orphaned Data'}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card title="Data Retention Policies">
                <div className="space-y-6">
                    <p className="text-sm text-secondary-600">
                        Manually purge data to manage database size. Define the retention period, type "Purge" to confirm, and then click the button.
                    </p>
                    <div className="p-4 border rounded-md space-y-4 divide-y divide-secondary-200">
                        <div className="flex flex-col md:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <Input
                                    label="Retain chat messages for (days)"
                                    type="number"
                                    min="1"
                                    value={retentionSettings.chatRetentionDays}
                                    onChange={(e) => handleRetentionChange('chatRetentionDays', e.target.value)}
                                />
                            </div>
                             <div className="flex-1 w-full">
                                <Input
                                    label={`Type "Purge" to confirm`}
                                    type="text"
                                    value={chatPurgeConfirmText}
                                    onChange={e => setChatPurgeConfirmText(e.target.value)}
                                    placeholder="Purge"
                                />
                            </div>
                            <Button variant="danger" onClick={handlePurgeChat} disabled={isPurging !== null || chatPurgeConfirmText !== 'Purge'} className="w-full md:w-auto">
                                {isPurging === 'chat' ? <Spinner size="sm" /> : 'Purge Chat Data'}
                            </Button>
                        </div>
                        <div className="pt-4 flex flex-col md:flex-row items-end gap-4">
                             <div className="flex-1 w-full">
                                <Input
                                    label="Retain audit logs for (days)"
                                    type="number"
                                    min="1"
                                    value={retentionSettings.auditLogRetentionDays}
                                    onChange={(e) => handleRetentionChange('auditLogRetentionDays', e.target.value)}
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <Input
                                    label={`Type "Purge" to confirm`}
                                    type="text"
                                    value={auditPurgeConfirmText}
                                    onChange={e => setAuditPurgeConfirmText(e.target.value)}
                                    placeholder="Purge"
                                />
                            </div>
                            <Button variant="danger" onClick={handlePurgeAuditLogs} disabled={isPurging !== null || auditPurgeConfirmText !== 'Purge'} className="w-full md:w-auto">
                                {isPurging === 'audit' ? <Spinner size="sm" /> : 'Purge Audit Logs'}
                            </Button>
                        </div>
                         <div className="pt-4 flex flex-col md:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <Input
                                    label="Retain notifications for (days)"
                                    type="number"
                                    min="1"
                                    value={retentionSettings.notificationRetentionDays}
                                    onChange={(e) => handleRetentionChange('notificationRetentionDays', e.target.value)}
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <Input
                                    label={`Type "Purge" to confirm`}
                                    type="text"
                                    value={notificationPurgeConfirmText}
                                    onChange={e => setNotificationPurgeConfirmText(e.target.value)}
                                    placeholder="Purge"
                                />
                            </div>
                            <Button variant="danger" onClick={handlePurgeNotifications} disabled={isPurging !== null || notificationPurgeConfirmText !== 'Purge'} className="w-full md:w-auto">
                                {isPurging === 'notification' ? <Spinner size="sm" /> : 'Purge Notification Data'}
                            </Button>
                        </div>
                    </div>
                     <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm">
                        <strong>Note:</strong> Purging data is permanent and cannot be undone. Please save your retention day settings before purging.
                    </div>
                </div>
                 <div className="flex justify-end mt-4">
                    <Button onClick={handleSaveRetention} disabled={isSaving}>
                        {isSaving ? <Spinner size="sm" /> : 'Save Retention Settings'}
                    </Button>
                </div>
            </Card>
            
            <FiscalYearRolloverModal 
                isOpen={isRolloverModalOpen}
                onClose={() => setIsRolloverModalOpen(false)}
                onConfirm={handleFiscalYearRollover}
                currentFiscalYear={settings.currentFiscalYear}
            />

            <Modal
                isOpen={isScanModalOpen}
                onClose={() => setIsScanModalOpen(false)}
                title="Orphaned Data Scan Results"
                footer={
                    <div className="space-x-2">
                        <Button variant="secondary" onClick={() => setIsScanModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="danger"
                            onClick={handlePurgeOrphanedData}
                            disabled={isPurging !== null || purgeDataConfirmText !== 'PURGE DATA' || Object.keys(scanResults).length === 0}
                        >
                            {isPurging === 'orphaned' ? <Spinner size="sm" /> : 'Purge Orphaned Data'}
                        </Button>
                    </div>
                }
            >
                {Object.keys(scanResults).length > 0 ? (
                    <div className="space-y-4">
                        <p className="font-semibold">The following orphaned records were found:</p>
                        <ul className="list-disc list-inside bg-secondary-50 p-3 rounded-md">
                            {Object.entries(scanResults).map(([category, items]) => (
                                <li key={category}><strong>{items.length}</strong> {category}</li>
                            ))}
                        </ul>
                        <p className="text-sm text-red-600 font-bold">This action will permanently delete all listed records. This cannot be undone.</p>
                        <Input
                            label='Type "PURGE DATA" to confirm'
                            value={purgeDataConfirmText}
                            onChange={e => setPurgeDataConfirmText(e.target.value)}
                            autoFocus
                            autoComplete="off"
                        />
                    </div>
                ) : (
                    <p>No orphaned data was found. Your database appears to be consistent.</p>
                )}
            </Modal>
        </div>
    );
};

export default DataManagement;