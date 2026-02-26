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
          subscribeToHubBackend(projectId, wallet.publicKey || 'mock_user')
            .catch(e => console.warn('[Store] Backend subscribe failed:', e));
        }
      },

      unsubscribeFromProject: (projectId) => {
        const { subscribedProjects, hubs, wallet } = get();
        // 1. Update local state immediately (optimistic UI)
        set({
          subscribedProjects: subscribedProjects.filter(id => id !== projectId),
          // Decrement subscriber count on the hub
          hubs: hubs.map(h => h.id === projectId ? { ...h, subscribers: Math.max(0, (h.subscribers || 0) - 1) } : h),
        });
        // 2. Sync with Firebase backend (FCM topic + Firestore)
        unsubscribeFromHubBackend(projectId, wallet.publicKey || 'mock_user')
          .catch(e => console.warn('[Store] Backend unsubscribe failed:', e));
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
      pendingHubs: [],

      addPendingHub: (hub) => {
        // 1. Update local state immediately
        set((state) => ({
          pendingHubs: [hub, ...state.pendingHubs],
        }));
        // 2. Sync with Firestore
        createHubInFirestore(hub)
          .catch(e => console.warn('[Store] Firestore createHub failed:', e));
      },

      approveHub: (hubId) => {
        const { pendingHubs, hubs, wallet } = get();
        const hub = pendingHubs.find((h) => h.id === hubId);
        if (hub) {
          // 1. Update local state immediately
          set({
            pendingHubs: pendingHubs.filter((h) => h.id !== hubId),
            hubs: [...hubs, { ...hub, status: 'ACTIVE' }],
          });
          // 2. Sync with Firestore
          approveHubInFirestore(hubId, wallet.publicKey || 'admin')
            .catch(e => console.warn('[Store] Firestore approveHub failed:', e));
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
          .catch(e => console.warn('[Store] Firestore rejectHub failed:', e));
      },

      // ============================================
      // HUB NOTIFICATIONS STATE (persisted)
      // ============================================
      hubNotifications: {},

      addHubNotification: (hubName, notification) => {
        set((state) => ({
          hubNotifications: {
            ...state.hubNotifications,
            [hubName]: [notification, ...(state.hubNotifications[hubName] || [])],
          },
        }));
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
        pushNotificationAd: PRICING.PUSH_NOTIFICATION_AD || 500,
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
                lockscreenAd: 2000, // Not in PlatformConfig — keep default
                globalNotification: 1000, // Not in PlatformConfig — keep default
              },
            });
          }
        } catch (error) {
          console.warn('[Store] Failed to load pricing from chain:', error.message);
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
      }),
    }
  )
);
