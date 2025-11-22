import React, { useMemo } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { useDatabase } from '../../hooks/useDatabase';
import { UserPresence } from '../../types';

interface ConversationListProps {
    onSelectConversation: (conversationId: string) => void;
    onNewConversation: () => void;
}

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;

const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation, onNewConversation }) => {
    const { user } = useAuth();
    const { conversations } = useChat();
    const { data } = useDatabase();
    const { users, presences } = data;

    const onlineUsersCount = useMemo(() => {
        if (!presences) return 0;
        return Object.values(presences).filter((p: any) => p.isOnline).length;
    }, [presences]);

    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    }, [conversations]);
    
    const getParticipantDetails = (participantIds: Record<string, boolean>) => {
        if (!user) return null;
        const otherUserId = Object.keys(participantIds).find(id => id !== user.uid);
        const participantUser = users.find(u => u.uid === otherUserId);
        if (!participantUser) return null;
        const isOnline = (presences as any)?.[otherUserId || '']?.isOnline || false;
        return { user: participantUser, isOnline };
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
        if (diffSeconds < 60) return `${diffSeconds}s`;
        const diffMinutes = Math.round(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m`;
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-semibold text-secondary-900">Conversations</h3>
                    <span className="text-sm text-secondary-500">({onlineUsersCount} online)</span>
                </div>
                <button onClick={onNewConversation} className="p-2 rounded-full hover:bg-secondary-100" aria-label="New Conversation">
                    <PlusIcon />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {sortedConversations.length > 0 ? (
                    <ul>
                        {sortedConversations.map(convo => {
                            const { user: participant, isOnline } = getParticipantDetails(convo.participantIds) || {};
                            if (!user || !participant) return null;
                            const unreadCount = convo.unreadCounts?.[user.uid] || 0;

                            return (
                                <li key={convo.id} onClick={() => onSelectConversation(convo.id)} className="p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary-50 border-b">
                                    <div className="relative flex-shrink-0">
                                        <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold ${isOnline ? 'bg-green-500 text-white' : 'bg-primary-200 text-primary-700'}`}>
                                            {participant.name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className={`font-semibold truncate ${unreadCount > 0 ? 'text-secondary-900' : 'text-secondary-700'}`}>{participant.name}</p>
                                            {convo.lastMessage?.timestamp && <p className="text-xs text-secondary-500 flex-shrink-0 ml-2">{formatTime(convo.lastMessage.timestamp)}</p>}
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm truncate ${unreadCount > 0 ? 'text-secondary-700 font-medium' : 'text-secondary-500'}`}>
                                                {convo.lastMessage?.text || 'No messages yet'}
                                            </p>
                                            {unreadCount > 0 && <span className="ml-2 mt-1 flex-shrink-0 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">{unreadCount}</span>}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center p-8 text-secondary-500">
                        <p>No conversations yet.</p>
                        <p className="text-sm">Start a new one to begin chatting.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationList;