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
import { PRICING, MOCK_HUBS } from '../config/constants';
import {
  subscribeToHubBackend,
  unsubscribeFromHubBackend,
  createHubInFirestore,
  approveHubInFirestore,
  rejectHubInFirestore,
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
          // 2. Sync with Firebase backend (FCM topic + Firestore)
          // [H-03 FIX] Rollback on failure instead of swallowing errors
          subscribeToHubBackend(projectId, wallet.publicKey || 'mock_user')
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
        unsubscribeFromHubBackend(projectId, wallet.publicKey || 'mock_user')
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
            hubs: [...hubs, { ...hub, status: 'ACTIVE', subscribers: (hub.subscribers || 0) + 1 }],
            subscribedProjects: updatedSubs,
          });
          // 2. Sync with Firestore + subscribe to FCM topic
          approveHubInFirestore(hubId, wallet.publicKey || 'admin')
            .catch(e => logger.warn('[Store] Firestore approveHub failed:', e));
          subscribeToHubBackend(hubId, wallet.publicKey || 'mock_user')
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
        rejectHubInFirestore(hubId, wallet.publicKey || 'admin')
          .catch(e => logger.warn('[Store] Firestore rejectHub failed:', e));
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
      },

      getHubNotifications: (hubName) => {
        const { hubNotifications } = get();
        return hubNotifications[hubName] || [];
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
                lockscreenAd: 1000, // Not in PlatformConfig — keep default
                globalNotification: 1000, // Not in PlatformConfig — keep default
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
      }),
    }
  )
);
