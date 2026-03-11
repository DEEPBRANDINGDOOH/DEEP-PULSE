/**
 * Global State Management with Zustand + Persist Middleware
 *
 * This store manages:
 * - Wallet connection state
 * - Subscribed projects
 * - Alerts and notifications
 * - User preferences
 *
 * Persistence is handled automatically by zustand/middleware persist.
 * Only wallet, subscribedProjects, pushToken, and theme are persisted.
 * Mock data (alerts, projects) resets on app restart.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_PROJECTS } from '../data/mockData';
import { PRICING, isAdmin, USE_DEVNET } from '../config/constants';
import {
  subscribeToHubBackend,
  unsubscribeFromHubBackend,
  createHubInFirestore,
  approveHubInFirestore,
  rejectHubInFirestore,
  suspendHubInFirestore,
  reactivateHubInFirestore,
  deleteHubInFirestore,
  // [B58] Static imports — fixes dynamic import() bug that silently failed in Metro/RN
  // ALL Firestore writes from the store were going through import().then() which never executed
  saveAdCreative,
  sendGlobalNotification,
  saveHubFeedback,
  updateNotificationReaction,
  deleteNotification,
  saveTalentSubmission,
  updateTalentSubmissionStatus,
  saveDaoProposal,
  updateDaoProposalInFirestore,
  saveUserScore,
  saveCustomDeal,
  removeCustomDealFromFirestore,
  saveAdminConversation,
  saveDoohCampaign,
} from '../services/firebaseService';
import { logger } from '../utils/security';

// Helper: merge local + firebase arrays by ID
// [B53] For items that exist in both: deep-merge fields, preferring non-empty values.
// Firebase provides the canonical status/timestamps; local provides richer field data
// (because Firestore explicit field mapping may have empty strings for some fields).
// Local-only items are preserved; Firebase-only items are preserved.
function mergeArraysById(localItems, firebaseItems) {
  if (!localItems || localItems.length === 0) return firebaseItems || [];
  if (!firebaseItems || firebaseItems.length === 0) return localItems;
  const fbMap = new Map(firebaseItems.map(item => [item.id, item]));
  const localMap = new Map(localItems.map(item => [item.id, item]));
  const merged = [];
  // Process Firebase items — merge with local if exists
  for (const fbItem of firebaseItems) {
    const localItem = localMap.get(fbItem.id);
    if (localItem) {
      // Deep merge: for each field, prefer non-empty value
      const mergedItem = { ...localItem };
      for (const [key, value] of Object.entries(fbItem)) {
        // [B55] Firebase value wins if non-empty; local value kept if Firebase is empty
        // Allow boolean false and numeric 0 to come through (they are valid values)
        if (value !== undefined && value !== null && (typeof value !== 'string' || value !== '')) {
          mergedItem[key] = value;
        }
      }
      merged.push(mergedItem);
    } else {
      merged.push(fbItem);
    }
  }
  // Add local-only items (not in Firebase)
  for (const localItem of localItems) {
    if (!fbMap.has(localItem.id)) {
      merged.push(localItem);
    }
  }
  return merged;
}

// [B55] Module-level timer — NOT in Zustand state (timers are not serializable)
let _scoreSyncTimer = null;

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ============================================
      // WALLET STATE
      // ============================================
      wallet: {
        connected: false,
        publicKey: null,
        authToken: null,
      },

      setWallet: (walletData) => set({ wallet: walletData }),

      clearWallet: () => set({
        wallet: {
          connected: false,
          publicKey: null,
          authToken: null,
        },
        hasGenesisToken: false,
        genesisTokenMint: null,
      }),

      // ============================================
      // SUBSCRIPTIONS STATE
      // ============================================
      subscribedProjects: [],

      subscribeToProject: (projectId) => {
        const { subscribedProjects, hubs, wallet } = get();
        if (!subscribedProjects.includes(projectId)) {
          // 1. Update local state immediately (optimistic UI)
          set({
            subscribedProjects: [...subscribedProjects, projectId],
            // Increment subscriber count on the hub
            hubs: hubs.map(h => h.id === projectId ? { ...h, subscribers: (h.subscribers || 0) + 1 } : h),
          });
          get().incrementScore(5); // [W6 FIX] Aligned with SCORING_COEFFICIENTS.SUBSCRIBE_HUB (5)
          // 2. Sync with Firebase backend (FCM topic + Firestore)
          // [H-03 FIX] Rollback on failure instead of swallowing errors
          subscribeToHubBackend(projectId, wallet?.publicKey || 'mock_user')
            .catch(e => {
              logger.warn('[Store] Backend subscribe failed, rolling back:', e);
              const current = get();
              set({
                subscribedProjects: current.subscribedProjects.filter(id => id !== projectId),
                hubs: current.hubs.map(h => h.id === projectId ? { ...h, subscribers: Math.max(0, (h.subscribers || 0) - 1) } : h),
              });
            });
        }
      },

      unsubscribeFromProject: (projectId) => {
        const { subscribedProjects, hubs, wallet } = get();
        const prevProjects = [...subscribedProjects];
        const prevCount = hubs.find(h => h.id === projectId)?.subscribers || 0;
        // 1. Update local state immediately (optimistic UI)
        set({
          subscribedProjects: subscribedProjects.filter(id => id !== projectId),
          // Decrement subscriber count on the hub
          hubs: hubs.map(h => h.id === projectId ? { ...h, subscribers: Math.max(0, (h.subscribers || 0) - 1) } : h),
        });
        // 2. Sync with Firebase backend (FCM topic + Firestore)
        // [H-03 FIX] Rollback on failure instead of swallowing errors
        unsubscribeFromHubBackend(projectId, wallet?.publicKey || 'mock_user')
          .catch(e => {
            logger.warn('[Store] Backend unsubscribe failed, rolling back:', e);
            const current = get();
            set({
              subscribedProjects: [...current.subscribedProjects, projectId],
              hubs: current.hubs.map(h => h.id === projectId ? { ...h, subscribers: prevCount } : h),
            });
          });
      },

      isSubscribed: (projectId) => {
        const { subscribedProjects } = get();
        return subscribedProjects.includes(projectId);
      },

      // Restore subscriptions from Firebase (used after cache clear)
      setSubscribedProjects: (hubIds) => {
        set({ subscribedProjects: hubIds || [] });
      },

      // ============================================
      // ALERTS STATE (not persisted — resets on app start)
      // ============================================
      alerts: [],

      markAlertAsRead: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === alertId ? { ...alert, read: true } : alert
          ),
        }));
      },

      markAllAlertsAsRead: () => {
        set((state) => ({
          alerts: state.alerts.map((alert) => ({ ...alert, read: true })),
        }));
      },

      getUnreadCount: () => {
        const { alerts } = get();
        return alerts.filter(alert => !alert.read).length;
      },

      addAlert: (alert) => {
        set((state) => ({
          alerts: [alert, ...state.alerts],
        }));
      },

      // ============================================
      // HUBS STATE (persisted — survives app restart)
      // ============================================
      hubs: [],
      pendingHubs: [],

      addPendingHub: (hub) => {
        // Update local state immediately
        // [B43] Firebase sync is now awaited by the calling screen (BrandBoostScreen)
        // to provide visible user feedback (✅ synced / ⚠️ pending)
        set((state) => ({
          pendingHubs: [hub, ...state.pendingHubs],
        }));
      },

      approveHub: (hubId) => {
        const { pendingHubs, hubs, wallet, subscribedProjects } = get();
        const hub = pendingHubs.find((h) => h.id === hubId);
        if (hub) {
          // 1. Update local state immediately + auto-subscribe creator
          const updatedSubs = subscribedProjects.includes(hubId)
            ? subscribedProjects
            : [...subscribedProjects, hubId];
          set({
            pendingHubs: pendingHubs.filter((h) => h.id !== hubId),
            hubs: [...hubs, { ...hub, status: 'ACTIVE', subscribers: (hub.subscribers || 0) + 1, subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }],
            subscribedProjects: updatedSubs,
          });
          // 2. Sync with Firestore + subscribe to FCM topic
          approveHubInFirestore(hubId, wallet?.publicKey || 'admin')
            .catch(e => logger.warn('[Store] Firestore approveHub failed:', e));
          subscribeToHubBackend(hubId, wallet?.publicKey || 'mock_user')
            .catch(e => logger.warn('[Store] Auto-subscribe creator failed:', e));
        }
      },

      rejectHub: (hubId) => {
        const { wallet } = get();
        // 1. Update local state immediately
        set((state) => ({
          pendingHubs: state.pendingHubs.filter((h) => h.id !== hubId),
        }));
        // 2. Sync with Firestore
        rejectHubInFirestore(hubId, wallet?.publicKey || 'admin')
          .catch(e => logger.warn('[Store] Firestore rejectHub failed:', e));
      },

      // Suspend an active hub (admin only — hides from Discover)
      suspendHub: (hubId) => {
        if (!hubId || typeof hubId !== 'string') {
          logger.warn('[Store] suspendHub: invalid hubId');
          return;
        }
        const { wallet, hubs } = get();
        if (!isAdmin(wallet?.publicKey)) {
          logger.warn('[Store] suspendHub blocked: not admin');
          return;
        }
        const prevHub = hubs.find(h => h.id === hubId);
        if (!prevHub || prevHub.status === 'SUSPENDED') return;

        set((state) => ({
          hubs: state.hubs.map(h =>
            h.id === hubId ? { ...h, status: 'SUSPENDED', suspendedAt: new Date().toISOString() } : h
          ),
        }));
        suspendHubInFirestore(hubId, wallet?.publicKey?.toString() || wallet?.publicKey)
          .then(result => {
            if (!result.success) {
              logger.warn('[Store] Firestore suspendHub sync failed (local state kept):', result.error);
            }
          })
          .catch(e => {
            logger.warn('[Store] Firestore suspendHub error (local state kept):', e?.message);
          });
      },

      // Reactivate a suspended hub (admin only — resets subscription to 30 days)
      reactivateHub: (hubId) => {
        if (!hubId || typeof hubId !== 'string') {
          logger.warn('[Store] reactivateHub: invalid hubId');
          return;
        }
        const { wallet, hubs } = get();
        if (!isAdmin(wallet?.publicKey)) {
          logger.warn('[Store] reactivateHub blocked: not admin');
          return;
        }
        const prevHub = hubs.find(h => h.id === hubId);
        if (!prevHub) return;

        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        set((state) => ({
          hubs: state.hubs.map(h =>
            h.id === hubId ? {
              ...h,
              status: 'ACTIVE',
              suspendedAt: null,
              subscriptionExpiresAt: newExpiry,
            } : h
          ),
        }));
        reactivateHubInFirestore(hubId, wallet?.publicKey?.toString() || wallet?.publicKey)
          .then(result => {
            if (!result.success) {
              logger.warn('[Store] Firestore reactivateHub sync failed (local state kept):', result.error);
            }
          })
          .catch(e => {
            logger.warn('[Store] Firestore reactivateHub error (local state kept):', e?.message);
          });
      },

      // Delete a hub permanently (admin only — IRREVERSIBLE)
      deleteHub: (hubId) => {
        if (!hubId || typeof hubId !== 'string') {
          logger.warn('[Store] deleteHub: invalid hubId');
          return;
        }
        const { wallet, hubs, subscribedProjects } = get();
        if (!isAdmin(wallet?.publicKey)) {
          logger.warn('[Store] deleteHub blocked: not admin');
          return;
        }
        if (!hubs.find(h => h.id === hubId)) return;

        // Save previous state for rollback
        const prevHubs = [...hubs];
        const prevSubs = [...subscribedProjects];
        set((state) => ({
          hubs: state.hubs.filter(h => h.id !== hubId),
          subscribedProjects: state.subscribedProjects.filter(id => id !== hubId),
        }));
        deleteHubInFirestore(hubId, wallet?.publicKey?.toString() || wallet?.publicKey)
          .then(result => {
            if (!result.success) {
              logger.warn('[Store] Firestore deleteHub sync failed (local state kept):', result.error);
            }
          })
          .catch(e => {
            logger.warn('[Store] Firestore deleteHub error (local state kept):', e?.message);
          });
      },

      // Check all hubs for overdue subscriptions (auto-detect expired payments)
      checkHubSubscriptions: () => {
        const { hubs } = get();
        const now = Date.now();
        let changed = false;
        const updated = hubs.map(h => {
          if (!h.subscriptionExpiresAt || ['SUSPENDED', 'PENDING', 'DELETED', 'REJECTED'].includes(h.status)) return h; // [B55]
          const expiresAt = new Date(h.subscriptionExpiresAt).getTime();
          // Guard against corrupted/invalid date values
          if (isNaN(expiresAt)) {
            logger.warn(`[Store] Invalid subscriptionExpiresAt for hub ${h.id}`);
            return h;
          }
          if (expiresAt < now && h.status !== 'OVERDUE') {
            changed = true;
            return { ...h, status: 'OVERDUE' };
          }
          if (expiresAt >= now && h.status === 'OVERDUE') {
            changed = true;
            return { ...h, status: 'ACTIVE' };
          }
          return h;
        });
        if (changed) set({ hubs: updated });
      },

      // ============================================
      // AD CREATIVES STATE (persisted — submitted by brands, reviewed by admin)
      // ============================================
      pendingAdCreatives: [],
      approvedAds: [],

      addPendingAdCreative: (ad) => {
        set((state) => ({
          pendingAdCreatives: [ad, ...state.pendingAdCreatives],
        }));
        get().incrementScore(20); // 20 pts per ad creative
        // [B58] Direct static call — fixes dynamic import() bug that silently failed in Metro/RN
        return saveAdCreative(ad)
          .then(result => {
            if (result?.success) {
              logger.log('[Store] saveAdCreative synced to Firestore:', ad.id);
            } else {
              logger.warn('[Store] saveAdCreative Firestore write returned false:', ad.id);
            }
            return result;
          })
          .catch(e => {
            logger.warn('[Store] saveAdCreative sync failed:', e);
            return { success: false };
          });
      },

      approveAdCreativeInStore: (adId) => {
        const { pendingAdCreatives, approvedAds, hubNotifications } = get();
        const ad = pendingAdCreatives.find(a => a.id === adId);
        if (ad) {
          const approvedAd = { ...ad, status: 'approved' };
          const updates = {
            pendingAdCreatives: pendingAdCreatives.filter(a => a.id !== adId),
            approvedAds: [...approvedAds, approvedAd],
          };

          // [B58] Direct static calls — fixes dynamic import() bug
          saveAdCreative(approvedAd)
            .then(r => { if (r?.success) logger.log('[Store] Approved ad synced:', adId); })
            .catch(e => logger.warn('[Store] saveAdCreative (approved) sync failed:', e));

          // Rich Notification Ads: displayed via approvedAds injection in HomeScreen feed
          // Push notification to all users via global notification
          if (ad.slotType === 'rich_notif') {
            const w = get().wallet?.publicKey;
            const walletStr = typeof w === 'string' ? w : (w?.toBase58?.() || w?.toString?.() || 'admin');
            sendGlobalNotification(
              ad.richTitle || 'Sponsored Content',
              ad.richBody || '',
              walletStr,
            ).catch(e => logger.warn('[Store] Global push for rich_notif failed:', e));
          }

          set(updates);
        }
      },

      rejectAdCreativeInStore: (adId) => {
        set((state) => ({
          pendingAdCreatives: state.pendingAdCreatives.filter(a => a.id !== adId),
        }));
      },

      // Resubmit an edited ad for admin review (moves from approved → pending)
      resubmitAdForReview: (adId, updates) => {
        const { approvedAds, pendingAdCreatives } = get();
        const ad = approvedAds.find(a => a.id === adId);
        if (ad) {
          const updatedAd = { ...ad, ...updates, status: 'pending_review', editedAt: new Date().toISOString() }; // [B41] Normalize status
          set({
            approvedAds: approvedAds.filter(a => a.id !== adId),
            pendingAdCreatives: [updatedAd, ...pendingAdCreatives],
          });
          // [B58] Direct static call — Sync to Firestore
          saveAdCreative(updatedAd)
            .catch(e => logger.warn('[Store] resubmitAdForReview sync failed:', e));
        }
      },

      // [B50] Pause an approved ad (status → 'paused', reversible)
      pauseAdInStore: (adId) => {
        set((state) => ({
          approvedAds: state.approvedAds.map(a =>
            a.id === adId ? { ...a, status: 'paused', pausedAt: new Date().toISOString() } : a
          ),
        }));
      },

      // [B50] Resume a paused ad (status → 'approved', back to running)
      resumeAdInStore: (adId) => {
        set((state) => ({
          approvedAds: state.approvedAds.map(a =>
            a.id === adId ? { ...a, status: 'approved', resumedAt: new Date().toISOString() } : a
          ),
        }));
      },

      // [B50] Stop an ad permanently (remove from approvedAds)
      stopAdInStore: (adId) => {
        set((state) => ({
          approvedAds: state.approvedAds.filter(a => a.id !== adId),
        }));
      },

      // ============================================
      // HUB FEEDBACKS STATE (persisted — submitted by users)
      // ============================================
      hubFeedbacks: {},

      addHubFeedback: (hubName, feedback) => {
        set((state) => ({
          hubFeedbacks: {
            ...state.hubFeedbacks,
            [hubName]: [feedback, ...(state.hubFeedbacks[hubName] || [])],
          },
        }));
        get().incrementScore(15); // [W6 FIX] Aligned with SCORING_COEFFICIENTS.SEND_FEEDBACK (15)
        // [B58] Direct static call — Sync to Firebase
        saveHubFeedback(hubName, feedback)
          .catch(e => logger.warn('[Store] saveHubFeedback sync failed:', e));
      },

      removeHubFeedback: (hubName, feedbackId) => {
        // [B55] Find feedback to get content key before removing
        const { hubFeedbacks } = get();
        const fbItem = (hubFeedbacks[hubName] || []).find(fb => fb.id === feedbackId);
        const contentKey = fbItem ? `${hubName}|${(fbItem.message || fbItem.title || '')}`.toLowerCase() : null;
        set((state) => ({
          hubFeedbacks: {
            ...state.hubFeedbacks,
            [hubName]: (state.hubFeedbacks[hubName] || []).filter(fb => fb.id !== feedbackId),
          },
          // [B55] Track dismissed feedback so sync never brings it back
          dismissedFeedbackIds: [...new Set([...state.dismissedFeedbackIds, feedbackId, ...(contentKey ? [contentKey] : [])])],
        }));
      },

      getHubFeedbacks: (hubName) => {
        const { hubFeedbacks } = get();
        return hubFeedbacks[hubName] || [];
      },

      // ============================================
      // HUB NOTIFICATIONS STATE (persisted)
      // ============================================
      hubNotifications: {},

      addHubNotification: (hubName, notification) => {
        set((state) => {
          // Enrich notification with hub logoUrl if not already present
          const hub = state.hubs.find(h => h.name === hubName)
                   || state.hubs.find(h => h.id === notification.hubId);
          const enriched = {
            ...notification,
            hubLogoUrl: notification.hubLogoUrl || hub?.logoUrl || null,
          };
          return {
            hubNotifications: {
              ...state.hubNotifications,
              [hubName]: [enriched, ...(state.hubNotifications[hubName] || [])],
            },
          };
        });
        get().incrementScore(15); // 15 pts per notification sent (creator)
      },

      getHubNotifications: (hubName) => {
        const { hubNotifications } = get();
        return hubNotifications[hubName] || [];
      },

      // Track read hub notification IDs (persisted)
      readHubNotificationIds: [],
      deletedNotificationIds: [],  // [B55] Persisted — survive Firebase sync
      dismissedFeedbackIds: [],    // [B55] Persisted — survive Firebase sync

      // [B56] Persist reaction to hub notification (survives app restart + cache clear)
      reactToHubNotification: (notifId) => {
        set((state) => {
          const updated = {};
          for (const [hubName, notifs] of Object.entries(state.hubNotifications || {})) {
            updated[hubName] = notifs.map(n =>
              n.id === notifId ? { ...n, reactions: (n.reactions || 0) + 1, reacted: true } : n
            );
          }
          return { hubNotifications: updated };
        });
        // [B58] Direct static call — Sync reaction count to Firebase
        const { hubNotifications } = get();
        let reactionCount = 0;
        for (const notifs of Object.values(hubNotifications || {})) {
          const found = notifs.find(n => n.id === notifId);
          if (found) { reactionCount = found.reactions || 0; break; }
        }
        updateNotificationReaction(notifId, reactionCount)
          .catch(e => logger.warn('[Store] updateNotificationReaction sync failed:', e));
      },

      markHubNotificationRead: (notifId) => {
        const { readHubNotificationIds } = get();
        if (!readHubNotificationIds.includes(notifId)) {
          set({ readHubNotificationIds: [...readHubNotificationIds, notifId] });
        }
      },

      markAllHubNotificationsRead: () => {
        const { hubNotifications, readHubNotificationIds } = get(); // [B55] Merge, don't replace
        const allIds = Object.values(hubNotifications || {}).flat().map(n => n.id);
        set({ readHubNotificationIds: [...new Set([...readHubNotificationIds, ...allIds])] });
      },

      // [B51] Remove a specific notification by ID from hubNotifications
      removeHubNotification: (notifId) => {
        // [B55] Find the notification to get its title+body for content-based matching
        const { hubNotifications } = get();
        let deletedNotif = null;
        for (const notifs of Object.values(hubNotifications || {})) {
          const found = notifs.find(n => n.id === notifId);
          if (found) { deletedNotif = found; break; }
        }
        set((state) => {
          const updated = {};
          for (const [hubName, notifs] of Object.entries(state.hubNotifications || {})) {
            const filtered = notifs.filter(n => n.id !== notifId);
            if (filtered.length > 0) updated[hubName] = filtered;
          }
          // [B55] Track deleted notification ID + content key so sync never brings it back
          const contentKey = deletedNotif ? `${(deletedNotif.title || '')}|${(deletedNotif.body || deletedNotif.message || '')}`.toLowerCase() : null;
          const newDeletedIds = [...new Set([...state.deletedNotificationIds, notifId, ...(contentKey ? [contentKey] : [])])];
          return { hubNotifications: updated, deletedNotificationIds: newDeletedIds };
        });
        // [B58] Direct static call — Also try to delete from Firestore
        deleteNotification(notifId)
          .catch(e => logger.warn('[Store] deleteNotification sync failed:', e));
      },

      getUnreadHubNotifCount: () => {
        const { hubNotifications, readHubNotificationIds } = get();
        // [B41] Exclude 'Sponsored' pseudo-hub — those are injected ads, not real notifications
        const allNotifs = Object.entries(hubNotifications || {})
          .filter(([hubName]) => hubName !== 'Sponsored')
          .flatMap(([, notifs]) => notifs);
        return allNotifs.filter(n => !readHubNotificationIds.includes(n.id)).length;
      },

      // ============================================
      // TALENT SUBMISSIONS STATE (persisted)
      // ============================================
      talentSubmissions: [], // Empty — populated by real user submissions

      addTalentSubmission: (submission) => {
        set((state) => ({
          talentSubmissions: [submission, ...state.talentSubmissions],
        }));
        get().incrementScore(25); // [W6 FIX] Aligned with SCORING_COEFFICIENTS.TALENT_SUBMIT (25)
        // [B58] Direct static call — Sync to Firebase
        saveTalentSubmission(submission)
          .catch(e => logger.warn('[Store] saveTalentSubmission sync failed:', e));
      },

      removeTalentSubmission: (submissionId) => {
        set((state) => ({
          talentSubmissions: state.talentSubmissions.filter(t => t.id !== submissionId),
        }));
        // [B58] Direct static call — Update status in Firebase to 'dismissed'
        updateTalentSubmissionStatus(submissionId, 'dismissed')
          .catch(e => logger.warn('[Store] removeTalentSubmission sync failed:', e));
      },

      updateTalentSubmission: (submissionId, updates) => {
        set((state) => ({
          talentSubmissions: state.talentSubmissions.map(t =>
            t.id === submissionId ? { ...t, ...updates } : t
          ),
        }));
        // [B58] Direct static call — Sync status update to Firebase
        if (updates.status) {
          updateTalentSubmissionStatus(submissionId, updates.status)
            .catch(e => logger.warn('[Store] updateTalentSubmission sync failed:', e));
        }
      },

      // ============================================
      // DAO PROPOSALS STATE (persisted)
      // ============================================
      daoProposals: [],

      addDaoProposal: (proposal) => {
        set((state) => ({
          daoProposals: [proposal, ...state.daoProposals],
        }));
        get().incrementScore(50); // 50 pts per DAO proposal
        // [B58] Direct static call — Sync to Firebase
        saveDaoProposal(proposal)
          .catch(e => logger.warn('[Store] saveDaoProposal sync failed:', e));
      },

      updateDaoProposal: (proposalId, updates) => {
        set((state) => ({
          daoProposals: state.daoProposals.map(p =>
            p.id === proposalId ? { ...p, ...updates } : p
          ),
        }));
        // [B58] Direct static call — Sync to Firebase
        updateDaoProposalInFirestore(proposalId, updates)
          .catch(e => logger.warn('[Store] updateDaoProposal sync failed:', e));
      },

      removeDaoProposal: (proposalId) => {
        set((state) => ({
          daoProposals: state.daoProposals.filter(p => p.id !== proposalId),
        }));
      },

      // ============================================
      // USER SCORE STATE (persisted — DEEP Score)
      // ============================================
      userScore: 0,
      userStreak: 0,
      userBalance: 0, // $SKR balance — updated from on-chain data

      setUserBalance: (balance) => set({ userBalance: balance }),

      incrementScore: (points) => {
        set((state) => ({
          userScore: (state.userScore || 0) + points,
        }));
        // [B55] Debounce Firebase sync — timer is module-level (not in Zustand state)
        if (_scoreSyncTimer) clearTimeout(_scoreSyncTimer);
        _scoreSyncTimer = setTimeout(() => {
          const { userScore, userStreak, wallet } = get();
          const addr = wallet?.publicKey?.toString?.() || wallet?.publicKey;
          if (addr) {
            // [B58] Direct static call — fixes dynamic import() bug
            saveUserScore(addr, userScore, userStreak)
              .catch(e => logger.warn('[Store] saveUserScore sync failed:', e));
          }
          _scoreSyncTimer = null;
        }, 2000);
      },

      setUserScore: (score) => {
        set({ userScore: score });
      },

      setUserStreak: (streak) => {
        set({ userStreak: streak });
      },

      incrementStreak: () => {
        set((state) => ({
          userStreak: (state.userStreak || 0) + 1,
        }));
      },

      // ============================================
      // SEEKER GENESIS TOKEN STATE (persisted)
      // ============================================
      hasGenesisToken: false,
      genesisTokenMint: null,

      setGenesisToken: (hasToken, mintAddress) => set({
        hasGenesisToken: hasToken,
        genesisTokenMint: mintAddress || null,
      }),

      // ============================================
      // FIREBASE SYNC — Replace local data with Firebase data
      // ============================================
      // All sync functions use MERGE (not replace) to prevent data loss
      // when Firebase writes failed silently (fire-and-forget pattern).
      // Firebase version wins for items that exist in both; local-only items preserved.

      syncHubsFromFirebase: (firebaseHubs) => {
        const { hubs: localHubs } = get();
        set({ hubs: mergeArraysById(localHubs, firebaseHubs) });
      },

      syncPendingHubsFromFirebase: (firebasePendingHubs) => {
        const { pendingHubs: localPending } = get();
        set({ pendingHubs: mergeArraysById(localPending, firebasePendingHubs || []) });
      },

      syncNotificationsFromFirebase: (firebaseNotifs) => {
        const { hubNotifications: localNotifs, hubs } = get();

        // [B53] Helper: extract real hubName from title if hubName field is missing.
        // sendHubNotification prefixes: "HubName: Title" — extract hubName from that.
        const resolveHubName = (n) => {
          if (n.hubName && n.hubName !== 'General') return n.hubName;
          // Try to extract from title: "HubName: ActualTitle"
          if (n.title && n.title.includes(': ')) {
            const prefix = n.title.split(': ')[0];
            const matchingHub = hubs.find(h => h.name === prefix);
            if (matchingHub) return matchingHub.name;
          }
          return n.hubName || 'General';
        };

        // [B53] Helper: normalize title for dedup (strip "HubName: " prefix)
        const normalizeTitle = (title, hubName) => {
          if (!title) return '';
          const prefix = `${hubName}: `;
          return title.startsWith(prefix) ? title.slice(prefix.length) : title;
        };

        // Group Firebase notifications by hubName
        const grouped = {};
        firebaseNotifs.forEach(n => {
          const hubName = resolveHubName(n);
          if (!grouped[hubName]) grouped[hubName] = [];
          grouped[hubName].push({
            id: n.id,
            title: n.title || '',
            body: n.body || '',
            message: n.body || n.message || '',
            fullMessage: n.body || n.fullMessage || n.message || '',
            hubName,
            hubIcon: n.hubIcon || 'apps',
            hubLogoUrl: n.hubLogoUrl || null,
            reactions: n.reactions || 0,   // [B56] Carry reactions from Firebase
            reacted: n.reacted || false,   // [B56] Carry reacted state
            timestamp: (() => {
              try {
                const d = n.createdAt?.toDate?.() || (n.createdAt ? new Date(n.createdAt) : null);
                if (d instanceof Date && !isNaN(d)) {
                  const now = new Date();
                  const diffMs = now - d;
                  const diffMin = Math.floor(diffMs / 60000);
                  if (diffMin < 1) return 'Just now';
                  if (diffMin < 60) return `${diffMin}m ago`;
                  const diffHr = Math.floor(diffMin / 60);
                  if (diffHr < 24) return `${diffHr}h ago`;
                  const diffDays = Math.floor(diffHr / 24);
                  if (diffDays < 7) return `${diffDays}d ago`;
                  return d.toLocaleDateString();
                }
                return String(n.createdAt || 'Unknown');
              } catch { return 'Unknown'; }
            })(),
            read: false,
            link: n.link || null,
          });
        });
        // Merge: keep local notifications that aren't in Firebase
        const { deletedNotificationIds } = get(); // [B55]
        const deletedSet = new Set(deletedNotificationIds || []);
        const allHubNames = new Set([...Object.keys(localNotifs || {}), ...Object.keys(grouped)]);
        const merged = {};
        for (const hubName of allHubNames) {
          const local = (localNotifs || {})[hubName] || [];
          const firebase = grouped[hubName] || [];
          // [B55] Filter out deleted notifications by ID AND by content key
          const filteredFirebase = firebase.filter(n => {
            if (deletedSet.has(n.id)) return false;
            const contentKey = `${(n.title || '')}|${(n.body || n.message || '')}`.toLowerCase();
            if (deletedSet.has(contentKey)) return false;
            return true;
          });
          const fbIds = new Set(filteredFirebase.map(n => n.id));
          const localOnly = local.filter(n => !fbIds.has(n.id) && !deletedSet.has(n.id));
          merged[hubName] = [...filteredFirebase, ...localOnly];
        }

        // [B53] Cross-group dedup: normalize titles (strip "HubName: " prefix) and dedup globally
        // This catches the case where local notif is under "MyHub" with title "My Title"
        // and Firebase notif is under "General" with title "MyHub: My Title"
        const globalSeen = new Set(); // normalized key → first occurrence tracked
        for (const hubName of Object.keys(merged)) {
          const notifs = merged[hubName];
          merged[hubName] = notifs.filter(n => {
            const normTitle = normalizeTitle(n.title, hubName);
            const key = `${hubName}|${normTitle}|${n.body || n.message}`.toLowerCase(); // [B55] Include hubName in dedup key
            if (globalSeen.has(key)) return false;
            globalSeen.add(key);
            return true;
          });
        }

        // [B53] Remove empty "General" group if all its notifs were deduped
        if (merged['General'] && merged['General'].length === 0) {
          delete merged['General'];
        }

        // Enrich logos from hubs state (Firebase notifs may lack hubLogoUrl)
        for (const hubName of Object.keys(merged)) {
          const hub = hubs.find(h => h.name === hubName);
          if (hub?.logoUrl) {
            merged[hubName] = merged[hubName].map(n => ({
              ...n,
              hubLogoUrl: n.hubLogoUrl || hub.logoUrl,
            }));
          }
        }
        set({ hubNotifications: merged });
      },

      syncAdsFromFirebase: (firebaseAds) => {
        const { approvedAds: localAds } = get();
        set({ approvedAds: mergeArraysById(localAds, firebaseAds) });
      },

      syncTalentSubmissions: (submissions) => {
        const { talentSubmissions: local } = get();
        set({ talentSubmissions: mergeArraysById(local, submissions) });
      },
      syncDaoProposals: (proposals) => {
        const { daoProposals: local } = get();
        set({ daoProposals: mergeArraysById(local, proposals) });
      },
      syncHubFeedbacks: (feedbacks) => {
        const { hubFeedbacks: local, dismissedFeedbackIds } = get(); // [B55]
        const dismissedSet = new Set(dismissedFeedbackIds || []);
        // feedbacks is an object keyed by hubName — merge per hub
        const allHubNames = new Set([...Object.keys(local || {}), ...Object.keys(feedbacks || {})]);
        const merged = {};
        for (const hubName of allHubNames) {
          const localFb = (local || {})[hubName] || [];
          // [B54] Firebase feedbacks are already filtered by status=pending in fetchHubFeedbacks
          const firebaseFb = (feedbacks || {})[hubName] || [];
          // [B55] Filter out dismissed feedbacks by ID AND content key
          const filteredFirebaseFb = firebaseFb.filter(f => {
            if (dismissedSet.has(f.id)) return false;
            const contentKey = `${hubName}|${(f.message || f.title || '')}`.toLowerCase();
            return !dismissedSet.has(contentKey);
          });
          const fbIds = new Set(filteredFirebaseFb.map(f => f.id));
          // Only keep local feedbacks that are NOT in Firebase AND still pending AND not dismissed
          const localOnly = localFb.filter(f => {
            if (fbIds.has(f.id)) return false; // already in Firebase result
            if (dismissedSet.has(f.id)) return false; // [B55] dismissed
            const status = (f.status || 'pending').toLowerCase();
            return status === 'pending';
          });
          const combined = [...filteredFirebaseFb, ...localOnly];
          if (combined.length > 0) merged[hubName] = combined;
        }
        set({ hubFeedbacks: merged });
      },
      syncPendingAdCreatives: (ads) => {
        const { pendingAdCreatives: local, approvedAds } = get();
        // [B51] Filter out ads already approved locally (prevents re-appearing in pending)
        const approvedIds = new Set(approvedAds.map(a => a.id));
        const filteredAds = (ads || [])
          .filter(a => !approvedIds.has(a.id));
        const merged = mergeArraysById(local, filteredAds);
        // [B56] Relaxed filter — only require id + slotType (imageUrl may be empty if Storage upload failed)
        // Previous [B54] filter was too aggressive: removed ALL ads without imageUrl,
        // which broke persistence after cache clear (Firestore stores empty imageUrl)
        const cleaned = merged
          .filter(a => !approvedIds.has(a.id))
          .filter(a => !!(a.id && a.slotType));
        set({ pendingAdCreatives: cleaned });
      },
      syncCustomDeals: (deals) => {
        const { customDeals: local } = get();
        set({ customDeals: mergeArraysById(local, deals) });
      },
      syncDoohCampaigns: (campaigns) => {
        const { doohCampaigns: local } = get();
        set({ doohCampaigns: mergeArraysById(local, campaigns) });
      },

      // ============================================
      // CUSTOM DEALS STATE (persisted — admin brand deals)
      // ============================================
      customDeals: [], // Empty — populated by admin custom deals

      addCustomDeal: (deal) => {
        set((state) => ({
          customDeals: [...state.customDeals, deal],
        }));
        // [B58] Direct static call — Sync to Firebase
        saveCustomDeal(deal)
          .catch(e => logger.warn('[Store] saveCustomDeal sync failed:', e));
      },

      removeCustomDeal: (dealId) => {
        set((state) => ({
          customDeals: state.customDeals.filter(d => d.id !== dealId),
        }));
        // [B58] Direct static call — Sync to Firebase
        removeCustomDealFromFirestore(dealId)
          .catch(e => logger.warn('[Store] removeCustomDeal sync failed:', e));
      },

      // ============================================
      // ADMIN MESSAGES STATE (persisted — conversations between admin & brands)
      // ============================================
      adminConversations: [], // Empty — populated from real brand conversations

      setAdminConversations: (convs) => {
        const { adminConversations: local } = get();
        set({ adminConversations: mergeArraysById(local || [], convs) });
      },

      updateAdminConversation: (convId, updates) => {
        set((state) => ({
          adminConversations: (state.adminConversations || []).map(c =>
            c.id === convId ? { ...c, ...updates } : c
          ),
        }));
        // [B58] Direct static call — Sync full conversation to Firebase
        const conv = get().adminConversations.find(c => c.id === convId);
        if (conv) {
          saveAdminConversation(conv)
            .catch(e => logger.warn('[Store] saveAdminConversation sync failed:', e));
        }
      },

      // ============================================
      // DOOH CAMPAIGNS STATE (persisted)
      // ============================================
      doohCampaigns: [],

      addDoohCampaign: (campaign) => {
        set((state) => ({
          doohCampaigns: [campaign, ...state.doohCampaigns],
        }));
        // [B58] Direct static call — Sync to Firebase
        saveDoohCampaign(campaign)
          .catch(e => logger.warn('[Store] saveDoohCampaign sync failed:', e));
      },

      // ============================================
      // PROJECTS STATE (not persisted — resets on app start)
      // ============================================
      projects: [...MOCK_PROJECTS],

      getPopularProjects: () => {
        const { projects } = get();
        return [...projects].sort((a, b) => b.subscriberCount - a.subscriberCount);
      },

      getSubscribedProjectsData: () => {
        const { projects, subscribedProjects } = get();
        return projects.filter(p => subscribedProjects.includes(p.id));
      },

      // ============================================
      // NOTIFICATIONS STATE
      // ============================================
      pushToken: null,

      setPushToken: (token) => set({ pushToken: token }),

      // ============================================
      // PLATFORM PRICING (fetched from on-chain in release)
      // ============================================
      platformPricing: {
        feedback: PRICING.FEEDBACK,
        talent: PRICING.TALENT,
        daoBoost: PRICING.DAO_BOOST,
        hubCreation: PRICING.HUB_CREATION,
        topAdSlot: PRICING.TOP_AD_SLOT,
        bottomAdSlot: PRICING.BOTTOM_AD_SLOT,
        lockscreenAd: PRICING.LOCKSCREEN_AD,
        globalNotification: PRICING.GLOBAL_NOTIFICATION,
        pushNotificationAd: PRICING.PUSH_NOTIFICATION_AD || 1500,
      },

      setPlatformPricing: (pricing) => set({ platformPricing: pricing }),

      updateSinglePrice: (key, value) => set((state) => ({
        platformPricing: { ...state.platformPricing, [key]: value },
      })),

      loadPlatformPricingFromChain: async () => {
        if (USE_DEVNET) return; // Devnet mode — keep defaults
        try {
          const { fetchPlatformConfig } = require('../services/transactionHelper');
          const config = await fetchPlatformConfig();
          if (config) {
            const DECIMALS = 1_000_000; // $SKR has 6 decimals
            set({
              platformPricing: {
                feedback: config.feedbackDeposit.toNumber() / DECIMALS,
                talent: config.talentDeposit.toNumber() / DECIMALS,
                daoBoost: config.daoProposalDeposit.toNumber() / DECIMALS,
                hubCreation: config.hubSubscriptionPrice.toNumber() / DECIMALS,
                topAdSlot: config.topAdPricePerWeek.toNumber() / DECIMALS,
                bottomAdSlot: config.bottomAdPricePerWeek.toNumber() / DECIMALS,
                lockscreenAd: get().platformPricing?.lockscreenAd || PRICING.LOCKSCREEN_AD,
                globalNotification: get().platformPricing?.globalNotification || PRICING.GLOBAL_NOTIFICATION,
                pushNotificationAd: get().platformPricing?.pushNotificationAd || 1500, // Preserve existing value
              },
            });
          }
        } catch (error) {
          logger.warn('[Store] Failed to load pricing from chain:', error.message);
        }
      },

      // ============================================
      // UI STATE
      // ============================================
      theme: 'dark',

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'deep-pulse-storage',
      version: 2, // v2: force-clear all old mock data from persisted state
      storage: createJSONStorage(() => AsyncStorage),
      // Migration: clean up old mock data when upgrading from v0/v1 to v2
      migrate: (persistedState, version) => {
        if (version < 2) {
          logger.log('[Store] Migrating to v2: clearing old mock data');
          return {
            ...persistedState,
            // Reset fields that may contain old mock data
            customDeals: [],
            talentSubmissions: [],
            daoProposals: [],
            adminConversations: [], // [B55] Use [] not null — prevents .find()/.map() crashes
            pendingAdCreatives: [],
            approvedAds: [],
            hubFeedbacks: {},
            hubNotifications: {},
            doohCampaigns: [],
            // Reset user data earned from mock interactions
            wallet: persistedState.wallet,
            subscribedProjects: [],
            pushToken: persistedState.pushToken,
            theme: persistedState.theme || 'dark',
            hubs: [],
            pendingHubs: [],
            userScore: 0,
            userStreak: 0,
            userBalance: 0,
            hasGenesisToken: false,
            genesisTokenMint: null,
          };
        }
        return persistedState;
      },
      // Only persist these keys (not mock data / alerts / projects)
      partialize: (state) => ({
        wallet: state.wallet,
        subscribedProjects: state.subscribedProjects,
        pushToken: state.pushToken,
        theme: state.theme,
        hubs: state.hubs,
        pendingHubs: state.pendingHubs,
        hubNotifications: state.hubNotifications,
        hubFeedbacks: state.hubFeedbacks,
        pendingAdCreatives: state.pendingAdCreatives,
        approvedAds: state.approvedAds,
        talentSubmissions: state.talentSubmissions,
        daoProposals: state.daoProposals,
        userScore: state.userScore,
        userStreak: state.userStreak,
        userBalance: state.userBalance,
        hasGenesisToken: state.hasGenesisToken,
        genesisTokenMint: state.genesisTokenMint,
        customDeals: state.customDeals,
        adminConversations: state.adminConversations,
        doohCampaigns: state.doohCampaigns,
        readHubNotificationIds: state.readHubNotificationIds,
        deletedNotificationIds: state.deletedNotificationIds,     // [B55]
        dismissedFeedbackIds: state.dismissedFeedbackIds,         // [B55]
        platformPricing: state.platformPricing,
      }),
    }
  )
);
