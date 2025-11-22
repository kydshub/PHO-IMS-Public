

import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { useAuth } from './useAuth';
import { Notification } from '../types';
import { db } from '../services/firebase';
import { useSettings } from './useSettings';

type NotificationType = 'stockTransfer' | 'physicalCountReview' | 'broadcast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'> & { type: NotificationType }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotificationsBySource: (sourceId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
        setNotifications([]);
        return;
    }

    const notificationsRef = db.ref('notifications').orderByChild('userId').equalTo(user.uid);
    
    const listener = (snapshot: firebase.database.DataSnapshot) => {
        const val = snapshot.val();
        const formattedNotifications: Notification[] = val 
            ? Object.entries(val).map(([id, dataObj]: [string, any]) => ({ ...dataObj, id }))
            : [];
        setNotifications(formattedNotifications);
    };

    notificationsRef.on('value', listener);

    return () => {
        notificationsRef.off('value', listener);
    };
  }, [user]);
  
  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'> & { type: NotificationType }) => {
    const { type, ...restOfNotificationData } = notificationData;

    // Check settings before sending. Broadcasts are always sent.
    if (type !== 'broadcast' && settings.notificationPreferences?.[type] === false) {
      console.log(`Notification of type "${type}" blocked by settings.`);
      return;
    }

    const newNotification: Omit<Notification, 'id'> = {
      ...restOfNotificationData,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    await db.ref('notifications').push(newNotification);
  }, [settings.notificationPreferences]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const updates: Record<string, any> = {};
    updates[`/notifications/${notificationId}/isRead`] = true;
    await db.ref().update(updates);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const updates: Record<string, any> = {};
    notifications.forEach(n => {
        if(n.userId === user.uid && !n.isRead) {
            updates[`/notifications/${n.id}/isRead`] = true;
        }
    });
    if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
    }
  }, [user, notifications]);

  const removeNotificationsBySource = useCallback(async (sourceId: string) => {
    if (!sourceId) return;

    const notifsRef = db.ref('notifications');
    const snapshot = await notifsRef.orderByChild('sourceId').equalTo(sourceId).once('value');
    
    if (snapshot.exists()) {
        const updates: Record<string, null> = {};
        snapshot.forEach(childSnapshot => {
            updates[childSnapshot.key!] = null;
        });
        await notifsRef.update(updates);
    }
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const value = {
    notifications: notifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotificationsBySource,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};