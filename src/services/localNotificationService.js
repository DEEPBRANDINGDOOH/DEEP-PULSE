/**
 * Local Notification Service
 *
 * Uses @notifee/react-native to display real Android notifications
 * on the lock screen and notification tray.
 *
 * Works in both debug and release mode.
 * In debug: local notifications are the primary delivery method.
 * In release: local notifications supplement Firebase Cloud Messaging.
 */

import { Platform } from 'react-native';
import { logger } from '../utils/security';

let notifee = null;
let AndroidImportance = null;

try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default;
  AndroidImportance = notifeeModule.AndroidImportance;
} catch (e) {
  logger.warn('[LocalNotif] @notifee/react-native not available:', e.message);
}

const CHANNEL_ID = 'deep-pulse-hub';

/**
 * Ensure the Android notification channel exists.
 * Must be called once before displaying notifications.
 */
async function ensureChannel() {
  if (!notifee || Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Hub Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
    logger.log('[LocalNotif] Channel created successfully');
  } catch (e) {
    logger.warn('[LocalNotif] createChannel failed:', e.message);
  }
}

// Store the promise so we can await it before first notification
const channelReady = ensureChannel();

/**
 * Display a local push notification (appears in tray + lock screen).
 *
 * @param {string} title   - Notification title (e.g. "Solana Gaming: New Launch")
 * @param {string} body    - Notification body text
 * @param {Object} [data]  - Optional data payload (hubName, hubId, link, etc.)
 */
export async function showLocalNotification(title, body, data = {}) {
  if (!notifee) {
    logger.warn('[LocalNotif] Notifee not available — skipping local notification');
    return;
  }
  try {
    // Wait for channel to be created before displaying
    await channelReady;

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher', // Default Android app icon (always exists)
        pressAction: { id: 'default' },
        importance: AndroidImportance.HIGH,
      },
      data,
    });
    logger.log(`[LocalNotif] Displayed: "${title}"`);
  } catch (e) {
    logger.warn('[LocalNotif] displayNotification failed:', e.message);
  }
}
