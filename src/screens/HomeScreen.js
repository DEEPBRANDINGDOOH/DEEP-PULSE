import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AdRotation, { AdRotationManager } from '../components/AdRotation';
import HubIcon from '../components/HubIcon';
import { MOCK_ADS } from '../config/constants';
import { useAppStore } from '../store/appStore';
import GlowCard from '../components/ui/GlowCard';
import GradientButton from '../components/ui/GradientButton';
import PulseOrb from '../components/ui/PulseOrb';
import { submitFeedback as submitFeedbackTx } from '../services/transactionHelper';
import { checkRateLimit, MAX_LENGTHS } from '../utils/security';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    hubName: 'Solana Gaming',
    hubIcon: 'game-controller',
    title: 'New Game Launch',
    message: 'Check out the latest game on Solana! Epic gameplay awaits...',
    fullMessage: 'Get ready for the biggest game launch of the year on Solana. Exclusive NFT rewards for early adopters. Be among the first to play and earn!\n\nThe game features a unique play-to-earn model with $SKR token integration. Top players will receive legendary NFTs and governance tokens.\n\nLaunch time: February 23, 2026 at 12:00 PM UTC\nPlatform: Solana Mobile (Seeker compatible)\nRewards: 10,000 $SKR pool for first 500 players',
    link: 'https://solanagaming.io/launch',
    timestamp: '2 hours ago',
    reactions: 234,
    comments: 56,
    isNew: true,
  },
  {
    id: '2',
    hubName: 'NFT Artists',
    hubIcon: 'color-palette',
    title: 'Artist Spotlight',
    message: '@solartist drops exclusive collection tomorrow at 12PM UTC',
    fullMessage: 'This week\'s featured artist is @solartist, known for their stunning generative art pieces.\n\nCollection: "Solar Flares"\nMint Date: Tomorrow at 12:00 PM UTC\nSupply: 500 unique pieces\nMint Price: 2 SOL\n\nEach piece is algorithmically generated using real solar data from NASA. Whitelist is open for DEEP Pulse subscribers!',
    link: 'https://magiceden.io/drops/solar-flares',
    timestamp: '5 hours ago',
    reactions: 156,
    comments: 23,
    isNew: true,
  },
  {
    id: '3',
    hubName: 'DeFi Alerts',
    hubIcon: 'trending-up',
    title: 'New Yield Farm',
    message: 'Jupiter launches new LP rewards program with 50% APY',
    fullMessage: 'Jupiter has launched a new liquidity provision rewards program offering up to 50% APY on selected pairs.\n\nFeatured Pairs:\n- SOL/USDC: 50% APY\n- JUP/SOL: 35% APY\n- BONK/USDC: 28% APY\n\nRewards are paid in JUP tokens and are claimable weekly. The program runs for 3 months starting today.\n\nNote: APY rates are variable and subject to change. Always DYOR before investing.',
    link: 'https://jup.ag/earn',
    timestamp: '1 day ago',
    reactions: 412,
    comments: 89,
    isNew: false,
  },
];

export default function HomeScreen({ navigation }) {
  const { wallet, getUnreadCount, hubNotifications, addHubFeedback } = useAppStore();
  const unreadCount = getUnreadCount();

  // Merge store notifications (from brand-sent notifs) with mock data
  const storeNotifs = Object.values(hubNotifications || {}).flat().map(n => ({
    ...n,
    hubIcon: n.hubIcon || 'apps',
    reactions: n.reactions || 0,
    comments: n.comments || 0,
    isNew: true,
  }));
  const [notifications, setNotifications] = useState([...storeNotifs, ...MOCK_NOTIFICATIONS]);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Re-sync when brand sends new notifications
  useEffect(() => {
    const freshStoreNotifs = Object.values(hubNotifications || {}).flat().map(n => ({
      ...n,
      hubIcon: n.hubIcon || 'apps',
      reactions: n.reactions || 0,
      comments: n.comments || 0,
      isNew: true,
    }));
    setNotifications([...freshStoreNotifs, ...MOCK_NOTIFICATIONS]);
  }, [hubNotifications]);

  const handleAdImpression = (data) => {
    AdRotationManager.trackImpression(data);
  };

  const handleAdClick = (data) => {
    AdRotationManager.trackClick(data);
  };

  const handleSendFeedback = (notification) => {
    if (!__DEV__ && !wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to send feedback.\n\nA 300 $SKR deposit is required.');
      return;
    }
    setSelectedNotification(notification);
    setFeedbackModalVisible(true);
  };

  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async () => {
    if (!checkRateLimit('submit_feedback')) return;
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please write your feedback before submitting.');
      return;
    }

    setSubmitting(true);

    // If notification has a hubPda (on-chain hub), do real transaction
    if (selectedNotification?.hubPda) {
      const depositIndex = Date.now() % 1000000; // Simple unique index
      const result = await submitFeedbackTx(
        selectedNotification.hubPda,
        feedbackText,
        depositIndex
      );
      setSubmitting(false);
      if (result.success) {
        // Store in Zustand for moderation screen
        addHubFeedback(selectedNotification?.hubName, {
          id: `fb_${Date.now()}`,
          wallet: wallet.publicKey ? wallet.publicKey.toString().slice(0, 3) + '...' + wallet.publicKey.toString().slice(-3) : '7xK...9Qz',
          title: `Re: ${selectedNotification?.title || 'Notification'}`,
          message: feedbackText.trim(),
          deposit: 300,
          timestamp: 'Just now',
          hubName: selectedNotification?.hubName,
        });
        setFeedbackText('');
        setFeedbackModalVisible(false);
      }
    } else {
      // Mock mode fallback — store feedback in Zustand for moderation
      addHubFeedback(selectedNotification?.hubName, {
        id: `fb_${Date.now()}`,
        wallet: wallet.publicKey ? wallet.publicKey.toString().slice(0, 3) + '...' + wallet.publicKey.toString().slice(-3) : '7xK...9Qz',
        title: `Re: ${selectedNotification?.title || 'Notification'}`,
        message: feedbackText.trim(),
        deposit: 300,
        timestamp: 'Just now',
        hubName: selectedNotification?.hubName,
      });
      setSubmitting(false);
      Alert.alert('Feedback Sent!', `Your feedback for "${selectedNotification?.hubName}" has been submitted.\n\n300 $SKR deposited in escrow.`);
      setFeedbackText('');
      setFeedbackModalVisible(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Background ambient orbs */}
      <PulseOrb color="#FF9F66" size={250} top={-50} left={-80} opacity={0.06} delay={0} />
      <PulseOrb color="#e88b52" size={180} top={300} left={220} opacity={0.04} delay={1500} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
          <View>
            <Text
              className="font-black text-3xl"
              style={{ color: '#FF9F66', letterSpacing: -0.5 }}
            >
              DEEP Pulse
            </Text>
            <Text className="text-text-muted text-xs mt-0.5">Web3 Notification Hub</Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              className="mr-3 w-10 h-10 rounded-full bg-background-card items-center justify-center border border-border"
              onPress={() => navigation.navigate('Profile')}
              style={{
                shadowColor: '#FF9F66',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name="person" size={18} color="#FF9F66" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-background-card items-center justify-center border border-border"
              onPress={() => navigation.navigate('Notifications')}
              style={{
                shadowColor: '#FF9F66',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name="notifications" size={18} color="#FF9F66" />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-primary rounded-full w-4 h-4 items-center justify-center">
                  <Text className="text-white font-bold" style={{ fontSize: 9 }}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* TOP AD SLOT */}
        <View className="px-6 mb-5">
          <AdRotation
            ads={MOCK_ADS.TOP}
            slotType="top"
            onAdImpression={handleAdImpression}
            onAdClick={handleAdClick}
          />
        </View>

        {/* Section Title */}
        <View className="px-6 mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-1 h-5 bg-primary rounded-full mr-2.5" />
            <Text className="text-text font-black text-lg" style={{ letterSpacing: -0.3 }}>Latest Updates</Text>
          </View>
          <Text className="text-text-muted text-xs">{notifications.length} updates</Text>
        </View>

        {/* Notifications Feed */}
        <View className="px-6">
          {notifications.map((notif, index) => (
            <GlowCard
              key={notif.id}
              className="mb-4"
              intensity={notif.isNew ? 'medium' : 'low'}
              accent={notif.isNew ? '#FF9F66' : '#2a2a30'}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('NotificationDetail', { notification: notif })}
              >
                <View className="p-5 pb-3">
                  {/* Header */}
                  <View className="flex-row items-center mb-3">
                    <HubIcon icon={notif.hubIcon} logoUrl={notif.hubLogoUrl} size={44} iconSize={22} />
                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center">
                        <Text className="text-text font-bold text-sm">{notif.hubName}</Text>
                        {notif.isNew && (
                          <View className="ml-2 rounded-md px-2 py-0.5" style={{ backgroundColor: 'rgba(255,159,102,0.2)' }}>
                            <Text className="text-primary font-black" style={{ fontSize: 9, letterSpacing: 1 }}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-text-muted text-xs mt-0.5">{notif.timestamp}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#555" />
                  </View>

                  {/* Content */}
                  <Text className="text-text font-bold text-base mb-1.5" style={{ letterSpacing: -0.2 }}>{notif.title}</Text>
                  <Text className="text-text-secondary text-sm mb-3 leading-5" numberOfLines={2}>
                    {notif.message}
                  </Text>

                  {/* Link indicator */}
                  {notif.link && (
                    <View className="flex-row items-center mb-3 bg-primary/8 rounded-lg px-3 py-1.5">
                      <Ionicons name="link" size={12} color="#FF9F66" />
                      <Text className="text-primary text-xs ml-1.5 flex-1" numberOfLines={1}>{notif.link}</Text>
                    </View>
                  )}

                  {/* Engagement Stats */}
                  <View className="flex-row items-center mb-3">
                    <TouchableOpacity
                      onPress={() => {
                        setNotifications(prev => prev.map(n =>
                          n.id === notif.id ? { ...n, reactions: n.reactions + 1, reacted: true } : n
                        ));
                      }}
                      activeOpacity={0.7}
                      className="flex-row items-center rounded-lg px-3 py-1.5 mr-3"
                      style={{
                        backgroundColor: notif.reacted ? 'rgba(255,159,102,0.15)' : 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        borderColor: notif.reacted ? 'rgba(255,159,102,0.3)' : 'transparent',
                      }}
                    >
                      <Ionicons name={notif.reacted ? 'flame' : 'flame-outline'} size={14} color="#FF9F66" />
                      <Text className={`font-semibold text-xs ml-1.5 ${notif.reacted ? 'text-primary' : 'text-text'}`}>{notif.reactions}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSendFeedback(notif)}
                      activeOpacity={0.7}
                      className="flex-row items-center bg-background-secondary rounded-lg px-3 py-1.5"
                    >
                      <Ionicons name="chatbubble" size={14} color="#9898a0" />
                      <Text className="text-text font-semibold text-xs ml-1.5">{notif.comments}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Action buttons */}
              <View className="flex-row px-5 pb-5">
                <TouchableOpacity
                  onPress={() => navigation.navigate('NotificationDetail', { notification: notif })}
                  className="flex-1 rounded-xl py-2.5 mr-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#2a2a30' }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="expand" size={14} color="#9898a0" />
                    <Text className="text-text font-semibold text-sm ml-1.5">Read More</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSendFeedback(notif)}
                  className="flex-1 rounded-xl py-2.5 ml-2"
                  style={{
                    backgroundColor: 'rgba(255,159,102,0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,159,102,0.25)',
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="chatbox" size={14} color="#FF9F66" />
                    <Text className="text-primary font-bold text-sm ml-1.5">Feedback</Text>
                    <View className="ml-1.5 bg-primary/20 rounded-md px-1.5 py-0.5">
                      <Text className="text-primary font-black" style={{ fontSize: 9 }}>300</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </GlowCard>
          ))}
        </View>

        {/* BOTTOM AD SLOT */}
        <View className="px-6 mt-2 mb-6">
          <AdRotation
            ads={MOCK_ADS.BOTTOM}
            slotType="bottom"
            onAdImpression={handleAdImpression}
            onAdClick={handleAdClick}
          />
        </View>
      </ScrollView>

      {/* Feedback Modal — Premium */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View
            className="bg-background-card rounded-t-3xl p-6"
            style={{
              shadowColor: '#FF9F66',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 20,
            }}
          >
            {/* Handle bar */}
            <View className="w-10 h-1 bg-border rounded-full self-center mb-5" />

            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-text font-black text-xl" style={{ letterSpacing: -0.3 }}>Send Feedback</Text>
              <TouchableOpacity
                onPress={() => setFeedbackModalVisible(false)}
                className="w-8 h-8 rounded-full bg-background-secondary items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#9898a0" />
              </TouchableOpacity>
            </View>

            <View className="rounded-xl p-4 mb-5" style={{ backgroundColor: 'rgba(255,159,102,0.08)', borderWidth: 1, borderColor: 'rgba(255,159,102,0.15)' }}>
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={18} color="#FF9F66" />
                <Text className="text-text-secondary text-sm ml-2">
                  Deposit: <Text className="text-primary font-bold">300 $SKR</Text> (refundable if approved)
                </Text>
              </View>
            </View>

            <Text className="text-text font-bold mb-2">Your Feedback</Text>
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Write your feedback here..."
              placeholderTextColor="#6b6b73"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={MAX_LENGTHS.FEEDBACK_TEXT}
              className="bg-background-secondary rounded-xl p-4 mb-6 h-32 text-text"
              style={{ borderWidth: 1, borderColor: '#2a2a30' }}
            />

            <GradientButton
              title="Submit Feedback"
              icon="send"
              onPress={submitFeedback}
              pulse={feedbackText.trim().length > 0}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
