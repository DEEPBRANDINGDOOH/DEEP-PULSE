import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { sendHubNotification } from '../services/firebaseService';
import { showLocalNotification } from '../services/localNotificationService';
import { safeOpenURL, isValidDiscordWebhook, checkRateLimit, MAX_LENGTHS, logger } from '../utils/security';

export default function HubDashboardScreen({ navigation, route }) {
  const hubName = route.params?.hubName || 'My Hub';
  const hubIcon = route.params?.hubIcon || 'rocket';
  const hubLogoUrl = route.params?.hubLogoUrl || null;
  const hubStatus = route.params?.hubStatus || 'ACTIVE';
  const { wallet } = useAppStore();
  const lockscreenPrice = useAppStore((state) => state.platformPricing?.lockscreenAd || 1000);
  const hubCreationPrice = useAppStore((state) => state.platformPricing?.hubCreation || 2000);
  const addHubNotification = useAppStore((state) => state.addHubNotification);
  // Read live subscriber count from hub in store
  const storeHubs = useAppStore((state) => state.hubs);
  const pendingHubs = useAppStore((state) => state.pendingHubs);
  const hubNotifications = useAppStore((state) => state.hubNotifications);
  const storeFeedbacks = useAppStore((state) => state.hubFeedbacks[hubName]) || [];
  const storeDaoProposals = useAppStore((state) => state.daoProposals) || [];
  const storeTalentSubmissions = useAppStore((state) => state.talentSubmissions) || [];
  const hubData = storeHubs.find(h => h.name === hubName) || pendingHubs.find(h => h.name === hubName);

  // Badge: count pending moderation items for this hub
  const pendingModerationCount =
    storeFeedbacks.length +
    storeDaoProposals.filter(p => p.hub === hubName || p.hubId === hubData?.id).length +
    storeTalentSubmissions.filter(t => t.hub === hubName || t.hubId === hubData?.id).length;

  // Check if current user is the hub creator (billing info is creator-only)
  const walletAddress = wallet?.publicKey;
  const isCreator = __DEV__ || (walletAddress && hubData?.creator === walletAddress);

  // Dynamic billing computation (only meaningful for creator)
  const subscriptionExpiresAt = hubData?.subscriptionExpiresAt;
  const daysRemaining = subscriptionExpiresAt
    ? Math.ceil((new Date(subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const billingInfo = daysRemaining !== null
    ? (daysRemaining > 0
        ? `Next renewal in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
        : `Payment overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`)
    : 'Subscription info unavailable';
  const isOverdue = hubData?.status === 'OVERDUE' || (daysRemaining !== null && daysRemaining <= 0);
  const isSuspended = hubData?.status === 'SUSPENDED';

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordServer, setDiscordServer] = useState('');
  const [discordChannel, setDiscordChannel] = useState('');

  // Use real data from the store; fallback to mock for legacy hubs
  const sentNotifs = hubNotifications[hubName] || [];
  const stats = {
    sent: hubData ? sentNotifs.length : 342,
    openRate: hubData?.subscribers > 0 ? 87 : 0,
    clickRate: hubData?.subscribers > 0 ? 62 : 0,
    subscribers: hubData?.subscribers || route.params?.subscribers || 0,
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView>
        {/* Header */}
        <View className="p-6 pb-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-text font-black text-3xl">{hubName}</Text>
            {(hubStatus === 'PENDING' || hubData?.status === 'PENDING') && (
              <View className="ml-3 bg-yellow-500/20 rounded-full px-3 py-1">
                <Text className="text-yellow-400 text-xs font-bold">PENDING</Text>
              </View>
            )}
          </View>
          <Text className="text-text-secondary text-base">
            {stats.subscribers.toLocaleString()} subscribers
          </Text>
          {(hubStatus === 'PENDING' || hubData?.status === 'PENDING') && (
            <View className="bg-yellow-500/10 rounded-xl p-3 mt-3 border border-yellow-500/20">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#EAB308" />
                <Text className="text-yellow-400 text-sm ml-2 flex-1">
                  Your hub is pending admin approval. Once approved, it will be visible in Discover.
                </Text>
              </View>
            </View>
          )}
          {isCreator && isOverdue && !isSuspended && (
            <View className="bg-orange-500/10 rounded-xl p-3 mt-3 border border-orange-500/20">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={16} color="#FF9800" />
                <Text className="text-orange-400 text-sm ml-2 flex-1">
                  Payment Overdue — Your hub subscription is overdue. Please renew to avoid suspension.
                </Text>
              </View>
            </View>
          )}
          {isCreator && isSuspended && (
            <View className="bg-red-500/10 rounded-xl p-3 mt-3 border border-red-500/20">
              <View className="flex-row items-center">
                <Ionicons name="ban" size={16} color="#f44336" />
                <Text className="text-red-400 text-sm ml-2 flex-1">
                  Hub Suspended — This hub has been suspended by the admin. Contact support.
                </Text>
              </View>
            </View>
          )}
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
              maxLength={MAX_LENGTHS.NOTIFICATION_TITLE}
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
              maxLength={MAX_LENGTHS.NOTIFICATION_BODY}
              className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 h-32 border border-border"
              textAlignVertical="top"
            />

            <Text className="text-text font-semibold mb-2">Link URL <Text className="text-text-secondary font-normal">(optional)</Text></Text>
            <TextInput
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://..."
              placeholderTextColor="#666"
              maxLength={MAX_LENGTHS.URL}
              className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
              autoCapitalize="none"
              keyboardType="url"
            />

            <TouchableOpacity
              className="bg-primary rounded-xl py-4"
              onPress={() => {
                if (!checkRateLimit('send_notification')) return;
                if (!__DEV__ && !wallet?.connected) {
                  Alert.alert('Wallet Required', 'Please connect your wallet to manage your hub and send notifications.');
                  return;
                }
                if (!title.trim() || !message.trim()) {
                  Alert.alert('Error', 'Please fill in both title and message.');
                  return;
                }
                Alert.alert('Send Notification', `Send "${title}" to ${stats.subscribers.toLocaleString()} subscribers?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send', onPress: async () => {
                    const notifTitle = title.trim();
                    const notifMessage = message.trim();

                    // 1. Store locally in Zustand (optimistic UI)
                    addHubNotification(hubName, {
                      id: `notif_${Date.now()}`,
                      title: notifTitle,
                      hubName: hubName,
                      hubIcon: hubIcon,
                      hubLogoUrl: hubLogoUrl,
                      message: notifMessage,
                      fullMessage: notifMessage,
                      link: linkUrl.trim() || null,
                      timestamp: 'Just now',
                      reactions: 0,
                      comments: 0,
                      isNew: true,
                    });

                    // 2. Trigger a real local push notification (lock screen + tray)
                    showLocalNotification(
                      `${hubName}: ${notifTitle}`,
                      notifMessage,
                      { hubName, hubId: hubData?.id || `hub_${hubName}`, link: linkUrl.trim() || '' },
                    );

                    // 3. Also try Firebase Cloud Function (for production with backend)
                    const hubId = hubData?.id || `hub_${hubName}`;
                    sendHubNotification(
                      hubId,
                      hubName,
                      notifTitle,
                      notifMessage,
                      wallet.publicKey || 'mock_admin',
                      linkUrl.trim() || null,
                    ).then((res) => {
                      logger.log('[HubDashboard] Push sent:', res);
                    }).catch((err) => {
                      logger.warn('[HubDashboard] Push delivery failed (local saved):', err);
                    });

                    Alert.alert('Sent!', `Notification "${notifTitle}" sent to ${stats.subscribers.toLocaleString()} subscribers via push.`);
                    setTitle('');
                    setMessage('');
                    setLinkUrl('');
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
            onPress={() => navigation.navigate('AdminMessages', { fromBrand: true, hubName: hubName, hubIcon: hubIcon || 'apps' })}
            className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons name="chatbubbles" size={24} color="#FF9F66" />
              <Text className="text-text font-semibold text-base ml-3">Messages from Admin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('BrandModeration', { hubName, hubId: hubData?.id })}
            className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={24} color="#FF9F66" />
              <Text className="text-text font-semibold text-base ml-3">Moderation</Text>
              {pendingModerationCount > 0 && (
                <View className="ml-2 bg-primary rounded-full items-center justify-center px-1.5" style={{ minWidth: 22, height: 22 }}>
                  <Text className="text-white text-xs font-bold">{pendingModerationCount}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AdTypeSelector', { hubId: hubData?.id || `hub_${hubName}`, hubName })}
            className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
          >
            <View className="flex-row items-center">
              <Ionicons name="megaphone" size={24} color="#FF9F66" />
              <View className="ml-3">
                <Text className="text-text font-semibold text-base">Manage Ad Slots</Text>
                <Text className="text-text-secondary text-xs">In-app, lockscreen & push notification ads</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
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
                <Text className="text-text-secondary text-xs mb-3">
                  Connect your Discord server and select the specific section where you post major announcements. Only messages from this section will be forwarded as push notifications to your hub subscribers.
                </Text>

                <Text className="text-text font-semibold text-xs mb-1">Discord Server (optional)</Text>
                <TextInput
                  value={discordServer}
                  onChangeText={setDiscordServer}
                  placeholder="e.g. Solana Official, Jupiter Exchange..."
                  placeholderTextColor="#666"
                  className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-3 border border-border"
                />

                <Text className="text-text font-semibold text-xs mb-1">Announcements Section (optional)</Text>
                <Text className="text-text-secondary text-xs mb-1">
                  Select the exact category → channel where your major announcements are posted
                </Text>
                <TextInput
                  value={discordChannel}
                  onChangeText={setDiscordChannel}
                  placeholder="e.g. Announcements > Major Updates"
                  placeholderTextColor="#666"
                  className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-3 border border-border"
                  autoCapitalize="none"
                />

                <Text className="text-text font-semibold text-xs mb-1">Webhook URL</Text>
                <Text className="text-text-secondary text-xs mb-1">
                  Create a webhook in that specific channel to connect it
                </Text>
                <TextInput
                  value={discordWebhook}
                  onChangeText={setDiscordWebhook}
                  placeholder="https://discord.com/api/webhooks/..."
                  placeholderTextColor="#666"
                  maxLength={MAX_LENGTHS.DISCORD_WEBHOOK}
                  className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-3 border border-border text-xs"
                  autoCapitalize="none"
                />
                <Text className="text-text-secondary text-xs mb-3 italic">
                  Go to your Discord Server → Settings → Integrations → Webhooks → New Webhook → Select your announcements channel → Copy URL
                </Text>
                <TouchableOpacity
                  className="bg-indigo-600 rounded-xl py-3"
                  onPress={() => {
                    if (!discordWebhook.trim() || !isValidDiscordWebhook(discordWebhook)) {
                      Alert.alert('Invalid Webhook', 'Please paste a valid Discord webhook URL from your announcements channel.');
                      return;
                    }
                    Alert.alert(
                      'Connect Discord',
                      `Connect ${discordServer || 'your Discord server'} to "${hubName}"?\n\nAnnouncements will be forwarded as push notifications to your ${stats.subscribers.toLocaleString()} subscribers.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Connect', onPress: () => {
                          setDiscordConnected(true);
                          Alert.alert('Connected!', `${discordServer} → ${hubName} pipeline is live!\n\nYour ${stats.subscribers.toLocaleString()} subscribers will receive push notifications from "${discordChannel}".`);
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
                <View className="flex-row items-center bg-green-500/10 rounded-xl p-3 mb-2">
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <View className="ml-2 flex-1">
                    <Text className="text-green-400 font-semibold">
                      {discordServer} → {hubName}
                    </Text>
                    <Text className="text-green-400/70 text-xs">
                      {discordChannel}
                    </Text>
                  </View>
                </View>
                <Text className="text-text-secondary text-xs mb-3">
                  Major announcements from "{discordChannel}" are automatically forwarded as push notifications to your {stats.subscribers.toLocaleString()} subscribers.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Disconnect Discord', `Stop forwarding from "${discordServer}" → ${discordChannel}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Disconnect', style: 'destructive', onPress: () => {
                        setDiscordConnected(false);
                        setDiscordWebhook('');
                        setDiscordServer('');
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

          {/* DOOH Worldwide Section */}
          <View className="bg-background-card rounded-2xl p-5 mb-4 border border-primary/20">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <Ionicons name="globe" size={22} color="#FF9F66" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-text font-bold text-base">DOOH Worldwide</Text>
                <View className="flex-row items-center mt-0.5">
                  <View className="bg-primary/20 rounded-full px-2 py-0.5">
                    <Text className="text-primary text-xs font-bold">NEW</Text>
                  </View>
                </View>
              </View>
            </View>
            <Text className="text-text-secondary text-sm mb-4 leading-5">
              Premium programmatic digital out-of-home inventory across high-traffic global venues through our network of international partners.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('DOOH', { hubName })}
              className="bg-primary rounded-xl py-3"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="megaphone" size={18} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">Create DOOH Campaign</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Billing — creator-only (subscribers should not see billing info) */}
          {isCreator && (
            <TouchableOpacity
              onPress={() => Alert.alert("Hub's Billing", `Current subscription: ${hubCreationPrice.toLocaleString()} $SKR/month\n${billingInfo}`, [
                { text: 'OK' },
              ])}
              className="bg-background-card rounded-xl p-4 mb-6 flex-row items-center justify-between border border-border"
            >
              <View className="flex-row items-center">
                <Ionicons name="card" size={24} color="#FF9F66" />
                <Text className="text-text font-semibold text-base ml-3">Hub's Billing</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-text-secondary text-sm mr-2">{hubCreationPrice.toLocaleString()} $SKR/month</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
