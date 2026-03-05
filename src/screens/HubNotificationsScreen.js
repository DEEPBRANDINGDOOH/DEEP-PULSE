import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HubIcon from '../components/HubIcon';
import { useAppStore } from '../store/appStore';
import { USE_DEVNET } from '../config/constants';

// Hub notifications are fetched from Firebase — no more hardcoded mock data
const MOCK_HUB_NOTIFICATIONS = {};

export default function HubNotificationsScreen({ navigation, route }) {
  const hubName = route.params?.hubName || 'Hub';
  const hubIcon = route.params?.hubIcon || 'apps';
  const hubLogoUrl = route.params?.hubLogoUrl || null;
  const subscribers = route.params?.subscribers || 0;
  const { wallet, getHubFeedbacks } = useAppStore();
  const storeNotifications = useAppStore((state) => state.hubNotifications[hubName] || []);

  // Merge mock notifications + store notifications (store first = newest)
  const notifications = [...storeNotifications, ...(MOCK_HUB_NOTIFICATIONS[hubName] || [])];

  const handleNotificationPress = (notif) => {
    navigation.navigate('NotificationDetail', {
      notification: notif,
    });
  };

  const handleSendFeedback = (notif) => {
    if (!USE_DEVNET && !wallet?.connected) {
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
          <View className="mr-4">
            <HubIcon icon={hubIcon} logoUrl={hubLogoUrl} size={56} iconSize={28} />
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
                <Text className="text-text-secondary text-xs">{typeof notif.timestamp === 'object' ? String(notif.timestamp) : notif.timestamp}</Text>
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
                      <Text className="text-primary font-bold" style={{ fontSize: 9 }}>
                        {(() => { const count = getHubFeedbacks(notif.hubName || hubName).length; return count > 0 ? count : '300'; })()}
                      </Text>
                    </View>
                    {getHubFeedbacks(notif.hubName || hubName).length > 0 && (
                      <View className="ml-1 bg-yellow-500/20 rounded-md px-1.5 py-0.5">
                        <Ionicons name="shield-checkmark" size={10} color="#EAB308" />
                      </View>
                    )}
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
