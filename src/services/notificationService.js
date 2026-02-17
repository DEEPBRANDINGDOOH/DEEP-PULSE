/**
 * Push Notifications Service
 * 
 * Handles all push notification functionality:
 * - Register for push permissions
 * - Get Expo push token
 * - Handle incoming notifications
 * - Schedule local notifications
 * 
 * Uses Expo Notifications API
 */

import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NOTIFICATION_CONFIG } from '../config/constants';

/**
 * Configure how notifications are handled when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Register for push notifications
   * 
   * Flow:
   * 1. Check if device supports push
   * 2. Request permissions
   * 3. Get Expo push token
   * 4. Send token to backend (TODO)
   * 
   * @returns {Promise<string|null>} Expo push token
   */
  async registerForPushNotifications() {
    let token;

    // Check if physical device (push doesn't work on simulators)
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }

    // Android-specific: Create notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CONFIG.channelId,
        {
          name: NOTIFICATION_CONFIG.channelName,
          description: NOTIFICATION_CONFIG.channelDescription,
          importance: Notifications.AndroidImportance.HIGH,
          sound: NOTIFICATION_CONFIG.sound,
          vibrationPattern: NOTIFICATION_CONFIG.vibrate,
          enableVibrate: true,
          enableLights: true,
          lightColor: '#FF6B35',
        }
      );
    }

    return token;
  }

  /**
   * Add listeners for incoming notifications
   * 
   * @param {Function} onNotificationReceived - Called when notification received
   * @param {Function} onNotificationResponse - Called when user taps notification
   */
  addNotificationListeners(onNotificationReceived, onNotificationResponse) {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listener for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );
  }

  /**
   * Remove notification listeners
   * Call this in cleanup (useEffect return)
   */
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Schedule a local notification
   * 
   * For testing or offline notifications
   * 
   * @param {Object} notification - Notification content
   * @param {number} seconds - Delay in seconds
   */
  async scheduleLocalNotification(notification, seconds = 0) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: NOTIFICATION_CONFIG.sound,
        },
        trigger: seconds > 0 ? { seconds } : null,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  /**
   * Send a test notification (for development)
   */
  async sendTestNotification() {
    await this.scheduleLocalNotification({
      title: '🔔 DEEP Pulse Test',
      body: 'Push notifications are working correctly!',
      data: {
        type: 'test',
      },
    }, 2);
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Get badge count (iOS only)
   */
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  /**
   * Set badge count (iOS only)
   */
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadge() {
    await this.setBadgeCount(0);
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Format alert data into notification format
   * 
   * This converts our alert objects into Expo notification format
   * 
   * @param {Object} alert - Alert from backend
   * @returns {Object} Expo notification object
   */
  formatAlertAsNotification(alert) {
    return {
      title: `${alert.projectIcon} ${alert.projectName}`,
      body: alert.title,
      data: {
        alertId: alert.id,
        projectId: alert.projectId,
        category: alert.category,
        link: alert.link,
        imageUrl: alert.imageUrl,
      },
    };
  }

  /**
   * Send notification to Expo Push API (backend integration)
   * 
   * TODO: This should be called from your backend, not client
   * Shown here for reference
   * 
   * @param {string} expoPushToken - User's push token
   * @param {Object} notification - Notification content
   */
  async sendPushNotification(expoPushToken, notification) {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: 'high',
      channelId: NOTIFICATION_CONFIG.channelId,
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      console.log('Push notification sent:', data);
      return data;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
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

  React.useEffect(() => {
    // Check permission on mount
    notificationService.getPermissionsStatus().then(setNotificationPermission);
  }, []);

  const requestPermissions = async () => {
    const token = await notificationService.registerForPushNotifications();
    const status = await notificationService.getPermissionsStatus();
    setNotificationPermission(status);
    return { token, status };
  };

  return {
    notificationPermission,
    requestPermissions,
    sendTestNotification: () => notificationService.sendTestNotification(),
  };
};
