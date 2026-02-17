import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_USER, getTierFromScore, isAdmin } from '../config/constants';

const MOCK_LEADERBOARD = [
  { rank: 1, wallet: '7xK...9Qz', score: 945, tier: 'LEGEND', boost: 12, talent: 5, feedback: 8 },
  { rank: 2, wallet: '2pQ...mNp', score: 887, tier: 'DIAMOND', boost: 8, talent: 4, feedback: 12 },
  { rank: 3, wallet: '8vN...4Wp', score: 832, tier: 'DIAMOND', boost: 10, talent: 3, feedback: 6 },
  { rank: 4, wallet: '5tY...2Lm', score: 776, tier: 'DIAMOND', boost: 6, talent: 6, feedback: 10 },
  { rank: 5, wallet: '3fR...8Kp', score: 723, tier: 'GOLD', boost: 7, talent: 2, feedback: 9 },
];

export default function ProfileScreen({ navigation }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const user = MOCK_USER;
  const tier = getTierFromScore(user.score);

  const renderProfileView = () => (
    <ScrollView className="px-6 py-4">
      {/* Wallet Card */}
      <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-text-secondary text-sm mb-1">Wallet</Text>
            <Text className="text-text font-bold text-lg">{user.wallet}</Text>
          </View>
          <TouchableOpacity>
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
              <Text className="text-2xl">{tier.icon}</Text>
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

      <TouchableOpacity className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border">
        <View className="flex-row items-center">
          <Ionicons name="moon" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Toggle Theme</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border">
        <View className="flex-row items-center">
          <Ionicons name="notifications" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Notification Settings</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border">
        <View className="flex-row items-center">
          <Ionicons name="receipt" size={20} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Transaction History</Text>
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
            { text: 'Disconnect', style: 'destructive', onPress: () => navigation.replace('Onboarding') },
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
                    <Text className="text-2xl mr-1">{entryTier.icon}</Text>
                    <Text className="text-text-secondary text-xs">{entryTier.name}</Text>
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
