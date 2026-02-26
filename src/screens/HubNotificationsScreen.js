import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';

const MOCK_HUB_NOTIFICATIONS = {
  'Solana Gaming': [
    {
      id: 'hn1', title: 'New Game Launch Tomorrow!', hubName: 'Solana Gaming', hubIcon: 'game-controller',
      message: 'Get ready for the biggest game launch of the year on Solana. Exclusive NFT rewards for early adopters. Be among the first to play and earn!',
      fullMessage: 'Get ready for the biggest game launch of the year on Solana. Exclusive NFT rewards for early adopters. Be among the first to play and earn!\n\nThe game features a unique play-to-earn model with $SKR token integration. Top players will receive legendary NFTs and governance tokens.\n\nLaunch time: February 23, 2026 at 12:00 PM UTC\nPlatform: Solana Mobile (Seeker compatible)\nRewards: 10,000 $SKR pool for first 500 players',
      link: 'https://solanagaming.io/launch',
      timestamp: '2 hours ago', reactions: 234, comments: 56, isNew: true,
    },
    {
      id: 'hn2', title: 'Weekly Tournament Results', hubName: 'Solana Gaming', hubIcon: 'game-controller',
      message: 'Congratulations to the top 10 players! Check your rewards.',
      fullMessage: 'Congratulations to the top 10 players of this week\'s tournament!\n\n1st Place: 5,000 $SKR + Legendary NFT\n2nd Place: 3,000 $SKR + Epic NFT\n3rd Place: 1,500 $SKR + Rare NFT\n\nAll participants received at least 100 $SKR for playing. Rewards have been distributed to your wallets.\n\nNext tournament starts Monday at 8:00 AM UTC!',
      link: null,
      timestamp: '1 day ago', reactions: 189, comments: 34, isNew: false,
    },
    {
      id: 'hn3', title: 'Server Maintenance Notice', hubName: 'Solana Gaming', hubIcon: 'game-controller',
      message: 'Scheduled maintenance on Feb 24, 2:00-4:00 AM UTC.',
      fullMessage: 'We will be performing scheduled maintenance to improve server performance and deploy new features.\n\nDate: February 24, 2026\nTime: 2:00 AM - 4:00 AM UTC\nExpected downtime: ~2 hours\n\nDuring this time, the game servers will be temporarily unavailable. Your progress and assets are safe.\n\nNew features being deployed:\n- Improved matchmaking\n- New weapon skins\n- Bug fixes for mobile controls',
      link: null,
      timestamp: '2 days ago', reactions: 67, comments: 12, isNew: false,
    },
  ],
  'NFT Artists': [
    {
      id: 'hn4', title: 'Artist Spotlight: @solartist', hubName: 'NFT Artists', hubIcon: 'color-palette',
      message: '@solartist drops exclusive collection tomorrow at 12PM UTC',
      fullMessage: 'This week\'s featured artist is @solartist, known for their stunning generative art pieces.\n\nCollection: "Solar Flares"\nMint Date: Tomorrow at 12:00 PM UTC\nSupply: 500 unique pieces\nMint Price: 2 SOL\n\nEach piece is algorithmically generated using real solar data from NASA. The collection explores the intersection of science and art.\n\nWhitelist is now open for DEEP Pulse subscribers!',
      link: 'https://magiceden.io/drops/solar-flares',
      timestamp: '5 hours ago', reactions: 156, comments: 23, isNew: true,
    },
  ],
  'DeFi Alerts': [
    {
      id: 'hn5', title: 'New Yield Farm Launched', hubName: 'DeFi Alerts', hubIcon: 'trending-up',
      message: 'Jupiter launches new LP rewards program with 50% APY',
      fullMessage: 'Jupiter has launched a new liquidity provision rewards program offering up to 50% APY on selected pairs.\n\nFeatured Pairs:\n- SOL/USDC: 50% APY\n- JUP/SOL: 35% APY\n- BONK/USDC: 28% APY\n\nRewards are paid in JUP tokens and are claimable weekly. The program runs for 3 months starting today.\n\nNote: APY rates are variable and subject to change based on total liquidity deposited. Always DYOR before investing.',
      link: 'https://jup.ag/earn',
      timestamp: '1 day ago', reactions: 412, comments: 89, isNew: false,
    },
  ],
};

export default function HubNotificationsScreen({ navigation, route }) {
  const hubName = route.params?.hubName || 'Hub';
  const hubIcon = route.params?.hubIcon || 'apps';
  const subscribers = route.params?.subscribers || 0;
  const { wallet } = useAppStore();
  const storeNotifications = useAppStore((state) => state.hubNotifications[hubName] || []);

  // Merge mock notifications + store notifications (store first = newest)
  const notifications = [...storeNotifications, ...(MOCK_HUB_NOTIFICATIONS[hubName] || [])];

  const handleNotificationPress = (notif) => {
    navigation.navigate('NotificationDetail', {
      notification: notif,
    });
  };

  const handleSendFeedback = (notif) => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to send feedback.\n\nA 300 $SKR deposit is required.');
      return;
    }
    navigation.navigate('NotificationDetail', {
      notification: notif,
      openFeedback: true,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-6 pb-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        </TouchableOpacity>
        <View className="flex-row items-center mb-2">
          <View className="w-14 h-14 rounded-full bg-primary/20 items-center justify-center mr-4">
            <Ionicons name={hubIcon} size={28} color="#FF9F66" />
          </View>
          <View className="flex-1">
            <Text className="text-text font-black text-2xl">{hubName}</Text>
            <Text className="text-text-secondary text-sm">{subscribers.toLocaleString()} subscribers</Text>
          </View>
        </View>
      </View>

      <ScrollView className="px-6">
        {notifications.length === 0 ? (
          <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
            <Ionicons name="notifications-off-outline" size={48} color="#666" />
            <Text className="text-text-secondary text-base mt-4 text-center">
              No notifications from this hub yet
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              onPress={() => handleNotificationPress(notif)}
              className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
              activeOpacity={0.7}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-text-secondary text-xs">{notif.timestamp}</Text>
                {notif.isNew && (
                  <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: 'rgba(255,159,102,0.2)' }}>
                    <Text className="text-primary font-black" style={{ fontSize: 9, letterSpacing: 1 }}>NEW</Text>
                  </View>
                )}
              </View>

              {/* Content */}
              <Text className="text-text font-bold text-base mb-2">{notif.title}</Text>
              <Text className="text-text-secondary text-sm mb-4 leading-5" numberOfLines={2}>
                {notif.message}
              </Text>

              {/* Link indicator */}
              {notif.link && (
                <View className="flex-row items-center mb-3 bg-primary/10 rounded-lg px-3 py-2">
                  <Ionicons name="link" size={14} color="#FF9F66" />
                  <Text className="text-primary text-xs ml-2 flex-1" numberOfLines={1}>{notif.link}</Text>
                  <Ionicons name="open-outline" size={14} color="#FF9F66" />
                </View>
              )}

              {/* Stats */}
              <View className="flex-row items-center mb-3">
                <View className="flex-row items-center bg-background-secondary rounded-lg px-3 py-1.5 mr-3">
                  <Ionicons name="flame" size={14} color="#FF9F66" />
                  <Text className="text-text font-semibold text-xs ml-1.5">{notif.reactions}</Text>
                </View>
                <View className="flex-row items-center bg-background-secondary rounded-lg px-3 py-1.5">
                  <Ionicons name="chatbubble" size={14} color="#9898a0" />
                  <Text className="text-text font-semibold text-xs ml-1.5">{notif.comments}</Text>
                </View>
              </View>

              {/* Actions */}
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => handleNotificationPress(notif)}
                  className="flex-1 bg-primary/15 rounded-xl py-2.5 mr-2"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="expand" size={14} color="#FF9F66" />
                    <Text className="text-primary font-semibold text-sm ml-1">Read More</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSendFeedback(notif)}
                  className="flex-1 bg-primary/15 rounded-xl py-2.5 ml-2"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="chatbox" size={14} color="#FF9F66" />
                    <Text className="text-primary font-semibold text-sm ml-1">Feedback</Text>
                    <View className="ml-1 bg-primary/20 rounded-md px-1.5 py-0.5">
                      <Text className="text-primary font-bold" style={{ fontSize: 9 }}>300</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
