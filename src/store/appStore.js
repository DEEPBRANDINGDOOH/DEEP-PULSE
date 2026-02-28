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
import { MOCK_ALERTS, MOCK_PROJECTS } from '../data/mockData';
import { PRICING, MOCK_HUBS, GRACE_PERIOD_DAYS, isAdmin } from '../config/constants';
import {
  subscribeToHubBackend,
  unsubscribeFromHubBackend,
  createHubInFirestore,
  approveHubInFirestore,
  rejectHubInFirestore,
  suspendHubInFirestore,
  reactivateHubInFirestore,
  deleteHubInFirestore,
} from '../services/firebaseService';
import { logger } from '../utils/security';

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
          get().incrementScore(10); // 10 pts per subscription
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

      // ============================================
      // ALERTS STATE (not persisted — resets on app start)
      // ============================================
      alerts: [...MOCK_ALERTS],

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
      hubs: [...MOCK_HUBS],
      pendingHubs: [
        {
          id: 'mock_pending_1', name: 'Crypto Traders', creator: '4mL...7Np',
          subscribers: 0, status: 'PENDING', createdDate: 'Feb 08, 2026',
          category: 'DeFi', description: 'Trading signals and market analysis', icon: 'trending-up',
        },
        {
          id: 'mock_pending_2', name: 'Solana Devs', creator: '9xT...2Qw',
          subscribers: 0, status: 'PENDING', createdDate: 'Feb 09, 2026',
          category: 'Infrastructure', description: 'Solana developer community', icon: 'code-slash',
        },
      ],

      addPendingHub: (hub) => {
        // 1. Update local state immediately
        set((state) => ({
          pendingHubs: [hub, ...state.pendingHubs],
        }));
        // 2. Sync with Firestore
        createHubInFirestore(hub)
          .catch(e => logger.warn('[Store] Firestore createHub failed:', e));
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
              logger.warn('[Store] Firestore suspendHub failed, rolling back');
              set((state) => ({
                hubs: state.hubs.map(h =>
                  h.id === hubId ? { ...h, status: prevHub.status, suspendedAt: prevHub.suspendedAt || null } : h
                ),
              }));
            }
          })
          .catch(e => {
            logger.warn('[Store] Firestore suspendHub error, rolling back:', e);
            set((state) => ({
              hubs: state.hubs.map(h =>
                h.id === hubId ? { ...h, status: prevHub.status, suspendedAt: prevHub.suspendedAt || null } : h
              ),
            }));
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
              logger.warn('[Store] Firestore reactivateHub failed, rolling back');
              set((state) => ({
                hubs: state.hubs.map(h =>
                  h.id === hubId ? { ...h, status: prevHub.status, suspendedAt: prevHub.suspendedAt || null, subscriptionExpiresAt: prevHub.subscriptionExpiresAt } : h
                ),
              }));
            }
          })
          .catch(e => {
            logger.warn('[Store] Firestore reactivateHub error, rolling back:', e);
            set((state) => ({
              hubs: state.hubs.map(h =>
                h.id === hubId ? { ...h, status: prevHub.status, suspendedAt: prevHub.suspendedAt || null, subscriptionExpiresAt: prevHub.subscriptionExpiresAt } : h
              ),
            }));
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
              logger.warn('[Store] Firestore deleteHub failed, rolling back');
              set({ hubs: prevHubs, subscribedProjects: prevSubs });
            }
          })
          .catch(e => {
            logger.warn('[Store] Firestore deleteHub error, rolling back:', e);
            set({ hubs: prevHubs, subscribedProjects: prevSubs });
          });
      },

      // Check all hubs for overdue subscriptions (auto-detect expired payments)
      checkHubSubscriptions: () => {
        const { hubs } = get();
        const now = Date.now();
        let changed = false;
        const updated = hubs.map(h => {
          if (!h.subscriptionExpiresAt || h.status === 'SUSPENDED' || h.status === 'PENDING') return h;
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
      pendingAdCreatives: [
        {
          id: 'ad_review_1',
          brandName: 'Jupiter Exchange',
          brandWallet: '7xK...9Qz',
          hubName: 'DeFi Alerts',
          slotType: 'top',
          imageUrl: 'https://cdn.jupiter.com/ads/swap-promo-390x120.png',
          landingUrl: 'https://jup.ag/swap',
          duration: 4,
          totalCost: 7200,
          status: 'PENDING',
          submittedDate: 'Feb 20, 2026',
        },
        {
          id: 'ad_review_2',
          brandName: 'NFT Marketplace',
          brandWallet: '2pQ...mNp',
          hubName: 'NFT Artists',
          slotType: 'bottom',
          imageUrl: 'https://cdn.nftmarket.io/banner-390x100.gif',
          landingUrl: 'https://nftmarket.io/drops',
          duration: 2,
          totalCost: 2700,
          status: 'PENDING',
          submittedDate: 'Feb 21, 2026',
        },
        {
          id: 'ad_review_3',
          brandName: 'Suspicious Token',
          brandWallet: '5tY...2Lm',
          hubName: 'Solana Gaming',
          slotType: 'top',
          imageUrl: 'https://sketchy-site.xyz/free-tokens-390x120.png',
          landingUrl: 'https://sketchy-site.xyz/claim',
          duration: 1,
          totalCost: 2000,
          status: 'PENDING',
          submittedDate: 'Feb 22, 2026',
        },
        {
          id: 'ad_review_4',
          brandName: 'Phantom Wallet',
          brandWallet: '9kR...3Wp',
          hubName: 'DeFi Alerts',
          slotType: 'lockscreen',
          imageUrl: 'https://cdn.phantom.app/lockscreen-promo-1080x1920.png',
          landingUrl: 'https://phantom.app/download',
          duration: 2,
          totalCost: 4000,
          status: 'PENDING',
          submittedDate: 'Feb 23, 2026',
        },
      ],
      approvedAds: [],

      addPendingAdCreative: (ad) => {
        set((state) => ({
          pendingAdCreatives: [ad, ...state.pendingAdCreatives],
        }));
        get().incrementScore(20); // 20 pts per ad creative
      },

      approveAdCreativeInStore: (adId) => {
        const { pendingAdCreatives, approvedAds } = get();
        const ad = pendingAdCreatives.find(a => a.id === adId);
        if (ad) {
          set({
            pendingAdCreatives: pendingAdCreatives.filter(a => a.id !== adId),
            approvedAds: [...approvedAds, { ...ad, status: 'APPROVED' }],
          });
        }
      },

      rejectAdCreativeInStore: (adId) => {
        set((state) => ({
          pendingAdCreatives: state.pendingAdCreatives.filter(a => a.id !== adId),
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
        get().incrementScore(25); // 25 pts per feedback
      },

      removeHubFeedback: (hubName, feedbackId) => {
        set((state) => ({
          hubFeedbacks: {
            ...state.hubFeedbacks,
            [hubName]: (state.hubFeedbacks[hubName] || []).filter(fb => fb.id !== feedbackId),
          },
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
          const hub = state.hubs.find(h => h.name === hubName);
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

      // ============================================
      // TALENT SUBMISSIONS STATE (persisted)
      // ============================================
      talentSubmissions: [
        {
          id: 'tsub_1',
          role: 'UI/UX Designer',
          hub: 'Solana Gaming',
          status: 'REVIEW',
          submittedDate: 'Feb 07, 2026',
          expectedDays: '3-5',
        },
      ],

      addTalentSubmission: (submission) => {
        set((state) => ({
          talentSubmissions: [submission, ...state.talentSubmissions],
        }));
        get().incrementScore(30); // 30 pts per talent submission
      },

      removeTalentSubmission: (submissionId) => {
        set((state) => ({
          talentSubmissions: state.talentSubmissions.filter(t => t.id !== submissionId),
        }));
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
      },

      updateDaoProposal: (proposalId, updates) => {
        set((state) => ({
          daoProposals: state.daoProposals.map(p =>
            p.id === proposalId ? { ...p, ...updates } : p
          ),
        }));
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

      incrementScore: (points) => {
        set((state) => ({
          userScore: (state.userScore || 0) + points,
        }));
      },

      setUserScore: (score) => {
        set({ userScore: score });
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
      // CUSTOM DEALS STATE (persisted — admin brand deals)
      // ============================================
      customDeals: [
        { id: '1', brandName: 'Jupiter Exchange', brandWallet: '7xK...9Qz', type: 'Ad Slot', originalPrice: 1500, dealPrice: 1000, duration: '12 weeks', status: 'active', notes: 'Launch partner discount' },
        { id: '2', brandName: 'Magic Eden', brandWallet: '2pQ...mNp', type: 'Hub Creation', originalPrice: 2000, dealPrice: 1500, duration: '6 months', status: 'active', notes: 'Strategic partner' },
      ],

      addCustomDeal: (deal) => {
        set((state) => ({
          customDeals: [...state.customDeals, deal],
        }));
      },

      removeCustomDeal: (dealId) => {
        set((state) => ({
          customDeals: state.customDeals.filter(d => d.id !== dealId),
        }));
      },

      // ============================================
      // ADMIN MESSAGES STATE (persisted — conversations between admin & brands)
      // ============================================
      adminConversations: null, // null = use mock data on first load

      setAdminConversations: (convs) => set({ adminConversations: convs }),

      updateAdminConversation: (convId, updates) => {
        set((state) => ({
          adminConversations: (state.adminConversations || []).map(c =>
            c.id === convId ? { ...c, ...updates } : c
          ),
        }));
      },

      // ============================================
      // DOOH CAMPAIGNS STATE (persisted)
      // ============================================
      doohCampaigns: [],

      addDoohCampaign: (campaign) => {
        set((state) => ({
          doohCampaigns: [campaign, ...state.doohCampaigns],
        }));
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
        if (__DEV__) return; // Mock mode — keep defaults
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
      storage: createJSONStorage(() => AsyncStorage),
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
        hasGenesisToken: state.hasGenesisToken,
        genesisTokenMint: state.genesisTokenMint,
        customDeals: state.customDeals,
        adminConversations: state.adminConversations,
        doohCampaigns: state.doohCampaigns,
      }),
    }
  )
);
