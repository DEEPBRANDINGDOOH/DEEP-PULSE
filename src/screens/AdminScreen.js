import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTierFromScore, PRICING } from '../config/constants';
import { useAppStore } from '../store/appStore';

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

const MOCK_PENDING_HUBS = [
  {
    id: '1', name: 'Crypto Traders', creator: '4mL...7Np',
    subscribers: 0, status: 'PENDING', createdDate: 'Feb 08, 2026',
  },
  {
    id: '2', name: 'Solana Devs', creator: '9xT...2Qw',
    subscribers: 0, status: 'PENDING', createdDate: 'Feb 09, 2026',
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
  const { wallet } = useAppStore();
  const [activeSection, setActiveSection] = useState('overview');
  const [globalNotifTitle, setGlobalNotifTitle] = useState('');
  const [globalNotifMessage, setGlobalNotifMessage] = useState('');
  const [pendingAds, setPendingAds] = useState(MOCK_PENDING_ADS);

  // Stats state
  const [statsPeriod, setStatsPeriod] = useState('30d');
  const [statsTab, setStatsTab] = useState('global');

  // Ad moderation handlers
  const handleApproveAd = (ad) => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    Alert.alert(
      'Approve Ad',
      `Approve "${ad.brandName}" ad for ${ad.hubName}?\n\nSlot: ${ad.slotType === 'top' ? 'Top' : 'Bottom'}\nDuration: ${ad.duration} week(s)\nCost: ${ad.totalCost.toLocaleString()} $SKR\n\nThe ad will go live immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            setPendingAds(prev => prev.filter(a => a.id !== ad.id));
            Alert.alert('Ad Approved', `"${ad.brandName}" ad is now live on ${ad.hubName}.`);
          },
        },
      ]
    );
  };

  const handleRejectAd = (ad) => {
    if (!wallet.connected) {
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
          onPress: () => {
            setPendingAds(prev => prev.filter(a => a.id !== ad.id));
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
    if (!wallet.connected) {
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
          onPress: () => {
            setPendingAds(prev => prev.filter(a => a.id !== ad.id));
            Alert.alert(
              'Flagged as Spam',
              `"${ad.brandName}" flagged as spam.\nFunds retained: ${ad.totalCost.toLocaleString()} $SKR\nBrand wallet: ${ad.brandWallet}`
            );
          },
        },
      ]
    );
  };

  // Hub handlers
  const handleApproveHub = (hubId, hubName) => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet to approve hubs.');
      return;
    }
    Alert.alert('Approve Hub', `Approve "${hubName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => console.log('Approved hub:', hubId) },
    ]);
  };

  const handleSuspendHub = (hubId, hubName) => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet.');
      return;
    }
    Alert.alert('Suspend Hub', `Suspend "${hubName}" for non-payment?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => console.log('Suspended:', hubId) },
    ]);
  };

  const handleSendGlobalNotification = () => {
    if (!wallet.connected) {
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
          onPress: () => {
            Alert.alert('Sent!', 'Global notification sent to all users.');
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
            <View className="bg-primary rounded-full w-6 h-6 items-center justify-center mr-2">
              <Text className="text-white text-xs font-bold">{MOCK_PENDING_HUBS.length}</Text>
            </View>
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
                <Text className="text-text font-semibold text-xs">{ad.slotType === 'top' ? 'Top (390x120)' : 'Bottom (390x100)'}</Text>
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
      {MOCK_PENDING_HUBS.map((hub) => (
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
