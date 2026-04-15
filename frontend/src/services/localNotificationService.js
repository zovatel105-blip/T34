import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = Capacitor.isNativePlatform();

class LocalNotificationService {
  constructor() {
    this.initialized = false;
    this.notificationId = 1;
  }

  async init() {
    if (this.initialized || !isNative) return;

    try {
      // Request permission
      const permResult = await LocalNotifications.requestPermissions();
      if (permResult.display !== 'granted') {
        console.warn('Local notifications permission not granted');
        return;
      }

      // Create notification channels for Android
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'likes',
          name: 'Likes',
          description: 'Cuando alguien da like a tu contenido',
          importance: 3,
          visibility: 1,
          vibration: true,
        });
        await LocalNotifications.createChannel({
          id: 'comments',
          name: 'Comentarios',
          description: 'Cuando alguien comenta en tu contenido',
          importance: 4,
          visibility: 1,
          vibration: true,
        });
        await LocalNotifications.createChannel({
          id: 'follows',
          name: 'Seguidores',
          description: 'Cuando alguien te sigue',
          importance: 3,
          visibility: 1,
          vibration: true,
        });
        await LocalNotifications.createChannel({
          id: 'votes',
          name: 'Votos',
          description: 'Cuando alguien vota en tu contenido',
          importance: 3,
          visibility: 1,
          vibration: true,
        });
        await LocalNotifications.createChannel({
          id: 'achievements',
          name: 'Logros',
          description: 'Logros y metas alcanzadas',
          importance: 4,
          visibility: 1,
          vibration: true,
        });
      }

      // Listen for notification actions
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Notification action:', notification);
      });

      this.initialized = true;
      console.log('✅ Local notifications initialized');
    } catch (error) {
      console.error('Error initializing local notifications:', error);
    }
  }

  getChannelId(type) {
    const map = {
      like: 'likes',
      comment: 'comments',
      follow: 'follows',
      vote: 'votes',
      achievement: 'achievements',
    };
    return map[type] || 'likes';
  }

  getTitle(type) {
    const map = {
      like: '❤️ Nuevo like',
      comment: '💬 Nuevo comentario',
      follow: '👥 Nuevo seguidor',
      vote: '🗳️ Nuevo voto',
      achievement: '🏆 ¡Logro desbloqueado!',
    };
    return map[type] || '🔔 Notificación';
  }

  async showNotification(notification) {
    if (!isNative) {
      // Web fallback - use browser Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(this.getTitle(notification.type), {
          body: `${notification.sender_username} ${notification.message}`,
          icon: notification.sender_avatar || '/favicon.ico',
          tag: notification.id,
        });
      }
      return;
    }

    try {
      await this.init();

      const id = this.notificationId++;
      await LocalNotifications.schedule({
        notifications: [
          {
            title: this.getTitle(notification.type),
            body: `${notification.sender_username} ${notification.message}`,
            id: id,
            channelId: this.getChannelId(notification.type),
            extra: {
              notificationId: notification.id,
              type: notification.type,
              pollId: notification.poll_id,
            },
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
          },
        ],
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  async showMultipleNotifications(notifications) {
    for (const notif of notifications) {
      await this.showNotification(notif);
    }
  }
}

const localNotificationService = new LocalNotificationService();
export default localNotificationService;
