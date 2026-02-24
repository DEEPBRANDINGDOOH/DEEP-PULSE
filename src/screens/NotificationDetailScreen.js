import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import GradientButton from '../components/ui/GradientButton';

export default function NotificationDetailScreen({ navigation, route }) {
  const notification = route.params?.notification || {};
  const openFeedback = route.params?.openFeedback || false;
  const { wallet } = useAppStore();

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    if (openFeedback) {
      setFeedbackModalVisible(true);
    }
  }, [openFeedback]);

  const handleOpenLink = () => {
    if (notification.link) {
      Linking.openURL(notification.link).catch(() => {
        Alert.alert('Error', 'Could not open this link.');
      });
    }
  };

  const handleSendFeedback = () => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to send feedback.\n\nA 300 $SKR deposit is required.');
      return;
    }
    setFeedbackModalVisible(true);
  };

  const submitFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please write your feedback before submitting.');
      return;
    }
    Alert.alert(
      'Feedback Sent!',
      `Your feedback for "${notification.hubName}" has been submitted.\n\n300 $SKR deposited in escrow.`
    );
    setFeedbackText('');
    setFeedbackModalVisible(false);
  };

  const handleShare = () => {
    Alert.alert('Share', 'Sharing functionality coming soon!');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="p-6 pb-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#FF9F66" />
          </TouchableOpacity>

          {/* Hub info */}
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-3">
              <Ionicons name={notification.hubIcon || 'apps'} size={24} color="#FF9F66" />
            </View>
            <View className="flex-1">
              <Text className="text-text font-bold">{notification.hubName || 'Hub'}</Text>
              <Text className="text-text-secondary text-xs">{notification.timestamp || ''}</Text>
            </View>
            {notification.isNew && (
              <View className="rounded-md px-2 py-1" style={{ backgroundColor: 'rgba(255,159,102,0.2)' }}>
                <Text className="text-primary font-black" style={{ fontSize: 10, letterSpacing: 1 }}>NEW</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View className="px-6 pb-6">
          {/* Title */}
          <Text className="text-text font-black text-2xl mb-4" style={{ letterSpacing: -0.3 }}>
            {notification.title || 'Notification'}
          </Text>

          {/* Full message */}
          <View className="bg-background-card rounded-2xl p-5 mb-5 border border-border">
            <Text className="text-text text-base leading-6">
              {notification.fullMessage || notification.message || ''}
            </Text>
          </View>

          {/* Link button */}
          {notification.link && (
            <TouchableOpacity
              onPress={handleOpenLink}
              className="bg-primary/10 rounded-2xl p-4 mb-5 border border-primary/25"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                  <Ionicons name="open-outline" size={20} color="#FF9F66" />
                </View>
                <View className="flex-1">
                  <Text className="text-primary font-bold text-sm mb-0.5">Visit Link</Text>
                  <Text className="text-text-secondary text-xs" numberOfLines={1}>{notification.link}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FF9F66" />
              </View>
            </TouchableOpacity>
          )}

          {/* Engagement Stats */}
          <View className="flex-row mb-5">
            <View className="flex-1 bg-background-card rounded-xl p-4 mr-2 items-center border border-border">
              <View className="flex-row items-center mb-1">
                <Ionicons name="flame" size={18} color="#FF9F66" />
                <Text className="text-text font-black text-lg ml-2">{notification.reactions || 0}</Text>
              </View>
              <Text className="text-text-secondary text-xs">Reactions</Text>
            </View>
            <View className="flex-1 bg-background-card rounded-xl p-4 ml-2 items-center border border-border">
              <View className="flex-row items-center mb-1">
                <Ionicons name="chatbubble" size={18} color="#9898a0" />
                <Text className="text-text font-black text-lg ml-2">{notification.comments || 0}</Text>
              </View>
              <Text className="text-text-secondary text-xs">Comments</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View className="flex-row mb-4">
            <TouchableOpacity
              onPress={handleSendFeedback}
              className="flex-1 mr-2"
            >
              <View
                className="rounded-xl py-4 items-center"
                style={{
                  backgroundColor: 'rgba(255,159,102,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,159,102,0.25)',
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="chatbox" size={18} color="#FF9F66" />
                  <Text className="text-primary font-bold text-sm ml-2">Send Feedback</Text>
                </View>
                <Text className="text-primary text-xs mt-1">300 $SKR deposit</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              className="flex-1 ml-2"
            >
              <View
                className="rounded-xl py-4 items-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: '#2a2a30',
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="share-social" size={18} color="#9898a0" />
                  <Text className="text-text font-bold text-sm ml-2">Share</Text>
                </View>
                <Text className="text-text-secondary text-xs mt-1">Share this update</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
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

            <Text className="text-text-secondary text-xs mb-2">
              Feedback for: <Text className="text-text font-bold">{notification.title}</Text>
            </Text>

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
