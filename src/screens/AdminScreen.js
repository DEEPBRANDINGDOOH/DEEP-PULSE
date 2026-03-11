import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getTierFromScore, PRICING, isAdmin, USE_DEVNET } from '../config/constants';
import { useAppStore } from '../store/appStore';
// Rich notif ad needs to store the notification in Zustand for in-app display
import { programService } from '../services/programService';
import { approveAdCreative, rejectAdCreative, pauseAdCreative, resumeAdCreative, stopAdCreative, sendGlobalNotification, sendHubNotification, fetchLeaderboard } from '../services/firebaseService';
import { showLocalNotification } from '../services/localNotificationService';
import { checkRateLimit, logger, safeOpenURL } from '../utils/security';

// ============================================
// MOCK DATA
// ============================================

// Top 100 leaderboard — fetched from Firebase via fetchLeaderboard() (B49)

// Initial pending hubs are now pre-seeded in appStore (no more runtime seeding).

// MOCK_PENDING_ADS moved to appStore.js (Zustand) for cross-screen data flow

// Stats computed dynamically from store data (no more hardcoded values)
function computeStats(storeHubs, pendingAds, daoProposals, approvedAds) {
  const activeHubs = storeHubs.filter(h => h.status === 'ACTIVE').length;
  const totalHubs = storeHubs.length;
  const suspendedCount = storeHubs.filter(h => h.status === 'SUSPENDED').length;
  const totalSubscribers = storeHubs.reduce((sum, h) => sum + (h.subscribers || 0), 0);
  const adsSold = (approvedAds || []).length;
  const proposalCount = daoProposals ? daoProposals.length : 0;

  const base = {
    global: { totalUsers: totalSubscribers, activeUsers: 0, totalHubs, revenue: 0, adsSold, feedbackCount: 0, daoProposals: proposalCount, growth: 0 },
    users: { newRegistrations: 0, activeUsers: 0, avgScore: 0, legendCount: 0, diamondCount: 0, feedbackSent: 0, subscriptions: totalSubscribers },
    brands: { activeHubs, revenuePerHub: 0, adsPurchased: adsSold, approvalRate: 0, avgResponseTime: '—', suspendedCount },
  };
  return { '7d': base, '30d': base, '90d': base };
}

// ============================================
// COMPONENT
// ============================================

export default function AdminScreen({ navigation }) {
  const { wallet, platformPricing: prices, updateSinglePrice, loadPlatformPricingFromChain } = useAppStore();
  // ALL hooks MUST be called before any early return (Rules of Hooks)
  const pendingHubs = useAppStore((state) => state.pendingHubs);
  const storeHubs = useAppStore((state) => state.hubs);
  const storeApproveHub = useAppStore((state) => state.approveHub);
  const storeRejectHub = useAppStore((state) => state.rejectHub);
  const storeSuspendHub = useAppStore((state) => state.suspendHub);
  const storeDeleteHub = useAppStore((state) => state.deleteHub);
  const storeReactivateHub = useAppStore((state) => state.reactivateHub);
  const checkHubSubscriptions = useAppStore((state) => state.checkHubSubscriptions);
  const [activeSection, setActiveSection] = useState('overview');
  const [globalNotifTitle, setGlobalNotifTitle] = useState('');
  const [globalNotifMessage, setGlobalNotifMessage] = useState('');
  const pendingAds = useAppStore((state) => state.pendingAdCreatives);
  const storeApprovedAds = useAppStore((state) => state.approvedAds);
  const storeApproveAd = useAppStore((state) => state.approveAdCreativeInStore);
  const storeRejectAd = useAppStore((state) => state.rejectAdCreativeInStore);
  const storePauseAd = useAppStore((state) => state.pauseAdInStore);
  const storeResumeAd = useAppStore((state) => state.resumeAdInStore);
  const storeStopAd = useAppStore((state) => state.stopAdInStore);
  const addHubNotification = useAppStore((state) => state.addHubNotification);
  const [savingPrice, setSavingPrice] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState('30d');
  const [statsTab, setStatsTab] = useState('global');
  // Pricing edit state — MUST be before navigation guard (Rules of Hooks)
  const [editingPrice, setEditingPrice] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  // Custom deals from Zustand store (persisted) — MUST be before guard
  const customDeals = useAppStore((state) => state.customDeals);
  const storeAddDeal = useAppStore((state) => state.addCustomDeal);
  const storeRemoveDeal = useAppStore((state) => state.removeCustomDeal);
  const daoProposals = useAppStore((state) => state.daoProposals);
  const [showDealModal, setShowDealModal] = useState(false);
  const [newDeal, setNewDeal] = useState({ brandName: '', brandWallet: '', type: 'Ad Slot', dealPrice: '', duration: '', notes: '' });
  // [B49] Leaderboard state — fetched from Firebase (same pattern as ProfileScreen)
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // [B53] Fetch leaderboard — force-save admin score first to ensure data is fresh
  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      // Force-save current user score before fetch
      const { userScore, userStreak, wallet: w } = useAppStore.getState();
      const addr = typeof w?.publicKey === 'string' ? w.publicKey : (w?.publicKey?.toString?.() || null);
      if (addr && userScore > 0) {
        const { saveUserScore } = require('../services/firebaseService');
        await saveUserScore(addr, userScore, userStreak).catch(() => {});
      }
      const data = await fetchLeaderboard(100);
      setLeaderboardData(data);
    } catch (_) {
      // Silently fail — empty state will show
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Fetch on-chain prices + check hub subscriptions on mount — MUST be before guard
  useEffect(() => {
    loadPlatformPricingFromChain();
    checkHubSubscriptions();
  }, []);

  // [B49] Load leaderboard when Top 100 section is opened
  useEffect(() => {
    if (activeSection === 'top100' && leaderboardData.length === 0) {
      loadLeaderboard();
    }
  }, [activeSection]);

  // ── NAVIGATION GUARD: Block non-admin access (after ALL hooks) ──
  if (!isAdmin(wallet?.publicKey)) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Ionicons name="shield-outline" size={48} color="#f44336" />
        <Text className="text-error text-lg font-bold mt-4">Access Denied</Text>
        <Text className="text-text-secondary text-sm mt-2">Admin wallet required.</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-primary/20 rounded-xl px-6 py-3 mt-6"
        >
          <Text className="text-primary font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Ad moderation handlers
  const handleApproveAd = (ad) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    const slotLabel = ad.slotType === 'top' ? 'Top' : ad.slotType === 'lockscreen' ? 'Lockscreen' : ad.slotType === 'rich_notif' ? 'Rich Notification' : 'Bottom';
    const costLabel = ad.totalCost ? ad.totalCost.toLocaleString() : '0';
    const walletStr = typeof wallet?.publicKey === 'string' ? wallet.publicKey : (wallet?.publicKey?.toBase58?.() || wallet?.publicKey?.toString?.() || 'admin');
    Alert.alert(
      'Approve Ad',
      `Approve "${ad.brandName || 'Unknown'}" ad for ${ad.hubName || 'Unknown Hub'}?\n\nSlot: ${slotLabel}\nDuration: ${ad.duration || 1} week(s)\nCost: ${costLabel} $SKR\n\nThe ad will go live immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // Update Zustand store (removes from pending, adds to approved)
              storeApproveAd(ad.id);
            } catch (storeErr) {
              logger.warn('[Admin] storeApproveAd error:', storeErr?.message);
            }

            try {
              // Sync with Firebase backend
              approveAdCreative(ad.id, walletStr)
                .catch(e => logger.warn('[Admin] approveAd backend failed:', e));
            } catch (fbErr) {
              logger.warn('[Admin] approveAdCreative call error:', fbErr?.message);
            }

            // Rich Notification Ads are displayed via approvedAds injection in HomeScreen feed
            // No hub-specific notification needed (avoids duplicates for hub subscribers)

            Alert.alert('Ad Approved', `"${ad.brandName || 'Ad'}" is now live on ${ad.hubName || 'hub'}.${ad.slotType === 'rich_notif' ? '\n\nPush notification sent to subscribers.' : ''}`);
          },
        },
      ]
    );
  };

  const handleRejectAd = (ad) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    const rejectCostLabel = ad.totalCost ? ad.totalCost.toLocaleString() : '0';
    const walletStr = typeof wallet?.publicKey === 'string' ? wallet.publicKey : (wallet?.publicKey?.toBase58?.() || wallet?.publicKey?.toString?.() || 'admin');
    Alert.alert(
      'Reject Ad',
      `Reject "${ad.brandName || 'Unknown'}" ad?\n\nYou will need to manually refund ${rejectCostLabel} $SKR to wallet:\n${ad.brandWallet || 'N/A'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Note Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              storeRejectAd(ad.id);
              rejectAdCreative(ad.id, walletStr, 'Rejected by admin — refund required')
                .catch(e => logger.warn('[Admin] rejectAd backend failed:', e));
              Alert.alert(
                'Ad Rejected',
                `Ad rejected.\n\nRefund required:\nWallet: ${ad.brandWallet || 'N/A'}\nAmount: ${rejectCostLabel} $SKR\n\nPlease process the refund manually.`
              );
            } catch (error) {
              logger.warn('[Admin] handleRejectAd error:', error?.message);
              Alert.alert('Error', 'Ad rejection failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleFlagSpam = (ad) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    const spamCostLabel = ad.totalCost ? ad.totalCost.toLocaleString() : '0';
    const walletStr = typeof wallet?.publicKey === 'string' ? wallet.publicKey : (wallet?.publicKey?.toBase58?.() || wallet?.publicKey?.toString?.() || 'admin');
    Alert.alert(
      'Flag as Spam',
      `Flag "${ad.brandName || 'Unknown'}" as spam?\n\nFunds (${spamCostLabel} $SKR) will be RETAINED.\nThe brand will be notified of the violation.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flag Spam & Retain Funds',
          style: 'destructive',
          onPress: async () => {
            try {
              storeRejectAd(ad.id);
              rejectAdCreative(ad.id, walletStr, 'Flagged as spam — funds retained')
                .catch(e => logger.warn('[Admin] flagSpam backend failed:', e));
              Alert.alert(
                'Flagged as Spam',
                `"${ad.brandName || 'Ad'}" flagged as spam.\nFunds retained: ${spamCostLabel} $SKR\nBrand wallet: ${ad.brandWallet || 'N/A'}`
              );
            } catch (error) {
              logger.warn('[Admin] handleFlagSpam error:', error?.message);
              Alert.alert('Error', 'Flag spam failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  // [B50] Active Ads handlers — Pause / Resume / Stop
  const handlePauseAd = (ad) => {
    const walletStr = typeof wallet?.publicKey === 'string' ? wallet.publicKey : (wallet?.publicKey?.toBase58?.() || wallet?.publicKey?.toString?.() || 'admin');
    Alert.alert(
      'Pause Ad',
      `Pause "${ad.brandName || 'Unknown'}" ad?\n\nIt will stop being shown until resumed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          onPress: async () => {
            try {
              storePauseAd(ad.id);
              pauseAdCreative(ad.id, walletStr)
                .catch(e => logger.warn('[Admin] pauseAd backend failed:', e));
              Alert.alert('Ad Paused', `"${ad.brandName || 'Ad'}" has been paused. You can resume it anytime.`);
            } catch (error) {
              logger.warn('[Admin] handlePauseAd error:', error?.message);
              Alert.alert('Error', 'Pause failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleResumeAd = (ad) => {
    const walletStr = typeof wallet?.publicKey === 'string' ? wallet.publicKey : (wallet?.publicKey?.toBase58?.() || wallet?.publicKey?.toString?.() || 'admin');
    try {
      storeResumeAd(ad.id);
      resumeAdCreative(ad.id, walletStr)
        .catch(e => logger.warn('[Admin] resumeAd backend failed:', e));
      Alert.alert('Ad Resumed', `"${ad.brandName || 'Ad'}" is now running again.`);
    } catch (error) {
      logger.warn('[Admin] handleResumeAd error:', error?.message);
      Alert.alert('Error', 'Resume failed. Please try again.');
    }
  };

  const handleStopAd = (ad) => {
    const costLabel = ad.totalCost ? ad.totalCost.toLocaleString() : '0';
    const walletStr = typeof wallet?.publicKey === 'string' ? wallet.publicKey : (wallet?.publicKey?.toBase58?.() || wallet?.publicKey?.toString?.() || 'admin');
    Alert.alert(
      'Stop Ad Permanently',
      `⚠️ Stop "${ad.brandName || 'Unknown'}" ad permanently?\n\nThis cannot be undone.\nConsider a refund for remaining duration.\n\nBrand wallet: ${ad.brandWallet || 'N/A'}\nCost: ${costLabel} $SKR`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              storeStopAd(ad.id);
              stopAdCreative(ad.id, walletStr)
                .catch(e => logger.warn('[Admin] stopAd backend failed:', e));
              Alert.alert(
                'Ad Stopped',
                `"${ad.brandName || 'Ad'}" has been permanently stopped.\n\nRemember to process refund if applicable.\nBrand wallet: ${ad.brandWallet || 'N/A'}`
              );
            } catch (error) {
              logger.warn('[Admin] handleStopAd error:', error?.message);
              Alert.alert('Error', 'Stop failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Hub handlers — connected to Zustand store
  const handleApproveHub = (hubId, hubName) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet to approve hubs.');
      return;
    }
    Alert.alert('Approve Hub', `Approve "${hubName}"?\n\nIt will appear in Discover for all users.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => {
        storeApproveHub(hubId);
        Alert.alert('Hub Approved', `"${hubName}" is now active and visible on Discover.`);
      }},
    ]);
  };

  const handleRejectHub = (hubId, hubName) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    Alert.alert('Reject Hub', `Reject "${hubName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => {
        storeRejectHub(hubId);
        Alert.alert('Hub Rejected', `"${hubName}" has been rejected.`);
      }},
    ]);
  };

  const handleSuspendActiveHub = (hubId, hubName) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    if (!checkRateLimit('admin_hub_action')) {
      Alert.alert('Rate Limited', 'Please wait before performing another admin action.');
      return;
    }
    Alert.alert('Suspend Hub', `Suspend "${hubName}"?\n\nIt will be hidden from Discover and no new subscribers can join.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => {
        storeSuspendHub(hubId);
        Alert.alert('Hub Suspended', `"${hubName}" has been suspended.`);
      }},
    ]);
  };

  const handleReactivateHub = (hubId, hubName) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    if (!checkRateLimit('admin_hub_action')) {
      Alert.alert('Rate Limited', 'Please wait before performing another admin action.');
      return;
    }
    Alert.alert('Reactivate Hub', `Reactivate "${hubName}"?\n\nSubscription will reset to 30 days.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reactivate', onPress: () => {
        storeReactivateHub(hubId);
        Alert.alert('Hub Reactivated', `"${hubName}" is now active again.`);
      }},
    ]);
  };

  const handleDeleteHub = (hubId, hubName) => {
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    if (!checkRateLimit('admin_hub_action')) {
      Alert.alert('Rate Limited', 'Please wait before performing another admin action.');
      return;
    }
    Alert.alert('DELETE Hub', `Are you absolutely sure you want to permanently delete "${hubName}"?\n\nThis action is IRREVERSIBLE. All subscribers will lose access.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'DELETE', style: 'destructive', onPress: () => {
        storeDeleteHub(hubId);
        Alert.alert('Hub Deleted', `"${hubName}" has been permanently removed.`);
      }},
    ]);
  };

  // Helper: compute subscription days info for admin display
  const getDaysInfo = (hub) => {
    if (!hub.subscriptionExpiresAt) return { label: 'No expiry set', color: '#666' };
    const diff = new Date(hub.subscriptionExpiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days > 7) return { label: `${days} days remaining`, color: '#4CAF50' };
    if (days > 0) return { label: `${days} days remaining`, color: '#FF9800' };
    return { label: `Overdue ${Math.abs(days)} days`, color: '#f44336' };
  };

  const handleSendGlobalNotification = () => {
    if (!checkRateLimit('global_notification', 5000)) return;
    if (!globalNotifTitle.trim() || !globalNotifMessage.trim()) {
      Alert.alert('Missing Info', 'Please fill in both title and message');
      return;
    }
    if (!USE_DEVNET && !wallet?.connected) {
      Alert.alert('Wallet Required', `Connect your admin wallet.\nCost: ${PRICING.GLOBAL_NOTIFICATION} $SKR.`);
      return;
    }
    Alert.alert(
      'Send Global Notification',
      `Send to ALL users. Cost: ${PRICING.GLOBAL_NOTIFICATION} $SKR. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            // Trigger real local push notification (lock screen + tray)
            showLocalNotification(
              `DEEP Pulse: ${globalNotifTitle}`,
              globalNotifMessage,
              { source: 'admin_global' },
            );
            // Also try Firebase Cloud Function (for production with backend)
            sendGlobalNotification(globalNotifTitle, globalNotifMessage, wallet?.publicKey || 'admin')
              .then((res) => logger.log('[Admin] Global push sent:', res))
              .catch(e => logger.warn('[Admin] Global push failed:', e));
            Alert.alert('Sent!', 'Global notification sent to all users via push.');
            setGlobalNotifTitle('');
            setGlobalNotifMessage('');
          },
        },
      ]
    );
  };

  // ============================================
  // RENDER: Overview
  // ============================================
  const renderOverview = () => {
    const STATS_DATA = computeStats(storeHubs, pendingAds, daoProposals, storeApprovedAds);
    const stats = STATS_DATA[statsPeriod];
    const pendingAdCount = pendingAds.length;
    const unreadMessages = 0;

    return (
      <ScrollView className="px-6 py-4" contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Period Selector */}
        <View className="flex-row mb-5">
          {['7d', '30d', '90d'].map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setStatsPeriod(period)}
              className={`flex-1 py-2 rounded-lg mr-2 ${statsPeriod === period ? 'bg-primary' : 'bg-background-card border border-border'}`}
            >
              <Text className={`text-center font-bold text-sm ${statsPeriod === period ? 'text-white' : 'text-text-secondary'}`}>
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Tabs */}
        <View className="flex-row mb-4">
          {['global', 'users', 'brands'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setStatsTab(tab)}
              className={`flex-1 py-2 ${statsTab === tab ? 'border-b-2 border-primary' : ''}`}
            >
              <Text className={`text-center font-semibold text-sm ${statsTab === tab ? 'text-primary' : 'text-text-secondary'}`}>
                {tab === 'global' ? 'Global' : tab === 'users' ? 'Users' : 'Brands'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        {statsTab === 'global' && (
          <View className="flex-row flex-wrap mb-6">
            <StatCard label="Total Users" value={stats.global.totalUsers.toLocaleString()} icon="people" color="#FF9F66" />
            <StatCard label="Active Users" value={stats.global.activeUsers.toLocaleString()} icon="pulse" color="#4CAF50" />
            <StatCard label="Active Hubs" value={stats.global.totalHubs.toString()} icon="apps" color="#2196F3" />
            <StatCard label="Revenue ($SKR)" value={stats.global.revenue.toLocaleString()} icon="cash" color="#FF9F66" isLast />
            <StatCard label="Ads Sold" value={stats.global.adsSold.toString()} icon="megaphone" color="#9C27B0" />
            <StatCard label="Feedback" value={stats.global.feedbackCount.toString()} icon="chatbox" color="#4CAF50" />
            <StatCard label="DAO Proposals" value={stats.global.daoProposals.toString()} icon="rocket" color="#2196F3" />
            <StatCard label="Growth" value={`+${stats.global.growth}%`} icon="trending-up" color="#4CAF50" isLast />
          </View>
        )}

        {statsTab === 'users' && (
          <View className="flex-row flex-wrap mb-6">
            <StatCard label="New Registrations" value={stats.users.newRegistrations.toLocaleString()} icon="person-add" color="#4CAF50" />
            <StatCard label="Active Users" value={stats.users.activeUsers.toLocaleString()} icon="pulse" color="#2196F3" />
            <StatCard label="Avg Score" value={stats.users.avgScore.toString()} icon="star" color="#FFD700" />
            <StatCard label="Legends" value={stats.users.legendCount.toString()} icon="trophy" color="#FFD700" isLast />
            <StatCard label="Diamonds" value={stats.users.diamondCount.toString()} icon="diamond" color="#B9F2FF" />
            <StatCard label="Feedback Sent" value={stats.users.feedbackSent.toLocaleString()} icon="chatbox" color="#FF9F66" />
            <StatCard label="Subscriptions" value={stats.users.subscriptions.toLocaleString()} icon="notifications" color="#9C27B0" />
          </View>
        )}

        {statsTab === 'brands' && (
          <View className="flex-row flex-wrap mb-6">
            <StatCard label="Active Hubs" value={stats.brands.activeHubs.toString()} icon="apps" color="#FF9F66" />
            <StatCard label="Rev/Hub ($SKR)" value={stats.brands.revenuePerHub.toLocaleString()} icon="cash" color="#4CAF50" />
            <StatCard label="Ads Purchased" value={stats.brands.adsPurchased.toString()} icon="megaphone" color="#9C27B0" />
            <StatCard label="Approval Rate" value={`${stats.brands.approvalRate}%`} icon="checkmark-circle" color="#4CAF50" isLast />
            <StatCard label="Avg Response" value={stats.brands.avgResponseTime} icon="time" color="#2196F3" />
            <StatCard label="Suspended" value={stats.brands.suspendedCount.toString()} icon="ban" color="#f44336" />
          </View>
        )}

        {/* Quick Actions */}
        <Text className="text-text font-bold text-lg mb-3">Quick Actions</Text>

        {/* Ad Moderation */}
        <TouchableOpacity
          onPress={() => setActiveSection('adModeration')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={24} color="#FF9F66" />
            <Text className="text-text font-semibold ml-3">Ad Moderation</Text>
          </View>
          <View className="flex-row items-center">
            {pendingAdCount > 0 && (
              <View className="bg-error rounded-full w-6 h-6 items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">{pendingAdCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* [B50] Active Ads Management */}
        <TouchableOpacity
          onPress={() => setActiveSection('activeAds')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="play-circle" size={24} color="#FF9F66" />
            <Text className="text-text font-semibold ml-3">Active Ads</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-primary font-bold mr-2">
              {storeApprovedAds.filter(a => a.status !== 'stopped').length}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* Messages */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminMessages')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="chatbubbles" size={24} color="#FF9F66" />
            <Text className="text-text font-semibold ml-3">Messages to Brands</Text>
          </View>
          <View className="flex-row items-center">
            {unreadMessages > 0 && (
              <View className="bg-primary rounded-full w-6 h-6 items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">{unreadMessages}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('top100')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <Text className="text-text font-semibold ml-3">Top 100 Leaderboard</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('hubs')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="apps" size={24} color="#FF9F66" />
            <Text className="text-text font-semibold ml-3">Manage Hubs</Text>
          </View>
          <View className="flex-row items-center">
            {pendingHubs.length > 0 && (
              <View className="bg-primary rounded-full w-6 h-6 items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">{pendingHubs.length}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('globalNotif')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="megaphone" size={24} color="#FF9F66" />
            <Text className="text-text font-semibold ml-3">Global Notification</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('pricing')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="pricetag" size={24} color="#4CAF50" />
            <Text className="text-text font-semibold ml-3">Pricing Management</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('deals')}
          className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
        >
          <View className="flex-row items-center">
            <Ionicons name="gift" size={24} color="#9C27B0" />
            <Text className="text-text font-semibold ml-3">Custom Brand Deals</Text>
          </View>
          <View className="flex-row items-center">
            <View className="bg-purple-500/30 rounded-full w-6 h-6 items-center justify-center mr-2">
              <Text className="text-white text-xs font-bold">{customDeals.length}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

      </ScrollView>
    );
  };

  // ============================================
  // RENDER: Ad Moderation
  // ============================================
  const renderAdModeration = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>

      <Text className="text-text font-black text-2xl mb-2">Ad Moderation</Text>
      <Text className="text-text-secondary text-sm mb-4">
        Review and approve ad creatives before they go live
      </Text>

      {pendingAds.length === 0 ? (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text className="text-text-secondary text-base mt-4 text-center">
            All ads reviewed! No pending submissions.
          </Text>
        </View>
      ) : (
        pendingAds.map((ad) => (
          <View key={ad.id} className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
            {/* Brand header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                  <Ionicons name="business" size={20} color="#FF9F66" />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-bold">{ad.brandName}</Text>
                  <Text className="text-text-secondary text-xs">{ad.brandWallet}</Text>
                </View>
              </View>
              <View className="bg-primary/20 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-bold">{(ad.totalCost || 0).toLocaleString()} $SKR</Text>
              </View>
            </View>

            {/* Ad details */}
            <View className="bg-background-secondary rounded-xl p-3 mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Hub</Text>
                <Text className="text-text font-semibold text-xs">{ad.hubName}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Slot</Text>
                <Text className="text-text font-semibold text-xs">{ad.slotType === 'top' ? 'Top (390x120)' : ad.slotType === 'lockscreen' ? 'Lockscreen (1080x1920)' : ad.slotType === 'rich_notif' ? 'Rich Notification' : 'Bottom (390x100)'}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Duration</Text>
                <Text className="text-text font-semibold text-xs">{ad.duration} week(s)</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-xs">Submitted</Text>
                <Text className="text-text font-semibold text-xs">{typeof ad.submittedDate === 'object' ? String(ad.submittedDate) : ad.submittedDate}</Text>
              </View>
            </View>

            {/* [B58] Ad Creative Preview */}
            {ad.imageUrl ? (
              <View className="rounded-xl overflow-hidden mb-3 border border-border">
                <Image
                  source={{ uri: ad.imageUrl }}
                  className="w-full"
                  style={{
                    height: ad.slotType === 'lockscreen' ? 200 : ad.slotType === 'top' ? 80 : ad.slotType === 'bottom' ? 70 : 120,
                  }}
                  resizeMode={ad.slotType === 'lockscreen' ? 'cover' : 'contain'}
                />
              </View>
            ) : ad.slotType === 'rich_notif' ? (
              <View className="bg-background-secondary rounded-xl p-4 mb-3 border border-primary/30">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="notifications" size={16} color="#FF9F66" />
                  <Text className="text-primary font-bold text-sm ml-2">Rich Notification Preview</Text>
                </View>
                <Text className="text-text font-bold text-base">{ad.richTitle || 'Sponsored Content'}</Text>
                <Text className="text-text-secondary text-sm mt-1">{ad.richBody || '(No body text)'}</Text>
                {ad.richCtaLabel && (
                  <View className="bg-primary rounded-lg px-4 py-2 mt-3 self-start">
                    <Text className="text-background font-bold text-sm">{ad.richCtaLabel}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="bg-background-secondary rounded-xl p-4 mb-3 items-center">
                <Ionicons name="image-outline" size={32} color="#666" />
                <Text className="text-text-secondary text-xs mt-2">No image provided</Text>
              </View>
            )}

            {/* Landing URL */}
            {ad.landingUrl ? (
              <TouchableOpacity
                onPress={() => safeOpenURL(ad.landingUrl, 'ad landing page')}
                className="bg-background-secondary rounded-xl p-3 mb-3 flex-row items-center"
              >
                <Ionicons name="open-outline" size={16} color="#FF9F66" />
                <Text className="text-primary text-xs font-semibold ml-2 flex-1" numberOfLines={1}>{ad.landingUrl}</Text>
                <Ionicons name="chevron-forward" size={14} color="#FF9F66" />
              </TouchableOpacity>
            ) : null}

            {/* Action Buttons */}
            <View className="flex-row mb-2">
              <TouchableOpacity
                onPress={() => handleApproveAd(ad)}
                className="flex-1 bg-success/20 rounded-xl py-3 mr-2 border border-success"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text className="text-success font-bold text-sm ml-1">Approve</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRejectAd(ad)}
                className="flex-1 bg-error/20 rounded-xl py-3 ml-2 border border-error"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="close-circle" size={16} color="#f44336" />
                  <Text className="text-error font-bold text-sm ml-1">Reject</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => handleFlagSpam(ad)}
              className="bg-error/10 rounded-xl py-3 border border-error/30"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="flag" size={16} color="#f44336" />
                <Text className="text-error font-semibold text-sm ml-1">Flag as Spam (Retain Funds)</Text>
              </View>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  // ============================================
  // [B50] RENDER: Active Ads Management
  // ============================================
  const renderActiveAds = () => {
    const runningAds = storeApprovedAds.filter(a => a.status === 'approved');
    const pausedAds = storeApprovedAds.filter(a => a.status === 'paused');
    const totalActive = runningAds.length + pausedAds.length;

    return (
      <ScrollView className="px-6 py-4">
        <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={24} color="#FF9F66" />
          <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
        </TouchableOpacity>

        <Text className="text-text font-black text-2xl mb-2">Active Ads</Text>
        <Text className="text-text-secondary text-sm mb-4">
          Manage running and paused ad campaigns ({totalActive} total)
        </Text>

        {totalActive === 0 ? (
          <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
            <Ionicons name="megaphone-outline" size={48} color="#6b6b73" />
            <Text className="text-text-secondary text-base mt-4 text-center">
              No active ads running.
            </Text>
            <Text className="text-text-muted text-sm mt-2 text-center">
              Approved ads will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Running Ads */}
            {runningAds.length > 0 && (
              <>
                <View className="flex-row items-center mb-3">
                  <View className="w-2.5 h-2.5 rounded-full bg-success mr-2" />
                  <Text className="text-success font-bold text-sm">Running ({runningAds.length})</Text>
                </View>
                {runningAds.map((ad) => (
                  <View key={ad.id} className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
                    {/* Brand header */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full bg-success/20 items-center justify-center mr-3">
                          <Ionicons name="business" size={20} color="#4CAF50" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-text font-bold">{ad.brandName || 'Unknown Brand'}</Text>
                          <Text className="text-text-secondary text-xs" numberOfLines={1}>{ad.brandWallet || ad.walletAddress || 'N/A'}</Text>
                        </View>
                      </View>
                      <View className="bg-success/20 rounded-full px-3 py-1">
                        <Text className="text-success text-xs font-bold">Running</Text>
                      </View>
                    </View>

                    {/* Ad details */}
                    <View className="bg-background-secondary rounded-xl p-3 mb-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-text-secondary text-xs">Hub</Text>
                        <Text className="text-text font-semibold text-xs">{ad.hubName || 'N/A'}</Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-text-secondary text-xs">Slot</Text>
                        <Text className="text-text font-semibold text-xs">{ad.slotType === 'top' ? 'Top (390x120)' : ad.slotType === 'lockscreen' ? 'Lockscreen (1080x1920)' : ad.slotType === 'rich_notif' ? 'Rich Notification' : 'Bottom (390x100)'}</Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-text-secondary text-xs">Duration</Text>
                        <Text className="text-text font-semibold text-xs">{ad.duration || '—'} week(s)</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-text-secondary text-xs">Cost</Text>
                        <Text className="text-primary font-semibold text-xs">{(ad.totalCost || 0).toLocaleString()} $SKR</Text>
                      </View>
                    </View>

                    {/* Action Buttons: Pause + Stop */}
                    <View className="flex-row">
                      <TouchableOpacity
                        onPress={() => handlePauseAd(ad)}
                        className="flex-1 rounded-xl py-3 mr-2 border"
                        style={{ backgroundColor: 'rgba(255, 152, 0, 0.15)', borderColor: '#FF9800' }}
                      >
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="pause-circle" size={16} color="#FF9800" />
                          <Text style={{ color: '#FF9800' }} className="font-bold text-sm ml-1">Pause</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleStopAd(ad)}
                        className="flex-1 bg-error/20 rounded-xl py-3 ml-2 border border-error"
                      >
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="stop-circle" size={16} color="#f44336" />
                          <Text className="text-error font-bold text-sm ml-1">Stop</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Paused Ads */}
            {pausedAds.length > 0 && (
              <>
                <View className="flex-row items-center mb-3 mt-2">
                  <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: '#FF9800' }} />
                  <Text style={{ color: '#FF9800' }} className="font-bold text-sm">Paused ({pausedAds.length})</Text>
                </View>
                {pausedAds.map((ad) => (
                  <View key={ad.id} className="bg-background-card rounded-2xl p-5 mb-4 border border-border" style={{ opacity: 0.85 }}>
                    {/* Brand header */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)' }}>
                          <Ionicons name="business" size={20} color="#FF9800" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-text font-bold">{ad.brandName || 'Unknown Brand'}</Text>
                          <Text className="text-text-secondary text-xs" numberOfLines={1}>{ad.brandWallet || ad.walletAddress || 'N/A'}</Text>
                        </View>
                      </View>
                      <View className="rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)' }}>
                        <Text style={{ color: '#FF9800' }} className="text-xs font-bold">Paused</Text>
                      </View>
                    </View>

                    {/* Ad details */}
                    <View className="bg-background-secondary rounded-xl p-3 mb-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-text-secondary text-xs">Hub</Text>
                        <Text className="text-text font-semibold text-xs">{ad.hubName || 'N/A'}</Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-text-secondary text-xs">Slot</Text>
                        <Text className="text-text font-semibold text-xs">{ad.slotType === 'top' ? 'Top (390x120)' : ad.slotType === 'lockscreen' ? 'Lockscreen (1080x1920)' : ad.slotType === 'rich_notif' ? 'Rich Notification' : 'Bottom (390x100)'}</Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-text-secondary text-xs">Duration</Text>
                        <Text className="text-text font-semibold text-xs">{ad.duration || '—'} week(s)</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-text-secondary text-xs">Cost</Text>
                        <Text className="text-primary font-semibold text-xs">{(ad.totalCost || 0).toLocaleString()} $SKR</Text>
                      </View>
                    </View>

                    {/* Action Buttons: Resume + Stop */}
                    <View className="flex-row">
                      <TouchableOpacity
                        onPress={() => handleResumeAd(ad)}
                        className="flex-1 bg-success/20 rounded-xl py-3 mr-2 border border-success"
                      >
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="play-circle" size={16} color="#4CAF50" />
                          <Text className="text-success font-bold text-sm ml-1">Resume</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleStopAd(ad)}
                        className="flex-1 bg-error/20 rounded-xl py-3 ml-2 border border-error"
                      >
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="stop-circle" size={16} color="#f44336" />
                          <Text className="text-error font-bold text-sm ml-1">Stop</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
        <View className="h-6" />
      </ScrollView>
    );
  };

  // ============================================
  // RENDER: Top 100
  // ============================================
  const renderTop100 = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>
      <Text className="text-text font-black text-2xl mb-4">Top 100</Text>
      {/* [B49] Loading state */}
      {leaderboardLoading && (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border mb-4">
          <ActivityIndicator size="large" color="#FF9F66" />
          <Text className="text-text-secondary text-sm mt-3">Loading rankings...</Text>
        </View>
      )}
      {/* [B49] Empty state (only when not loading) */}
      {!leaderboardLoading && leaderboardData.length === 0 && (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border mb-4">
          <Ionicons name="trophy-outline" size={48} color="#666" />
          <Text className="text-text-secondary text-base mt-4 text-center">No leaderboard data yet</Text>
          <Text className="text-text-muted text-xs text-center mt-1">Rankings will appear here as users earn DEEP Score</Text>
        </View>
      )}
      {leaderboardData.map((entry) => {
        const tier = getTierFromScore(entry.score);
        return (
          <View key={entry.rank} className="bg-background-card rounded-xl p-4 mb-3 border border-border">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                  <Text className="text-text font-black">#{entry.rank}</Text>
                </View>
                <View className="ml-3">
                  <Text className="text-text font-bold">{entry.wallet}</Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name={tier.icon} size={16} color={tier.color} />
                    <Text className="text-text-secondary text-xs ml-1">{tier.name}</Text>
                  </View>
                </View>
              </View>
              <Text className="text-primary font-black text-xl">{entry.score}</Text>
            </View>
            <View className="flex-row justify-around mt-2 pt-2 border-t border-border">
              <View className="items-center">
                <Text className="text-text font-semibold">{entry.boost}</Text>
                <Text className="text-text-secondary text-xs">DAO</Text>
              </View>
              <View className="items-center">
                <Text className="text-text font-semibold">{entry.talent}</Text>
                <Text className="text-text-secondary text-xs">Talent</Text>
              </View>
              <View className="items-center">
                <Text className="text-text font-semibold">{entry.feedback}</Text>
                <Text className="text-text-secondary text-xs">Feedback</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  // ============================================
  // RENDER: Hubs Management
  // ============================================
  const renderHubsManagement = () => {
    const activeHubs = storeHubs.filter(h => h.status === 'ACTIVE' || h.status === 'OVERDUE' || !h.status);
    const suspendedHubs = storeHubs.filter(h => h.status === 'SUSPENDED');

    return (
      <ScrollView className="px-6 py-4">
        <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={24} color="#FF9F66" />
          <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
        </TouchableOpacity>
        <Text className="text-text font-black text-2xl mb-4">Manage Hubs</Text>

        {/* ── Section 1: Pending Approval ── */}
        <Text className="text-text font-semibold mb-3">Pending Approval ({pendingHubs.length})</Text>
        {pendingHubs.length === 0 && (
          <Text className="text-text-secondary text-sm mb-4 italic">No pending hubs</Text>
        )}
        {pendingHubs.map((hub) => (
          <View key={hub.id} className="bg-background-card rounded-xl p-4 mb-3 border border-border">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text font-bold text-lg">{hub.name}</Text>
              <View className="bg-primary/20 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-bold">PENDING</Text>
              </View>
            </View>
            <Text className="text-text-secondary text-sm mb-1">Creator: {hub.creator}</Text>
            <Text className="text-text-secondary text-sm mb-3">Created: {typeof hub.createdDate === 'object' ? String(hub.createdDate) : hub.createdDate}</Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => handleApproveHub(hub.id, hub.name)}
                className="flex-1 bg-success/20 rounded-xl py-2 mr-2 border border-success"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text className="text-success font-semibold ml-1 text-sm">Approve</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRejectHub(hub.id, hub.name)}
                className="flex-1 bg-error/20 rounded-xl py-2 ml-2 border border-error"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="close-circle" size={16} color="#f44336" />
                  <Text className="text-error font-semibold ml-1 text-sm">Reject</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* ── Section 2: Active & Overdue Hubs ── */}
        <Text className="text-text font-semibold mb-3 mt-4">Active Hubs ({activeHubs.length})</Text>
        {activeHubs.length === 0 && (
          <Text className="text-text-secondary text-sm mb-4 italic">No active hubs</Text>
        )}
        {activeHubs.map((hub) => {
          const daysInfo = getDaysInfo(hub);
          const isOverdue = hub.status === 'OVERDUE';
          return (
            <View key={hub.id} className="bg-background-card rounded-xl p-4 mb-3 border border-border">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text font-bold text-lg flex-1 mr-2" numberOfLines={1}>{hub.name}</Text>
                <View className={`rounded-full px-3 py-1 ${isOverdue ? 'bg-orange-500/20' : 'bg-success/20'}`}>
                  <Text className={`text-xs font-bold ${isOverdue ? 'text-orange-500' : 'text-success'}`}>
                    {isOverdue ? 'OVERDUE' : 'ACTIVE'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center mb-1">
                <Ionicons name="people" size={14} color="#999" />
                <Text className="text-text-secondary text-sm ml-1">{(hub.subscribers || 0).toLocaleString()} subscribers</Text>
              </View>
              <View className="flex-row items-center mb-3">
                <Ionicons name="time" size={14} color={daysInfo.color} />
                <Text className="text-sm ml-1" style={{ color: daysInfo.color }}>{daysInfo.label}</Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => handleSuspendActiveHub(hub.id, hub.name)}
                  className="flex-1 bg-orange-500/20 rounded-xl py-2 mr-2 border border-orange-500"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="pause-circle" size={16} color="#FF9800" />
                    <Text className="text-orange-500 font-semibold ml-1 text-sm">Suspend</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteHub(hub.id, hub.name)}
                  className="flex-1 bg-error/20 rounded-xl py-2 ml-2 border border-error"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="trash" size={16} color="#f44336" />
                    <Text className="text-error font-semibold ml-1 text-sm">Delete</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* ── Section 3: Suspended Hubs ── */}
        <Text className="text-text font-semibold mb-3 mt-4">Suspended Hubs ({suspendedHubs.length})</Text>
        {suspendedHubs.length === 0 && (
          <Text className="text-text-secondary text-sm mb-4 italic">No suspended hubs</Text>
        )}
        {suspendedHubs.map((hub) => (
          <View key={hub.id} className="bg-background-card rounded-xl p-4 mb-3 border border-border opacity-70">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text font-bold text-lg flex-1 mr-2" numberOfLines={1}>{hub.name}</Text>
              <View className="bg-error/20 rounded-full px-3 py-1">
                <Text className="text-error text-xs font-bold">SUSPENDED</Text>
              </View>
            </View>
            <View className="flex-row items-center mb-1">
              <Ionicons name="people" size={14} color="#999" />
              <Text className="text-text-secondary text-sm ml-1">{(hub.subscribers || 0).toLocaleString()} subscribers</Text>
            </View>
            {hub.suspendedAt && (
              <Text className="text-text-secondary text-sm mb-3">Suspended: {(() => { try { const d = new Date(hub.suspendedAt); return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Unknown'; } catch { return 'Unknown'; } })()}</Text>
            )}
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => handleReactivateHub(hub.id, hub.name)}
                className="flex-1 bg-success/20 rounded-xl py-2 mr-2 border border-success"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="play-circle" size={16} color="#4CAF50" />
                  <Text className="text-success font-semibold ml-1 text-sm">Reactivate</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteHub(hub.id, hub.name)}
                className="flex-1 bg-error/20 rounded-xl py-2 ml-2 border border-error"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="trash" size={16} color="#f44336" />
                  <Text className="text-error font-semibold ml-1 text-sm">Delete</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ============================================
  // RENDER: Global Notification
  // ============================================
  const renderGlobalNotification = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>
      <Text className="text-text font-black text-2xl mb-2">Global Notification</Text>
      <Text className="text-text-secondary text-sm mb-4">Send to ALL users - Cost: {PRICING.GLOBAL_NOTIFICATION} $SKR</Text>
      <View className="bg-background-card rounded-xl p-5 mb-6 border border-border">
        <Text className="text-text font-semibold mb-2">Title</Text>
        <TextInput
          value={globalNotifTitle} onChangeText={setGlobalNotifTitle}
          placeholder="Notification title..." placeholderTextColor="#666"
          maxLength={100}
          className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
        />
        <Text className="text-text font-semibold mb-2">Message</Text>
        <TextInput
          value={globalNotifMessage} onChangeText={setGlobalNotifMessage}
          placeholder="Notification message..." placeholderTextColor="#666"
          maxLength={500}
          multiline numberOfLines={4} textAlignVertical="top"
          className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 h-32 border border-border"
        />
        <TouchableOpacity
          onPress={handleSendGlobalNotification}
          disabled={!globalNotifTitle || !globalNotifMessage}
          className={`rounded-xl py-4 ${globalNotifTitle && globalNotifMessage ? 'bg-primary' : 'bg-border'}`}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="send" size={18} color="#fff" />
            <Text className="text-white font-bold ml-2">Send ({PRICING.GLOBAL_NOTIFICATION} $SKR)</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ============================================
  // RENDER: Pricing Management
  // ============================================
  const PRICE_LABELS = {
    feedback: { label: 'Feedback Deposit', icon: 'chatbox', unit: '$SKR' },
    talent: { label: 'Talent Deposit', icon: 'briefcase', unit: '$SKR' },
    daoBoost: { label: 'DAO Boost Deposit', icon: 'rocket', unit: '$SKR' },
    hubCreation: { label: 'Hub Creation', icon: 'storefront', unit: '$SKR/month' },
    topAdSlot: { label: 'Top Ad Slot', icon: 'arrow-up-circle', unit: '$SKR/week' },
    bottomAdSlot: { label: 'Bottom Ad Slot', icon: 'arrow-down-circle', unit: '$SKR/week' },
    lockscreenAd: { label: 'Lockscreen Ad', icon: 'phone-portrait', unit: '$SKR/week' },
    globalNotification: { label: 'Global Notification', icon: 'megaphone', unit: '$SKR' },
    pushNotificationAd: { label: 'Rich Notification Ad', icon: 'notifications', unit: '$SKR/week' },
  };

  // Map frontend key → on-chain parameter name
  const PRICE_TO_CHAIN_MAP = {
    feedback: 'feedbackDeposit',
    talent: 'talentDeposit',
    daoBoost: 'daoProposalDeposit',
    hubCreation: 'hubSubscriptionPrice',
    topAdSlot: 'topAdPricePerWeek',
    bottomAdSlot: 'bottomAdPricePerWeek',
  };

  const handleSavePrice = (key) => {
    const newValue = parseInt(editPriceValue, 10);
    if (isNaN(newValue) || newValue <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid positive number.');
      return;
    }
    const chainParam = PRICE_TO_CHAIN_MAP[key];
    const isOnChainPrice = !!chainParam;

    Alert.alert(
      'Update Price',
      `Change "${PRICE_LABELS[key].label}" from ${prices[key]} to ${newValue} $SKR?${isOnChainPrice && !USE_DEVNET ? '\n\nThis will update the on-chain PlatformConfig.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            if (!USE_DEVNET && isOnChainPrice) {
              // Release mode: call on-chain update_platform_config
              try {
                setSavingPrice(true);
                const DECIMALS = 1_000_000;
                const onChainValue = newValue * DECIMALS;
                await programService.updatePlatformConfig({
                  [chainParam]: onChainValue,
                });
                updateSinglePrice(key, newValue);
                setEditingPrice(null);
                setEditPriceValue('');
                Alert.alert('Price Updated On-Chain', `${PRICE_LABELS[key].label} is now ${newValue} $SKR.\n\nAll users will see the new price immediately.`);
              } catch (error) {
                Alert.alert('Transaction Failed', error.message || 'Failed to update price on-chain.');
              } finally {
                setSavingPrice(false);
              }
            } else {
              // Dev mode: update store locally
              updateSinglePrice(key, newValue);
              setEditingPrice(null);
              setEditPriceValue('');
              Alert.alert('Price Updated', `${PRICE_LABELS[key].label} is now ${newValue} $SKR.${USE_DEVNET ? '\n\n(Dev mode: local update only)' : ''}`);
            }
          },
        },
      ]
    );
  };

  const renderPricingManagement = () => (
    <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>

      <Text className="text-text font-black text-2xl mb-2">Pricing Management</Text>
      <Text className="text-text-secondary text-sm mb-5">
        Modify platform pricing for all actions
      </Text>

      {Object.entries(prices).map(([key, value]) => {
        const info = PRICE_LABELS[key];
        if (!info) return null; // Skip unknown pricing keys
        const isEditing = editingPrice === key;
        return (
          <View key={key} className="bg-background-card rounded-xl p-4 mb-3 border border-border">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center mr-3">
                  <Ionicons name={info.icon} size={20} color="#FF9F66" />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-bold">{info.label}</Text>
                  <Text className="text-text-secondary text-xs">{info.unit}</Text>
                </View>
              </View>
              {isEditing ? (
                <View className="flex-row items-center">
                  <TextInput
                    value={editPriceValue}
                    onChangeText={setEditPriceValue}
                    keyboardType="number-pad"
                    className="bg-background-secondary text-primary font-bold text-right rounded-lg px-3 py-2 w-24 border border-primary mr-2"
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => handleSavePrice(key)} className="bg-success/20 rounded-lg p-2 mr-1">
                    <Ionicons name="checkmark" size={18} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setEditingPrice(null); setEditPriceValue(''); }} className="bg-error/20 rounded-lg p-2">
                    <Ionicons name="close" size={18} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setEditingPrice(key); setEditPriceValue(String(value)); }}
                  className="flex-row items-center"
                >
                  <Text className="text-primary font-black text-xl mr-2">{value.toLocaleString()}</Text>
                  <Ionicons name="create-outline" size={18} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
      <View className="h-6" />
    </ScrollView>
  );

  // ============================================
  // RENDER: Custom Brand Deals
  // ============================================
  const handleCreateDeal = () => {
    if (!newDeal.brandName || !newDeal.brandWallet || !newDeal.dealPrice || !newDeal.duration) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    const dealPrice = parseInt(newDeal.dealPrice, 10);
    if (isNaN(dealPrice) || dealPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid deal price.');
      return;
    }
    const originalPrice = newDeal.type === 'Ad Slot' ? prices.topAdSlot
      : newDeal.type === 'Hub Creation' ? prices.hubCreation
      : newDeal.type === 'Bottom Ad Slot' ? prices.bottomAdSlot
      : newDeal.type === 'Lockscreen Ad' ? prices.lockscreenAd
      : prices.feedback;

    const deal = {
      id: Date.now().toString(),
      brandName: newDeal.brandName,
      brandWallet: newDeal.brandWallet,
      type: newDeal.type,
      originalPrice,
      dealPrice,
      duration: newDeal.duration,
      status: 'active',
      notes: newDeal.notes,
    };
    storeAddDeal(deal);
    setShowDealModal(false);
    setNewDeal({ brandName: '', brandWallet: '', type: 'Ad Slot', dealPrice: '', duration: '', notes: '' });
    Alert.alert('Deal Created', `Custom deal for "${deal.brandName}" is now active.\n\n${deal.type}: ${dealPrice} $SKR instead of ${originalPrice} $SKR`);
  };

  const handleRevokeDeal = (deal) => {
    Alert.alert(
      'Revoke Deal',
      `Remove custom deal for "${deal.brandName}"?\n\nThey will revert to standard pricing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            storeRemoveDeal(deal.id);
            Alert.alert('Deal Revoked', `${deal.brandName} is now on standard pricing.`);
          },
        },
      ]
    );
  };

  const renderCustomDeals = () => (
    <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>

      <Text className="text-text font-black text-2xl mb-2">Custom Brand Deals</Text>
      <Text className="text-text-secondary text-sm mb-5">
        Create special pricing for strategic partners
      </Text>

      {/* Create New Deal Button */}
      <TouchableOpacity
        onPress={() => setShowDealModal(true)}
        className="bg-primary/15 rounded-xl py-4 mb-5 border border-primary/30"
      >
        <View className="flex-row items-center justify-center">
          <Ionicons name="add-circle" size={22} color="#FF9F66" />
          <Text className="text-primary font-bold text-base ml-2">Create New Deal</Text>
        </View>
      </TouchableOpacity>

      {/* Active Deals */}
      {customDeals.length === 0 ? (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="gift-outline" size={48} color="#666" />
          <Text className="text-text-secondary text-base mt-4 text-center">
            No active deals. Create one for a brand partner.
          </Text>
        </View>
      ) : (
        customDeals.map((deal) => (
          <View key={deal.id} className="bg-background-card rounded-xl p-4 mb-3 border border-border">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center mr-3">
                  <Ionicons name="business" size={20} color="#9C27B0" />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-bold">{deal.brandName}</Text>
                  <Text className="text-text-secondary text-xs">{deal.brandWallet}</Text>
                </View>
              </View>
              <View className="bg-success/20 rounded-full px-3 py-1">
                <Text className="text-success text-xs font-bold">{(deal.status || 'active').toUpperCase()}</Text>
              </View>
            </View>

            <View className="bg-background-secondary rounded-lg p-3 mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Type</Text>
                <Text className="text-text font-semibold text-xs">{deal.type}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Standard Price</Text>
                <Text className="text-text-secondary text-xs line-through">{(deal.originalPrice || 0).toLocaleString()} $SKR</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Deal Price</Text>
                <Text className="text-success font-bold text-xs">{(deal.dealPrice || 0).toLocaleString()} $SKR</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Duration</Text>
                <Text className="text-text font-semibold text-xs">{deal.duration}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-xs">Discount</Text>
                <Text className="text-success font-bold text-xs">
                  -{deal.originalPrice > 0 ? Math.round((1 - (deal.dealPrice || 0) / deal.originalPrice) * 100) : 0}%
                </Text>
              </View>
            </View>

            {deal.notes ? (
              <View className="bg-primary/5 rounded-lg p-2 mb-3">
                <Text className="text-text-secondary text-xs italic">{deal.notes}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => handleRevokeDeal(deal)}
              className="bg-error/10 rounded-xl py-2.5 border border-error/20"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="trash-outline" size={16} color="#f44336" />
                <Text className="text-error font-semibold text-sm ml-1">Revoke Deal</Text>
              </View>
            </TouchableOpacity>
          </View>
        ))
      )}
      <View className="h-6" />
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header — only show main header on overview, sub-sections have their own */}
      {activeSection === 'overview' && (
        <View className="p-6 pb-4 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#FF9F66" />
          </TouchableOpacity>
          <View>
            <Text className="text-text font-black text-3xl">Admin</Text>
            <Text className="text-text-secondary text-sm">Platform Management</Text>
          </View>
        </View>
      )}

      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'adModeration' && renderAdModeration()}
      {activeSection === 'top100' && renderTop100()}
      {activeSection === 'hubs' && renderHubsManagement()}
      {activeSection === 'globalNotif' && renderGlobalNotification()}
      {activeSection === 'pricing' && renderPricingManagement()}
      {activeSection === 'deals' && renderCustomDeals()}
      {activeSection === 'activeAds' && renderActiveAds()}

      {/* Create Deal Modal */}
      <Modal
        visible={showDealModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDealModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-background rounded-t-3xl p-6 max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text font-black text-2xl">New Custom Deal</Text>
                <TouchableOpacity onPress={() => setShowDealModal(false)}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              <Text className="text-text-secondary text-sm mb-2">Brand Name *</Text>
              <TextInput
                value={newDeal.brandName}
                onChangeText={(t) => setNewDeal(prev => ({ ...prev, brandName: t }))}
                placeholder="e.g. Jupiter Exchange"
                placeholderTextColor="#666"
                className="bg-background-secondary text-text rounded-xl p-4 mb-4 border border-border"
              />

              <Text className="text-text-secondary text-sm mb-2">Brand Wallet Address *</Text>
              <TextInput
                value={newDeal.brandWallet}
                onChangeText={(t) => setNewDeal(prev => ({ ...prev, brandWallet: t }))}
                placeholder="e.g. 7xK4b...9QzP"
                placeholderTextColor="#666"
                className="bg-background-secondary text-text rounded-xl p-4 mb-4 border border-border"
                autoCapitalize="none"
              />

              <Text className="text-text-secondary text-sm mb-2">Deal Type *</Text>
              <View className="flex-row flex-wrap mb-4">
                {['Ad Slot', 'Bottom Ad Slot', 'Lockscreen Ad', 'Hub Creation', 'Feedback'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewDeal(prev => ({ ...prev, type }))}
                    className={`rounded-lg px-4 py-2 mr-2 mb-2 ${newDeal.type === type ? 'bg-primary' : 'bg-background-secondary border border-border'}`}
                  >
                    <Text className={`text-sm font-semibold ${newDeal.type === type ? 'text-white' : 'text-text-secondary'}`}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-text-secondary text-sm mb-2">Deal Price ($SKR) *</Text>
              <TextInput
                value={newDeal.dealPrice}
                onChangeText={(t) => setNewDeal(prev => ({ ...prev, dealPrice: t }))}
                placeholder="e.g. 1000"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                className="bg-background-secondary text-text rounded-xl p-4 mb-4 border border-border"
              />

              <Text className="text-text-secondary text-sm mb-2">Duration *</Text>
              <TextInput
                value={newDeal.duration}
                onChangeText={(t) => setNewDeal(prev => ({ ...prev, duration: t }))}
                placeholder="e.g. 12 weeks, 6 months"
                placeholderTextColor="#666"
                className="bg-background-secondary text-text rounded-xl p-4 mb-4 border border-border"
              />

              <Text className="text-text-secondary text-sm mb-2">Notes (optional)</Text>
              <TextInput
                value={newDeal.notes}
                onChangeText={(t) => setNewDeal(prev => ({ ...prev, notes: t }))}
                placeholder="e.g. Launch partner discount"
                placeholderTextColor="#666"
                className="bg-background-secondary text-text rounded-xl p-4 mb-6 border border-border"
              />

              <TouchableOpacity onPress={handleCreateDeal} className="bg-primary rounded-xl py-4">
                <View className="flex-row items-center justify-center">
                  <Ionicons name="gift" size={20} color="#fff" />
                  <Text className="text-white font-bold text-base ml-2">Create Deal</Text>
                </View>
              </TouchableOpacity>
              <View className="h-6" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// StatCard Component
// ============================================
function StatCard({ label, value, icon, color, isLast }) {
  return (
    <View className={`w-1/2 ${isLast ? '' : 'pr-2'} mb-3 ${isLast ? 'pl-2' : ''}`}>
      <View className="bg-background-card rounded-xl p-4 border border-border">
        <View className="flex-row items-center mb-2">
          <Ionicons name={icon} size={16} color={color} />
          <Text className="text-text-secondary text-xs ml-1">{label}</Text>
        </View>
        <Text className="text-text font-black text-xl" style={{ color }}>{value}</Text>
      </View>
    </View>
  );
}
