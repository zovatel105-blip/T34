import { useEffect, useState, useCallback, useRef } from 'react';
import AppConfig from '../config/config';

const POLL_INTERVAL = 30000; // 30 seconds

export function useInboxUnreadCount(isAuthenticated) {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const apiRequest = useCallback(async (endpoint) => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const response = await fetch(`${AppConfig.BACKEND_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      let total = 0;

      // Messages unread
      const msgData = await apiRequest('/api/messages/unread-count');
      total += msgData?.unread_count || 0;

      // Activity unread
      const actData = await apiRequest('/api/users/activity/unread-count');
      total += actData?.unread_count || 0;

      // Followers unread
      const folData = await apiRequest('/api/users/followers/unread-count');
      total += folData?.unread_count || 0;

      // Message requests unread
      const reqData = await apiRequest('/api/messages/requests/unread-count');
      total += reqData?.unread_count || 0;

      setUnreadCount(total);
    } catch (error) {
      console.error('Error fetching inbox unread count:', error);
    }
  }, [isAuthenticated, apiRequest]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  return { unreadCount, refreshUnread: fetchUnreadCount };
}
