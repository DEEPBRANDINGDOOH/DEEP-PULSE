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
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { USE_DEVNET, ADMIN_WALLET } from '../config/constants';
import { createHub } from '../services/transactionHelper';
import { checkRateLimit, MAX_LENGTHS } from '../utils/security';
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadHubLogo, validateHubLogo } from '../services/storageService';

export default function BrandBoostScreen({ navigation }) {
  const { wallet } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hubName, setHubName] = useState('');
  const [hubDescription, setHubDescription] = useState('');
  const [hubCategory, setHubCategory] = useState('DeFi');
  const [hubIcon, setHubIcon] = useState('rocket');
  const [hubLogoAsset, setHubLogoAsset] = useState(null);
  const [hubLogoPreview, setHubLogoPreview] = useState(null); // Local URI for preview
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
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
    if (!checkRateLimit('create_hub', 10000)) return;
    if (!hubName.trim() || !hubDescription.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    if (!wallet?.connected && !USE_DEVNET) {
      Alert.alert('Wallet Required', 'Please connect your wallet first. Hub creation costs 2000 $SKR/month.');
      return;
    }

    setIsCreating(true);

    try {
      const createdHubName = hubName;
      Alert.alert(
        USE_DEVNET ? 'Create Hub (Demo)' : 'Payment Required',
        USE_DEVNET
          ? `Create "${hubName}" hub in demo mode?\n\n(No real transaction — mock data)`
          : `To create "${hubName}" hub, you need to pay 2000 $SKR per month.\n\nThis will create an on-chain transaction via your wallet.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsCreating(false) },
          {
            text: 'Create Hub',
            onPress: async () => {
              try {
                // Map category to Anchor enum format
                const categoryMap = {
                  'DeFi': 'defi', 'NFT': 'nft', 'Gaming': 'gaming',
                  'Wallet': 'wallet', 'Infrastructure': 'infrastructure',
                  'DAO': 'dao', 'Metaverse': 'metaverse',
                };
                const categoryKey = categoryMap[hubCategory] || 'defi';
                const hubIndex = Date.now() % 1000000; // Unique index

                // Dev mode: simulate success without real transaction
                const result = USE_DEVNET
                  ? { success: true, signature: 'mock_tx_' + Date.now() }
                  : await createHub(hubName, hubDescription, categoryKey, hubIndex);

                if (result.success) {
                  // Upload logo if one was selected
                  let logoUrl = null;
                  const hubId = `hub_${Date.now()}`;
                  if (hubLogoAsset) {
                    try {
                      setLogoUploadProgress(0);
                      const uploadResult = await uploadHubLogo(
                        hubLogoAsset,
                        hubId,
                        (progress) => setLogoUploadProgress(progress),
                      );
                      if (uploadResult.success) {
                        logoUrl = uploadResult.url;
                      }
                    } catch (e) {
                      // Logo upload failed — continue without logo
                    }
                  }

                  // Add hub to store as pending (admin must approve)
                  const categoryIconMap = {
                    'DeFi': 'trending-up', 'NFT': 'color-palette', 'Gaming': 'game-controller',
                    'Wallet': 'wallet', 'Infrastructure': 'construct', 'DAO': 'people',
                    'Metaverse': 'globe',
                  };
                  const newHub = {
                    id: hubId,
                    name: createdHubName,
                    category: hubCategory,
                    description: hubDescription,
                    icon: hubIcon || categoryIconMap[hubCategory] || 'rocket',
                    logoUrl: logoUrl, // null if no logo uploaded
                    subscribers: 0,
                    status: 'PENDING',
                    creator: (typeof wallet.publicKey === 'string' ? wallet.publicKey : (wallet.publicKey?.toBase58?.() || wallet.publicKey?.toString?.() || ADMIN_WALLET)),
                    createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                  };
                  // Save to local store + await Firebase sync
                  useAppStore.getState().addPendingHub(newHub);

                  // [B43] Await Firebase write directly — don't rely on fire-and-forget
                  const { createHubInFirestore: createHubFb } = require('../services/firebaseService');
                  const fbResult = await createHubFb(newHub);
                  if (!fbResult.success) {
                    console.error('[BrandBoost] Firebase hub sync failed:', fbResult.error || 'unknown');
                  }

                  // Reset form
                  setHubName('');
                  setHubDescription('');
                  setHubCategory('DeFi');
                  setHubIcon('rocket');
                  setHubLogoAsset(null);
                  setHubLogoPreview(null);
                  setShowCreateModal(false);
                  setIsCreating(false);

                  Alert.alert(
                    'Hub Created!',
                    `Your hub "${createdHubName}" has been submitted for review!${!fbResult.success ? '\n\n⚠️ Cloud sync pending — hub saved locally.' : '\n\n✅ Synced to cloud.'}\n\nThe admin will approve it shortly.`,
                    [{
                      text: 'Go to Dashboard',
                      onPress: () => navigation.navigate('HubDashboard', {
                        hubName: createdHubName,
                        hubIcon: newHub.icon,
                        hubLogoUrl: logoUrl,
                        hubStatus: 'PENDING',
                        subscribers: 0,
                      }),
                    }]
                  );
                } else {
                  setIsCreating(false);
                }
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
          <Text className="text-text ml-2 flex-1">Receive user feedback (300 $SKR each)</Text>
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
            description="Receive direct feedback from your community. Users pay 300 $SKR per feedback, ensuring quality insights."
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

        {/* Bottom spacing */}

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

                {/* Hub Logo Upload (optional) */}
                <Text className="text-text font-semibold mb-2">Hub Logo <Text className="text-text-secondary font-normal">(optional)</Text></Text>
                <Text className="text-text-secondary text-xs mb-3">
                  200 x 200 px recommended  ·  Max 500 KB  ·  PNG, JPG, or WebP
                </Text>

                {hubLogoPreview ? (
                  <View className="flex-row items-center mb-4">
                    <Image
                      source={{ uri: hubLogoPreview }}
                      style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,159,102,0.1)' }}
                    />
                    <View className="flex-1 ml-4">
                      <Text className="text-text text-sm font-semibold mb-1">Logo selected</Text>
                      <Text className="text-text-secondary text-xs">
                        {hubLogoAsset?.fileSize ? `${Math.round(hubLogoAsset.fileSize / 1024)} KB` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setHubLogoAsset(null);
                        setHubLogoPreview(null);
                      }}
                      className="bg-red-500/20 rounded-lg px-3 py-2"
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      launchImageLibrary(
                        {
                          mediaType: 'photo',
                          quality: 0.9,
                          maxWidth: 400,
                          maxHeight: 400,
                          includeBase64: false,
                        },
                        (response) => {
                          if (response.didCancel || response.errorCode) return;
                          const asset = response.assets?.[0];
                          if (!asset) return;
                          // Client-side validation
                          const validation = validateHubLogo(asset);
                          if (!validation.valid) {
                            Alert.alert('Invalid Logo', validation.errors.join('\n'));
                            return;
                          }
                          setHubLogoAsset(asset);
                          setHubLogoPreview(asset.uri);
                        },
                      );
                    }}
                    disabled={isCreating}
                    className="bg-background-card border-2 border-dashed border-primary/40 rounded-2xl p-5 items-center mb-4"
                  >
                    <Ionicons name="image-outline" size={32} color="#FF9F66" />
                    <Text className="text-primary font-semibold text-sm mt-2">Upload Logo</Text>
                    <Text className="text-text-secondary text-xs mt-1">Tap to choose from gallery</Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View className="flex-row items-center mb-4">
                  <View className="flex-1 h-px bg-border" />
                  <Text className="text-text-secondary text-xs mx-3">OR choose an icon</Text>
                  <View className="flex-1 h-px bg-border" />
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
                  maxLength={MAX_LENGTHS.HUB_NAME}
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
                  maxLength={MAX_LENGTHS.HUB_DESCRIPTION}
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
