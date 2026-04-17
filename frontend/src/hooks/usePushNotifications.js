/**
 * usePushNotifications Hook
 * Handles Firebase Cloud Messaging push notifications on Android/iOS
 */
import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';
import AppConfig from '../config/config';

export const usePushNotifications = (isAuthenticated, userToken) => {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    // Only initialize on native platforms and when user is authenticated
    if (!Capacitor.isNativePlatform() || !isAuthenticated || !userToken) {
      return;
    }

    const initializePushNotifications = async () => {
      try {
        console.log('📲 Initializing push notifications...');

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        console.log('Permission status:', permResult.receive);
        setNotificationPermission(permResult.receive);

        if (permResult.receive === 'granted') {
          // Register for push notifications
          await PushNotifications.register();
          console.log('✅ Registered for push notifications');
        } else {
          console.log('❌ Push notification permission denied');
        }

        // Listen for registration success
        await PushNotifications.addListener('registration', async (token) => {
          console.log('✅ FCM Token received:', token.value.substring(0, 20) + '...');
          setFcmToken(token.value);

          // Register token with backend
          try {
            const API_URL = AppConfig.BACKEND_URL;
            await axios.post(
              `${API_URL}/api/push/register-token`,
              {
                token: token.value,
                device_type: 'android',
                device_name: Capacitor.getPlatform()
              },
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log('✅ FCM token registered with backend');
          } catch (error) {
            console.error('❌ Error registering FCM token with backend:', error);
          }
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Error on push notification registration:', error);
        });

        // Handle notification received while app is in foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('🔔 Push notification received (foreground):', notification);
          
          // You can show a custom in-app notification here
          // For now, we'll just log it
          alert(`📬 ${notification.title}\n${notification.body}`);
        });

        // Handle notification tapped (app in background)
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('👆 Push notification tapped:', notification);
          
          // Handle navigation based on notification data
          const data = notification.notification.data;
          if (data?.type) {
            handleNotificationTap(data);
          }
        });

      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
      }
    };

    initializePushNotifications();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isAuthenticated, userToken]);

  const handleNotificationTap = (data) => {
    // Navigate to appropriate screen based on notification type
    console.log('Handling notification tap with data:', data);
    
    switch (data.type) {
      case 'message':
        // Navigate to messages
        window.location.href = '/messages';
        break;
      case 'comment':
        // Navigate to poll detail
        if (data.poll_id) {
          window.location.href = `/feed`; // Could be more specific with poll ID
        }
        break;
      case 'like':
        // Navigate to notifications
        window.location.href = '/notifications';
        break;
      case 'follow':
        // Navigate to profile
        window.location.href = '/notifications';
        break;
      case 'challenge_invitation':
      case 'challenge_result':
        // Navigate to challenges
        if (data.challenge_id) {
          window.location.href = '/explore';
        }
        break;
      default:
        // Navigate to home/feed
        window.location.href = '/feed';
    }
  };

  const unregisterToken = async () => {
    if (!fcmToken || !userToken) return;

    try {
      const API_URL = AppConfig.BACKEND_URL;
      await axios.delete(
        `${API_URL}/api/push/unregister-token`,
        {
          params: { token: fcmToken },
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );
      console.log('✅ FCM token unregistered');
    } catch (error) {
      console.error('❌ Error unregistering FCM token:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!userToken) return;

    try {
      const API_URL = AppConfig.BACKEND_URL;
      const response = await axios.post(
        `${API_URL}/api/push/test-notification`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );
      console.log('✅ Test notification sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      throw error;
    }
  };

  return {
    notificationPermission,
    fcmToken,
    unregisterToken,
    sendTestNotification
  };
};
