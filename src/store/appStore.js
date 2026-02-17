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
        const { subscribedProjects } = get();
        if (!subscribedProjects.includes(projectId)) {
          set({ subscribedProjects: [...subscribedProjects, projectId] });
        }
      },

      unsubscribeFromProject: (projectId) => {
        const { subscribedProjects } = get();
        set({ subscribedProjects: subscribedProjects.filter(id => id !== projectId) });
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
      }),
    }
  )
);
