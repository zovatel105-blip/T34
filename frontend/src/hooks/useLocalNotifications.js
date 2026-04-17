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

// Generador de IDs válidos para LocalNotifications (Android los requiere
// dentro del rango Int32: máximo 2,147,483,647). Date.now() devuelve ~1.7
// billones, lo que excede Int32 y hace que la notificación FALLE EN SILENCIO.
let notificationIdCounter = 1;
const getNotificationId = () => {
  // Rango seguro 1..1_000_000_000 (mucho margen dentro de Int32)
  notificationIdCounter = (notificationIdCounter + 1) % 1000000000;
  if (notificationIdCounter === 0) notificationIdCounter = 1;
  // Mezclar con segundos (no milisegundos) para mantener unicidad entre sesiones
  return (Math.floor(Date.now() / 1000) % 1000000000) + notificationIdCounter;
};

export const useLocalNotifications = (isAuthenticated, userToken) => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const lastCheckedRef = useRef({
    messages: null,
    notifications: null,
    lastMessageId: null,
    lastNotificationId: null,
    initialized: false
  });
  const pollingIntervalRef = useRef(null);

  // Solicitar permisos de notificaciones
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated) {
      return;
    }

    const requestPermissions = async () => {
      try {
        // Primero chequear estado actual
        const current = await LocalNotifications.checkPermissions();
        console.log('🔔 Permisos actuales:', current);

        let granted = current.display === 'granted';

        // Si no está concedido, pedir explícitamente
        if (!granted) {
          const result = await LocalNotifications.requestPermissions();
          granted = result.display === 'granted';
          console.log('🔔 Resultado solicitud permisos:', result);
        }

        setPermissionGranted(granted);

        if (granted) {
          console.log('✅ Permisos de notificaciones locales OTORGADOS');

          // Crear canal PRIMERO (requerido en Android 8+)
          await createNotificationChannel();

          // Pequeña notificación de prueba al otorgar permisos por primera vez
          // (solo en desarrollo o si el usuario activó el modo debug).
          // Comentar esta línea en producción si no se desea:
          // await sendTestNotification();
        } else {
          console.warn('⚠️ Permisos de notificaciones locales DENEGADOS');
        }
      } catch (error) {
        console.error('❌ Error solicitando permisos:', error);
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
        importance: 5, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#ff4081'
      });
      console.log('✅ Canal de notificaciones creado: default');
    } catch (error) {
      console.error('❌ Error creando canal:', error);
    }
  };

  // Notificación de prueba (para verificar que el sistema funciona)
  const sendTestNotification = async () => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🎉 Notificaciones activas',
            body: 'Recibirás alertas de mensajes y actividad.',
            id: getNotificationId(),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            channelId: 'default',
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#ff4081'
          }
        ]
      });
      console.log('✅ Notificación de prueba programada');
    } catch (error) {
      console.error('❌ Error enviando notificación de prueba:', error);
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
        if (!API_URL) {
          console.warn('⚠️ [Notif] No hay BACKEND_URL configurado');
          return;
        }

        // Obtener contadores actuales
        const response = await axios.get(
          `${API_URL}/api/notifications/summary`,
          {
            headers: { 'Authorization': `Bearer ${userToken}` },
            timeout: 10000
          }
        );

        const data = response.data;

        // PRIMERA VEZ: inicializar contadores sin notificar (para no
        // avisar de mensajes viejos al abrir la app).
        if (!lastCheckedRef.current.initialized) {
          lastCheckedRef.current = {
            messages: data.unread_messages || 0,
            notifications: data.unread_notifications || 0,
            lastMessageId: data.latest_message_id || null,
            lastNotificationId: data.latest_notification_id || null,
            initialized: true
          };
          console.log('🔔 [Notif] Contadores inicializados:', lastCheckedRef.current);
          return;
        }

        const prevMessages = lastCheckedRef.current.messages || 0;
        const prevNotifications = lastCheckedRef.current.notifications || 0;

        // Detectar nuevos mensajes
        if ((data.unread_messages || 0) > prevMessages) {
          const newCount = (data.unread_messages || 0) - prevMessages;
          console.log(`🔔 [Notif] ${newCount} nuevos mensajes detectados`);
          await showNotification({
            title: '💬 Nuevo mensaje',
            body: `Tienes ${newCount} mensaje${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''}`,
            data: { type: 'message', route: '/messages' }
          });
        }

        // Detectar nuevas notificaciones (likes, comentarios, follows)
        if ((data.unread_notifications || 0) > prevNotifications) {
          const newCount = (data.unread_notifications || 0) - prevNotifications;
          console.log(`🔔 [Notif] ${newCount} nuevas notificaciones detectadas`);

          // Obtener la última notificación para mostrar detalles
          const notif = data.latest_notification;
          let title = '🔔 Nueva actividad';
          let body = `Tienes ${newCount} notificación${newCount > 1 ? 'es' : ''} nueva${newCount > 1 ? 's' : ''}`;

          if (notif) {
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
                break;
            }
          }

          await showNotification({
            title,
            body,
            data: { type: 'notification', route: '/notifications' }
          });
        }

        // Actualizar contadores
        lastCheckedRef.current = {
          messages: data.unread_messages || 0,
          notifications: data.unread_notifications || 0,
          lastMessageId: data.latest_message_id || null,
          lastNotificationId: data.latest_notification_id || null,
          initialized: true
        };

      } catch (error) {
        // Error de red - ignorar silenciosamente para no spamear logs
        if (!error.message?.includes('timeout') && !error.message?.includes('Network')) {
          console.error('❌ [Notif] Error checking events:', error?.message || error);
        }
      }
    };

    // Verificar inmediatamente al iniciar
    checkForNewEvents();

    // Polling cada 20 segundos cuando la app está activa (más responsivo que 30s)
    pollingIntervalRef.current = setInterval(checkForNewEvents, 20000);

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

    let listener;
    const attachListener = async () => {
      listener = await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('🔔 Notificación tocada:', notification);

        const data = notification.notification.extra;
        if (data?.route) {
          // Navegar a la ruta correspondiente
          window.location.href = data.route;
        }
      });
    };

    attachListener();

    return () => {
      if (listener) {
        listener.remove().catch(() => {});
      }
    };
  }, []);

  // Función auxiliar para mostrar notificación
  const showNotification = async ({ title, body, data }) => {
    try {
      const id = getNotificationId();
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id, // ⚠️ DEBE ser Int32 válido (<= 2,147,483,647)
            schedule: { at: new Date(Date.now() + 500) }, // Mostrar casi inmediato
            sound: 'default',
            attachments: null,
            actionTypeId: '',
            extra: data || {},
            channelId: 'default',
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#ff4081'
          }
        ]
      });
      console.log(`✅ [Notif] Programada (id=${id}): ${title}`);
    } catch (error) {
      console.error('❌ [Notif] Error mostrando notificación:', error);
    }
  };

  return {
    permissionGranted,
    showNotification,
    sendTestNotification
  };
};
