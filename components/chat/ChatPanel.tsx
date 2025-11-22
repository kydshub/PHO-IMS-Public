
import React, { useState } from 'react';
import ConversationList from './ConversationList';
import MessageView from './MessageView';
import NewConversationModal from './NewConversationModal';

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose }) => {
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isNewConvoModalOpen, setIsNewConvoModalOpen] = useState(false);

    const handleSelectConversation = (conversationId: string) => {
        setActiveConversationId(conversationId);
    };

    const handleStartNewConversation = () => {
        // This will be handled by the NewConversationModal, which will call useChat.startConversation
        // and then select it.
        setIsNewConvoModalOpen(true);
    };

    const handleBackToList = () => {
        setActiveConversationId(null);
    };
    
    const handleNewConversationStarted = (conversationId: string) => {
        setActiveConversationId(conversationId);
        setIsNewConvoModalOpen(false);
    }

    return (
        <>
        <div
            className={`fixed bottom-24 right-6 z-40 w-[calc(100%-3rem)] max-w-md h-[70vh] bg-white rounded-lg shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            }`}
        >
            {activeConversationId ? (
                <MessageView conversationId={activeConversationId} onBack={handleBackToList} />
            ) : (
                <ConversationList onSelectConversation={handleSelectConversation} onNewConversation={handleStartNewConversation} />
            )}
        </div>
        {isNewConvoModalOpen && (
            <NewConversationModal
                isOpen={isNewConvoModalOpen}
                onClose={() => setIsNewConvoModalOpen(false)}
                onConversationStarted={handleNewConversationStarted}
            />
        )}
        </>
    );
};

export default ChatPanel;
