import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getTierFromScore, PRICING } from '../config/constants';
import { useAppStore } from '../store/appStore';
import { programService } from '../services/programService';
import { approveAdCreative, rejectAdCreative, sendGlobalNotification } from '../services/firebaseService';
import { logger } from '../utils/security';

// ============================================
// MOCK DATA
// ============================================

const MOCK_TOP_100 = [
  { rank: 1, wallet: '7xK...9Qz', score: 945, boost: 12, talent: 5, feedback: 8 },
  { rank: 2, wallet: '2pQ...mNp', score: 887, boost: 8, talent: 4, feedback: 12 },
  { rank: 3, wallet: '8vN...4Wp', score: 832, boost: 10, talent: 3, feedback: 6 },
  { rank: 4, wallet: '5tY...2Lm', score: 776, boost: 6, talent: 6, feedback: 10 },
  { rank: 5, wallet: '3fR...8Kp', score: 723, boost: 7, talent: 2, feedback: 9 },
];

// Mock pending hubs used as initial seed (added to store on first launch)
const INITIAL_PENDING_HUBS = [
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
];

const MOCK_PENDING_ADS = [
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
];

// Stats per period
const STATS_DATA = {
  '7d': {
    global: { totalUsers: 47832, activeUsers: 12450, totalHubs: 23, revenue: 145200, adsSold: 8, feedbackCount: 342, daoProposals: 12, growth: 4.2 },
    users: { newRegistrations: 1234, activeUsers: 12450, avgScore: 342, legendCount: 23, diamondCount: 87, feedbackSent: 342, subscriptions: 2890 },
    brands: { activeHubs: 23, revenuePerHub: 6313, adsPurchased: 8, approvalRate: 85, avgResponseTime: '2.4h', suspendedCount: 1 },
  },
  '30d': {
    global: { totalUsers: 47832, activeUsers: 28900, totalHubs: 23, revenue: 892450, adsSold: 34, feedbackCount: 2156, daoProposals: 67, growth: 34 },
    users: { newRegistrations: 8920, activeUsers: 28900, avgScore: 389, legendCount: 23, diamondCount: 87, feedbackSent: 2156, subscriptions: 15400 },
    brands: { activeHubs: 23, revenuePerHub: 38802, adsPurchased: 34, approvalRate: 78, avgResponseTime: '3.1h', suspendedCount: 2 },
  },
  '90d': {
    global: { totalUsers: 47832, activeUsers: 35200, totalHubs: 23, revenue: 2450000, adsSold: 89, feedbackCount: 6780, daoProposals: 145, growth: 89 },
    users: { newRegistrations: 22340, activeUsers: 35200, avgScore: 412, legendCount: 23, diamondCount: 87, feedbackSent: 6780, subscriptions: 38900 },
    brands: { activeHubs: 23, revenuePerHub: 106521, adsPurchased: 89, approvalRate: 82, avgResponseTime: '2.8h', suspendedCount: 4 },
  },
};

// ============================================
// COMPONENT
// ============================================

export default function AdminScreen({ navigation }) {
  const { wallet, platformPricing: prices, updateSinglePrice, loadPlatformPricingFromChain } = useAppStore();
  const pendingHubs = useAppStore((state) => state.pendingHubs);
  const storeApproveHub = useAppStore((state) => state.approveHub);
  const storeRejectHub = useAppStore((state) => state.rejectHub);
  const storeAddPendingHub = useAppStore((state) => state.addPendingHub);
  const [activeSection, setActiveSection] = useState('overview');
  const [globalNotifTitle, setGlobalNotifTitle] = useState('');
  const [globalNotifMessage, setGlobalNotifMessage] = useState('');
  const [pendingAds, setPendingAds] = useState(MOCK_PENDING_ADS);
  const [savingPrice, setSavingPrice] = useState(false);

  // Stats state
  const [statsPeriod, setStatsPeriod] = useState('30d');
  const [statsTab, setStatsTab] = useState('global');

  // Pricing edit state
  const [editingPrice, setEditingPrice] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');

  // Track whether we already seeded hubs in this session
  const hasSeeded = useRef(false);

  // Fetch on-chain prices on mount (release mode only)
  // Seed initial pending hubs ONLY on first mount & if never seeded before
  useEffect(() => {
    loadPlatformPricingFromChain();
    if (pendingHubs.length === 0 && !hasSeeded.current) {
      INITIAL_PENDING_HUBS.forEach((hub) => storeAddPendingHub(hub));
      hasSeeded.current = true;
    }
  }, []);

  // Custom deals state
  const [customDeals, setCustomDeals] = useState([
    { id: '1', brandName: 'Jupiter Exchange', brandWallet: '7xK...9Qz', type: 'Ad Slot', originalPrice: 1500, dealPrice: 1000, duration: '12 weeks', status: 'active', notes: 'Launch partner discount' },
    { id: '2', brandName: 'Magic Eden', brandWallet: '2pQ...mNp', type: 'Hub Creation', originalPrice: 2000, dealPrice: 1500, duration: '6 months', status: 'active', notes: 'Strategic partner' },
  ]);
  const [showDealModal, setShowDealModal] = useState(false);
  const [newDeal, setNewDeal] = useState({ brandName: '', brandWallet: '', type: 'Ad Slot', dealPrice: '', duration: '', notes: '' });

  // Ad moderation handlers
  const handleApproveAd = (ad) => {
    if (!__DEV__ && !wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    Alert.alert(
      'Approve Ad',
      `Approve "${ad.brandName}" ad for ${ad.hubName}?\n\nSlot: ${ad.slotType === 'top' ? 'Top' : ad.slotType === 'lockscreen' ? 'Lockscreen' : 'Bottom'}\nDuration: ${ad.duration} week(s)\nCost: ${ad.totalCost.toLocaleString()} $SKR\n\nThe ad will go live immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setPendingAds(prev => prev.filter(a => a.id !== ad.id));
            // Sync with Firebase backend
            approveAdCreative(ad.id, wallet.publicKey || 'admin')
              .catch(e => logger.warn('[Admin] approveAd backend failed:', e));
            Alert.alert('Ad Approved', `"${ad.brandName}" ad is now live on ${ad.hubName}.`);
          },
        },
      ]
    );
  };

  const handleRejectAd = (ad) => {
    if (!__DEV__ && !wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    Alert.alert(
      'Reject Ad',
      `Reject "${ad.brandName}" ad?\n\nYou will need to manually refund ${ad.totalCost.toLocaleString()} $SKR to wallet:\n${ad.brandWallet}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Note Refund',
          style: 'destructive',
          onPress: async () => {
            setPendingAds(prev => prev.filter(a => a.id !== ad.id));
            // Sync with Firebase backend
            rejectAdCreative(ad.id, wallet.publicKey || 'admin', 'Rejected by admin — refund required')
              .catch(e => logger.warn('[Admin] rejectAd backend failed:', e));
            Alert.alert(
              'Ad Rejected',
              `Ad rejected.\n\nRefund required:\nWallet: ${ad.brandWallet}\nAmount: ${ad.totalCost.toLocaleString()} $SKR\n\nPlease process the refund manually.`
            );
          },
        },
      ]
    );
  };

  const handleFlagSpam = (ad) => {
    if (!__DEV__ && !wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    Alert.alert(
      'Flag as Spam',
      `Flag "${ad.brandName}" as spam?\n\nFunds (${ad.totalCost.toLocaleString()} $SKR) will be RETAINED.\nThe brand will be notified of the violation.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flag Spam & Retain Funds',
          style: 'destructive',
          onPress: async () => {
            setPendingAds(prev => prev.filter(a => a.id !== ad.id));
            // Sync with Firebase backend
            rejectAdCreative(ad.id, wallet.publicKey || 'admin', 'Flagged as spam — funds retained')
              .catch(e => logger.warn('[Admin] flagSpam backend failed:', e));
            Alert.alert(
              'Flagged as Spam',
              `"${ad.brandName}" flagged as spam.\nFunds retained: ${ad.totalCost.toLocaleString()} $SKR\nBrand wallet: ${ad.brandWallet}`
            );
          },
        },
      ]
    );
  };

  // Hub handlers — connected to Zustand store
  const handleApproveHub = (hubId, hubName) => {
    if (!__DEV__ && !wallet.connected) {
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

  const handleSuspendHub = (hubId, hubName) => {
    if (!__DEV__ && !wallet.connected) {
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

  const handleSendGlobalNotification = () => {
    if (!__DEV__ && !wallet.connected) {
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
            // Send via Firebase Cloud Function → FCM push to ALL users
            sendGlobalNotification(globalNotifTitle, globalNotifMessage, wallet.publicKey || 'admin')
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
    const stats = STATS_DATA[statsPeriod];
    const pendingAdCount = pendingAds.length;
    const unreadMessages = 3; // mock

    return (
      <ScrollView className="px-6 py-4">
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
                <Text className="text-primary text-xs font-bold">{ad.totalCost.toLocaleString()} $SKR</Text>
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
                <Text className="text-text font-semibold text-xs">{ad.slotType === 'top' ? 'Top (390x120)' : ad.slotType === 'lockscreen' ? 'Lockscreen (1080x1920)' : 'Bottom (390x100)'}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Duration</Text>
                <Text className="text-text font-semibold text-xs">{ad.duration} week(s)</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-xs">Submitted</Text>
                <Text className="text-text font-semibold text-xs">{ad.submittedDate}</Text>
              </View>
            </View>

            {/* URLs */}
            <View className="bg-background-secondary rounded-xl p-3 mb-3">
              <Text className="text-text-secondary text-xs mb-1">Image URL:</Text>
              <Text className="text-primary text-xs mb-2" numberOfLines={2}>{ad.imageUrl}</Text>
              <Text className="text-text-secondary text-xs mb-1">Landing URL:</Text>
              <TouchableOpacity onPress={() => Linking.openURL(ad.landingUrl).catch(() => {})}>
                <Text className="text-primary text-xs underline" numberOfLines={1}>{ad.landingUrl}</Text>
              </TouchableOpacity>
            </View>

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
  // RENDER: Top 100
  // ============================================
  const renderTop100 = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>
      <Text className="text-text font-black text-2xl mb-4">Top 100</Text>
      {MOCK_TOP_100.map((entry) => {
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
  const renderHubsManagement = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity onPress={() => setActiveSection('overview')} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>
      <Text className="text-text font-black text-2xl mb-4">Manage Hubs</Text>
      <Text className="text-text font-semibold mb-3">Pending Approval</Text>
      {pendingHubs.map((hub) => (
        <View key={hub.id} className="bg-background-card rounded-xl p-4 mb-3 border border-border">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-text font-bold text-lg">{hub.name}</Text>
            <View className="bg-primary/20 rounded-full px-3 py-1">
              <Text className="text-primary text-xs font-bold">{hub.status}</Text>
            </View>
          </View>
          <Text className="text-text-secondary text-sm mb-1">Creator: {hub.creator}</Text>
          <Text className="text-text-secondary text-sm mb-3">Created: {hub.createdDate}</Text>
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
              onPress={() => handleSuspendHub(hub.id, hub.name)}
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
    </ScrollView>
  );

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
          className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
        />
        <Text className="text-text font-semibold mb-2">Message</Text>
        <TextInput
          value={globalNotifMessage} onChangeText={setGlobalNotifMessage}
          placeholder="Notification message..." placeholderTextColor="#666"
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
      `Change "${PRICE_LABELS[key].label}" from ${prices[key]} to ${newValue} $SKR?${isOnChainPrice && !__DEV__ ? '\n\nThis will update the on-chain PlatformConfig.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            if (!__DEV__ && isOnChainPrice) {
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
              Alert.alert('Price Updated', `${PRICE_LABELS[key].label} is now ${newValue} $SKR.${__DEV__ ? '\n\n(Dev mode: local update only)' : ''}`);
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
    setCustomDeals(prev => [...prev, deal]);
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
            setCustomDeals(prev => prev.filter(d => d.id !== deal.id));
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
                <Text className="text-success text-xs font-bold">{deal.status.toUpperCase()}</Text>
              </View>
            </View>

            <View className="bg-background-secondary rounded-lg p-3 mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Type</Text>
                <Text className="text-text font-semibold text-xs">{deal.type}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Standard Price</Text>
                <Text className="text-text-secondary text-xs line-through">{deal.originalPrice.toLocaleString()} $SKR</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Deal Price</Text>
                <Text className="text-success font-bold text-xs">{deal.dealPrice.toLocaleString()} $SKR</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-text-secondary text-xs">Duration</Text>
                <Text className="text-text font-semibold text-xs">{deal.duration}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-xs">Discount</Text>
                <Text className="text-success font-bold text-xs">
                  -{Math.round((1 - deal.dealPrice / deal.originalPrice) * 100)}%
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
      {/* Header */}
      <View className="p-6 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        </TouchableOpacity>
        <View>
          <Text className="text-text font-black text-3xl">Admin</Text>
          <Text className="text-text-secondary text-sm">Platform Management</Text>
        </View>
      </View>

      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'adModeration' && renderAdModeration()}
      {activeSection === 'top100' && renderTop100()}
      {activeSection === 'hubs' && renderHubsManagement()}
      {activeSection === 'globalNotif' && renderGlobalNotification()}
      {activeSection === 'pricing' && renderPricingManagement()}
      {activeSection === 'deals' && renderCustomDeals()}

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
