import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { useSettings, AppSettings } from '../hooks/useSettings';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { useDatabase } from '../hooks/useDatabase';
import { useNotifications } from '../hooks/useNotifications';
import { Role, UserStatus, BulletinPage } from '../types';
import { logAuditEvent } from '../services/audit';
import { Spinner } from '../components/ui/Spinner';
import { Select } from '../components/ui/Select';
import { navigationConfig, NavItem, NavSubItem } from '../components/Sidebar';
import { useInfoModal } from '../hooks/useInfoModal';
import { db } from '../services/firebase';
import { CHANGELOG_CONTENT } from '../constants';
import { Modal } from '../components/ui/Modal';
import { useConfirmation } from '../hooks/useConfirmation';
import DataManagement from './DataManagement';


const sanitizePathForKey = (path: string) => path.replace(/\//g, '_');

const ToggleSwitch: React.FC<{
    label: string;
    description?: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ label, description, enabled, onChange }) => (
    <div className="flex items-center justify-between">
        <div className="flex-grow">
          <span className="text-sm font-medium text-secondary-700">{label}</span>
          {description && <p className="text-xs text-secondary-500">{description}</p>}
        </div>
        <button
            type="button"
            className={`${
                enabled ? 'bg-primary-600' : 'bg-secondary-200'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ml-4`}
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
        >
            <span
                aria-hidden="true"
                className={`${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const UpArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const DownArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;


const GeneralSettings = () => {
    const { settings, updateSettings } = useSettings();
    const { user } = useAuth();
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const currentVersion = useMemo(() => {
        const match = CHANGELOG_CONTENT.match(/## \[(\d+\.\d+\.\d+)\]/);
        return match ? match[1] : 'Unknown';
    }, []);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    useEffect(() => {
        setIsDirty(JSON.stringify(localSettings) !== JSON.stringify(settings));
    }, [localSettings, settings]);

    const handleChange = (key: keyof AppSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!user) {
            alert("You must be logged in to save settings.");
            return;
        }
        setIsSaving(true);
        try {
            await updateSettings(localSettings, user);
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("An error occurred while saving settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

    return (
        <div className="space-y-6">
            <Card title="System Settings">
                <div className="space-y-6">
                    <div className="p-4 border rounded-md">
                        <h4 className="font-medium text-secondary-800 mb-2">Branding & Identity</h4>
                        <div className="space-y-4">
                            <Input label="Application Name" value={localSettings.appName} onChange={e => handleChange('appName', e.target.value)} />
                            <Input label="Organization Name (for Printouts)" value={localSettings.organizationName} onChange={e => handleChange('organizationName', e.target.value)} />
                        </div>
                    </div>
                    <div className="p-4 border rounded-md">
                        <h4 className="font-medium text-secondary-800 mb-2">Security</h4>
                        <div className="space-y-4">
                            <Select label="Session Timeout" value={localSettings.sessionTimeoutMinutes} onChange={e => handleChange('sessionTimeoutMinutes', Number(e.target.value))}>
                                <option value={15}>15 Minutes</option>
                                <option value={30}>30 Minutes</option>
                                <option value={60}>1 Hour</option>
                                <option value={120}>2 Hours</option>
                            </Select>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                            {isSaving ? <Spinner size="sm" /> : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </Card>
            <Card title="Application Information">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-secondary-600">Application Name:</span><span className="font-medium">{settings.appName}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-600">Current Version:</span><span className="font-medium">{currentVersion}</span></div>
                </div>
            </Card>
             <Card title="Application Changelog">
                <div className="text-sm bg-secondary-50 p-4 rounded-md overflow-y-auto max-h-[60vh]">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                        {CHANGELOG_CONTENT.trim()}
                    </pre>
                </div>
            </Card>
        </div>
    );
};

const MaintenanceSettings = () => {
    const { settings, updateSettings } = useSettings();
    const { user } = useAuth();
    const { showSuccess, showError } = useInfoModal();

    const [maintenanceSettings, setMaintenanceSettings] = useState({
        maintenanceMode: settings.maintenanceMode || false,
        maintenanceMessage: settings.maintenanceMessage || '',
    });

    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMaintenanceSettings({
            maintenanceMode: settings.maintenanceMode || false,
            maintenanceMessage: settings.maintenanceMessage || "We are currently performing system maintenance and will be back online shortly. Thank you for your patience.",
        });
    }, [settings]);

    useEffect(() => {
        const maintenanceDirty = maintenanceSettings.maintenanceMode !== (settings.maintenanceMode || false) ||
            maintenanceSettings.maintenanceMessage !== (settings.maintenanceMessage || "We are currently performing system maintenance and will be back online shortly. Thank you for your patience.");
        
        setIsDirty(maintenanceDirty);
    }, [maintenanceSettings, settings]);

    const handleChange = (key: keyof typeof maintenanceSettings, value: any) => {
        setMaintenanceSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateSettings({ ...maintenanceSettings }, user);
            showSuccess({ title: "Settings Saved", message: "Your settings have been updated successfully." });
        } catch (error) {
            console.error("Failed to save settings:", error);
            showError({ title: "Save Failed", message: "An error occurred while saving." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card title="Maintenance Mode">
                <div className="space-y-6">
                    <div className="p-4 border rounded-md space-y-4">
                        <ToggleSwitch
                            label="Enable Maintenance Mode"
                            description="When enabled, only System Administrators can access the application."
                            enabled={maintenanceSettings.maintenanceMode}
                            onChange={(value) => handleChange('maintenanceMode', value)}
                        />
                        <div className="pt-4 border-t">
                            <Textarea
                                label="Maintenance Message"
                                description="This message will be displayed to users trying to access the site."
                                rows={4}
                                value={maintenanceSettings.maintenanceMessage}
                                onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                                placeholder="e.g., The system is temporarily down for scheduled updates. We expect to be back online around 2:00 PM."
                            />
                        </div>
                    </div>
                </div>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                    {isSaving ? <Spinner size="sm" /> : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
};

interface BulletinPageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (page: Partial<BulletinPage>) => Promise<void>;
    pageData: Partial<BulletinPage> | null;
}

const BulletinPageModal: React.FC<BulletinPageModalProps> = ({ isOpen, onClose, onSave, pageData }) => {
    const [formData, setFormData] = useState<Partial<BulletinPage>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(pageData || {});
        }
    }, [isOpen, pageData]);

    const handleChange = (field: keyof Omit<BulletinPage, 'id'>, value: string | number | undefined) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    
    if (!isOpen) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={formData.id ? "Edit Bulletin Page" : "Add Bulletin Page"}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Page</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Title"
                    value={formData.title || ''}
                    onChange={e => handleChange('title', e.target.value)}
                    required
                    autoFocus
                />
                <Textarea
                    label="Content (Markdown is supported)"
                    rows={10}
                    value={formData.content || ''}
                    onChange={e => handleChange('content', e.target.value)}
                    required
                />
            </form>
        </Modal>
    );
};

const CommunicationSettings: React.FC = () => {
    const { user } = useAuth();
    const { data } = useDatabase();
    const { addNotification } = useNotifications();
    const { showSuccess, showError } = useInfoModal();
    const confirm = useConfirmation();

    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastLink, setBroadcastLink] = useState('');
    const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | Role>('ALL');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    
    const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
    const [editingBulletinPage, setEditingBulletinPage] = useState<Partial<BulletinPage> | null>(null);
    const bulletinPages = useMemo(() => {
        return [...(data.bulletinBoard || [])].sort((a, b) => a.order - b.order);
    }, [data.bulletinBoard]);
    
    const handleOpenBulletinModal = (page?: BulletinPage) => {
        setEditingBulletinPage(page || { title: '', content: '', order: (bulletinPages.length > 0 ? Math.max(...bulletinPages.map(p => p.order)) : 0) + 1 });
        setIsBulletinModalOpen(true);
    };

    const handleSaveBulletinPage = async (pageData: Partial<BulletinPage>) => {
        if (!user || !pageData.title?.trim() || !pageData.content?.trim()) {
            showError({ title: "Validation Error", message: "Title and content are required." });
            return;
        }

        const { id, ...pageToSave } = pageData;
        const finalPageData = { ...pageToSave, order: Number(pageToSave.order || 0) };

        try {
            if (id) {
                await db.ref(`bulletinBoard/${id}`).update(finalPageData);
                await logAuditEvent(user, 'Bulletin Board Update', { title: finalPageData.title });
                showSuccess({ title: "Success", message: "Bulletin page updated." });
            } else {
                await db.ref('bulletinBoard').push(finalPageData);
                await logAuditEvent(user, 'Bulletin Board Create', { title: finalPageData.title });
                showSuccess({ title: "Success", message: "Bulletin page created." });
            }
            setIsBulletinModalOpen(false);
            setEditingBulletinPage(null);
        } catch (error: any) {
            console.error("Failed to save bulletin page:", error);
            showError({ title: "Save Failed", message: error.message });
        }
    };
    
    const handleDeleteBulletinPage = async (page: BulletinPage) => {
        if (!user) return;
        
        const isConfirmed = await confirm({
            title: "Delete Page",
            message: `Are you sure you want to delete the page "${page.title}"? This cannot be undone.`,
            confirmText: "Delete",
            variant: "danger"
        });

        if (isConfirmed) {
            try {
                await db.ref(`bulletinBoard/${page.id}`).remove();
                await logAuditEvent(user, 'Bulletin Board Delete', { pageId: page.id, title: page.title });
                showSuccess({ title: "Deleted", message: "Bulletin page has been deleted." });
            } catch (error: any) {
                console.error("Failed to delete bulletin page:", error);
                showError({ title: "Delete Failed", message: error.message });
            }
        }
    };

    const handleMovePage = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === bulletinPages.length - 1) return;

        const pageToMove = bulletinPages[index];
        const pageToSwapWith = bulletinPages[index + (direction === 'up' ? -1 : 1)];

        if (!pageToMove || !pageToSwapWith) return;

        const updates: Record<string, any> = {};
        updates[`/bulletinBoard/${pageToMove.id}/order`] = pageToSwapWith.order;
        updates[`/bulletinBoard/${pageToSwapWith.id}/order`] = pageToMove.order;

        try {
            await db.ref().update(updates);
            if (user) {
                await logAuditEvent(user, 'Bulletin Board Reorder', { title: pageToMove.title, direction });
            }
            showSuccess({ title: "Success", message: "Bulletin page reordered." });
        } catch (error: any) {
            console.error("Failed to reorder bulletin page:", error);
            showError({ title: "Reorder Failed", message: error.message });
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastMessage.trim()) {
            alert('Notification message cannot be empty.');
            return;
        }
        if (!user) {
            alert('You must be logged in to perform this action.');
            return;
        }

        setIsBroadcasting(true);
        try {
            const activeUsers = data.users.filter(u => u.status === UserStatus.Active);
            
            const targetedUsers = broadcastTarget === 'ALL'
                ? activeUsers
                : activeUsers.filter(u => u.role === broadcastTarget);
            
            for (const targetUser of targetedUsers) {
                await addNotification({
                    userId: targetUser.uid,
                    message: broadcastMessage,
                    link: broadcastLink.trim() || '#',
                    type: 'broadcast',
                });
            }
            
            await logAuditEvent(user, 'Broadcast Sent', { 
                message: broadcastMessage,
                target: broadcastTarget
            });

            alert(`Notification sent to ${targetedUsers.length} users.`);
            setBroadcastMessage('');
            setBroadcastLink('');
            setBroadcastTarget('ALL');
        } catch (error) {
            console.error("Failed to send broadcast:", error);
            alert("An error occurred while sending the notification.");
        } finally {
            setIsBroadcasting(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <Card title="Broadcast Notification">
                <div className="space-y-4">
                    <p className="text-sm text-secondary-600">
                        Send a notification to all active users in the system or target specific roles. This is useful for system-wide announcements.
                    </p>
                    <Textarea
                        label="Message"
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        rows={3}
                        placeholder="Enter your announcement here..."
                        disabled={isBroadcasting}
                    />
                     <Select
                        label="Target Audience"
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value as 'ALL' | Role)}
                        disabled={isBroadcasting}
                    >
                        <option value="ALL">All Active Users</option>
                        {Object.values(Role).map(role => (
                            <option key={role} value={role}>All {role}s</option>
                        ))}
                    </Select>
                    <Input
                        label="Link (Optional)"
                        value={broadcastLink}
                        onChange={(e) => setBroadcastLink(e.target.value)}
                        placeholder="e.g., /reports or https://example.com"
                        disabled={isBroadcasting}
                    />
                    <div className="text-right">
                        <Button onClick={handleSendBroadcast} disabled={isBroadcasting || !broadcastMessage.trim()}>
                            {isBroadcasting ? <Spinner size="sm" /> : 'Send Notification'}
                        </Button>
                    </div>
                </div>
            </Card>
            <Card title="Bulletin Board Management">
                <div className="space-y-4">
                    <p className="text-sm text-secondary-600">
                        Manage the pages that appear on the Bulletin Board. Use the arrows to change the order.
                    </p>
                    <div className="border rounded-md">
                        {bulletinPages.map((page, index) => (
                            <div key={page.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                                <div>
                                    <p className="font-medium text-secondary-800">{page.title}</p>
                                </div>
                                <div className="space-x-1 flex items-center">
                                    <Button size="sm" variant="ghost" onClick={() => handleMovePage(index, 'up')} disabled={index === 0} title="Move Up"><UpArrowIcon/></Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleMovePage(index, 'down')} disabled={index === bulletinPages.length - 1} title="Move Down"><DownArrowIcon/></Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenBulletinModal(page)}>Edit</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDeleteBulletinPage(page)}>Delete</Button>
                                </div>
                            </div>
                        ))}
                         {bulletinPages.length === 0 && (
                            <p className="p-4 text-center text-secondary-500">No bulletin pages have been created yet.</p>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => handleOpenBulletinModal()}>Add New Page</Button>
                    </div>
                </div>
            </Card>

            <BulletinPageModal
                isOpen={isBulletinModalOpen}
                onClose={() => setIsBulletinModalOpen(false)}
                onSave={handleSaveBulletinPage}
                pageData={editingBulletinPage}
            />
        </div>
    );
};

const ModuleSettings = () => {
     const { settings, updateSettings } = useSettings();
     const { user } = useAuth();
     const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
     
     const navItemGroups = useMemo(() => {
        const groups: Record<string, (NavItem | NavSubItem)[]> = { 'Top-Level': [] };
        navigationConfig.forEach(item => {
            if (item.type === 'link') {
                groups['Top-Level'].push(item);
            } else if (item.type === 'group') {
                groups[item.label] = item.items;
            }
        });
        return groups;
    }, []);

    const toggleSection = (label: string) => {
        setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const handleSettingChange = (key: keyof AppSettings, value: any) => {
        if (user) {
            updateSettings({ [key]: value }, user);
        }
    };
    
    const handleToggleNavItem = (path: string, newEnabledState: boolean) => {
        if (!user) return;
        const sanitizedPath = sanitizePathForKey(path);
        const newDisabledItems = {
            ...(settings.disabledNavItems || {}),
            [sanitizedPath]: !newEnabledState,
        };
        if (newDisabledItems[sanitizedPath] === false) {
            delete newDisabledItems[sanitizedPath];
        }
        updateSettings({ disabledNavItems: newDisabledItems }, user);
    };

     const handleToggleGroup = (items: (NavItem | NavSubItem)[], newEnabledState: boolean) => {
        if (!user) return;
        const newDisabledItems = { ...(settings.disabledNavItems || {}) };
        items.forEach(item => {
            const sanitizedPath = sanitizePathForKey(item.path);
            if (!newEnabledState) {
                newDisabledItems[sanitizedPath] = true;
            } else {
                delete newDisabledItems[sanitizedPath];
            }
        });
        updateSettings({ disabledNavItems: newDisabledItems }, user);
    };

     return (
        <div className="space-y-6">
            <Card title="Feature Toggles & Customization">
                 <div className="space-y-4">
                    <p className="text-sm text-secondary-600">
                        Enable or disable major application features. Changes will take effect across the application.
                    </p>
                    <div className="p-4 border rounded-md space-y-4 divide-y divide-secondary-200">
                       <ToggleSwitch
                            label="Enable Chat Module"
                            description="Turns the real-time chat bubble and panel on or off."
                            enabled={settings.enableChat}
                            onChange={(value) => handleSettingChange('enableChat', value)}
                       />
                       <div className="pt-4">
                           <ToggleSwitch
                                label="Enable Barcode Scanner Simulation"
                                description="Shows or hides the 'Scan Item' button on transaction forms."
                                enabled={settings.enableBarcodeScanner}
                                onChange={(value) => handleSettingChange('enableBarcodeScanner', value)}
                           />
                       </div>
                       <div className="pt-4">
                           <ToggleSwitch
                               label="Enable Chat Sound Effects"
                               description="Play sounds when sending or receiving messages."
                               enabled={settings.enableChatSounds}
                               onChange={(value) => handleSettingChange('enableChatSounds', value)}
                           />
                       </div>
                        <div className="pt-4">
                            <Input
                                label="Sidebar Badge Text"
                                id="sidebarBadgeText"
                                name="sidebarBadgeText"
                                type="text"
                                value={settings.sidebarBadgeText}
                                onChange={(e) => handleSettingChange('sidebarBadgeText', e.target.value)}
                                placeholder="e.g., Alpha, Beta, Production"
                                maxLength={20}
                            />
                            <p className="text-xs text-secondary-500 mt-1">Leave empty to hide the badge. Changes are saved automatically.</p>
                        </div>
                    </div>
                </div>
            </Card>
             <Card title="Sidebar Navigation">
                <div className="space-y-4">
                    <p className="text-sm text-secondary-600">
                        Enable or disable specific items in the sidebar navigation menu. This affects all users.
                    </p>
                    <div className="border rounded-md">
                        {Object.entries(navItemGroups).map(([groupName, items]) => {
                            if (items.length === 0) return null;
            
                            const allEnabledInGroup = items.every(item => !settings.disabledNavItems?.[sanitizePathForKey(item.path)]);
                            const isTopLevel = groupName === 'Top-Level';
                            
                            return (
                                <div key={groupName} className="border-b last:border-b-0">
                                    {isTopLevel ? (
                                        <div className="p-4 space-y-4 divide-y divide-secondary-200">
                                            {items.map(item => (
                                                <div key={item.path} className="pt-4 first:pt-0">
                                                    <ToggleSwitch
                                                        label={item.label}
                                                        enabled={!settings.disabledNavItems?.[sanitizePathForKey(item.path)]}
                                                        onChange={(newEnabledState) => handleToggleNavItem(item.path, newEnabledState)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between p-2 hover:bg-secondary-50">
                                                <button onClick={() => toggleSection(groupName)} className="flex items-center gap-2 p-2 flex-grow text-left rounded-md">
                                                    <span className="font-semibold text-secondary-800">{groupName}</span>
                                                    <ChevronDownIcon className={`transform transition-transform duration-200 ${openSections[groupName] ? 'rotate-180' : ''}`} />
                                                </button>
                                                <div className="pr-2 flex-shrink-0">
                                                    <ToggleSwitch 
                                                        label="All"
                                                        enabled={allEnabledInGroup}
                                                        onChange={(newState) => handleToggleGroup(items, newState)}
                                                    />
                                                </div>
                                            </div>
                                            {openSections[groupName] && (
                                                <div className="p-4 pl-8 space-y-4 border-t divide-y divide-secondary-200">
                                                    {items.map(item => (
                                                         <div key={item.path} className="pt-4 first:pt-0">
                                                            <ToggleSwitch
                                                                label={item.label}
                                                                enabled={!settings.disabledNavItems?.[sanitizePathForKey(item.path)]}
                                                                onChange={(newEnabledState) => handleToggleNavItem(item.path, newEnabledState)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </div>
    );
};

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const isSystemAdmin = user?.role === Role.SystemAdministrator;

    const tabs = [
        { id: 'general', label: 'General & System' },
        { id: 'modules', label: 'Modules & Features' },
        { id: 'communication', label: 'Communication' },
        ...(isSystemAdmin ? [{ id: 'data', label: 'Data Management' }] : []),
        ...(isSystemAdmin ? [{ id: 'maintenance', label: 'Maintenance' }] : [])
    ];

    return (
        <div>
            <h2 className="text-3xl font-semibold text-secondary-800 mb-6">System Settings</h2>

            <div className="flex flex-col md:flex-row gap-8">
                <nav className="flex flex-row md:flex-col md:w-1/4 lg:w-1/5 -mx-4 md:mx-0" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group flex items-center px-4 py-2 text-sm font-medium rounded-md w-full text-left ${
                                activeTab === tab.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="flex-1">
                    <div className="space-y-6">
                        {activeTab === 'general' && isSystemAdmin && <GeneralSettings />}
                        {activeTab === 'modules' && isSystemAdmin && <ModuleSettings />}
                        {activeTab === 'communication' && isSystemAdmin && <CommunicationSettings />}
                        {activeTab === 'data' && isSystemAdmin && <DataManagement />}
                        {activeTab === 'maintenance' && isSystemAdmin && <MaintenanceSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;