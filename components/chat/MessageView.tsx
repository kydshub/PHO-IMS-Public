
import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { useDatabase } from '../../hooks/useDatabase';
import { Spinner } from '../ui/Spinner';
import { formatLastSeen } from '../../utils/formatters';

interface MessageViewProps {
    conversationId: string;
    onBack: () => void;
}

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;

const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};


const MessageView: React.FC<MessageViewProps> = ({ conversationId, onBack }) => {
    const { user } = useAuth();
    const { conversations, messages, sendMessage, markConversationAsRead } = useChat();
    const { data } = useDatabase();
    const { users, presences } = data;
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const conversation = conversations.find(c => c.id === conversationId);
    const otherParticipantId = conversation ? Object.keys(conversation.participantIds).find(id => id !== user?.uid) : null;
    const participant = otherParticipantId ? users.find(u => u.uid === otherParticipantId) : null;
    const participantPresence = otherParticipantId ? presences?.[otherParticipantId] : null;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages[conversationId]]);

    useEffect(() => {
        markConversationAsRead(conversationId);
    }, [conversationId, markConversationAsRead]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(conversationId, newMessage);
            setNewMessage('');
        }
    };

    if (!conversation || !participant) {
        return <div className="p-4 flex items-center justify-center h-full"><Spinner /></div>;
    }

    let lastDate: string | null = null;

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center p-4 border-b gap-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary-100" aria-label="Back to conversations">
                    <BackIcon />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${participantPresence?.isOnline ? 'bg-green-500 text-white' : 'bg-primary-200 text-primary-700'}`}>
                    {participant.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-semibold text-secondary-900">{participant.name}</h3>
                    {participantPresence?.isOnline ? (
                        <p className="text-xs text-green-600 font-medium">Online</p>
                    ) : (
                        <p className="text-xs text-secondary-500">
                            {participantPresence?.lastSeen ? formatLastSeen(participantPresence.lastSeen) : 'Offline'}
                        </p>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2">
                {(messages[conversationId] || []).map(msg => {
                    const msgDate = new Date(msg.timestamp).toDateString();
                    let dateSeparator = null;
                    if (msgDate !== lastDate) {
                        dateSeparator = (
                            <div className="text-center my-2">
                                <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded-full">
                                    {formatDateSeparator(msg.timestamp)}
                                </span>
                            </div>
                        );
                        lastDate = msgDate;
                    }

                    return (
                        <Fragment key={msg.id}>
                            {dateSeparator}
                            <div className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.senderId === user?.uid ? 'bg-primary-600 text-white' : 'bg-secondary-200 text-secondary-900'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                    <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-200' : 'text-secondary-500'} text-right`}>
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </p>
                                </div>
                            </div>
                        </Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 block w-full px-3 py-2 bg-white text-secondary-900 border border-secondary-300 rounded-full shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        autoComplete="off"
                    />
                    <button type="submit" className="bg-primary-600 text-white rounded-full p-3 shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        <SendIcon />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MessageView;
