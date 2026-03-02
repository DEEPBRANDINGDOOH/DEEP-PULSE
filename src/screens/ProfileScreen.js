import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Clipboard, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HubIcon from '../components/HubIcon';
import { SOLANA_CONFIG, getTierFromScore, isAdmin, USE_DEVNET } from '../config/constants';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';
import { setWalletState, getWalletPublicKey, initUserScore } from '../services/transactionHelper';
import { programService } from '../services/programService';

// Leaderboard data — fetched from Firebase in production (empty by default)
const MOCK_LEADERBOARD = [];

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
  const setWallet = useAppStore((state) => state.setWallet);
  const storeWallet = useAppStore((state) => state.wallet);
  const subscribedProjects = useAppStore((state) => state.subscribedProjects);
  const storeHubs = useAppStore((state) => state.hubs);
  const pendingHubs = useAppStore((state) => state.pendingHubs);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [notifMuted, setNotifMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Use Zustand wallet state for reactive UI (getWalletPublicKey is non-reactive module variable)
  const connectedPubkey = storeWallet?.connected ? storeWallet.publicKey : null;
  const walletDisplay = connectedPubkey ? formatWallet(connectedPubkey) : 'Not connected';
  const fullWalletAddress = connectedPubkey ? connectedPubkey.toString() : '';

  // Get hubs created by this user only (pending + active)
  // Production: strict wallet match; Dev: show all for demo
  const myCreatedHubs = [...pendingHubs, ...storeHubs].filter(h => {
    if (!h.creator) return false;
    if (USE_DEVNET) return true;
    return fullWalletAddress && h.creator === fullWalletAddress;
  });

  // Dynamic DEEP Score from Zustand store
  const storeScore = useAppStore((state) => state.userScore);
  const storeStreak = useAppStore((state) => state.userStreak);
  const storeBalance = useAppStore((state) => state.userBalance ?? 0);

  const user = {
    wallet: walletDisplay,
    balance: storeBalance,
    subscriptions: subscribedProjects.length || 0,
    score: storeScore > 0 ? storeScore : 0,
    streakDays: storeStreak || 0,
    notifications: 0,
  };
  const tier = getTierFromScore(user.score);

  const handleCopyWallet = () => {
    Clipboard.setString(fullWalletAddress);
    Alert.alert('Copied!', `Wallet address copied to clipboard.`);
  };

  const hasGenesisToken = useAppStore((state) => state.hasGenesisToken);

  const renderProfileView = () => (
    <ScrollView className="px-6 py-4">
      {/* Wallet Card */}
      <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-text-secondary text-sm">Wallet</Text>
              {hasGenesisToken && (
                <View className="ml-2 flex-row items-center bg-yellow-500/20 rounded-full px-2 py-0.5">
                  <Ionicons name="shield-checkmark" size={12} color="#EAB308" />
                  <Text style={{ fontSize: 10, color: '#EAB308', fontWeight: '800', marginLeft: 3 }}>SEEKER VERIFIED</Text>
                </View>
              )}
            </View>
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

        {/* Seeker Bonus */}
        {hasGenesisToken && (
          <View className="flex-row items-center mb-3 bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
            <Ionicons name="diamond" size={16} color="#EAB308" />
            <Text className="text-yellow-400 text-sm font-bold ml-2">+15% Seeker Genesis Bonus</Text>
            <Text className="text-text-secondary text-xs ml-auto">Active</Text>
          </View>
        )}

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
          const network = USE_DEVNET ? '?cluster=devnet' : '';
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

      {/* Connect or Disconnect Wallet — conditional based on wallet state */}
      {storeWallet?.connected ? (
        <TouchableOpacity
          className="bg-error/20 rounded-xl p-4 mb-6 flex-row items-center justify-center border border-error"
          onPress={() => {
            Alert.alert('Disconnect Wallet', 'Are you sure you want to disconnect your wallet?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: async () => {
                const authToken = useAppStore.getState().wallet?.authToken;
                clearWallet();
                setWalletState(null, null);
                try { await walletAdapter.disconnect(authToken); } catch(e) {}
                Alert.alert('Wallet Disconnected', 'Your wallet has been disconnected successfully.');
              }},
            ]);
          }}
        >
          <Ionicons name="log-out" size={20} color="#f44336" />
          <Text className="text-error font-bold ml-2">Disconnect Wallet</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="bg-green-500/20 rounded-xl p-4 mb-6 flex-row items-center justify-center border border-green-500"
          disabled={isConnecting}
          onPress={async () => {
            setIsConnecting(true);
            try {
              const result = await walletAdapter.connect();
              const pubKeyStr = result.publicKey?.toString ? result.publicKey.toString() : result.publicKey;
              setWallet({
                connected: true,
                publicKey: pubKeyStr,
                authToken: result.authToken,
              });
              setWalletState(result.publicKey, result.authToken);
              initUserScore().catch(() => {});
              programService.checkGenesisToken(result.publicKey).then((sgt) => {
                useAppStore.getState().setGenesisToken(sgt.hasToken, sgt.mintAddress);
              }).catch(() => {});
              Alert.alert('Wallet Connected', `Connected to ${result.label || 'wallet'}`);
            } catch (error) {
              Alert.alert('Connection Failed', error?.message || 'Could not connect wallet.');
            } finally {
              setIsConnecting(false);
            }
          }}
        >
          <Ionicons name="wallet" size={20} color="#22c55e" />
          <Text style={{ color: '#22c55e', fontWeight: '700', marginLeft: 8 }}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Text>
        </TouchableOpacity>
      )}
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

      {MOCK_LEADERBOARD.length === 0 && (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="trophy-outline" size={48} color="#666" />
          <Text className="text-text-secondary text-base mt-4 text-center">
            No leaderboard data yet
          </Text>
          <Text className="text-text-muted text-xs text-center mt-1">
            Rankings will appear here as users earn DEEP Score
          </Text>
        </View>
      )}

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
