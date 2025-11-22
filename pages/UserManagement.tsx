import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { ImpersonationConfirmationModal } from '../components/ui/ImpersonationConfirmationModal';
import { SuspendUserConfirmationModal } from '../components/ui/SuspendUserConfirmationModal';
import { ReactivateUserConfirmationModal } from '../components/ui/ReactivateUserConfirmationModal';
import { User, Role, Facility, UserStatus, FacilityStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useDatabase } from '../hooks/useDatabase';
import { db } from '../services/firebase';
import { ManagementPageHeader } from '../components/ui/ManagementPageHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { useSort } from '../hooks/useSort';
import { SortableHeader } from '../components/ui/SortableHeader';
import UserImportModal from '../components/ui/UserImportModal';
import { logAuditEvent } from '../services/audit';
import { useConfirmation } from '../hooks/useConfirmation';

// Icons
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SuspendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;
const ReactivateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ImpersonateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8V6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v4"/><path d="M7 10h10"/><path d="M10 16v-4"/><path d="M14 16v-4"/><path d="M22 14v-2a4 4 0 0 0-4-4h-2"/><path d="M20 18h2a2 2 0 0 0 2-2v-2"/><path d="M4 14a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"/></svg>;


const UserManagement: React.FC = () => {
    const { user: currentUser, register, impersonate } = useAuth();
    const { data } = useDatabase();
    const { users, facilities } = data;
    const navigate = useNavigate();
    const location = useLocation();
    const confirm = useConfirmation();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImpersonateModalOpen, setIsImpersonateModalOpen] = useState(false);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
    
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToModify, setUserToModify] = useState<User | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [facilityFilter, setFacilityFilter] = useState((location.state as any)?.preselectedFacilityId || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    
    const canImport = currentUser?.role === Role.Admin || currentUser?.role === Role.SystemAdministrator;
    const canImpersonate = currentUser?.role === Role.SystemAdministrator;

    useEffect(() => {
        if ((location.state as any)?.preselectedFacilityId) {
            navigate(location.pathname, { replace: true, state: undefined });
        }
    }, [location.state, navigate, location.pathname]);
    
    const augmentedUsers = useMemo(() => {
        return users.map(user => ({
            ...user,
            facilityName: facilities.find(f => f.id === user.facilityId)?.name || 'N/A'
        }));
    }, [users, facilities]);

    const filteredUsers = useMemo(() => {
        return augmentedUsers.filter(user => {
            const searchMatch = !searchTerm || user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const roleMatch = !roleFilter || user.role === roleFilter;
            const statusMatch = !statusFilter || user.status === statusFilter;
            const facilityMatch = !facilityFilter || user.facilityId === facilityFilter;
            return searchMatch && roleMatch && statusMatch && facilityMatch;
        });
    }, [augmentedUsers, searchTerm, roleFilter, statusFilter, facilityFilter]);

    const { sortedItems: sortedUsers, requestSort, sortConfig } = useSort(filteredUsers, { key: 'name', direction: 'ascending' });
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, statusFilter, facilityFilter, itemsPerPage, sortConfig]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedUsers, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const startItemIndex = (currentPage - 1) * itemsPerPage;
    const endItemIndex = Math.min(startItemIndex + itemsPerPage, sortedUsers.length);

    const openAddModal = () => { setEditingUser(null); setIsModalOpen(true); };
    const openEditModal = (user: User) => { setEditingUser(user); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingUser(null); };
    const openDeleteModal = (user: User) => { setUserToModify(user); setIsDeleteModalOpen(true); };
    const openImpersonateModal = (user: User) => { setUserToModify(user); setIsImpersonateModalOpen(true); };
    const openSuspendModal = (user: User) => { setUserToModify(user); setIsSuspendModalOpen(true); };
    const openReactivateModal = (user: User) => { setUserToModify(user); setIsReactivateModalOpen(true); };

    const handleSaveUser = async (userData: Partial<User>, password?: string) => {
        if (!currentUser) return;
        if (!userData.email || !userData.name || !userData.role) {
            alert('Name, email, and role are required.');
            return;
        }

        if (editingUser) { // Update existing user
            const { uid, ...dataToUpdate } = userData;
            await db.ref(`users/${editingUser.uid}`).update(dataToUpdate);
            await logAuditEvent(currentUser, 'User Update', { targetUser: editingUser.email, changes: dataToUpdate });
        } else { // Create new user
            if (!password) {
                alert('Password is required for new users.');
                return;
            }
            try {
                const newUser = {
                    name: userData.name,
                    email: userData.email,
                    position: userData.position || '',
                    role: userData.role,
                    facilityId: userData.facilityId || '',
                };
                const { user } = await register(newUser, password);
                await logAuditEvent(currentUser, 'User Create', { newUserEmail: newUser.email, role: newUser.role });
            } catch (error: any) {
                alert(`Error creating user: ${error.message}`);
            }
        }
        closeModal();
    };
    
    const confirmDeleteUser = async () => {
        if (!userToModify || !currentUser) return;
        await db.ref(`users/${userToModify.uid}`).remove();
        await logAuditEvent(currentUser, 'User Delete', { deletedUser: userToModify.email });
        setIsDeleteModalOpen(false);
        setUserToModify(null);
    };
    
    const confirmImpersonateUser = () => {
        if (!userToModify) return;
        impersonate(userToModify, navigate);
        setIsImpersonateModalOpen(false);
    };
    
    const confirmSuspendUser = async () => {
        if (!userToModify || !currentUser) return;
        await db.ref(`users/${userToModify.uid}`).update({ status: UserStatus.Suspended });
        await logAuditEvent(currentUser, 'User Suspend', { targetUser: userToModify.email });
        setIsSuspendModalOpen(false);
    };

    const confirmReactivateUser = async () => {
        if (!userToModify || !currentUser) return;
        const updates: any = { status: UserStatus.Active };
        if(userToModify.previousRole){
            updates.previousRole = null;
        }
        await db.ref(`users/${userToModify.uid}`).update(updates);
        await logAuditEvent(currentUser, 'User Reactivate', { targetUser: userToModify.email });
        setIsReactivateModalOpen(false);
    };
    
    const handleImport = async (newUsers: (Omit<User, 'uid' | 'status'> & { password?: string })[]) => {
        if (!currentUser || !newUsers || newUsers.length === 0) return;
        try {
            for (const newUser of newUsers) {
                const { password, ...userData } = newUser;
                if(password){
                    await register(userData, password);
                }
            }
            await logAuditEvent(currentUser, 'Bulk Import: Users', { count: newUsers.length });
            alert(`${newUsers.length} users imported successfully! They will need to reset their password on first login.`);
            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Error importing users:", error);
            alert("An error occurred during import.");
        }
    };

    const exportToCSV = () => {
        const headers = ['name', 'position', 'email', 'role', 'status', 'facilityName'];
        const csvRows = [headers.join(','), ...sortedUsers.map(user => [
            `"${user.name}"`,
            `"${user.position || ''}"`,
            `"${user.email}"`,
            user.role,
            user.status,
            `"${user.facilityName}"`
        ].join(','))];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.csv';
        a.click();
        URL.revokeObjectURL(url);
    };
    
    const handlePrint = () => {
        const roleName = roleFilter || 'All';
        const statusName = statusFilter || 'All';
        const facilityName = facilityFilter ? facilities.find(f => f.id === facilityFilter)?.name : 'All';
        const filterCriteria = { searchTerm, role: roleName, status: statusName, facility: facilityName };
        navigate('/print/users', { state: { items: sortedUsers, filterCriteria, generatedDate: new Date().toISOString() } });
    };

    // --- Bulk Action Logic ---
    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const paginatedUserIds = useMemo(() => paginatedUsers.map(u => u.uid), [paginatedUsers]);
    const selectedOnPageCount = useMemo(() => paginatedUserIds.filter(id => selectedUserIds.includes(id)).length, [paginatedUserIds, selectedUserIds]);
    
    useEffect(() => {
        if (headerCheckboxRef.current) {
            headerCheckboxRef.current.checked = selectedOnPageCount === paginatedUserIds.length && paginatedUserIds.length > 0;
            headerCheckboxRef.current.indeterminate = selectedOnPageCount > 0 && selectedOnPageCount < paginatedUserIds.length;
        }
    }, [selectedOnPageCount, paginatedUserIds.length]);
    
    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserIds(prev => [...new Set([...prev, ...paginatedUserIds])]);
        } else {
            setSelectedUserIds(prev => prev.filter(id => !paginatedUserIds.includes(id)));
        }
    };

    const handleSelectUser = (userId: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedUserIds(prev => [...prev, userId]);
        } else {
            setSelectedUserIds(prev => prev.filter(id => id !== userId));
        }
    };

    const handleBulkAction = async (action: 'suspend' | 'reactivate' | 'delete') => {
        const usersToModify = users.filter(u => selectedUserIds.includes(u.uid));
        if (usersToModify.length === 0) return;

        const actionText = action.charAt(0).toUpperCase() + action.slice(1);
        const isConfirmed = await confirm({
            title: `${actionText} ${usersToModify.length} Users?`,
            message: `Are you sure you want to ${action} the selected user accounts? This action will apply to all selected users.`,
            confirmText: `${actionText} Users`,
            variant: action === 'delete' ? 'danger' : 'primary',
        });

        if (isConfirmed) {
            const updates: Record<string, any> = {};
            selectedUserIds.forEach(uid => {
                switch(action) {
                    case 'suspend': updates[`/users/${uid}/status`] = UserStatus.Suspended; break;
                    case 'reactivate': updates[`/users/${uid}/status`] = UserStatus.Active; break;
                    case 'delete': updates[`/users/${uid}`] = null; break;
                }
            });

            try {
                await db.ref().update(updates);
                if (currentUser) {
                    await logAuditEvent(currentUser, `Bulk User ${actionText}`, { userCount: selectedUserIds.length, userIds: selectedUserIds });
                }
                setSelectedUserIds([]);
            } catch (error) {
                console.error(`Failed to ${action} users:`, error);
                alert(`An error occurred while attempting to ${action} users.`);
            }
        }
    };

    return (
        <div>
            <ManagementPageHeader
                title="User Management"
                onPrint={handlePrint}
                onExport={exportToCSV}
                onImport={canImport ? () => setIsImportModalOpen(true) : undefined}
                onAddNew={openAddModal}
                addNewText="Add New User"
            />
             <Card noPadding footer={
                 <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={sortedUsers.length}
                    startItemIndex={startItemIndex}
                    endItemIndex={endItemIndex}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                 />
            }>
                 <div className="p-4 border-b grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="">All Roles</option>
                        {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                    </Select>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All Statuses</option>
                        {Object.values(UserStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </Select>
                    <Select value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)}>
                        <option value="">All Facilities</option>
                        {facilities.filter(f => f.status === FacilityStatus.Active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                </div>
                <div>
                    {selectedUserIds.length > 0 && (
                        <div className="bg-primary-50 border-b border-primary-200 p-2 flex justify-between items-center">
                            <span className="text-sm font-semibold text-primary-800 px-4">{selectedUserIds.length} user(s) selected</span>
                            <div className="space-x-2">
                                 <Button size="sm" variant="secondary" onClick={() => handleBulkAction('suspend')}>Suspend</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleBulkAction('reactivate')}>Reactivate</Button>
                                <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>Delete</Button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        <input type="checkbox" ref={headerCheckboxRef} onChange={handleSelectAllOnPage} className="h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500" />
                                    </th>
                                    {/* FIX: Added missing 'children' prop to 'SortableHeader' components. */}
                                    <SortableHeader sortKey="name" requestSort={requestSort} sortConfig={sortConfig}>Name</SortableHeader>
                                    <SortableHeader sortKey="role" requestSort={requestSort} sortConfig={sortConfig}>Role</SortableHeader>
                                    <SortableHeader sortKey="status" requestSort={requestSort} sortConfig={sortConfig}>Status</SortableHeader>
                                    <SortableHeader sortKey="facilityName" requestSort={requestSort} sortConfig={sortConfig}>Facility</SortableHeader>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {paginatedUsers.map((user) => (
                                    <tr key={user.uid} className={`${selectedUserIds.includes(user.uid) ? 'bg-primary-50' : ''} hover:bg-secondary-50`}>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUserIds.includes(user.uid)} 
                                                onChange={(e) => handleSelectUser(user.uid, e.target.checked)} 
                                                className="h-4 w-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-secondary-200" 
                                                disabled={currentUser?.uid === user.uid}
                                                title={currentUser?.uid === user.uid ? "You cannot select your own account for bulk actions." : ""}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-secondary-900">{user.name}</div>
                                            <div className="text-xs text-secondary-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{user.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === UserStatus.Active ? 'bg-green-100 text-green-800' : 'bg-secondary-200 text-secondary-800'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{user.facilityName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                            {canImpersonate && currentUser?.uid !== user.uid && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openImpersonateModal(user)}
                                                    title={user.requiresPasswordChange ? "Cannot impersonate: User has not set their password yet." : "Impersonate User"}
                                                    disabled={!!user.requiresPasswordChange}
                                                >
                                                    <ImpersonateIcon />
                                                </Button>
                                            )}
                                            {user.status === UserStatus.Active ? (
                                                <Button variant="ghost" size="sm" onClick={() => openSuspendModal(user)} title={currentUser?.uid === user.uid ? "You cannot suspend yourself." : "Suspend User"} disabled={currentUser?.uid === user.uid}><SuspendIcon /></Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => openReactivateModal(user)} title="Reactivate User"><ReactivateIcon /></Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}><EditIcon /></Button>
                                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(user)} title={currentUser?.uid === user.uid ? "You cannot delete yourself." : "Delete User"} disabled={currentUser?.uid === user.uid}><TrashIcon /></Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {paginatedUsers.length === 0 && (
                            <div className="text-center p-8 text-secondary-500">
                                No users match the current filters.
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <UserFormModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveUser}
                user={editingUser}
                facilities={facilities}
                currentUser={currentUser}
            />
            <UserImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
                facilities={facilities}
            />
             <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteUser}
                itemName={userToModify?.name || ''}
                itemType="user"
            />
            <ImpersonationConfirmationModal
                isOpen={isImpersonateModalOpen}
                onClose={() => setIsImpersonateModalOpen(false)}
                onConfirm={confirmImpersonateUser}
                userToImpersonate={userToModify}
            />
             <SuspendUserConfirmationModal
                isOpen={isSuspendModalOpen}
                onClose={() => setIsSuspendModalOpen(false)}
                onConfirm={confirmSuspendUser}
                userToSuspend={userToModify}
            />
            <ReactivateUserConfirmationModal
                isOpen={isReactivateModalOpen}
                onClose={() => setIsReactivateModalOpen(false)}
                onConfirm={confirmReactivateUser}
                userToReactivate={userToModify}
            />
        </div>
    );
};

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Partial<User>, password?: string) => void;
    user: User | null;
    facilities: Facility[];
    currentUser: User | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user, facilities, currentUser }) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [password, setPassword] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setFormData(user ? { ...user } : { name: '', email: '', position: '', role: Role.User, status: UserStatus.Active, facilityId: '' });
            setPassword('');
        }
    }, [isOpen, user]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, password);
    };
    
    const isEditingSelf = user && currentUser && user.uid === currentUser.uid;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={user ? 'Edit User' : 'Add New User'}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} type="submit">{user ? 'Save Changes' : 'Add User'}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Full Name" name="name" type="text" value={formData.name || ''} onChange={handleChange} required autoFocus />
                <Input label="Email Address" name="email" type="email" value={formData.email || ''} onChange={handleChange} required disabled={!!user} />
                <Input label="Position" name="position" type="text" value={formData.position || ''} onChange={handleChange} />
                <Select label="Role" name="role" value={formData.role || ''} onChange={handleChange} required disabled={isEditingSelf}>
                    {Object.values(Role).map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </Select>
                 <Select label="Facility" name="facilityId" value={formData.facilityId || ''} onChange={handleChange}>
                    <option value="">No Facility Assigned</option>
                    {facilities.filter(f => f.status === FacilityStatus.Active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
                {!user && (
                    <Input 
                        label="Password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                    />
                )}
            </form>
        </Modal>
    );
};

export default UserManagement;