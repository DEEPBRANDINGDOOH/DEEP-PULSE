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
import { API_BASE_URL, USE_DEVNET } from '../config/constants';
import { logger } from '../utils/security';

// Safe imports for Firebase
let firestore = null;
let functions = null;
let messagingModule = null;
let authModule = null;
let crashlyticsModule = null;
let appCheckModule = null;

try {
  firestore = require('@react-native-firebase/firestore').default;
} catch (e) {
  logger.warn('[FirebaseService] Firestore not available:', e.message);
}

try {
  functions = require('@react-native-firebase/functions').default;
} catch (e) {
  logger.warn('[FirebaseService] Cloud Functions not available:', e.message);
}

try {
  messagingModule = require('@react-native-firebase/messaging').default;
} catch (e) {
  logger.warn('[FirebaseService] Messaging not available:', e.message);
}

try {
  authModule = require('@react-native-firebase/auth').default;
} catch (e) {
  logger.warn('[FirebaseService] Auth not available:', e.message);
}

try {
  crashlyticsModule = require('@react-native-firebase/crashlytics').default;
} catch (e) {
  logger.warn('[FirebaseService] Crashlytics not available:', e.message);
}

try {
  appCheckModule = require('@react-native-firebase/app-check').default;
} catch (e) {
  logger.warn('[FirebaseService] App Check not available:', e.message);
}

// =====================================================
//  HELPER: Get Firestore instance safely
// =====================================================

function getDb() {
  if (!firestore) {
    logger.warn('[FirebaseService] Firestore not initialized');
    return null;
  }
  return firestore();
}

function getFunctions() {
  if (!functions) {
    logger.warn('[FirebaseService] Cloud Functions not initialized');
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
 * @param {string|null} link - Optional link URL to include in notification
 * @returns {Promise<{success: boolean, notificationId?: string}>}
 */
export async function sendHubNotification(hubId, hubName, title, body, walletAddress, link = null) {
  logger.log(`[FirebaseService] sendHubNotification: ${hubName} → "${title}"`);

  // [C-06 FIX] Validate required fields before any write
  if (!hubId || !title || !body || !walletAddress || walletAddress.length < 32) {
    logger.warn('[FirebaseService] sendHubNotification: missing required fields');
    return { success: false, error: 'Missing required fields' };
  }
  // Enforce field length limits (match Firestore rules)
  const safeTitle = title.slice(0, 100);
  const safeBody = body.slice(0, 500);
  // Prefix title with hub name so recipients see the sender
  const displayTitle = hubName ? `${hubName}: ${safeTitle}` : safeTitle;

  // Strategy 1: Call the Cloud Function directly (preferred)
  const fnInstance = getFunctions();
  if (fnInstance) {
    try {
      const sendPush = fnInstance.httpsCallable('sendPushToSubscribers');
      const result = await sendPush({
        hubId,
        title: displayTitle,
        body: safeBody,
        walletAddress,
        data: { hubName, hubId, ...(link ? { link } : {}) },
      });
      logger.log('[FirebaseService] Cloud Function response:', result.data);
      return { success: true, notificationId: result.data?.notificationId };
    } catch (error) {
      // [B47] Downgrade to warn — Cloud Function fallback to Firestore is expected behavior (not a red-banner error)
      logger.warn('[FirebaseService] Cloud Function call failed, trying Firestore fallback:', error.message);
    }
  }

  // Strategy 2: Write directly to Firestore (triggers onNewNotification)
  const db = getDb();
  if (db) {
    try {
      const notifRef = await db.collection('notifications').add({
        hubId,
        hubName,
        title: displayTitle,
        body: safeBody,
        link: link || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        source: 'app_direct',
        walletAddress,
      });
      logger.log('[FirebaseService] Notification written to Firestore:', notifRef.id);
      return { success: true, notificationId: notifRef.id };
    } catch (error) {
      logger.error('[FirebaseService] Firestore write failed:', error.message);
    }
  }

  // No Firebase available — notification NOT synced (local only)
  logger.warn('[FirebaseService] No Firebase — notification local only, NOT synced');
  return { success: false, notificationId: null, error: 'No Firebase available' };
}

// =====================================================
//  2. HUB LIFECYCLE — Firestore Sync
// =====================================================

/**
 * Create a hub document in Firestore (status: PENDING)
 * [B44] Explicit field construction — no blind spread to avoid undefined values
 *       Uses console.error (always visible) instead of logger.warn (dev-only)
 * @param {Object} hubData - { id, name, description, category, icon, creator, createdDate }
 */
export async function createHubInFirestore(hubData) {
  // [B44] Always use console.error for critical write ops (visible in release builds)
  console.log('[FirebaseService] createHub called:', hubData?.name, '(id:', hubData?.id, ')');

  if (!hubData || !hubData.id || !hubData.name) {
    console.error('[FirebaseService] createHub: INVALID hubData — missing id or name', JSON.stringify(hubData));
    return { success: false, error: 'Invalid hub data: missing id or name' };
  }

  const db = getDb();
  if (!db) {
    console.error('[FirebaseService] createHub: Firestore NOT available (db is null)');
    return { success: false, error: 'Firestore not initialized' };
  }

  try {
    // [B44] Explicitly construct document — never spread raw hubData
    // Firestore throws on undefined values; this guarantees only valid fields
    const docData = {
      id: String(hubData.id),
      name: String(hubData.name),
      description: String(hubData.description || ''),
      category: String(hubData.category || 'DeFi'),
      icon: String(hubData.icon || 'rocket'),
      creator: String(hubData.creator || 'unknown'),
      createdDate: String(hubData.createdDate || new Date().toISOString()),
      status: 'PENDING',
      active: false,
      subscribers: 0,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    // Only add logoUrl if it's a non-null string (Firestore rejects undefined)
    if (hubData.logoUrl != null && typeof hubData.logoUrl === 'string') {
      docData.logoUrl = hubData.logoUrl;
    }

    console.log('[FirebaseService] createHub: writing to hubs/' + docData.id, 'fields:', Object.keys(docData).join(', '));
    await db.collection('hubs').doc(docData.id).set(docData);
    console.log('[FirebaseService] ✅ Hub created in Firestore OK:', docData.id);
    return { success: true };
  } catch (error) {
    // [B44] console.error is ALWAYS visible (even in release builds)
    console.error('[FirebaseService] ❌ createHub FAILED:', error.message, error.code || '', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve a hub in Firestore (status: ACTIVE)
 * @param {string} hubId - Hub ID
 * @param {string} adminWallet - Admin wallet address
 */
export async function approveHubInFirestore(hubId, adminWallet) {
  logger.log(`[FirebaseService] approveHub: ${hubId}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    await db.collection('hubs').doc(hubId).update({
      status: 'ACTIVE',
      active: true,
      approvedAt: firestore.FieldValue.serverTimestamp(),
      approvedBy: adminWallet || null,
    });
    logger.log('[FirebaseService] Hub approved in Firestore:', hubId);
    return { success: true };
  } catch (error) {
    logger.error('[FirebaseService] approveHub failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a hub in Firestore (status: REJECTED)
 * @param {string} hubId - Hub ID
 * @param {string} adminWallet - Admin wallet address
 */
export async function rejectHubInFirestore(hubId, adminWallet) {
  logger.log(`[FirebaseService] rejectHub: ${hubId}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    await db.collection('hubs').doc(hubId).update({
      status: 'REJECTED',
      active: false,
      rejectedAt: firestore.FieldValue.serverTimestamp(),
      rejectedBy: adminWallet || null,
    });
    logger.log('[FirebaseService] Hub rejected in Firestore:', hubId);
    return { success: true };
  } catch (error) {
    logger.error('[FirebaseService] rejectHub failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Suspend a hub in Firestore (status: SUSPENDED)
 * @param {string} hubId - Hub ID
 * @param {string} adminWallet - Admin wallet address (must be valid Solana address)
 */
export async function suspendHubInFirestore(hubId, adminWallet) {
  if (!hubId || typeof hubId !== 'string') {
    logger.warn('[FirebaseService] suspendHub: invalid hubId');
    return { success: false, error: 'Invalid hubId' };
  }
  if (!adminWallet || typeof adminWallet !== 'string' || adminWallet.length < 32) {
    logger.warn('[FirebaseService] suspendHub: invalid adminWallet');
    return { success: false, error: 'Invalid admin wallet' };
  }
  logger.log(`[FirebaseService] suspendHub: ${hubId}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    await db.collection('hubs').doc(hubId).set({
      status: 'SUSPENDED',
      active: false,
      suspendedAt: firestore.FieldValue.serverTimestamp(),
      suspendedBy: adminWallet,
    }, { merge: true });
    logger.log('[FirebaseService] Hub suspended in Firestore:', hubId);
    return { success: true };
  } catch (error) {
    logger.error('[FirebaseService] suspendHub failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Reactivate a suspended hub in Firestore (status: ACTIVE)
 * @param {string} hubId - Hub ID
 * @param {string} adminWallet - Admin wallet address (must be valid Solana address)
 */
export async function reactivateHubInFirestore(hubId, adminWallet) {
  if (!hubId || typeof hubId !== 'string') {
    logger.warn('[FirebaseService] reactivateHub: invalid hubId');
    return { success: false, error: 'Invalid hubId' };
  }
  if (!adminWallet || typeof adminWallet !== 'string' || adminWallet.length < 32) {
    logger.warn('[FirebaseService] reactivateHub: invalid adminWallet');
    return { success: false, error: 'Invalid admin wallet' };
  }
  logger.log(`[FirebaseService] reactivateHub: ${hubId}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    await db.collection('hubs').doc(hubId).update({
      status: 'ACTIVE',
      active: true,
      reactivatedAt: firestore.FieldValue.serverTimestamp(),
      reactivatedBy: adminWallet,
      suspendedAt: null,
      suspendedBy: null,
    });
    logger.log('[FirebaseService] Hub reactivated in Firestore:', hubId);
    return { success: true };
  } catch (error) {
    logger.error('[FirebaseService] reactivateHub failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Soft-delete a hub in Firestore (sets status to DELETED + active: false).
 * Firestore rules block .delete() — we use a status update instead.
 * The hub remains in Firestore for audit trail but is excluded from all queries.
 * @param {string} hubId - Hub ID
 * @param {string} adminWallet - Admin wallet address (must be valid Solana address)
 */
export async function deleteHubInFirestore(hubId, adminWallet) {
  if (!hubId || typeof hubId !== 'string') {
    logger.warn('[FirebaseService] deleteHub: invalid hubId');
    return { success: false, error: 'Invalid hubId' };
  }
  if (!adminWallet || typeof adminWallet !== 'string' || adminWallet.length < 32) {
    logger.warn('[FirebaseService] deleteHub: invalid adminWallet');
    return { success: false, error: 'Invalid admin wallet' };
  }
  logger.log(`[FirebaseService] deleteHub: ${hubId} by ${adminWallet}`);
  const db = getDb();
  if (!db) return { success: false };

  try {
    // Soft-delete: mark as DELETED (Firestore rules block hard .delete())
    await db.collection('hubs').doc(hubId).set({
      status: 'DELETED',
      active: false,
      deletedAt: firestore.FieldValue.serverTimestamp(),
      deletedBy: adminWallet,
    }, { merge: true });
    logger.log('[FirebaseService] Hub soft-deleted in Firestore:', hubId);
    return { success: true };
  } catch (error) {
    logger.error('[FirebaseService] deleteHub failed:', error.message);
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
  logger.log(`[FirebaseService] subscribe: ${walletAddress} → hub ${hubId}`);

  // 1. Subscribe to FCM topic (for push notifications)
  if (messagingModule) {
    try {
      await messagingModule().subscribeToTopic(`hub_${hubId}`);
      logger.log(`[FirebaseService] FCM topic subscribed: hub_${hubId}`);
    } catch (e) {
      logger.warn('[FirebaseService] FCM topic subscribe failed:', e.message);
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

    logger.log('[FirebaseService] Subscription recorded in Firestore');
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] subscribe Firestore failed:', error.message);
    return { success: true }; // FCM subscription still works
  }
}

/**
 * Remove a subscription from Firestore + unsubscribe from FCM topic
 * @param {string} hubId - Hub ID
 * @param {string} walletAddress - Subscriber wallet
 */
export async function unsubscribeFromHubBackend(hubId, walletAddress) {
  logger.log(`[FirebaseService] unsubscribe: ${walletAddress} ← hub ${hubId}`);

  // 1. Unsubscribe from FCM topic
  if (messagingModule) {
    try {
      await messagingModule().unsubscribeFromTopic(`hub_${hubId}`);
      logger.log(`[FirebaseService] FCM topic unsubscribed: hub_${hubId}`);
    } catch (e) {
      logger.warn('[FirebaseService] FCM topic unsubscribe failed:', e.message);
    }
  }

  // 2. Remove from Firestore
  const db = getDb();
  if (!db) return { success: true };

  try {
    await db.collection('subscriptions').doc(`${walletAddress}_${hubId}`).delete();
    // NOTE: increment(-1) can push subscribers below 0 if the subscription
    // doc was already missing (e.g. double-tap). Firestore has no atomic
    // "decrement only if > 0" — a Cloud Function or security rule
    // `max(resource.data.subscribers - 1, 0)` would be needed to fully fix.
    await db.collection('hubs').doc(hubId).update({
      subscribers: firestore.FieldValue.increment(-1),
    });
    logger.log('[FirebaseService] Unsubscription recorded in Firestore');
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] unsubscribe Firestore failed:', error.message);
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
  logger.log(`[FirebaseService] approveAd: ${creativeId}`);
  const fnInstance = getFunctions();
  if (fnInstance) {
    try {
      const moderate = fnInstance.httpsCallable('moderateAdCreative');
      const result = await moderate({ creativeId, action: 'approve', walletAddress });
      return { success: true, data: result.data };
    } catch (error) {
      logger.error('[FirebaseService] approveAd Cloud Function failed:', error.message);
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
      logger.error('[FirebaseService] approveAd Firestore failed:', error.message);
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
  logger.log(`[FirebaseService] rejectAd: ${creativeId}`);
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
      logger.error('[FirebaseService] rejectAd Cloud Function failed:', error.message);
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
      logger.error('[FirebaseService] rejectAd Firestore failed:', error.message);
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
  logger.log(`[FirebaseService] trackEvent: ${eventType} by ${walletAddress}`);
  const fnInstance = getFunctions();
  if (fnInstance) {
    try {
      const track = fnInstance.httpsCallable('trackEvent');
      await track({ walletAddress, eventType, hubId });
      return { success: true };
    } catch (error) {
      // [B47] Downgrade — Cloud Function may not be deployed, Firestore fallback handles it
      logger.log('[FirebaseService] trackEvent Cloud Function unavailable, using Firestore fallback');
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
      // [B47] Downgrade — analytics tracking is non-critical
      logger.warn('[FirebaseService] trackEvent Firestore failed:', error.message);
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
  logger.log(`[FirebaseService] sendGlobalNotification: "${title}"`);

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
      logger.error('[FirebaseService] sendGlobalNotification failed:', error.message);
    }
  }

  return { success: false, error: 'No Firebase available' };
}

// =====================================================
//  5b. TALENT SUBMISSIONS — Firestore Sync
// =====================================================

export async function saveTalentSubmission(submission) {
  if (!submission?.id) return { success: false }; // [B48] Null guard
  logger.log(`[FirebaseService] saveTalentSubmission: ${submission.id}`);
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B45] Explicit fields — no blind spread (prevents Firestore undefined crash)
    const docData = {
      id: String(submission.id),
      name: String(submission.name || ''),
      category: String(submission.category || ''),
      description: String(submission.description || ''),
      portfolio: String(submission.portfolio || ''),
      walletAddress: String(submission.walletAddress || submission.creator || ''),
      status: String(submission.status || 'pending'),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (submission.depositTx) docData.depositTx = String(submission.depositTx);
    await db.collection('talentSubmissions').doc(docData.id).set(docData);
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] saveTalentSubmission failed:', error.message);
    return { success: false };
  }
}

export async function fetchTalentSubmissions() {
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('talentSubmissions').orderBy('createdAt', 'desc').limit(100).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchTalentSubmissions failed:', error.message);
    return null;
  }
}

// =====================================================
//  5c. DAO PROPOSALS — Firestore Sync
// =====================================================

export async function saveDaoProposal(proposal) {
  if (!proposal?.id) return { success: false }; // [B48] Null guard
  logger.log(`[FirebaseService] saveDaoProposal: ${proposal.id}`);
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B45] Explicit fields
    const docData = {
      id: String(proposal.id),
      title: String(proposal.title || ''),
      description: String(proposal.description || ''),
      category: String(proposal.category || ''),
      targetAmount: Number(proposal.targetAmount || 0),
      walletAddress: String(proposal.walletAddress || proposal.creator || ''),
      status: String(proposal.status || 'pending'),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (proposal.depositTx) docData.depositTx = String(proposal.depositTx);
    if (proposal.hubName) docData.hubName = String(proposal.hubName);
    await db.collection('daoProposals').doc(docData.id).set(docData);
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] saveDaoProposal failed:', error.message);
    return { success: false };
  }
}

export async function updateDaoProposalInFirestore(proposalId, updates) {
  if (!proposalId) return { success: false }; // [B48] Null guard
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B48] Sanitize updates — strip undefined values to prevent Firestore crash
    const cleanUpdates = {};
    Object.entries(updates || {}).forEach(([key, val]) => {
      if (val !== undefined) cleanUpdates[key] = val;
    });
    cleanUpdates.updatedAt = firestore.FieldValue.serverTimestamp();
    await db.collection('daoProposals').doc(proposalId).update(cleanUpdates);
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] updateDaoProposal failed:', error.message);
    return { success: false };
  }
}

export async function fetchDaoProposals() {
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('daoProposals').orderBy('createdAt', 'desc').limit(100).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchDaoProposals failed:', error.message);
    return null;
  }
}

// =====================================================
//  5d. USER FEEDBACK — Firestore Sync
// =====================================================

export async function saveHubFeedback(hubName, feedback) {
  if (!feedback?.id) return { success: false }; // [B48] Null guard
  logger.log(`[FirebaseService] saveHubFeedback: ${feedback.id} for ${hubName}`);
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B48] Explicit fields — same pattern as other save functions (prevents Firestore undefined crash)
    const docData = {
      id: String(feedback.id),
      wallet: String(feedback.wallet || ''),
      title: String(feedback.title || ''),
      message: String(feedback.message || ''),
      deposit: Number(feedback.deposit) || 0,
      timestamp: String(feedback.timestamp || ''),
      hubName: String(hubName || ''),
      notificationId: String(feedback.notificationId || ''),
      status: String(feedback.status || 'pending'),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('hubFeedbacks').doc(docData.id).set(docData);
    return { success: true };
  } catch (error) {
    // [B47] Downgrade — non-critical background sync
    logger.warn('[FirebaseService] saveHubFeedback failed:', error.message);
    return { success: false };
  }
}

export async function fetchHubFeedbacks() {
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('hubFeedbacks').orderBy('createdAt', 'desc').limit(200).get();
    const grouped = {};
    snapshot.docs.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      const hub = data.hubName || 'General';
      if (!grouped[hub]) grouped[hub] = [];
      grouped[hub].push(data);
    });
    return grouped;
  } catch (error) {
    logger.warn('[FirebaseService] fetchHubFeedbacks failed:', error.message);
    return null;
  }
}

// =====================================================
//  5e. AD CREATIVE SUBMISSIONS — Firestore Sync
// =====================================================

export async function saveAdCreative(ad) {
  if (!ad?.id) return { success: false }; // [B48] Null guard
  logger.log(`[FirebaseService] saveAdCreative: ${ad.id}`);
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B45] Explicit fields — adCreatives has write:false in rules
    // This write goes to offline cache and syncs when rules allow it
    const docData = {
      id: String(ad.id),
      brandName: String(ad.brandName || ''),
      slotType: String(ad.slotType || ''),
      walletAddress: String(ad.walletAddress || ad.advertiser || ''),
      status: 'pending_review',
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (ad.imageUrl) docData.imageUrl = String(ad.imageUrl);
    if (ad.landingUrl) docData.landingUrl = String(ad.landingUrl);
    if (ad.title) docData.title = String(ad.title);
    if (ad.richTitle) docData.richTitle = String(ad.richTitle);
    if (ad.richBody) docData.richBody = String(ad.richBody);
    if (ad.richCtaLabel) docData.richCtaLabel = String(ad.richCtaLabel);
    if (ad.richCtaUrl) docData.richCtaUrl = String(ad.richCtaUrl);
    if (ad.hubName) docData.hubName = String(ad.hubName);
    if (ad.duration != null) docData.duration = Number(ad.duration);
    if (ad.totalCost != null) docData.totalCost = Number(ad.totalCost);
    if (ad.submittedDate) docData.submittedDate = String(ad.submittedDate);
    await db.collection('adCreatives').doc(docData.id).set(docData);
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] saveAdCreative failed:', error.message);
    return { success: false };
  }
}

export async function fetchPendingAdCreatives() {
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('adCreatives').where('status', '==', 'pending_review').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchPendingAdCreatives failed:', error.message);
    return null;
  }
}

// =====================================================
//  5f. CUSTOM BRAND DEALS — Firestore Sync
// =====================================================

export async function saveCustomDeal(deal) {
  if (!deal?.id) return { success: false }; // [B48] Null guard
  logger.log(`[FirebaseService] saveCustomDeal: ${deal.id}`);
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B45] Explicit fields
    const docData = {
      id: String(deal.id),
      brandName: String(deal.brandName || ''),
      hubName: String(deal.hubName || ''),
      dealPrice: Number(deal.dealPrice || 0),
      originalPrice: Number(deal.originalPrice || 0),
      slotType: String(deal.slotType || ''),
      status: String(deal.status || 'active'),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (deal.walletAddress) docData.walletAddress = String(deal.walletAddress);
    if (deal.description) docData.description = String(deal.description);
    await db.collection('customDeals').doc(docData.id).set(docData);
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] saveCustomDeal failed:', error.message);
    return { success: false };
  }
}

export async function removeCustomDealFromFirestore(dealId) {
  const db = getDb();
  if (!db) return { success: false };
  try {
    await db.collection('customDeals').doc(dealId).update({
      status: 'revoked',
      revokedAt: firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] removeCustomDeal failed:', error.message);
    return { success: false };
  }
}

export async function fetchCustomDeals() {
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('customDeals').where('status', '==', 'active').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchCustomDeals failed:', error.message);
    return null;
  }
}

// =====================================================
//  5g. ADMIN-BRAND MESSAGES — Firestore Sync
// =====================================================

export async function saveAdminConversation(conversation) {
  if (!conversation?.id) return { success: false }; // [B48] Null guard
  logger.log(`[FirebaseService] saveAdminConversation: ${conversation.id}`);
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B45] Explicit fields
    const docData = {
      id: String(conversation.id),
      brandName: String(conversation.brandName || ''),
      hubName: String(conversation.hubName || ''),
      messages: Array.isArray(conversation.messages) ? conversation.messages : [],
      status: String(conversation.status || 'open'),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    if (conversation.walletAddress) docData.walletAddress = String(conversation.walletAddress);
    await db.collection('adminConversations').doc(docData.id).set(docData);
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] saveAdminConversation failed:', error.message);
    return { success: false };
  }
}

export async function fetchAdminConversations() {
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('adminConversations').orderBy('updatedAt', 'desc').limit(50).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchAdminConversations failed:', error.message);
    return null;
  }
}

// =====================================================
//  5h. DOOH CAMPAIGNS — Firestore Sync
// =====================================================

export async function saveDoohCampaign(campaign) {
  if (!campaign?.id) return { success: false }; // [B48] Null guard
  logger.log(`[FirebaseService] saveDoohCampaign: ${campaign.id}`);
  const db = getDb();
  if (!db) return { success: false };
  try {
    // [B45] Explicit fields
    const docData = {
      id: String(campaign.id),
      campaignTitle: String(campaign.campaignTitle || ''),
      hubName: String(campaign.hubName || ''),
      description: String(campaign.description || ''),
      contactEmail: String(campaign.contactEmail || ''),
      status: String(campaign.status || 'pending'),
      createdAt: firestore.FieldValue.serverTimestamp(),
    };
    if (campaign.targetLocations) docData.targetLocations = String(campaign.targetLocations);
    if (campaign.preferredDates) docData.preferredDates = String(campaign.preferredDates);
    if (campaign.selectedInventory) docData.selectedInventory = campaign.selectedInventory;
    if (campaign.budget) docData.budget = String(campaign.budget);
    if (campaign.walletAddress) docData.walletAddress = String(campaign.walletAddress);
    await db.collection('doohCampaigns').doc(docData.id).set(docData);
    return { success: true };
  } catch (error) {
    logger.warn('[FirebaseService] saveDoohCampaign failed:', error.message);
    return { success: false };
  }
}

export async function fetchDoohCampaigns() {
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('doohCampaigns').orderBy('createdAt', 'desc').limit(50).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchDoohCampaigns failed:', error.message);
    return null;
  }
}

// =====================================================
//  5i. USER SCORES — Firestore Sync
// =====================================================

export async function saveUserScore(walletAddress, score, streak) {
  if (!walletAddress) return { success: false };
  const db = getDb();
  if (!db) return { success: false };
  try {
    await db.collection('userScores').doc(walletAddress).set({
      score: score || 0,
      streak: streak || 0,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    // [B47] Downgrade to warn — background sync failure is non-critical
    logger.warn('[FirebaseService] saveUserScore failed:', error.message);
    return { success: false };
  }
}

export async function fetchUserScore(walletAddress) {
  if (!walletAddress) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const doc = await db.collection('userScores').doc(walletAddress).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    logger.warn('[FirebaseService] fetchUserScore failed:', error.message);
    return null;
  }
}

/**
 * Fetch leaderboard from userScores collection
 * Returns top 100 users sorted by score descending
 * [B47] New — wires ProfileScreen leaderboard to real Firestore data
 */
export async function fetchLeaderboard(limit = 100) {
  const db = getDb();
  if (!db) return [];
  try {
    const snapshot = await db.collection('userScores')
      .orderBy('score', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      wallet: doc.id.slice(0, 4) + '...' + doc.id.slice(-3),
      fullWallet: doc.id,
      score: doc.data().score || 0,
      streak: doc.data().streak || 0,
      boost: doc.data().boost || 0,
      talent: doc.data().talent || 0,
      feedback: doc.data().feedback || 0,
    }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchLeaderboard failed:', error.message);
    return [];
  }
}

/**
 * Fetch user's hub subscriptions from Firestore
 * @param {string} walletAddress - User wallet address
 * @returns {Promise<Array>} Array of hub IDs the user is subscribed to
 */
export async function fetchUserSubscriptions(walletAddress) {
  if (!walletAddress) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection('subscriptions')
      .where('walletAddress', '==', walletAddress)
      .get();
    return snapshot.docs.map(doc => doc.data().hubId);
  } catch (error) {
    logger.warn('[FirebaseService] fetchUserSubscriptions failed:', error.message);
    return null;
  }
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
    logger.warn('[FirebaseService] fetchHubs failed:', error.message);
    return null;
  }
}

/**
 * Fetch all pending hubs from Firestore (for admin approval)
 * @returns {Promise<Array>} Array of pending hub objects
 */
export async function fetchPendingHubsFromFirestore() {
  const db = getDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection('hubs').where('status', '==', 'PENDING').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchPendingHubs failed:', error.message);
    return null;
  }
}

/**
 * Fetch recent notifications from Firestore
 * @returns {Promise<Array>} Array of notification objects
 */
export async function fetchNotificationsFromFirestore() {
  const db = getDb();
  if (!db) return null;

  try {
    const snapshot = await db
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchNotifications failed:', error.message);
    return null;
  }
}

/**
 * Fetch approved ad creatives from Firestore
 * @returns {Promise<Array>} Array of approved ad objects
 */
export async function fetchApprovedAdsFromFirestore() {
  const db = getDb();
  if (!db) return null;

  try {
    const snapshot = await db
      .collection('adCreatives')
      .where('status', '==', 'approved')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('[FirebaseService] fetchApprovedAds failed:', error.message);
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
    logger.log('[FirebaseService] FCM token registered for:', walletAddress);
  } catch (error) {
    logger.warn('[FirebaseService] registerFcmToken failed:', error.message);
  }
}

// =====================================================
//  7. FIREBASE AUTH — Sign In With Wallet
// =====================================================

/**
 * Authenticate with Firebase using wallet signature.
 *
 * Flow:
 *   1. Signs a message via MWA (wallet.signMessage)
 *   2. Sends signature to signInWithWallet Cloud Function
 *   3. Cloud Function verifies ed25519 signature → returns Firebase Custom Auth token
 *   4. App signs in with auth().signInWithCustomToken(token)
 *
 * @param {string} walletAddress - The wallet's base58 public key
 * @param {Function} signMessageFn - walletAdapter.signMessage function
 * @param {string} authToken - MWA auth token for signMessage
 * @returns {Promise<{success: boolean, uid?: string}>}
 */
export async function authenticateWithFirebase(walletAddress, signMessageFn, authToken) {
  if (!authModule || !walletAddress) {
    logger.warn('[FirebaseService] Auth not available or no wallet');
    return { success: false };
  }

  // Check if already authenticated with same wallet
  const currentUser = authModule().currentUser;
  if (currentUser && currentUser.uid === walletAddress) {
    logger.log('[FirebaseService] Already authenticated as:', walletAddress);
    return { success: true, uid: walletAddress };
  }

  try {
    // Step 1: Create a unique message to sign
    const timestamp = Date.now();
    const message = `Sign in to DEEP PULSE: ${timestamp}`;

    // Step 2: Sign the message via MWA
    logger.log('[FirebaseService] Requesting wallet signature for auth...');
    const signatureBytes = await signMessageFn(message, authToken);

    if (!signatureBytes) {
      logger.warn('[FirebaseService] No signature returned from wallet');
      return { success: false, error: 'No signature' };
    }

    // Step 3: Convert signature to base64 for transport
    const signatureBase64 = Buffer.from(signatureBytes).toString('base64');

    // Step 4: Call Cloud Function to verify signature and get Firebase token
    const fnInstance = getFunctions();
    if (!fnInstance) {
      logger.warn('[FirebaseService] Cloud Functions not available for auth');
      return { success: false, error: 'Cloud Functions unavailable' };
    }

    const signIn = fnInstance.httpsCallable('signInWithWallet');
    const result = await signIn({
      walletAddress,
      message,
      signature: signatureBase64,
    });

    if (!result.data?.token) {
      logger.warn('[FirebaseService] No token received from signInWithWallet');
      return { success: false, error: 'No token received' };
    }

    // Step 5: Sign in to Firebase with the custom token
    await authModule().signInWithCustomToken(result.data.token);

    logger.log('[FirebaseService] Firebase Auth successful! UID:', walletAddress);
    return { success: true, uid: walletAddress };
  } catch (error) {
    logger.warn('[FirebaseService] Firebase Auth failed:', error.message);
    // Don't throw — auth failure shouldn't block the app
    return { success: false, error: error.message };
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function signOutFirebase() {
  if (!authModule) return;
  try {
    await authModule().signOut();
    logger.log('[FirebaseService] Firebase Auth signed out');
  } catch (error) {
    logger.warn('[FirebaseService] signOut failed:', error.message);
  }
}

/**
 * Check current Firebase Auth state
 * @returns {string|null} Current user's UID (wallet address) or null
 */
export function getFirebaseAuthUser() {
  if (!authModule) return null;
  return authModule().currentUser?.uid || null;
}

// =====================================================
//  8. FIREBASE CRASHLYTICS — Error Monitoring
// =====================================================

/**
 * Initialize Crashlytics and set user context
 * @param {string} walletAddress - User wallet for crash attribution
 */
export function initCrashlytics(walletAddress) {
  if (!crashlyticsModule) return;
  try {
    const crashlytics = crashlyticsModule();
    crashlytics.setCrashlyticsCollectionEnabled(true);
    if (walletAddress) {
      crashlytics.setUserId(walletAddress);
      crashlytics.setAttribute('wallet', walletAddress);
    }
    logger.log('[FirebaseService] Crashlytics initialized');
  } catch (error) {
    logger.warn('[FirebaseService] Crashlytics init failed:', error.message);
  }
}

/**
 * Log a non-fatal error to Crashlytics
 * @param {Error} error - Error object
 * @param {string} context - Where the error occurred
 */
export function logCrashlyticsError(error, context = '') {
  if (!crashlyticsModule) return;
  try {
    const crashlytics = crashlyticsModule();
    if (context) crashlytics.setAttribute('context', context);
    crashlytics.recordError(error);
  } catch (e) {
    // Silently fail — don't crash while reporting crashes
  }
}

/**
 * Log a breadcrumb message to Crashlytics
 * @param {string} message - Log message
 */
export function logCrashlyticsBreadcrumb(message) {
  if (!crashlyticsModule) return;
  try {
    crashlyticsModule().log(message);
  } catch (e) {
    // Silently fail
  }
}

// =====================================================
//  9. FIREBASE APP CHECK — Protect Cloud Functions
// =====================================================

/**
 * Initialize Firebase App Check
 * Uses Debug provider in USE_DEVNET mode, Play Integrity in production.
 */
export function initAppCheck() {
  if (!appCheckModule) return;
  try {
    const appCheck = appCheckModule();
    appCheck.initializeAppCheck({
      provider: USE_DEVNET
        ? appCheckModule.AppCheckDebugProvider  // Debug token for dev builds
        : appCheckModule.PlayIntegrityProvider, // Play Integrity for release builds
      isTokenAutoRefreshEnabled: true,
    });
    logger.log('[FirebaseService] App Check initialized (USE_DEVNET:', USE_DEVNET, ')');
  } catch (error) {
    logger.warn('[FirebaseService] App Check init failed:', error.message);
  }
}
