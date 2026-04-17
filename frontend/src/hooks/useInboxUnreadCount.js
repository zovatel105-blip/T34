import { useEffect, useState, useCallback } from 'react';
import AppConfig from '../config/config';
import useLivePoll from './useLivePoll';

// Refresco en vivo estilo TikTok/Instagram: 15s, pausa en background,
// refresco inmediato al volver el foco (ver useLivePoll).
const POLL_INTERVAL = 15000;

export function useInboxUnreadCount(isAuthenticated) {
  const [unreadCount, setUnreadCount] = useState(0);

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
      const msgData = await apiRequest('/api/messages/unread');
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

  // Fetch inicial al autenticarse / al cambiar a no autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    fetchUnreadCount();
  }, [isAuthenticated, fetchUnreadCount]);

  // 🔴 Live refresh (pausa cuando el tab está oculto, refresca al volver al foco)
  useLivePoll(fetchUnreadCount, POLL_INTERVAL, {
    enabled: isAuthenticated,
    pauseWhenHidden: true,
    refreshOnFocus: true,
  });

  return { unreadCount, refreshUnread: fetchUnreadCount };
}
