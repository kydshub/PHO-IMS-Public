
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { Button } from './ui/Button';

const NotificationDropdown: React.FC<{onClose: () => void}> = ({ onClose }) => {
    const { notifications, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const handleNotificationClick = (notificationId: string, link: string) => {
        markAsRead(notificationId);
        navigate(link);
        onClose();
    };
    
    const handleMarkAllAsRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        markAllAsRead();
    };

    const sortedNotifications = useMemo(() => 
        [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [notifications]);

    const filteredNotifications = useMemo(() => {
        if (filter === 'unread') {
            return sortedNotifications.filter(n => !n.isRead);
        }
        return sortedNotifications;
    }, [sortedNotifications, filter]);
    
    const hasUnread = useMemo(() => notifications.some(n => !n.isRead), [notifications]);

    return (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-secondary-200 z-50 flex flex-col">
            <div className="p-3 border-b border-secondary-200">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xl font-bold text-secondary-800">Notifications</h4>
                     {hasUnread && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                            Mark all as read
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={filter === 'all' ? 'primary' : 'secondary'}
                        onClick={() => setFilter('all')}
                        className={`rounded-full ${filter !== 'all' ? 'bg-secondary-200 text-secondary-800 hover:bg-secondary-300' : ''}`}
                    >
                        All
                    </Button>
                     <Button
                        size="sm"
                        variant={filter === 'unread' ? 'primary' : 'secondary'}
                        onClick={() => setFilter('unread')}
                        className={`rounded-full ${filter !== 'unread' ? 'bg-secondary-200 text-secondary-800 hover:bg-secondary-300' : ''}`}
                    >
                        Unread
                    </Button>
                </div>
            </div>
            <div className="flex-1 max-h-96 overflow-y-auto">
                {filteredNotifications.length > 0 ? (
                    <ul className="divide-y divide-secondary-100">
                        {filteredNotifications.map(notification => (
                            <li 
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification.id, notification.link)}
                                className={`p-3 hover:bg-secondary-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-primary-50' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-2 flex-shrink-0 mt-1.5">
                                        {!notification.isRead && <div className="w-2 h-2 rounded-full bg-primary-500"></div>}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-sm text-secondary-700">{notification.message}</p>
                                        <p className="text-xs text-secondary-500 mt-1">
                                            {new Date(notification.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-8 text-center text-secondary-500 flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-secondary-300 mb-2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                        <p className="font-semibold">No new notifications</p>
                        <p className="text-xs">You're all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
