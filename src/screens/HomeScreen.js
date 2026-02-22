import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AdRotation, { AdRotationManager } from '../components/AdRotation';
import { MOCK_ADS } from '../config/constants';

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
      <ScrollView>
        {/* Header */}
        <View className="p-6 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-text font-black text-3xl">DEEP Pulse</Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity className="mr-4" onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="person-circle" size={32} color="#FF9F66" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications" size={28} color="#FF9F66" />
              <View className="absolute -top-1 -right-1 bg-primary rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">3</Text>
              </View>
            </TouchableOpacity>
          </View>
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

        {/* Latest Updates Title */}
        <View className="px-6 mb-4">
          <Text className="text-text font-bold text-xl">Latest Updates</Text>
        </View>

        {/* Notifications Feed */}
        <View className="px-6">
          {notifications.map((notif) => (
            <View
              key={notif.id}
              className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
            >
              {/* Header */}
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                  <Ionicons name={notif.hubIcon} size={20} color="#FF9F66" />
                </View>
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text className="text-text font-semibold text-sm">{notif.hubName}</Text>
                    {notif.isNew && (
                      <View className="ml-2 bg-primary rounded-full px-2 py-0.5">
                        <Text className="text-white text-xs font-bold">NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-text-secondary text-xs">{notif.timestamp}</Text>
                </View>
              </View>

              {/* Content */}
              <Text className="text-text font-bold text-base mb-2">{notif.title}</Text>
              <Text className="text-text-secondary text-sm mb-4 leading-5">
                {notif.message}
              </Text>

              {/* Engagement Stats */}
              <View className="flex-row items-center mb-4">
                <View className="flex-row items-center mr-4">
                  <Ionicons name="flame" size={16} color="#FF9F66" />
                  <Text className="text-text-secondary text-sm ml-1">{notif.reactions}</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="chatbubble" size={16} color="#666" />
                  <Text className="text-text-secondary text-sm ml-1">{notif.comments}</Text>
                </View>
              </View>

              {/* Send Feedback Button */}
              <TouchableOpacity
                onPress={() => handleSendFeedback(notif)}
                className="bg-primary/20 rounded-xl py-3 border border-primary"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="chatbox" size={16} color="#FF9F66" />
                  <Text className="text-primary font-bold text-sm ml-2">
                    Send Feedback (400 $SKR)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
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

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background-card rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text font-bold text-xl">Send Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <View className="bg-background-secondary rounded-xl p-4 mb-4">
              <Text className="text-text-secondary text-sm">
                Deposit: 400 $SKR (refundable if approved)
              </Text>
            </View>

            <Text className="text-text font-semibold mb-2">Your Feedback</Text>
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Write your feedback here..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              className="bg-background-secondary rounded-xl p-4 mb-6 h-32 border border-border text-text"
            />

            <TouchableOpacity
              onPress={submitFeedback}
              className="bg-primary rounded-xl py-4"
            >
              <Text className="text-white font-bold text-center text-base">
                Submit (400 $SKR)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
