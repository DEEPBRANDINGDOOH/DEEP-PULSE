import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Clipboard, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HubIcon from '../components/HubIcon';
import { MOCK_USER, SOLANA_CONFIG, getTierFromScore, isAdmin } from '../config/constants';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';
import { setWalletState, getWalletPublicKey } from '../services/transactionHelper';

const MOCK_LEADERBOARD = [
  { rank: 1, wallet: '7xK...9Qz', score: 6820, tier: 'LEGEND', boost: 45, talent: 12, feedback: 28, streak: 47 },
  { rank: 2, wallet: '2pQ...mNp', score: 5340, tier: 'LEGEND', boost: 32, talent: 8, feedback: 35, streak: 31 },
  { rank: 3, wallet: '8vN...4Wp', score: 4150, tier: 'DIAMOND', boost: 28, talent: 15, feedback: 18, streak: 22 },
  { rank: 4, wallet: '5tY...2Lm', score: 3200, tier: 'DIAMOND', boost: 18, talent: 10, feedback: 22, streak: 14 },
  { rank: 5, wallet: '3fR...8Kp', score: 1890, tier: 'GOLD', boost: 12, talent: 5, feedback: 15, streak: 9 },
  { rank: 6, wallet: '9mT...3Jx', score: 1750, tier: 'GOLD', boost: 10, talent: 7, feedback: 12, streak: 8 },
  { rank: 7, wallet: '4wB...6Rn', score: 1620, tier: 'GOLD', boost: 9, talent: 6, feedback: 14, streak: 11 },
  { rank: 8, wallet: '6hD...1Ys', score: 1480, tier: 'GOLD', boost: 8, talent: 4, feedback: 11, streak: 7 },
  { rank: 9, wallet: '1kF...5Vq', score: 1310, tier: 'GOLD', boost: 7, talent: 3, feedback: 13, streak: 6 },
  { rank: 10, wallet: '8nG...2Tz', score: 1190, tier: 'GOLD', boost: 6, talent: 5, feedback: 9, streak: 5 },
  { rank: 11, wallet: '3qH...7Wx', score: 980, tier: 'SILVER', boost: 5, talent: 4, feedback: 8, streak: 4 },
  { rank: 12, wallet: '5sJ...4Pu', score: 870, tier: 'SILVER', boost: 4, talent: 3, feedback: 7, streak: 3 },
  { rank: 13, wallet: '2vL...9Nr', score: 760, tier: 'SILVER', boost: 3, talent: 2, feedback: 10, streak: 5 },
  { rank: 14, wallet: '7yM...1Kp', score: 650, tier: 'SILVER', boost: 3, talent: 2, feedback: 6, streak: 2 },
  { rank: 15, wallet: '4bN...8Hm', score: 540, tier: 'SILVER', boost: 2, talent: 1, feedback: 5, streak: 3 },
  { rank: 16, wallet: '9eP...3Fk', score: 430, tier: 'SILVER', boost: 2, talent: 1, feedback: 4, streak: 2 },
  { rank: 17, wallet: '1gQ...6Dj', score: 320, tier: 'SILVER', boost: 1, talent: 1, feedback: 3, streak: 1 },
  { rank: 18, wallet: '6jR...2Bh', score: 250, tier: 'BRONZE', boost: 1, talent: 0, feedback: 2, streak: 1 },
  { rank: 19, wallet: '3lS...5Ag', score: 180, tier: 'BRONZE', boost: 0, talent: 1, feedback: 2, streak: 0 },
  { rank: 20, wallet: '8oT...9Zf', score: 90, tier: 'BRONZE', boost: 0, talent: 0, feedback: 1, streak: 0 },
];

/**
 * Format a public key for display: "7xKL...9Qz"
 */
function formatWallet(pubkey) {
  if (!pubkey) return 'Not connected';
  const str = typeof pubkey === 'string' ? pubkey : pubkey.toString();
  if (str.length <= 10) return str;
  return `${str.slice(0, 4)}...${str.slice(-3)}`;
}

export default function ProfileScreen({ navigation }) {
  const clearWallet = useAppStore((state) => state.clearWallet);
  const storeWallet = useAppStore((state) => state.wallet);
  const subscribedProjects = useAppStore((state) => state.subscribedProjects);
  const storeHubs = useAppStore((state) => state.hubs);
  const pendingHubs = useAppStore((state) => state.pendingHubs);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [notifMuted, setNotifMuted] = useState(false);

  // Get hubs created by this user (pending + active)
  const myCreatedHubs = [...pendingHubs, ...storeHubs].filter(h => h.creator != null);

  // Use real wallet if connected, otherwise fall back to mock
  const connectedPubkey = getWalletPublicKey();
  const walletDisplay = connectedPubkey ? formatWallet(connectedPubkey) : MOCK_USER.wallet;
  const fullWalletAddress = connectedPubkey ? connectedPubkey.toString() : MOCK_USER.wallet;
  const user = {
    ...MOCK_USER,
    wallet: walletDisplay,
    subscriptions: subscribedProjects.length || MOCK_USER.subscriptions,
  };
  const tier = getTierFromScore(user.score);

  const handleCopyWallet = () => {
    Clipboard.setString(fullWalletAddress);
    Alert.alert('Copied!', `Wallet address copied to clipboard.`);
  };

  const renderProfileView = () => (
    <ScrollView className="px-6 py-4">
      {/* Wallet Card */}
      <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-text-secondary text-sm mb-1">Wallet</Text>
            <Text className="text-text font-bold text-lg">{user.wallet}</Text>
          </View>
          <TouchableOpacity onPress={handleCopyWallet}>
            <Ionicons name="copy-outline" size={24} color="#FF9F66" />
          </TouchableOpacity>
        </View>

        <View className="border-t border-border my-4" />

        <View>
          <Text className="text-text-secondary text-sm mb-1">Balance</Text>
          <Text className="text-primary font-black text-3xl">
            {user.balance.toLocaleString()} $SKR
          </Text>
        </View>
      </View>

      {/* DEEP Score Card */}
      <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-text-secondary text-sm mb-1">DEEP Score</Text>
            <View className="flex-row items-center">
              <Text className="text-text font-black text-3xl mr-2">{user.score.toLocaleString()}</Text>
              <Ionicons name={tier.icon} size={24} color={tier.color} />
            </View>
          </View>
          <View className="bg-primary/20 rounded-full px-4 py-2">
            <Text className="text-primary font-bold">{tier.name}</Text>
          </View>
        </View>

        {/* Streak */}
        <View className="flex-row items-center mb-4 bg-background/50 rounded-xl p-3">
          <Ionicons name="flame" size={20} color="#FF6B35" />
          <Text className="text-text font-semibold ml-2">{user.streakDays || 0} days</Text>
          <Text className="text-text-secondary text-xs ml-2">active streak</Text>
          {(user.streakDays || 0) >= 3 && (
            <View className="ml-auto bg-green-500/20 rounded-full px-2 py-1">
              <Text className="text-green-400 text-xs font-bold">
                {user.streakDays >= 30 ? '+40%' : user.streakDays >= 14 ? '+25%' : user.streakDays >= 7 ? '+15%' : '+10%'} bonus
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setShowLeaderboard(true)}
          className="bg-primary/20 rounded-xl py-3 border border-primary"
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="trophy" size={18} color="#FF9F66" />
            <Text className="text-primary font-bold ml-2">View Leaderboard</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Swipe-to-Earn Access */}
      <TouchableOpacity
        onPress={() => navigation.navigate('SwipeEarn')}
        className="bg-gradient-to-r from-primary/20 to-yellow-500/20 bg-background-card rounded-2xl p-4 mb-4 flex-row items-center justify-between border border-primary/50"
      >
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
            <Ionicons name="swap-horizontal" size={22} color="#FF9F66" />
          </View>
          <View className="flex-1">
            <Text className="text-text font-bold text-sm">Swipe-to-Earn</Text>
            <Text className="text-text-secondary text-xs">Earn points on your lock screen</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#FF9F66" />
      </TouchableOpacity>

      {/* Stats */}
      <View className="flex-row mb-4">
        <View className="flex-1 bg-background-card rounded-2xl p-4 mr-2 border border-border items-center">
          <Text className="text-text font-black text-2xl mb-1">{user.subscriptions}</Text>
          <Text className="text-text-secondary text-xs">Subscribed</Text>
        </View>
        <View className="flex-1 bg-background-card rounded-2xl p-4 ml-2 border border-border items-center">
          <Text className="text-text font-black text-2xl mb-1">{user.notifications}</Text>
          <Text className="text-text-secondary text-xs">Notifications</Text>
        </View>
      </View>

      {/* Settings */}
      <Text className="text-text font-semibold text-lg mb-3">Settings</Text>

      <View
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name={notifMuted ? 'notifications-off' : 'notifications'} size={20} color={notifMuted ? '#666' : '#FF9F66'} />
          <View className="ml-3 flex-1">
            <Text className="text-text font-semibold">Notifications</Text>
            <Text className="text-text-secondary text-xs">
              {notifMuted ? 'All notifications muted' : 'Notifications enabled'}
            </Text>
          </View>
        </View>
        <Switch
          value={!notifMuted}
          onValueChange={(value) => {
            setNotifMuted(!value);
            Alert.alert(
              value ? 'Notifications Enabled' : 'Notifications Muted',
              value
                ? 'You will receive push notifications from your subscribed hubs.'
                : 'All push notifications have been muted. You can re-enable them anytime.'
            );
          }}
          trackColor={{ false: '#444', true: '#FF9F66' }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        onPress={() => {
          const walletAddr = connectedPubkey ? connectedPubkey.toString() : null;
          if (!walletAddr) {
            Alert.alert('Wallet Required', 'Connect your wallet to view transaction history on Solscan.');
            return;
          }
          const programId = SOLANA_CONFIG.PROGRAM_ID;
          const network = __DEV__ ? '?cluster=devnet' : '';
          const url = `https://solscan.io/account/${walletAddr}${network}#defiactivities`;
          Alert.alert(
            'Transaction History',
            'View all your DEEP Pulse transactions on Solscan?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Solscan', onPress: () => Linking.openURL(url) },
            ]
          );
        }}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="receipt" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Transaction History</Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="open-outline" size={16} color="#666" />
          <Ionicons name="chevron-forward" size={20} color="#666" className="ml-1" />
        </View>
      </TouchableOpacity>

      {/* Brand Hub Access */}
      <TouchableOpacity
        onPress={() => navigation.navigate('BrandBoost')}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="storefront" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Create a Hub (Brands)</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      {/* My Created Hubs — shows hub dashboards for hubs this user created */}
      {myCreatedHubs.length > 0 && (
        <View className="mb-3">
          <Text className="text-text font-semibold text-lg mb-3">My Created Hubs</Text>
          {myCreatedHubs.map((hub) => (
            <TouchableOpacity
              key={hub.id}
              onPress={() => navigation.navigate('HubDashboard', {
                hubName: hub.name,
                hubIcon: hub.icon || 'rocket',
                hubLogoUrl: hub.logoUrl || null,
                hubStatus: hub.status || 'ACTIVE',
                subscribers: hub.subscribers || 0,
              })}
              className="bg-background-card rounded-xl p-4 mb-2 flex-row items-center justify-between border border-border"
            >
              <View className="flex-row items-center flex-1">
                <HubIcon hub={hub} size={40} iconSize={20} />
                <View className="ml-3 flex-1">
                  <Text className="text-text font-bold">{hub.name}</Text>
                  <Text className="text-text-secondary text-xs">
                    {(hub.subscribers || 0).toLocaleString()} subscribers
                  </Text>
                </View>
                <View className={`rounded-full px-2 py-1 mr-2 ${
                  hub.status === 'PENDING' ? 'bg-yellow-500/20'
                    : hub.status === 'OVERDUE' ? 'bg-orange-500/20'
                    : hub.status === 'SUSPENDED' ? 'bg-red-500/20'
                    : 'bg-green-500/20'
                }`}>
                  <Text className={`text-xs font-bold ${
                    hub.status === 'PENDING' ? 'text-yellow-400'
                      : hub.status === 'OVERDUE' ? 'text-orange-400'
                      : hub.status === 'SUSPENDED' ? 'text-red-400'
                      : 'text-green-400'
                  }`}>
                    {hub.status || 'ACTIVE'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF9F66" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Admin Access */}
      {isAdmin(fullWalletAddress) && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Admin')}
          className="bg-primary/20 rounded-xl p-4 mb-3 flex-row items-center justify-between border border-primary"
        >
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={20} color="#FF9F66" />
            <Text className="text-primary font-bold ml-3">Admin Dashboard</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FF9F66" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        className="bg-error/20 rounded-xl p-4 mb-6 flex-row items-center justify-center border border-error"
        onPress={() => {
          Alert.alert('Disconnect Wallet', 'Are you sure you want to disconnect your wallet?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disconnect', style: 'destructive', onPress: () => {
              const authToken = useAppStore.getState().wallet?.authToken;
              clearWallet();
              setWalletState(null, null); // Clear transaction helper state
              try { walletAdapter.disconnect(authToken); } catch(e) {}
              navigation.replace('Onboarding');
            }},
          ]);
        }}
      >
        <Ionicons name="log-out" size={20} color="#f44336" />
        <Text className="text-error font-bold ml-2">Disconnect Wallet</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderLeaderboardView = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity
        onPress={() => setShowLeaderboard(false)}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Profile</Text>
      </TouchableOpacity>

      <View className="bg-background-card rounded-2xl p-6 mb-6 border border-border">
        <View className="flex-row items-center mb-2">
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <Text className="text-text font-black text-2xl ml-3">Top 100</Text>
        </View>
        <Text className="text-text-secondary">
          Rankings based on DEEP Score algorithm
        </Text>
      </View>

      {MOCK_LEADERBOARD.map((entry) => {
        const entryTier = getTierFromScore(entry.score);
        return (
          <View
            key={entry.rank}
            className="bg-background-card rounded-2xl p-5 mb-3 border border-border"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    entry.rank === 1
                      ? 'bg-yellow-500/20'
                      : entry.rank === 2
                      ? 'bg-gray-400/20'
                      : entry.rank === 3
                      ? 'bg-orange-500/20'
                      : 'bg-border'
                  }`}
                >
                  <Text className="text-text font-black text-lg">#{entry.rank}</Text>
                </View>
                <View className="ml-3">
                  <Text className="text-text font-bold">{entry.wallet}</Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name={entryTier.icon} size={16} color={entryTier.color} />
                    <Text className="text-text-secondary text-xs ml-1">{entryTier.name}</Text>
                  </View>
                </View>
              </View>
              <Text className="text-primary font-black text-xl">{entry.score}</Text>
            </View>

            <View className="flex-row justify-between">
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
              <View className="items-center">
                <View className="flex-row items-center">
                  <Ionicons name="flame" size={12} color="#FF6B35" />
                  <Text className="text-text font-semibold ml-1">{entry.streak}</Text>
                </View>
                <Text className="text-text-secondary text-xs">Streak</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      {!showLeaderboard && (
        <View className="p-6 pb-4">
          <Text className="text-text font-black text-3xl">Profile</Text>
        </View>
      )}

      {showLeaderboard ? renderLeaderboardView() : renderProfileView()}
    </SafeAreaView>
  );
}
