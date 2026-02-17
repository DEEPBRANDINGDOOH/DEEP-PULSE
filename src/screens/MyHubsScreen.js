import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AdRotation, { AdRotationManager } from '../components/AdRotation';
import { MOCK_ADS } from '../config/constants';

const MOCK_MY_HUBS = [
  {
    id: '1',
    name: 'Solana Gaming',
    icon: '🎮',
    subscribers: 12500,
    unreadCount: 3,
    lastNotification: 'New game launch tomorrow!',
    lastNotificationTime: '2 hours ago',
  },
  {
    id: '2',
    name: 'NFT Artists',
    icon: '💎',
    subscribers: 8200,
    unreadCount: 1,
    lastNotification: 'Artist spotlight: @solartist',
    lastNotificationTime: '5 hours ago',
  },
  {
    id: '3',
    name: 'DeFi Alerts',
    icon: '💰',
    subscribers: 15700,
    unreadCount: 0,
    lastNotification: 'New yield farm launched',
    lastNotificationTime: '1 day ago',
  },
];

export default function MyHubsScreen({ navigation }) {
  const [myHubs, setMyHubs] = useState(MOCK_MY_HUBS);

  const handleAdImpression = (data) => {
    AdRotationManager.trackImpression(data);
  };

  const handleAdClick = (data) => {
    AdRotationManager.trackClick(data);
  };

  const handleHubClick = (hub) => {
    console.log('Open hub:', hub.id);
    // TODO: Navigate to hub notifications
  };

  const handleUnsubscribe = (hubId, hubName) => {
    Alert.alert(
      'Unsubscribe',
      `Are you sure you want to unsubscribe from ${hubName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: () => {
            setMyHubs(myHubs.filter(h => h.id !== hubId));
            console.log('Unsubscribed from:', hubId);
            // TODO: Call API to unsubscribe
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView>
        {/* Header */}
        <View className="p-6 pb-4">
          <Text className="text-text font-black text-3xl mb-2">My Hubs</Text>
          <Text className="text-text-secondary text-base">
            {myHubs.length} subscription{myHubs.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* TOP AD SLOT */}
        <View className="px-6 mb-6">
          <AdRotation
            ads={MOCK_ADS.TOP}
            slotType="top"
            onAdImpression={handleAdImpression}
            onAdClick={handleAdClick}
          />
        </View>

        {/* My Hubs List */}
        <View className="px-6">
          {myHubs.length === 0 ? (
            <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
              <Ionicons name="apps-outline" size={48} color="#666" />
              <Text className="text-text-secondary text-lg mt-4 text-center">
                You're not subscribed to any hubs yet
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Discover')}
                className="mt-4 bg-primary rounded-xl px-6 py-3"
              >
                <Text className="text-white font-bold">Discover Hubs</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myHubs.map((hub) => (
              <TouchableOpacity
                key={hub.id}
                onPress={() => handleHubClick(hub)}
                className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
              >
                {/* Hub Header */}
                <View className="flex-row items-center mb-3">
                  <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center">
                    <Text className="text-3xl">{hub.icon}</Text>
                  </View>
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center">
                      <Text className="text-text font-bold text-lg">{hub.name}</Text>
                      {hub.unreadCount > 0 && (
                        <View className="ml-2 bg-primary rounded-full w-6 h-6 items-center justify-center">
                          <Text className="text-white text-xs font-bold">
                            {hub.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-text-secondary text-sm">
                      {hub.subscribers.toLocaleString()} subscribers
                    </Text>
                  </View>
                </View>

                {/* Last Notification */}
                <View className="bg-background-secondary rounded-xl p-3 mb-3">
                  <Text className="text-text text-sm mb-1">{hub.lastNotification}</Text>
                  <Text className="text-text-secondary text-xs">{hub.lastNotificationTime}</Text>
                </View>

                {/* Actions */}
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => handleHubClick(hub)}
                    className="flex-1 bg-primary/20 rounded-xl py-2 mr-2"
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="notifications" size={16} color="#FF9F66" />
                      <Text className="text-primary font-semibold text-sm ml-1">
                        View All
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleUnsubscribe(hub.id, hub.name)}
                    className="flex-1 bg-error/20 rounded-xl py-2 ml-2"
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="close-circle" size={16} color="#f44336" />
                      <Text className="text-error font-semibold text-sm ml-1">
                        Unsubscribe
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* BOTTOM AD SLOT */}
        <View className="px-6 mt-4 mb-6">
          <AdRotation
            ads={MOCK_ADS.BOTTOM}
            slotType="bottom"
            onAdImpression={handleAdImpression}
            onAdClick={handleAdClick}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
