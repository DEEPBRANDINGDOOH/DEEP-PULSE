import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AdRotation, { AdRotationManager } from '../components/AdRotation';
import { MOCK_ADS } from '../config/constants';
import { useAppStore } from '../store/appStore';
import GlowCard from '../components/ui/GlowCard';
import GradientButton from '../components/ui/GradientButton';
import PulseOrb from '../components/ui/PulseOrb';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    hubName: 'Solana Gaming',
    hubIcon: 'game-controller',
    title: 'New Game Launch',
    message: 'Check out the latest game on Solana! Epic gameplay awaits...',
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
    timestamp: '1 day ago',
    reactions: 412,
    comments: 89,
    isNew: false,
  },
];

export default function HomeScreen({ navigation }) {
  const { wallet } = useAppStore();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const handleAdImpression = (data) => {
    AdRotationManager.trackImpression(data);
  };

  const handleAdClick = (data) => {
    AdRotationManager.trackClick(data);
  };

  const handleSendFeedback = (notification) => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to send feedback.\n\nA 400 $SKR deposit is required.');
      return;
    }
    setSelectedNotification(notification);
    setFeedbackModalVisible(true);
  };

  const submitFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please write your feedback before submitting.');
      return;
    }
    Alert.alert('Feedback Sent!', `Your feedback for "${selectedNotification?.hubName}" has been submitted.\n\n400 $SKR deposited in escrow.`);
    setFeedbackText('');
    setFeedbackModalVisible(false);
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
              <View className="absolute -top-1 -right-1 bg-primary rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white font-bold" style={{ fontSize: 9 }}>3</Text>
              </View>
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
              <View className="p-5">
                {/* Header */}
                <View className="flex-row items-center mb-3">
                  <View
                    className="w-11 h-11 rounded-xl items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,159,102,0.15)' }}
                  >
                    <Ionicons name={notif.hubIcon} size={22} color="#FF9F66" />
                  </View>
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
                </View>

                {/* Content */}
                <Text className="text-text font-bold text-base mb-1.5" style={{ letterSpacing: -0.2 }}>{notif.title}</Text>
                <Text className="text-text-secondary text-sm mb-4 leading-5">
                  {notif.message}
                </Text>

                {/* Engagement Stats */}
                <View className="flex-row items-center mb-4">
                  <View className="flex-row items-center bg-background-secondary rounded-lg px-3 py-1.5 mr-3">
                    <Ionicons name="flame" size={14} color="#FF9F66" />
                    <Text className="text-text font-semibold text-xs ml-1.5">{notif.reactions}</Text>
                  </View>
                  <View className="flex-row items-center bg-background-secondary rounded-lg px-3 py-1.5">
                    <Ionicons name="chatbubble" size={14} color="#9898a0" />
                    <Text className="text-text font-semibold text-xs ml-1.5">{notif.comments}</Text>
                  </View>
                </View>

                {/* Send Feedback Button */}
                <TouchableOpacity
                  onPress={() => handleSendFeedback(notif)}
                  className="rounded-xl py-3 overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(255,159,102,0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,159,102,0.25)',
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="chatbox" size={16} color="#FF9F66" />
                    <Text className="text-primary font-bold text-sm ml-2">
                      Send Feedback
                    </Text>
                    <View className="ml-2 bg-primary/20 rounded-md px-2 py-0.5">
                      <Text className="text-primary font-black" style={{ fontSize: 10 }}>400 $SKR</Text>
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
                  Deposit: <Text className="text-primary font-bold">400 $SKR</Text> (refundable if approved)
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
