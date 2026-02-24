import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';

export default function HubDashboardScreen({ navigation, route }) {
  const hubName = route.params?.hubName || 'My Hub';
  const { wallet } = useAppStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const stats = {
    sent: 342,
    openRate: 87,
    clickRate: 62,
    subscribers: 12542,
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView>
        {/* Header */}
        <View className="p-6 pb-4">
          <Text className="text-text font-black text-3xl mb-2">{hubName}</Text>
          <Text className="text-text-secondary text-base">
            {stats.subscribers.toLocaleString()} subscribers
          </Text>
        </View>

        {/* Stats Cards */}
        <View className="flex-row flex-wrap px-6 mb-6">
          <View className="w-1/3 pr-2 mb-3">
            <View className="bg-background-card rounded-xl p-4 border border-border items-center">
              <Text className="text-text font-black text-2xl mb-1">{stats.sent}</Text>
              <Text className="text-text-secondary text-xs text-center">Sent</Text>
            </View>
          </View>
          <View className="w-1/3 px-1 mb-3">
            <View className="bg-background-card rounded-xl p-4 border border-border items-center">
              <Text className="text-text font-black text-2xl mb-1">{stats.openRate}%</Text>
              <Text className="text-text-secondary text-xs text-center">Open</Text>
            </View>
          </View>
          <View className="w-1/3 pl-2 mb-3">
            <View className="bg-background-card rounded-xl p-4 border border-border items-center">
              <Text className="text-text font-black text-2xl mb-1">{stats.clickRate}%</Text>
              <Text className="text-text-secondary text-xs text-center">Click</Text>
            </View>
          </View>
        </View>

        {/* Send Notification Form */}
        <View className="px-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="send" size={20} color="#FF9F66" />
            <Text className="text-text font-bold text-xl ml-2">Send Notification</Text>
          </View>

          <View className="bg-background-card rounded-2xl p-5 mb-6 border border-border">
            <Text className="text-text font-semibold mb-2">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Notification title..."
              placeholderTextColor="#666"
              className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
            />

            <Text className="text-text font-semibold mb-2">Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Notification message..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 h-32 border border-border"
              textAlignVertical="top"
            />

            <TouchableOpacity
              className="bg-primary rounded-xl py-4"
              onPress={() => {
                if (!wallet.connected) {
                  Alert.alert('Wallet Required', 'Please connect your wallet to manage your hub and send notifications.');
                  return;
                }
                if (!title.trim() || !message.trim()) {
                  Alert.alert('Error', 'Please fill in both title and message.');
                  return;
                }
                Alert.alert('Send Notification', `Send "${title}" to ${stats.subscribers.toLocaleString()} subscribers?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send', onPress: () => {
                    Alert.alert('Sent!', 'Notification sent to all subscribers.');
                    setTitle('');
                    setMessage('');
                  }},
                ]);
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="send" size={18} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">
                  Send to {stats.subscribers.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <Text className="text-text font-bold text-xl mb-4">Quick Actions</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('AdminMessages', { fromBrand: true, hubName: hubName })}
            className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons name="chatbubbles" size={24} color="#FF9F66" />
              <Text className="text-text font-semibold text-base ml-3">Messages from Admin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('BrandModeration')}
            className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={24} color="#FF9F66" />
              <Text className="text-text font-semibold text-base ml-3">Moderation</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AdSlots')}
            className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons name="megaphone" size={24} color="#FF9F66" />
              <Text className="text-text font-semibold text-base ml-3">Manage Ad Slots</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Alert.alert('Billing', `Current subscription: 2,000 $SKR/month\nNext renewal in 23 days`, [
              { text: 'OK' },
            ])}
            className="bg-background-card rounded-xl p-4 mb-6 flex-row items-center justify-between border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons name="card" size={24} color="#FF9F66" />
              <Text className="text-text font-semibold text-base ml-3">Billing</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-text-secondary text-sm mr-2">2,000 $SKR/month</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
