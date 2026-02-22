/**
 * Brand Boost Screen
 * 
 * For brands/projects to create and manage their notification hubs
 * - Create new hub (pay 2000 $SKR/month)
 * - Manage existing hubs
 * - Send notifications to subscribers
 * - View analytics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';

export default function BrandBoostScreen({ navigation }) {
  const { wallet } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hubName, setHubName] = useState('');
  const [hubDescription, setHubDescription] = useState('');
  const [hubCategory, setHubCategory] = useState('DeFi');
  const [hubIcon, setHubIcon] = useState('rocket');
  const [isCreating, setIsCreating] = useState(false);

  const CATEGORIES = ['DeFi', 'NFT', 'Gaming', 'Wallet', 'Infrastructure', 'DAO', 'Metaverse'];
  const ICON_OPTIONS = [
    { name: 'rocket', label: 'Rocket' },
    { name: 'flash', label: 'Flash' },
    { name: 'flame', label: 'Flame' },
    { name: 'diamond', label: 'Diamond' },
    { name: 'star', label: 'Star' },
    { name: 'navigate', label: 'Target' },
    { name: 'cash', label: 'Cash' },
    { name: 'color-palette', label: 'Art' },
    { name: 'game-controller', label: 'Gaming' },
    { name: 'trophy', label: 'Trophy' },
    { name: 'globe', label: 'Globe' },
    { name: 'sparkles', label: 'Sparkles' },
  ];

  const handleCreateHub = async () => {
    // Dev mode: allow hub creation without wallet for testing
    const __DEV_MODE__ = !wallet.connected;

    if (!hubName.trim() || !hubDescription.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    setIsCreating(true);

    try {
      const createdHubName = hubName;
      Alert.alert(
        'Payment Required',
        `To create "${hubName}" hub, you need to pay 2000 $SKR per month.${__DEV_MODE__ ? '\n\n(Dev mode: wallet not connected, simulated transaction)' : '\n\nThis will create an on-chain transaction.'}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsCreating(false) },
          {
            text: 'Create Hub',
            onPress: async () => {
              try {
                // Simulate transaction
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Reset form
                setHubName('');
                setHubDescription('');
                setHubCategory('DeFi');
                setHubIcon('rocket');
                setShowCreateModal(false);
                setIsCreating(false);

                Alert.alert(
                  'Hub Created!',
                  `Your hub "${createdHubName}" has been created successfully!\n\nYou can now send notifications to your subscribers.`,
                  [{
                    text: 'Go to Dashboard',
                    onPress: () => navigation.navigate('HubDashboard', { hubName: createdHubName }),
                  }]
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to create hub. Please try again.');
                setIsCreating(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Hub creation error:', error);
      Alert.alert('Error', 'Failed to create hub');
      setIsCreating(false);
    }
  };

  const FeatureCard = ({ icon, title, description }) => (
    <View className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
      <View className="flex-row items-start">
        <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mr-4">
          <Ionicons name={icon} size={24} color="#FF9F66" />
        </View>
        <View className="flex-1">
          <Text className="text-text font-bold text-lg mb-2">{title}</Text>
          <Text className="text-text-secondary text-sm leading-5">{description}</Text>
        </View>
      </View>
    </View>
  );

  const PricingCard = ({ isPopular = false }) => (
    <View className={`bg-background-card rounded-2xl p-6 border-2 ${
      isPopular ? 'border-primary' : 'border-border'
    }`}>
      {isPopular && (
        <View className="bg-primary px-3 py-1 rounded-full self-start mb-3">
          <Text className="text-white text-xs font-bold">MOST POPULAR</Text>
        </View>
      )}
      
      <Text className="text-text text-2xl font-bold mb-2">Hub Subscription</Text>
      <View className="flex-row items-end mb-4">
        <Text className="text-primary text-4xl font-bold">2000</Text>
        <Text className="text-primary text-xl font-bold ml-1">$SKR</Text>
        <Text className="text-text-secondary text-sm ml-2 mb-1">/month</Text>
      </View>

      <View className="border-t border-border pt-4 mb-6">
        <Text className="text-text-secondary text-sm mb-3">What's included:</Text>
        
        <View className="flex-row items-start mb-3">
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text className="text-text ml-2 flex-1">Unlimited notifications</Text>
        </View>
        
        <View className="flex-row items-start mb-3">
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text className="text-text ml-2 flex-1">Real-time push to all subscribers</Text>
        </View>
        
        <View className="flex-row items-start mb-3">
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text className="text-text ml-2 flex-1">Analytics dashboard</Text>
        </View>
        
        <View className="flex-row items-start mb-3">
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text className="text-text ml-2 flex-1">Receive user feedback (500 $SKR each)</Text>
        </View>
        
        <View className="flex-row items-start">
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text className="text-text ml-2 flex-1">Verified badge</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setShowCreateModal(true)}
        className="bg-primary py-4 rounded-xl"
        activeOpacity={0.7}
      >
        <Text className="text-white text-center font-bold text-base">
          Create Your Hub
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-text text-3xl font-bold mb-2">Brand Boost</Text>
          <Text className="text-text-secondary text-base leading-6">
            Create your notification hub and reach thousands of Solana users instantly
          </Text>
        </View>

        {/* Hero Section */}
        <View className="px-5 mb-8">
          <View className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-6 border border-primary/30">
            <View className="flex-row items-center mb-3">
              <Ionicons name="rocket" size={24} color="#FF9F66" />
              <Text className="text-text text-2xl font-bold ml-2">Reach Your Community Instantly</Text>
            </View>
            <Text className="text-text-secondary text-base leading-6 mb-4">
              Send real-time notifications about drops, updates, and announcements directly to your subscribers' mobile devices.
            </Text>
            <View className="flex-row items-center">
              <View className="flex-1 mr-2">
                <Text className="text-primary text-3xl font-bold">10K+</Text>
                <Text className="text-text-secondary text-sm">Active Users</Text>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-primary text-3xl font-bold">98%</Text>
                <Text className="text-text-secondary text-sm">Open Rate</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Why Brand Boost */}
        <View className="px-5 mb-8">
          <Text className="text-text text-2xl font-bold mb-4">Why Brand Boost?</Text>
          
          <FeatureCard
            icon="notifications"
            title="Instant Notifications"
            description="Send push notifications that reach your subscribers within seconds, even when the app is closed."
          />

          <FeatureCard
            icon="navigate"
            title="Direct Communication"
            description="No algorithms, no middlemen. Your message reaches 100% of your subscribers."
          />

          <FeatureCard
            icon="chatbubbles"
            title="Valuable Feedback"
            description="Receive direct feedback from your community. Users pay 500 $SKR per feedback, ensuring quality insights."
          />

          <FeatureCard
            icon="bar-chart"
            title="Analytics Dashboard"
            description="Track opens, engagement, and subscriber growth with detailed analytics."
          />
        </View>

        {/* Pricing */}
        <View className="px-5 mb-8">
          <Text className="text-text text-2xl font-bold mb-2">Simple Pricing</Text>
          <Text className="text-text-secondary mb-6">
            One transparent price, unlimited value
          </Text>
          
          <PricingCard isPopular={true} />
        </View>

        {/* How It Works */}
        <View className="px-5 mb-8">
          <Text className="text-text text-2xl font-bold mb-4">How It Works</Text>
          
          <View className="bg-background-card rounded-2xl p-5 border border-border">
            <View className="flex-row items-start mb-5">
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-4">
                <Text className="text-white font-bold">1</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold text-base mb-1">Create Your Hub</Text>
                <Text className="text-text-secondary text-sm">Pay 2000 $SKR/month to set up your notification hub</Text>
              </View>
            </View>

            <View className="flex-row items-start mb-5">
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-4">
                <Text className="text-white font-bold">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold text-base mb-1">Grow Your Audience</Text>
                <Text className="text-text-secondary text-sm">Users discover and subscribe to your hub for free</Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-4">
                <Text className="text-white font-bold">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text font-semibold text-base mb-1">Send Notifications</Text>
                <Text className="text-text-secondary text-sm">Broadcast updates instantly to all your subscribers</Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View className="px-5 mb-8">
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="bg-primary py-6 rounded-2xl"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="rocket" size={20} color="#fff" />
              <Text className="text-white font-bold text-lg ml-2">Create Your Hub Now</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>

      {/* Create Hub Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isCreating && setShowCreateModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-background-surface rounded-t-3xl" style={{ maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="p-6">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-text text-2xl font-bold">Create Hub</Text>
                  <TouchableOpacity
                    onPress={() => !isCreating && setShowCreateModal(false)}
                    disabled={isCreating}
                  >
                    <Ionicons name="close" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Icon Selector */}
                <Text className="text-text font-semibold mb-3">Hub Icon</Text>
                <View className="flex-row flex-wrap mb-6">
                  {ICON_OPTIONS.map((iconOpt) => (
                    <TouchableOpacity
                      key={iconOpt.name}
                      onPress={() => setHubIcon(iconOpt.name)}
                      className={`w-14 h-14 rounded-xl items-center justify-center m-1 ${
                        hubIcon === iconOpt.name ? 'bg-primary' : 'bg-background-card border border-border'
                      }`}
                    >
                      <Ionicons name={iconOpt.name} size={24} color={hubIcon === iconOpt.name ? '#fff' : '#FF9F66'} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Name */}
                <Text className="text-text font-semibold mb-3">Hub Name</Text>
                <TextInput
                  className="bg-background-card border border-border rounded-xl px-4 py-3 text-text mb-6"
                  placeholder="e.g., My DeFi Protocol"
                  placeholderTextColor="#666"
                  value={hubName}
                  onChangeText={setHubName}
                  editable={!isCreating}
                />

                {/* Description */}
                <Text className="text-text font-semibold mb-3">Description</Text>
                <TextInput
                  className="bg-background-card border border-border rounded-xl px-4 py-3 text-text mb-6"
                  placeholder="Brief description of your project..."
                  placeholderTextColor="#666"
                  value={hubDescription}
                  onChangeText={setHubDescription}
                  multiline
                  numberOfLines={3}
                  editable={!isCreating}
                />

                {/* Category */}
                <Text className="text-text font-semibold mb-3">Category</Text>
                <View className="flex-row flex-wrap mb-6">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setHubCategory(cat)}
                      disabled={isCreating}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 ${
                        hubCategory === cat ? 'bg-primary' : 'bg-background-card border border-border'
                      }`}
                    >
                      <Text className={hubCategory === cat ? 'text-white font-semibold' : 'text-text-secondary'}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Pricing Info */}
                <View className="bg-background-card border border-primary/30 rounded-2xl p-4 mb-6">
                  <Text className="text-text font-semibold mb-2">Monthly Subscription</Text>
                  <Text className="text-primary text-3xl font-bold mb-2">2000 $SKR</Text>
                  <Text className="text-text-secondary text-sm">
                    • Unlimited notifications{'\n'}
                    • Analytics dashboard{'\n'}
                    • Verified badge
                  </Text>
                </View>

                {/* Create Button */}
                <TouchableOpacity
                  onPress={handleCreateHub}
                  disabled={isCreating}
                  className={`py-4 rounded-xl ${isCreating ? 'bg-primary/50' : 'bg-primary'}`}
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-center font-bold text-base">
                    {isCreating ? 'Creating...' : 'Create Hub (2000 $SKR)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
