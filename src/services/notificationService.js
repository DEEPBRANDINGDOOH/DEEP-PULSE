/**
 * Push Notifications Service — Firebase Cloud Messaging (FCM)
 *
 * Handles all push notification functionality:
 * - Register for push permissions (Android 13+)
 * - Get FCM device token
 * - Handle incoming notifications (foreground + background)
 * - Subscribe to hub topics
 *
 * Uses @react-native-firebase/messaging
 */

import React from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Safe import for Firebase Messaging
let messaging = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('Firebase Messaging not available:', e.message);
}

class NotificationService {
  constructor() {
    this.unsubscribeOnMessage = null;
    this.fcmToken = null;
  }

  /**
   * Request notification permissions (required on Android 13+)
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermission() {
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return false;
    }

    try {
      // Android 13+ requires POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Notification permission denied');
          return false;
        }
      }

      // Request FCM permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('FCM permission granted:', authStatus);
      }
      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get the FCM device token
   * This token is used to send push notifications to this device
   *
   * @returns {Promise<string|null>} FCM token
   */
  async getToken() {
    if (!messaging) return null;

    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register for push notifications
   * Requests permission + gets token
   *
   * @returns {Promise<string|null>} FCM token if successful
   */
  async registerForPushNotifications() {
    const permitted = await this.requestPermission();
    if (!permitted) return null;

    const token = await this.getToken();

    // Token is registered with Firebase backend via registerFcmToken() in App.js

    return token;
  }

  /**
   * Subscribe to a hub topic
   * When a brand sends a notification, all subscribers to that hub topic receive it
   *
   * @param {string} hubId - The hub ID to subscribe to
   */
  async subscribeToHub(hubId) {
    if (!messaging) return;
    try {
      await messaging().subscribeToTopic(`hub_${hubId}`);
      console.log(`Subscribed to hub: ${hubId}`);
    } catch (error) {
      console.error(`Error subscribing to hub ${hubId}:`, error);
    }
  }

  /**
   * Unsubscribe from a hub topic
   *
   * @param {string} hubId - The hub ID to unsubscribe from
   */
  async unsubscribeFromHub(hubId) {
    if (!messaging) return;
    try {
      await messaging().unsubscribeFromTopic(`hub_${hubId}`);
      console.log(`Unsubscribed from hub: ${hubId}`);
    } catch (error) {
      console.error(`Error unsubscribing from hub ${hubId}:`, error);
    }
  }

  /**
   * Listen for notifications while app is in foreground
   *
   * @param {Function} onNotification - Callback with notification data
   */
  addForegroundListener(onNotification) {
    if (!messaging) return;

    this.unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('FCM foreground message:', remoteMessage);

      if (onNotification) {
        onNotification({
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          data: remoteMessage.data,
        });
      }

      // Show an alert since foreground notifications don't show in tray
      Alert.alert(
        remoteMessage.notification?.title || 'DEEP Pulse',
        remoteMessage.notification?.body || '',
      );
    });
  }

  /**
   * Setup background notification handler
   * Must be called at app startup (outside of components)
   */
  setupBackgroundHandler() {
    if (!messaging) return;

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('FCM background message:', remoteMessage);
      // Background notifications are automatically shown in the tray
      // This handler is for custom data processing
    });
  }

  /**
   * Handle notification that opened the app
   * Called when user taps a notification while app is in background/killed
   *
   * @param {Function} onNotificationOpen - Callback with notification data
   */
  async getInitialNotification(onNotificationOpen) {
    if (!messaging) return;

    // App opened from background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app from background:', remoteMessage);
      if (onNotificationOpen) {
        onNotificationOpen(remoteMessage.data);
      }
    });

    // App opened from killed state
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log('Notification opened app from killed state:', initialNotification);
      if (onNotificationOpen) {
        onNotificationOpen(initialNotification.data);
      }
    }
  }

  /**
   * Listen for token refresh
   * FCM token can change — when it does, update backend
   */
  onTokenRefresh(callback) {
    if (!messaging) return;
    return messaging().onTokenRefresh((token) => {
      console.log('FCM token refreshed:', token);
      this.fcmToken = token;
      if (callback) callback(token);
    });
  }

  /**
   * Remove foreground listener
   */
  removeForegroundListener() {
    if (this.unsubscribeOnMessage) {
      this.unsubscribeOnMessage();
      this.unsubscribeOnMessage = null;
    }
  }

  /**
   * Get permission status
   */
  async getPermissionsStatus() {
    if (!messaging) return 'unavailable';
    try {
      const authStatus = await messaging().hasPermission();
      if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) return 'granted';
      if (authStatus === messaging.AuthorizationStatus.PROVISIONAL) return 'provisional';
      return 'denied';
    } catch (e) {
      return 'unavailable';
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

/**
 * Hook for using notifications in components
 */
export const useNotifications = () => {
  const [notificationPermission, setNotificationPermission] = React.useState(null);
  const [fcmToken, setFcmToken] = React.useState(null);

  React.useEffect(() => {
    // Check permission on mount
    notificationService.getPermissionsStatus().then(setNotificationPermission);
  }, []);

  const requestPermissions = async () => {
    const token = await notificationService.registerForPushNotifications();
    const status = await notificationService.getPermissionsStatus();
    setNotificationPermission(status);
    setFcmToken(token);
    return { token, status };
  };

  return {
    notificationPermission,
    fcmToken,
    requestPermissions,
    subscribeToHub: (hubId) => notificationService.subscribeToHub(hubId),
    unsubscribeFromHub: (hubId) => notificationService.unsubscribeFromHub(hubId),
  };
};
