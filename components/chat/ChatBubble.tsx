
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatPanel from './ChatPanel';

const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const ChatBubble: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { totalUnreadCount } = useChat();
    
    const [position, setPosition] = useState<React.CSSProperties>({
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
    });
    const [isDragging, setIsDragging] = useState(false);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const isClick = useRef(true);

    useEffect(() => {
        const savedPos = localStorage.getItem('chatBubblePosition');
        if (savedPos) {
            setPosition(JSON.parse(savedPos));
        }
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!bubbleRef.current) return;
        isClick.current = true;
        setIsDragging(true);
        const rect = bubbleRef.current.getBoundingClientRect();
        dragStartPos.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        // Prevent text selection during drag
        e.preventDefault();
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !bubbleRef.current) return;
            isClick.current = false;

            const newX = e.clientX - dragStartPos.current.x;
            const newY = e.clientY - dragStartPos.current.y;

            const maxX = window.innerWidth - bubbleRef.current.offsetWidth;
            const maxY = window.innerHeight - bubbleRef.current.offsetHeight;

            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));

            setPosition({
                position: 'fixed',
                top: `${constrainedY}px`,
                left: `${constrainedX}px`,
            });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setTimeout(() => {
                    if (bubbleRef.current) {
                        const finalRect = bubbleRef.current.getBoundingClientRect();
                        const posToSave = {
                            position: 'fixed',
                            top: `${finalRect.top}px`,
                            left: `${finalRect.left}px`,
                        };
                        localStorage.setItem('chatBubblePosition', JSON.stringify(posToSave));
                    }
                }, 0);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleClick = () => {
        if (isClick.current) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <>
            <div
                ref={bubbleRef}
                style={position}
                className="z-50"
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <button
                    className={`bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-transform ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-110'}`}
                    aria-label={isOpen ? "Close chat" : `Open chat, ${totalUnreadCount} unread messages`}
                    // Prevent button's default focus behavior on drag
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {totalUnreadCount > 0 && !isOpen && (
                        <span className="absolute -top-1 -right-1 flex h-6 w-6">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-xs items-center justify-center">
                                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                            </span>
                        </span>
                    )}
                    {isOpen ? <CloseIcon /> : <ChatIcon />}
                </button>
            </div>
            <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
};

export default ChatBubble;
