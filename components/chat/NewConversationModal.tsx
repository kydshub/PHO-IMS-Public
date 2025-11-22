

import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useDatabase } from '../../hooks/useDatabase';
import { User } from '../../types';

interface NewConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConversationStarted: (conversationId: string) => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ isOpen, onClose, onConversationStarted }) => {
    const { user } = useAuth();
    const { startConversation } = useChat();
    const { data } = useDatabase();
    const { users: allUsers, presences, facilities } = data;
    const [searchTerm, setSearchTerm] = useState('');

    const users = useMemo(() => {
        const facilityMap = new Map(facilities.map(f => [f.id, f.name]));
        return allUsers
            .filter(u => u.uid !== user?.uid)
            .map(u => ({
                ...u,
                facilityName: u.facilityId ? facilityMap.get(u.facilityId) || 'Unknown Facility' : 'No Facility Assigned',
                isOnline: presences?.[u.uid]?.isOnline || false,
            }))
            .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [user, searchTerm, allUsers, facilities, presences]);
    
    const handleSelectUser = (targetUser: User) => {
        startConversation(targetUser.uid).then(conversationId => {
            onConversationStarted(conversationId);
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Start New Conversation">
            <div className="space-y-4">
                <Input
                    placeholder="Search for a user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
                <div className="max-h-80 overflow-y-auto border rounded-md">
                    {users.length > 0 ? (
                        <ul className="divide-y divide-secondary-200">
                            {users.map(u => {
                                const isOnline = presences?.[u.uid]?.isOnline || false;
                                return (
                                <li key={u.uid}>
                                    <button
                                        onClick={() => handleSelectUser(u)}
                                        className="w-full text-left p-3 flex items-center gap-3 hover:bg-secondary-50"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${isOnline ? 'bg-green-500 text-white' : 'bg-primary-200 text-primary-700'}`}>
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-secondary-800">{u.name}</p>
                                            <p className="text-sm text-secondary-500">{u.position || u.role}</p>
                                            <p className="text-xs text-primary-700 font-medium">{u.facilityName}</p>
                                        </div>
                                    </button>
                                </li>
                            )})}
                        </ul>
                    ) : (
                        <p className="text-center p-6 text-secondary-500">No users found.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default NewConversationModal;
