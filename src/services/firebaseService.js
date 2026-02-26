/**
 * Firebase Backend Service — Last Mile Wiring
 *
 * Connects the app to Firebase Cloud Functions + Firestore
 * for real-time hub management, notifications, and analytics.
 *
 * All calls are non-blocking (fire-and-forget with logging).
 * The local Zustand store is always updated first (optimistic UI),
 * then the backend sync happens in the background.
 */

import { Alert } from 'react-native';
import { API_BASE_URL } from '../config/constants';

// Safe imports for Firebase
let firestore = null;
let functions = null;
let messagingModule = null;

try {
  firestore = require('@react-native-firebase/firestore').default;
} catch (e) {
  console.warn('[FirebaseService] Firestore not available:', e.message);
}

try {
  functions = require('@react-native-firebase/functions').default;
} catch (e) {
  console.warn('[FirebaseService] Cloud Functions not available:', e.message);
}

try {
  messagingModule = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('[FirebaseService] Messaging not available:', e.message);
}

// =====================================================
//  HELPER: Get Firestore instance safely
// =====================================================

function getDb() {
  if (!firestore) {
    console.warn('[FirebaseService] Firestore not initialized');
    return null;
  }
  return firestore();
}

function getFunctions() {
  if (!functions) {
    console.warn('[FirebaseService] Cloud Functions not initialized');
    return null;
  }
  return functions();
}

// =====================================================
//  1. NOTIFICATION BROADCASTING
// =====================================================

/**
 * Send a push notification to all subscribers of a hub
 * via the Cloud Function sendPushToSubscribers.
 *
 * Also creates a Firestore doc in `notifications` collection
 * which triggers the onNewNotification Cloud Function for FCM delivery.
 *
 * @param {string} hubId - Hub ID (used for FCM topic `hub_{hubId}`)
 * @param {string} hubName - Hub name (for display)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} walletAddress - Sender's wallet (for ownership verification)
 * @returns {Promise<{success: boolean, notificationId?: string}>}
 */
export async function sendHubNotification(hubId, hubName, title, body, walletAddress) {
  console.log(`[FirebaseService] sendHubNotification: ${hubName} → "${title}"`);

  // Strategy 1: Call the Cloud Function directly (preferred)
  const fnInstance = getFunctions();
  if (fnInstance) {
    try {
      const sendPush = fnInstance.httpsCallable('sendPushToSubscribers');
      const result = await sendPush({
        hubId,
        title,
        body,
        walletAddress,
        data: { hubName, hubId },
      });
      console.log('[FirebaseService] Cloud Function response:', result.data);
      return { success: true, notificationId: result.data?.notificationId };
    } catch (error) {
      console.warn('[FirebaseService] Cloud Function call failed, trying Firestore fallback:', error.message);
    }
  }

  // Strategy 2: Write directly to Firestore (triggers onNewNotification)
  const db = getDb();
  if (db) {
    try {
      const notifRef = await db.collection('notifications').add({
        hubId,
        hubName,
        title,
        body,
        createdAt: firestore.FieldValue.serverTimestamp(),
        source: 'app_direct',
        walletAddress: walletAddress || null,
      });
      console.log('[FirebaseService] Notification written to Firestore:', notifRef.id);
      return { success: true, notificationId: notifRef.id };
    } catch (error) {
      console.warn('[FirebaseService] Firestore write failed:', error.message);
    }
  }

  // No Firebase available — notification saved locally only
  console.log('[FirebaseService] No Firebase — notification local only');
  return { success: true, notificationId: null };
}

// =====================================================
//  2. HUB LIFECYCLE — Firestore Sync
// =====================================================

/**
 * Create a hub document in Firestore (status: PENDING)
 * @param {Object} hubData - { id, name, description, category, icon, creator, createdDate }
 */
export async function createHubInFirestore(hubData) {
  console.log(`[FirebaseService] createHub: ${hubData.name}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    await db.collection('hubs').doc(hubData.id).set({
      ...hubData,
      status: 'PENDING',
      active: false,
      subscribers: 0,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    console.log('[FirebaseService] Hub created in Firestore:', hubData.id);
    return { success: true };
  } catch (error) {
    console.warn('[FirebaseService] createHub failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Approve a hub in Firestore (status: ACTIVE)
 * @param {string} hubId - Hub ID
 * @param {string} adminWallet - Admin wallet address
 */
export async function approveHubInFirestore(hubId, adminWallet) {
  console.log(`[FirebaseService] approveHub: ${hubId}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    await db.collection('hubs').doc(hubId).update({
      status: 'ACTIVE',
      active: true,
      approvedAt: firestore.FieldValue.serverTimestamp(),
      approvedBy: adminWallet || null,
    });
    console.log('[FirebaseService] Hub approved in Firestore:', hubId);
    return { success: true };
  } catch (error) {
    console.warn('[FirebaseService] approveHub failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a hub in Firestore (status: REJECTED)
 * @param {string} hubId - Hub ID
 * @param {string} adminWallet - Admin wallet address
 */
export async function rejectHubInFirestore(hubId, adminWallet) {
  console.log(`[FirebaseService] rejectHub: ${hubId}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    await db.collection('hubs').doc(hubId).update({
      status: 'REJECTED',
      active: false,
      rejectedAt: firestore.FieldValue.serverTimestamp(),
      rejectedBy: adminWallet || null,
    });
    console.log('[FirebaseService] Hub rejected in Firestore:', hubId);
    return { success: true };
  } catch (error) {
    console.warn('[FirebaseService] rejectHub failed:', error.message);
    return { success: false, error: error.message };
  }
}

// =====================================================
//  3. SUBSCRIBE / UNSUBSCRIBE — Firestore + FCM Topics
// =====================================================

/**
 * Record a subscription in Firestore + subscribe to FCM topic
 * @param {string} hubId - Hub ID
 * @param {string} walletAddress - Subscriber wallet
 */
export async function subscribeToHubBackend(hubId, walletAddress) {
  console.log(`[FirebaseService] subscribe: ${walletAddress} → hub ${hubId}`);

  // 1. Subscribe to FCM topic (for push notifications)
  if (messagingModule) {
    try {
      await messagingModule().subscribeToTopic(`hub_${hubId}`);
      console.log(`[FirebaseService] FCM topic subscribed: hub_${hubId}`);
    } catch (e) {
      console.warn('[FirebaseService] FCM topic subscribe failed:', e.message);
    }
  }

  // 2. Record in Firestore
  const db = getDb();
  if (!db) return { success: true }; // FCM subscription still works

  try {
    // Add to user's subscriptions
    await db.collection('subscriptions').doc(`${walletAddress}_${hubId}`).set({
      walletAddress,
      hubId,
      subscribedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Increment hub subscriber count
    await db.collection('hubs').doc(hubId).update({
      subscribers: firestore.FieldValue.increment(1),
    });

    console.log('[FirebaseService] Subscription recorded in Firestore');
    return { success: true };
  } catch (error) {
    console.warn('[FirebaseService] subscribe Firestore failed:', error.message);
    return { success: true }; // FCM subscription still works
  }
}

/**
 * Remove a subscription from Firestore + unsubscribe from FCM topic
 * @param {string} hubId - Hub ID
 * @param {string} walletAddress - Subscriber wallet
 */
export async function unsubscribeFromHubBackend(hubId, walletAddress) {
  console.log(`[FirebaseService] unsubscribe: ${walletAddress} ← hub ${hubId}`);

  // 1. Unsubscribe from FCM topic
  if (messagingModule) {
    try {
      await messagingModule().unsubscribeFromTopic(`hub_${hubId}`);
      console.log(`[FirebaseService] FCM topic unsubscribed: hub_${hubId}`);
    } catch (e) {
      console.warn('[FirebaseService] FCM topic unsubscribe failed:', e.message);
    }
  }

  // 2. Remove from Firestore
  const db = getDb();
  if (!db) return { success: true };

  try {
    await db.collection('subscriptions').doc(`${walletAddress}_${hubId}`).delete();
    await db.collection('hubs').doc(hubId).update({
      subscribers: firestore.FieldValue.increment(-1),
    });
    console.log('[FirebaseService] Unsubscription recorded in Firestore');
    return { success: true };
  } catch (error) {
    console.warn('[FirebaseService] unsubscribe Firestore failed:', error.message);
    return { success: true };
  }
}

// =====================================================
//  4. AD MODERATION — Firestore Sync
// =====================================================

/**
 * Approve an ad creative via Cloud Function
 * @param {string} creativeId - Firestore doc ID
 * @param {string} walletAddress - Admin wallet
 */
export async function approveAdCreative(creativeId, walletAddress) {
  console.log(`[FirebaseService] approveAd: ${creativeId}`);
  const fnInstance = getFunctions();
  if (fnInstance) {
    try {
      const moderate = fnInstance.httpsCallable('moderateAdCreative');
      const result = await moderate({ creativeId, action: 'approve', walletAddress });
      return { success: true, data: result.data };
    } catch (error) {
      console.warn('[FirebaseService] approveAd Cloud Function failed:', error.message);
    }
  }

  // Fallback: direct Firestore update
  const db = getDb();
  if (db) {
    try {
      await db.collection('adCreatives').doc(creativeId).update({
        status: 'approved',
        reviewedAt: firestore.FieldValue.serverTimestamp(),
        reviewedBy: walletAddress,
      });
      return { success: true };
    } catch (error) {
      console.warn('[FirebaseService] approveAd Firestore failed:', error.message);
    }
  }

  return { success: false };
}

/**
 * Reject an ad creative via Cloud Function
 * @param {string} creativeId - Firestore doc ID
 * @param {string} walletAddress - Admin wallet
 * @param {string} reason - Rejection reason
 */
export async function rejectAdCreative(creativeId, walletAddress, reason) {
  console.log(`[FirebaseService] rejectAd: ${creativeId}`);
  const fnInstance = getFunctions();
  if (fnInstance) {
    try {
      const moderate = fnInstance.httpsCallable('moderateAdCreative');
      const result = await moderate({
        creativeId,
        action: 'reject',
        walletAddress,
        rejectionReason: reason || 'Rejected by admin',
      });
      return { success: true, data: result.data };
    } catch (error) {
      console.warn('[FirebaseService] rejectAd Cloud Function failed:', error.message);
    }
  }

  const db = getDb();
  if (db) {
    try {
      await db.collection('adCreatives').doc(creativeId).update({
        status: 'rejected',
        rejectionReason: reason || 'Rejected by admin',
        reviewedAt: firestore.FieldValue.serverTimestamp(),
        reviewedBy: walletAddress,
      });
      return { success: true };
    } catch (error) {
      console.warn('[FirebaseService] rejectAd Firestore failed:', error.message);
    }
  }

  return { success: false };
}

// =====================================================
//  5. ANALYTICS — Track Events
// =====================================================

/**
 * Track a user event (for DEEP Score calculation)
 * @param {string} walletAddress - User wallet
 * @param {string} eventType - SCORING_COEFFICIENTS key
 * @param {string} hubId - Optional hub context
 */
export async function trackEvent(walletAddress, eventType, hubId = null) {
  console.log(`[FirebaseService] trackEvent: ${eventType} by ${walletAddress}`);
  const fnInstance = getFunctions();
  if (fnInstance) {
    try {
      const track = fnInstance.httpsCallable('trackEvent');
      await track({ walletAddress, eventType, hubId });
      return { success: true };
    } catch (error) {
      console.warn('[FirebaseService] trackEvent failed:', error.message);
    }
  }

  // Fallback: log locally
  const db = getDb();
  if (db) {
    try {
      await db.collection('analytics').doc(walletAddress).collection('events').add({
        eventType,
        hubId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.warn('[FirebaseService] trackEvent Firestore failed:', error.message);
    }
  }

  return { success: false };
}

/**
 * Send a global notification via Cloud Function
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} walletAddress - Admin wallet
 */
export async function sendGlobalNotification(title, body, walletAddress) {
  console.log(`[FirebaseService] sendGlobalNotification: "${title}"`);

  const db = getDb();
  if (db) {
    try {
      await db.collection('notifications').add({
        hubId: 'global',
        title,
        body,
        createdAt: firestore.FieldValue.serverTimestamp(),
        source: 'admin_global',
        walletAddress,
      });
      return { success: true };
    } catch (error) {
      console.warn('[FirebaseService] sendGlobalNotification failed:', error.message);
    }
  }

  return { success: true }; // Always return success for UI
}

// =====================================================
//  6. FETCH OPERATIONS — Read from Firestore
// =====================================================

/**
 * Fetch all active hubs from Firestore
 * @returns {Promise<Array>} Array of hub objects
 */
export async function fetchHubsFromFirestore() {
  const db = getDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection('hubs').where('active', '==', true).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('[FirebaseService] fetchHubs failed:', error.message);
    return null;
  }
}

/**
 * Register FCM token in Firestore for a wallet
 * @param {string} token - FCM device token
 * @param {string} walletAddress - User wallet
 */
export async function registerFcmToken(token, walletAddress) {
  if (!token || !walletAddress) return;
  const db = getDb();
  if (!db) return;

  try {
    await db.collection('fcmTokens').doc(walletAddress).set({
      token,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      platform: 'android',
    }, { merge: true });
    console.log('[FirebaseService] FCM token registered for:', walletAddress);
  } catch (error) {
    console.warn('[FirebaseService] registerFcmToken failed:', error.message);
  }
}
