/**
 * lockScreenService.js — React Native interface for the LockScreen Overlay (Swipe-to-Earn)
 *
 * Bridge to the native Android LockScreenModule.
 * Handles: service start/stop, permissions, ad queue, stats, swipe events.
 *
 * Usage:
 *   import lockScreenService from './services/lockScreenService';
 *
 *   // Check permission & start
 *   await lockScreenService.requestPermissionAndStart();
 *
 *   // Push ads from backend
 *   await lockScreenService.pushAdQueue([
 *     { contentUrl: 'https://brand.com/ad.html', title: 'Nike Solana', brand: 'Nike', clickUrl: 'https://nike.com' },
 *   ]);
 *
 *   // Listen for swipes
 *   lockScreenService.onSwipe((event) => {
 *     console.log(event.action, event.points); // "skip" 5 or "engage" 10
 *   });
 *
 *   // Get stats
 *   const stats = await lockScreenService.getStats();
 *   // { adsToday: 3, totalPoints: 25, maxAdsPerDay: 15, enabled: true }
 */

import { NativeModules, NativeEventEmitter, Platform, Alert } from 'react-native';

const { LockScreenModule } = NativeModules;

// Event emitter for swipe events
let eventEmitter = null;
let swipeSubscription = null;

const lockScreenService = {

  /**
   * Check if the module is available (Android only).
   */
  isAvailable() {
    return Platform.OS === 'android' && LockScreenModule != null;
  },

  /**
   * Check if the app has overlay (draw over other apps) permission.
   * @returns {Promise<boolean>}
   */
  async hasPermission() {
    if (!this.isAvailable()) return false;
    try {
      return await LockScreenModule.hasOverlayPermission();
    } catch (e) {
      console.warn('[LockScreen] Permission check failed:', e);
      return false;
    }
  },

  /**
   * Request overlay permission — opens Android system settings.
   * User must manually toggle the permission.
   * @returns {Promise<boolean>} true if already granted, false if user needs to toggle
   */
  async requestPermission() {
    if (!this.isAvailable()) return false;
    try {
      return await LockScreenModule.requestOverlayPermission();
    } catch (e) {
      console.warn('[LockScreen] Permission request failed:', e);
      return false;
    }
  },

  /**
   * Start the LockScreen foreground service.
   * Requires overlay permission.
   * @returns {Promise<boolean>}
   */
  async start() {
    if (!this.isAvailable()) {
      console.warn('[LockScreen] Not available on this platform');
      return false;
    }
    try {
      await LockScreenModule.startService();
      await LockScreenModule.setEnabled(true);
      return true;
    } catch (e) {
      console.error('[LockScreen] Start failed:', e);
      throw e;
    }
  },

  /**
   * Stop the LockScreen service.
   * @returns {Promise<boolean>}
   */
  async stop() {
    if (!this.isAvailable()) return false;
    try {
      await LockScreenModule.setEnabled(false);
      await LockScreenModule.stopService();
      return true;
    } catch (e) {
      console.error('[LockScreen] Stop failed:', e);
      return false;
    }
  },

  /**
   * Request permission and start the service in one step.
   * Shows an alert explaining the feature if permission is not yet granted.
   * @returns {Promise<boolean>}
   */
  async requestPermissionAndStart() {
    if (!this.isAvailable()) {
      Alert.alert('Non disponible', 'Cette fonctionnalité est disponible uniquement sur Android.');
      return false;
    }

    const hasPermission = await this.hasPermission();

    if (!hasPermission) {
      return new Promise((resolve) => {
        Alert.alert(
          'Swipe-to-Earn 🔓',
          'DEEP Pulse affiche du contenu sponsorisé sur votre écran de verrouillage.\n\n' +
          '• Max 15 contenus/jour\n' +
          '• Swipez pour gagner des points $SKR\n' +
          '• Désactivable à tout moment\n\n' +
          'Autorisez l\'affichage par-dessus les autres apps pour activer cette fonctionnalité.',
          [
            { text: 'Plus tard', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Autoriser',
              onPress: async () => {
                await this.requestPermission();
                // User needs to toggle manually in settings, then come back
                Alert.alert(
                  'Permission requise',
                  'Activez "Autoriser l\'affichage par-dessus d\'autres applis" dans les paramètres, puis revenez ici.',
                  [{ text: 'OK', onPress: () => resolve(false) }]
                );
              },
            },
          ]
        );
      });
    }

    // Permission granted — start the service
    try {
      await this.start();
      return true;
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de démarrer le service Swipe-to-Earn.');
      return false;
    }
  },

  /**
   * Push an ad queue to the native service.
   * @param {Array<{contentUrl: string, title: string, brand: string, clickUrl: string}>} ads
   * @returns {Promise<number>} Number of ads queued
   */
  async pushAdQueue(ads) {
    if (!this.isAvailable()) return 0;
    try {
      return await LockScreenModule.setAdQueue(ads);
    } catch (e) {
      console.error('[LockScreen] Failed to push ad queue:', e);
      return 0;
    }
  },

  /**
   * Get current stats (ads today, points, etc.).
   * @returns {Promise<{adsToday: number, adsThisHour: number, totalPoints: number, maxAdsPerDay: number, maxAdsPerHour: number, enabled: boolean}>}
   */
  async getStats() {
    if (!this.isAvailable()) {
      return { adsToday: 0, adsThisHour: 0, totalPoints: 0, maxAdsPerDay: 15, maxAdsPerHour: 3, enabled: false };
    }
    try {
      return await LockScreenModule.getStats();
    } catch (e) {
      console.error('[LockScreen] Stats fetch failed:', e);
      return { adsToday: 0, adsThisHour: 0, totalPoints: 0, maxAdsPerDay: 15, maxAdsPerHour: 3, enabled: false };
    }
  },

  /**
   * Check if the service is currently running.
   * @returns {Promise<boolean>}
   */
  async isRunning() {
    if (!this.isAvailable()) return false;
    try {
      return await LockScreenModule.isRunning();
    } catch (e) {
      return false;
    }
  },

  /**
   * Listen for swipe events from the lock screen.
   * @param {function({action: 'skip'|'engage'|'dismiss', points: number, adIndex: number})} callback
   * @returns {function} Unsubscribe function
   */
  onSwipe(callback) {
    if (!this.isAvailable()) return () => {};

    // Lazy-init event emitter
    if (!eventEmitter) {
      eventEmitter = new NativeEventEmitter(LockScreenModule);
    }

    // Remove previous subscription
    if (swipeSubscription) {
      swipeSubscription.remove();
    }

    swipeSubscription = eventEmitter.addListener('onLockScreenSwipe', (event) => {
      callback(event);
    });

    return () => {
      if (swipeSubscription) {
        swipeSubscription.remove();
        swipeSubscription = null;
      }
    };
  },

  /**
   * Remove all swipe listeners.
   */
  removeAllListeners() {
    if (swipeSubscription) {
      swipeSubscription.remove();
      swipeSubscription = null;
    }
  },
};

export default lockScreenService;
