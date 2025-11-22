import React, { createContext, useContext, ReactNode, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { useAuth } from './useAuth';
import { db } from '../services/firebase';
import { useSettings } from './useSettings';
import { playSound } from '../utils/sound';

// Types updated to use server-side numeric timestamps for accuracy and easier sorting.
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string; // user.uid
  text: string;
  timestamp: number; // Milliseconds since epoch from server
}

export interface Conversation {
  id: string;
  participantIds: Record<string, boolean>;
  lastMessage?: ChatMessage;
  lastUpdated: number; // Milliseconds since epoch from server
  unreadCounts: Record<string, number>; // key: userId, value: count
}


interface ChatContextType {
    conversations: Conversation[];
    messages: Record<string, ChatMessage[]>;
    totalUnreadCount: number;
    startConversation: (targetUserId: string) => Promise<string>; // returns conversationId
    sendMessage: (conversationId: string, text: string) => Promise<void>;
    markConversationAsRead: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [conversationIds, setConversationIds] = useState<string[]>([]);
    const previousConversationsRef = useRef<Conversation[]>([]);

    useEffect(() => {
        previousConversationsRef.current = conversations;
    }, [conversations]);

    // Effect 1: Listen for the current user's list of conversation IDs
    useEffect(() => {
        if (!user) {
            setConversationIds([]);
            return;
        }

        const userConvosRef = db.ref(`user-conversations/${user.uid}`);
        const listener = (snapshot: firebase.database.DataSnapshot) => {
            const val = snapshot.val();
            const ids = val ? Object.keys(val) : [];
            setConversationIds(ids);
        };

        userConvosRef.on('value', listener);

        return () => {
            userConvosRef.off('value', listener);
        };
    }, [user]);

    // Effect 2: Listen for details of each conversation the user is a part of
    useEffect(() => {
        if (conversationIds.length === 0) {
            setConversations([]);
            return;
        }

        const listeners: { ref: firebase.database.Reference, listener: any }[] = [];

        conversationIds.forEach(convoId => {
            const convoRef = db.ref(`conversations/${convoId}`);
            const listener = async (snapshot: firebase.database.DataSnapshot) => {
                const val = snapshot.val();
                
                if (val && user && settings.enableChatSounds) {
                    const newConvoData: Conversation = { ...val, id: convoId };
                    const oldConvo = previousConversationsRef.current.find(c => c.id === convoId);
                    
                    const oldUnread = oldConvo?.unreadCounts?.[user.uid] || 0;
                    const newUnread = newConvoData.unreadCounts?.[user.uid] || 0;

                    if (newUnread > oldUnread) {
                        await playSound('messageReceived');
                    }
                }

                setConversations(prevConvos => {
                    const newConvos = prevConvos.filter(c => c.id !== convoId); // Remove old version if exists
                    if (val) {
                        newConvos.push({ ...val, id: convoId }); // Add new/updated version
                    }
                    return newConvos;
                });
            };
            convoRef.on('value', listener);
            listeners.push({ ref: convoRef, listener });
        });

        // Cleanup when conversationIds array changes
        return () => {
            listeners.forEach(({ ref, listener }) => ref.off('value', listener));
            setConversations(prevConvos => prevConvos.filter(c => conversationIds.includes(c.id)));
        };
    }, [conversationIds, user, settings.enableChatSounds]);


    // Create a stable key based on conversation IDs. This effect will only re-run
    // when conversations are added or removed, not on every message update.
    const conversationIdsKey = useMemo(() => conversations.map(c => c.id).sort().join(','), [conversations]);

    // Effect to fetch and listen for messages for each conversation
    useEffect(() => {
        const listeners: { ref: firebase.database.Query, listener: any }[] = [];
        const currentConvoIds = conversationIdsKey ? conversationIdsKey.split(',') : [];

        currentConvoIds.forEach(convoId => {
            const messagesRef = db.ref(`chatMessages/${convoId}`).orderByChild('timestamp').limitToLast(100);
            const listener = (snapshot: firebase.database.DataSnapshot) => {
                const val = snapshot.val();
                const formattedMessages: ChatMessage[] = val 
                    ? Object.entries(val).map(([id, dataObj]: [string, any]) => ({ ...dataObj, id }))
                    : [];

                setMessages(prevMessages => ({
                    ...prevMessages,
                    [convoId]: formattedMessages.sort((a, b) => a.timestamp - b.timestamp)
                }));
            };
            messagesRef.on('value', listener);
            listeners.push({ ref: messagesRef, listener });
        });
        
        // This cleanup runs when conversationIdsKey changes (a convo is added/removed),
        // detaching all old listeners before the new set is attached.
        return () => {
            listeners.forEach(({ ref, listener }) => ref.off('value', listener));
        };
    }, [conversationIdsKey]);


    const sendMessage = useCallback(async (conversationId: string, text: string) => {
        if (!user || !text.trim()) return;

        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) {
            console.error("Attempted to send message to a non-existent conversation.");
            return;
        }

        const otherParticipantId = Object.keys(conversation.participantIds).find(id => id !== user.uid);
        if (!otherParticipantId) return;

        const currentUnread = conversation.unreadCounts?.[otherParticipantId] || 0;

        try {
            const updates: { [key: string]: any } = {};
            const newMessageKey = db.ref(`chatMessages/${conversationId}`).push().key;
            if (!newMessageKey) throw new Error("Could not generate a key for the new message.");
            
            const serverTimestamp = firebase.database.ServerValue.TIMESTAMP;

            const newMessageForDb = {
                conversationId,
                senderId: user.uid,
                text: text.trim(),
                timestamp: serverTimestamp,
            };

            updates[`/chatMessages/${conversationId}/${newMessageKey}`] = newMessageForDb;
            updates[`/conversations/${conversationId}/lastMessage`] = { ...newMessageForDb, id: newMessageKey };
            updates[`/conversations/${conversationId}/lastUpdated`] = serverTimestamp;
            updates[`/conversations/${conversationId}/unreadCounts/${otherParticipantId}`] = currentUnread + 1;
            
            await db.ref().update(updates);
            if (settings.enableChatSounds) {
                await playSound('messageSent');
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    }, [user, conversations, settings.enableChatSounds]);
    
    const startConversation = useCallback(async (targetUserId: string): Promise<string> => {
        if (!user) throw new Error("User not authenticated");

        const existingConvo = conversations.find(c => 
            c.participantIds &&
            c.participantIds[user.uid] &&
            c.participantIds[targetUserId] &&
            Object.keys(c.participantIds).length === 2
        );

        if (existingConvo) {
            return existingConvo.id;
        }
        
        const newConvoRef = db.ref('conversations').push();
        const newConvoId = newConvoRef.key!;

        const newConvoData = {
            participantIds: {
                [user.uid]: true,
                [targetUserId]: true,
            },
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            unreadCounts: {
                [user.uid]: 0,
                [targetUserId]: 0,
            }
        };
        
        const updates: Record<string, any> = {};
        updates[`/conversations/${newConvoId}`] = newConvoData;
        updates[`/user-conversations/${user.uid}/${newConvoId}`] = newConvoData.participantIds;
        updates[`/user-conversations/${targetUserId}/${newConvoId}`] = newConvoData.participantIds;

        await db.ref().update(updates);

        return newConvoId;
    }, [user, conversations]);

    const markConversationAsRead = useCallback(async (conversationId: string) => {
        if (!user) return;
        const updates: Record<string, any> = {};
        updates[`/conversations/${conversationId}/unreadCounts/${user.uid}`] = 0;
        await db.ref().update(updates);
    }, [user]);

    const totalUnreadCount = useMemo(() => {
        if (!user) return 0;
        return conversations
            .reduce((total, convo) => total + (convo.unreadCounts?.[user.uid] || 0), 0);
    }, [conversations, user]);

    const value = {
        conversations,
        messages,
        totalUnreadCount,
        startConversation,
        sendMessage,
        markConversationAsRead,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
