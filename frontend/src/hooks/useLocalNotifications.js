/**
 * useLocalNotifications Hook
 * Sistema de notificaciones locales que detecta eventos nuevos y muestra notificaciones
 * Compatible con la futura migración a Firebase Cloud Messaging
 */
import { useEffect, useRef, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';
import AppConfig from '../config/config';

export const useLocalNotifications = (isAuthenticated, userToken) => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const lastCheckedRef = useRef({
    messages: 0,
    notifications: 0,
    lastMessageId: null,
    lastNotificationId: null
  });
  const pollingIntervalRef = useRef(null);

  // Solicitar permisos de notificaciones
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated) {
      return;
    }

    const requestPermissions = async () => {
      try {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        setPermissionGranted(granted);
        
        if (granted) {
          console.log('✅ Permisos de notificaciones locales otorgados');
          
          // Crear canal de notificaciones para Android
          await createNotificationChannel();
        } else {
          console.log('❌ Permisos de notificaciones locales denegados');
        }
      } catch (error) {
        console.error('Error solicitando permisos:', error);
      }
    };

    requestPermissions();
  }, [isAuthenticated]);

  // Crear canal de notificaciones (requerido en Android 8+)
  const createNotificationChannel = async () => {
    try {
      await LocalNotifications.createChannel({
        id: 'default',
        name: 'Notificaciones Generales',
        description: 'Notificaciones de mensajes, comentarios y actividad',
        importance: 5,
        visibility: 1,
        sound: 'default.wav',
        vibration: true
      });
      console.log('✅ Canal de notificaciones creado');
    } catch (error) {
      console.error('Error creando canal:', error);
    }
  };

  // Polling para detectar nuevos eventos
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated || !userToken || !permissionGranted) {
      return;
    }

    const checkForNewEvents = async () => {
      try {
        const API_URL = AppConfig.BACKEND_URL;
        if (!API_URL) return;

        // Obtener contadores actuales
        const response = await axios.get(
          `${API_URL}/api/notifications/summary`,
          {
            headers: { 'Authorization': `Bearer ${userToken}` },
            timeout: 10000
          }
        );

        const data = response.data;
        
        // Detectar nuevos mensajes
        if (data.unread_messages > lastCheckedRef.current.messages) {
          const newCount = data.unread_messages - lastCheckedRef.current.messages;
          await showNotification({
            title: '💬 Nuevo mensaje',
            body: `Tienes ${newCount} mensaje${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''}`,
            id: Date.now(),
            data: { type: 'message', route: '/messages' }
          });
        }

        // Detectar nuevas notificaciones (likes, comentarios, follows)
        if (data.unread_notifications > lastCheckedRef.current.notifications) {
          const newCount = data.unread_notifications - lastCheckedRef.current.notifications;
          
          // Obtener la última notificación para mostrar detalles
          if (data.latest_notification) {
            const notif = data.latest_notification;
            let title = '🔔 Nueva actividad';
            let body = '';
            
            switch (notif.type) {
              case 'like':
                title = '❤️ Nuevo like';
                body = `A ${notif.from_user} le gustó tu publicación`;
                break;
              case 'comment':
                title = '💭 Nuevo comentario';
                body = `${notif.from_user} comentó en tu publicación`;
                break;
              case 'follow':
                title = '👤 Nuevo seguidor';
                body = `${notif.from_user} comenzó a seguirte`;
                break;
              case 'mention':
                title = '@ Mención';
                body = `${notif.from_user} te mencionó`;
                break;
              case 'challenge':
                title = '⚔️ Nuevo desafío';
                body = `${notif.from_user} te invitó a un battle`;
                break;
              default:
                body = `Tienes ${newCount} notificación${newCount > 1 ? 'es' : ''} nueva${newCount > 1 ? 's' : ''}`;
            }
            
            await showNotification({
              title,
              body,
              id: Date.now() + 1,
              data: { type: 'notification', route: '/notifications' }
            });
          }
        }

        // Actualizar contadores
        lastCheckedRef.current = {
          messages: data.unread_messages,
          notifications: data.unread_notifications,
          lastMessageId: data.latest_message_id,
          lastNotificationId: data.latest_notification_id
        };

      } catch (error) {
        // Error de red - ignorar silenciosamente para no spamear logs
        if (!error.message?.includes('timeout') && !error.message?.includes('Network')) {
          console.error('Error checking events:', error);
        }
      }
    };

    // Verificar inmediatamente al iniciar
    checkForNewEvents();

    // Polling cada 30 segundos cuando la app está activa
    pollingIntervalRef.current = setInterval(checkForNewEvents, 30000);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isAuthenticated, userToken, permissionGranted]);

  // Manejar tap en notificaciones
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleNotificationTap = async () => {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Notificación tocada:', notification);
        
        const data = notification.notification.extra;
        if (data?.route) {
          // Navegar a la ruta correspondiente
          window.location.href = data.route;
        }
      });
    };

    handleNotificationTap();

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, []);

  // Función auxiliar para mostrar notificación
  const showNotification = async ({ title, body, id, data }) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 100) }, // Mostrar inmediatamente
            sound: 'default',
            attachments: null,
            actionTypeId: '',
            extra: data,
            channelId: 'default'
          }
        ]
      });
      console.log(`✅ Notificación mostrada: ${title}`);
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  };

  return {
    permissionGranted,
    showNotification
  };
};
