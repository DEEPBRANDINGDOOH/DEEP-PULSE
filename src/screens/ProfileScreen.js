import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MOCK_USER, getTierFromScore, isAdmin } from '../config/constants';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';
import { setWalletState } from '../services/transactionHelper';

const MOCK_LEADERBOARD = [
  { rank: 1, wallet: '7xK...9Qz', score: 945, tier: 'LEGEND', boost: 12, talent: 5, feedback: 8 },
  { rank: 2, wallet: '2pQ...mNp', score: 887, tier: 'DIAMOND', boost: 8, talent: 4, feedback: 12 },
  { rank: 3, wallet: '8vN...4Wp', score: 832, tier: 'DIAMOND', boost: 10, talent: 3, feedback: 6 },
  { rank: 4, wallet: '5tY...2Lm', score: 776, tier: 'DIAMOND', boost: 6, talent: 6, feedback: 10 },
  { rank: 5, wallet: '3fR...8Kp', score: 723, tier: 'GOLD', boost: 7, talent: 2, feedback: 9 },
];

export default function ProfileScreen({ navigation }) {
  const clearWallet = useAppStore((state) => state.clearWallet);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const user = MOCK_USER;
  const tier = getTierFromScore(user.score);

  const handleCopyWallet = () => {
    Alert.alert('Copied!', `Wallet address ${user.wallet} copied to clipboard.`);
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
              <Text className="text-text font-black text-3xl mr-2">{user.score}</Text>
              <Ionicons name={tier.icon} size={24} color={tier.color} />
            </View>
          </View>
          <View className="bg-primary/20 rounded-full px-4 py-2">
            <Text className="text-primary font-bold">{tier.name}</Text>
          </View>
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
            <Text className="text-text-secondary text-xs">Gagnez des points sur l'écran de verrouillage</Text>
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

      <TouchableOpacity
        onPress={() => Alert.alert('Theme', 'Dark mode is enabled by default. Light mode coming soon!')}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="moon" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Toggle Theme</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Alert.alert('Notifications', 'Push notifications are enabled.\nManage notification preferences for each hub in My Hubs.')}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="notifications" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Notification Settings</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Alert.alert('Transaction History', 'Recent transactions:\n\n- Subscribe to Solana Gaming: FREE\n- Feedback deposit: 300 $SKR\n- DAO contribution: 500 $SKR\n\nFull on-chain history available on Solscan.')}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="receipt" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Transaction History</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
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

      {/* Admin Access */}
      {isAdmin(user.wallet) && (
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
              clearWallet();
              setWalletState(null, null); // Clear transaction helper state
              try { walletAdapter.disconnect(); } catch(e) {}
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
