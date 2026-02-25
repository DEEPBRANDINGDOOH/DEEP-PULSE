import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';

export default function HubDashboardScreen({ navigation, route }) {
  const hubName = route.params?.hubName || 'My Hub';
  const { wallet } = useAppStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordChannel, setDiscordChannel] = useState('');

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
            onPress={() => navigation.navigate('AdSlots')}
            className="bg-primary/10 rounded-xl p-4 mb-3 flex-row items-center justify-between border border-primary/30"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="phone-portrait" size={24} color="#FF9F66" />
              <View className="ml-3 flex-1">
                <Text className="text-text font-semibold text-base">Lockscreen Ads</Text>
                <Text className="text-text-secondary text-xs">Premium full-screen overlay - 2,000 $SKR/week</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="bg-primary/20 rounded-full px-2 py-0.5 mr-2">
                <Text className="text-primary text-xs font-bold">NEW</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF9F66" />
            </View>
          </TouchableOpacity>

          {/* Discord Integration */}
          <Text className="text-text font-bold text-xl mb-4 mt-2">Integrations</Text>

          <View className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-indigo-500/20 items-center justify-center">
                <Ionicons name="logo-discord" size={22} color="#5865F2" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-text font-bold text-base">Connect Discord</Text>
                <Text className="text-text-secondary text-xs">
                  Auto-forward your Discord announcements to hub subscribers
                </Text>
              </View>
              {discordConnected && (
                <View className="bg-green-500/20 rounded-full px-2 py-1">
                  <Text className="text-green-400 text-xs font-bold">LIVE</Text>
                </View>
              )}
            </View>

            {!discordConnected ? (
              <>
                <Text className="text-text-secondary text-xs mb-2">
                  Connect your Discord server's <Text className="text-text font-bold">#major-announcements</Text> channel. Only important news from this channel will be forwarded as push notifications to your hub subscribers.
                </Text>
                <TextInput
                  value={discordWebhook}
                  onChangeText={setDiscordWebhook}
                  placeholder="https://discord.com/api/webhooks/..."
                  placeholderTextColor="#666"
                  className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-3 border border-border text-xs"
                  autoCapitalize="none"
                />
                <TextInput
                  value={discordChannel}
                  onChangeText={setDiscordChannel}
                  placeholder="#major-announcements"
                  placeholderTextColor="#666"
                  className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-3 border border-border"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="bg-indigo-600 rounded-xl py-3"
                  onPress={() => {
                    if (!discordWebhook.trim() || !discordWebhook.includes('discord.com/api/webhooks')) {
                      Alert.alert('Invalid Webhook', 'Please paste a valid Discord webhook URL.\n\nTo get one: Discord Server Settings → Integrations → Webhooks → New Webhook → Copy URL');
                      return;
                    }
                    Alert.alert(
                      'Connect Discord',
                      `Connect ${discordChannel || '#major-announcements'} to "${hubName}"?\n\nOnly major announcements from this channel will be forwarded as push notifications to your ${stats.subscribers.toLocaleString()} subscribers.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Connect', onPress: () => {
                          setDiscordConnected(true);
                          Alert.alert('Connected!', `Discord → ${hubName} pipeline is now live.\n\nYour subscribers will receive push notifications for major announcements from ${discordChannel || '#major-announcements'}.`);
                        }},
                      ]
                    );
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="logo-discord" size={18} color="#fff" />
                    <Text className="text-white font-bold ml-2">Connect Channel</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <View>
                <View className="flex-row items-center bg-green-500/10 rounded-xl p-3 mb-3">
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text className="text-green-400 font-semibold ml-2 flex-1">
                    {discordChannel || 'Discord'} → {hubName} is live
                  </Text>
                </View>
                <Text className="text-text-secondary text-xs mb-3">
                  Major announcements from {discordChannel || '#major-announcements'} are automatically forwarded as push notifications to your {stats.subscribers.toLocaleString()} subscribers.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Disconnect Discord', 'Stop forwarding Discord messages to this hub?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Disconnect', style: 'destructive', onPress: () => {
                        setDiscordConnected(false);
                        setDiscordWebhook('');
                        setDiscordChannel('');
                      }},
                    ]);
                  }}
                  className="bg-red-500/10 rounded-xl py-2 border border-red-500/30"
                >
                  <Text className="text-red-400 font-semibold text-center text-sm">Disconnect</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

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
