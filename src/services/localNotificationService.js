/**
 * Local Notification Service
 *
 * Uses @notifee/react-native to display real Android notifications
 * on the lock screen and notification tray.
 *
 * Used in debug/demo mode when Firebase Cloud Functions
 * are not deployed (no server-side FCM push).
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
  } catch (e) {
    logger.warn('[LocalNotif] createChannel failed:', e.message);
  }
}

// Create channel on import
ensureChannel();

/**
 * Display a local push notification (appears in tray + lock screen).
 *
 * @param {string} title   — Notification title (e.g. "Solana Gaming: New Launch")
 * @param {string} body    — Notification body text
 * @param {Object} [data]  — Optional data payload (hubName, hubId, link, etc.)
 */
export async function showLocalNotification(title, body, data = {}) {
  if (!notifee) {
    logger.warn('[LocalNotif] Notifee not available — skipping local notification');
    return;
  }
  try {
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification', // Falls back to app icon if not found
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
