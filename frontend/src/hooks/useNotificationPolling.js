import { useEffect, useRef, useState, useCallback } from 'react';
import notificationApiService from '../services/notificationApiService';
import localNotificationService from '../services/localNotificationService';

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotificationPolling(isAuthenticated) {
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCheckRef = useRef(null);
  const intervalRef = useRef(null);

  const checkForNewNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      // Get unread count
      const count = await notificationApiService.getUnreadCount();
      setUnreadCount(count);

      // Get latest notifications
      const notifications = await notificationApiService.getNotifications(10);
      
      if (notifications.length > 0 && lastCheckRef.current) {
        // Filter notifications that are newer than last check and unread
        const newNotifs = notifications.filter(
          (n) => !n.is_read && new Date(n.created_at) > lastCheckRef.current
        );

        // Show local notifications for new ones
        if (newNotifs.length > 0) {
          await localNotificationService.showMultipleNotifications(newNotifs);
        }
      }

      lastCheckRef.current = new Date();
    } catch (error) {
      console.error('Notification polling error:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    // Initialize local notifications
    localNotificationService.init();

    // Set initial timestamp
    lastCheckRef.current = new Date();

    // Initial check
    checkForNewNotifications();

    // Start polling
    intervalRef.current = setInterval(checkForNewNotifications, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, checkForNewNotifications]);

  return { unreadCount, refreshNotifications: checkForNewNotifications };
}
