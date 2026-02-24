/**
 * Ad Slots Screen
 *
 * Allows brands to purchase ad slots on their hubs
 * - Top Ad Slot: 2,000 $SKR/week (8 max, rotates every 15s)
 * - Bottom Ad Slot: 1,500 $SKR/week (8 max, rotates every 15s)
 *
 * Features:
 * - View available slots
 * - Purchase slots with $SKR (submitted for admin review)
 * - Image validation (format, URL)
 * - Edit creative in active campaign (re-submits for review)
 * - View rotation schedule
 * - Analytics dashboard
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';

// Ad Slot Configuration
const AD_CONFIG = {
  TOP_SLOT: {
    price: 2000,
    maxSlots: 8,
    rotationInterval: 15,
    width: 390,
    height: 120,
    position: 'top',
    name: 'Top Ad Slot',
    description: 'Premium placement above content feed',
    avgViews: 3125,
    acceptedFormats: 'PNG, JPG, GIF (animated supported)',
    recommendedSize: '390 x 120 px',
    maxFileSize: '2 MB',
  },
  BOTTOM_SLOT: {
    price: 1500,
    maxSlots: 8,
    rotationInterval: 15,
    width: 390,
    height: 100,
    position: 'bottom',
    name: 'Bottom Ad Slot',
    description: 'Standard placement below content feed',
    avgViews: 2500,
    acceptedFormats: 'PNG, JPG, GIF (animated supported)',
    recommendedSize: '390 x 100 px',
    maxFileSize: '2 MB',
  },
};

// Accepted image extensions
const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const REJECTED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.svg', '.bmp', '.tiff'];

/**
 * Validate ad creative URL
 * Returns { valid: boolean, errors: string[] }
 */
function validateAdCreative(imageUrl, landingUrl, slotType) {
  const errors = [];

  // Image URL checks
  if (!imageUrl || !imageUrl.trim()) {
    errors.push('Image URL is required');
  } else {
    // Must be https
    if (!imageUrl.startsWith('https://')) {
      errors.push('Image URL must start with https:// for security');
    }

    // Check file extension
    const urlLower = imageUrl.toLowerCase().split('?')[0]; // remove query params
    const hasAcceptedExt = ACCEPTED_EXTENSIONS.some(ext => urlLower.endsWith(ext));
    const hasRejectedExt = REJECTED_EXTENSIONS.some(ext => urlLower.endsWith(ext));

    if (hasRejectedExt) {
      errors.push('Video files are not supported. Use PNG, JPG, or GIF only');
    } else if (!hasAcceptedExt) {
      errors.push('Invalid file format. Accepted: PNG, JPG, GIF only. Make sure your URL ends with a valid image extension');
    }
  }

  // Landing URL checks
  if (!landingUrl || !landingUrl.trim()) {
    errors.push('Landing page URL is required');
  } else {
    if (!landingUrl.startsWith('https://')) {
      errors.push('Landing URL must start with https:// for security');
    }
  }

  const config = slotType === 'top' ? AD_CONFIG.TOP_SLOT : AD_CONFIG.BOTTOM_SLOT;

  return {
    valid: errors.length === 0,
    errors,
    specs: {
      dimensions: `${config.width} x ${config.height} px`,
      formats: config.acceptedFormats,
      maxSize: config.maxFileSize,
    },
  };
}

// Mock active ads for current user
const MOCK_MY_ADS = [
  {
    id: 'my_ad_1',
    slotType: 'top',
    imageUrl: 'https://cdn.example.com/ads/jupiter-swap-390x120.png',
    landingUrl: 'https://jup.ag',
    status: 'APPROVED', // APPROVED, PENDING_REVIEW, REJECTED
    remainingDays: 18,
    totalWeeks: 4,
    impressions: 12540,
    clicks: 342,
  },
  {
    id: 'my_ad_2',
    slotType: 'bottom',
    imageUrl: 'https://cdn.example.com/ads/nft-drop-390x100.gif',
    landingUrl: 'https://magiceden.io/drops',
    status: 'PENDING_REVIEW',
    remainingDays: 7,
    totalWeeks: 1,
    impressions: 0,
    clicks: 0,
  },
];

export default function AdSlotsScreen({ route, navigation }) {
  const { hubId } = route.params || {};
  const { wallet } = useAppStore();

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  // Purchase form state
  const [imageUrl, setImageUrl] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [duration, setDuration] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Edit form state
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLandingUrl, setEditLandingUrl] = useState('');
  const [editValidationErrors, setEditValidationErrors] = useState([]);

  // My ads
  const [myAds, setMyAds] = useState(MOCK_MY_ADS);

  // Mock data
  const [topSlots, setTopSlots] = useState([
    { id: 1, advertiser: '7xK...9Qz', active: true, remaining: 3 },
    { id: 2, advertiser: '2pQ...mNp', active: true, remaining: 5 },
    { id: 3, advertiser: 'Available', active: false },
    { id: 4, advertiser: 'Available', active: false },
    { id: 5, advertiser: 'Available', active: false },
    { id: 6, advertiser: 'Available', active: false },
    { id: 7, advertiser: 'Available', active: false },
    { id: 8, advertiser: 'Available', active: false },
  ]);

  const [bottomSlots, setBottomSlots] = useState([
    { id: 1, advertiser: '5jK...7Km', active: true, remaining: 2 },
    { id: 2, advertiser: 'Available', active: false },
    { id: 3, advertiser: 'Available', active: false },
    { id: 4, advertiser: 'Available', active: false },
    { id: 5, advertiser: 'Available', active: false },
    { id: 6, advertiser: 'Available', active: false },
    { id: 7, advertiser: 'Available', active: false },
    { id: 8, advertiser: 'Available', active: false },
  ]);

  const handlePurchaseSlot = (slotType) => {
    if (!wallet.connected) {
      Alert.alert('Connect Wallet', 'Please connect your wallet to purchase ad slots');
      return;
    }
    setSelectedSlot(slotType);
    setImageUrl('');
    setLandingUrl('');
    setDuration(1);
    setValidationErrors([]);
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = async () => {
    // Run validation
    const validation = validateAdCreative(imageUrl, landingUrl, selectedSlot);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    setIsPurchasing(true);

    const config = selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT : AD_CONFIG.BOTTOM_SLOT;
    const totalCost = config.price * duration * (1 - calculateDiscount(duration));

    Alert.alert(
      'Confirm Purchase',
      `Purchase ${config.name}?\n\nCost: ${totalCost.toLocaleString()} $SKR (${duration} week${duration > 1 ? 's' : ''})\n\nYour ad will be submitted for admin review before going live.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsPurchasing(false) },
        {
          text: 'Purchase & Submit',
          onPress: async () => {
            try {
              await new Promise(resolve => setTimeout(resolve, 2000));

              Alert.alert(
                'Ad Submitted for Review',
                `Your ${config.name} has been purchased and submitted for admin approval.\n\n` +
                `Status: Pending Review\n` +
                `Duration: ${duration} week${duration > 1 ? 's' : ''}\n` +
                `Cost: ${totalCost.toLocaleString()} $SKR\n\n` +
                `Your ad will go live once approved by the platform admin. ` +
                `You will be notified when it's approved or if changes are needed.`,
                [{ text: 'OK', onPress: () => setShowPurchaseModal(false) }]
              );

              // Add to my ads list
              setMyAds(prev => [...prev, {
                id: `my_ad_${Date.now()}`,
                slotType: selectedSlot,
                imageUrl: imageUrl.trim(),
                landingUrl: landingUrl.trim(),
                status: 'PENDING_REVIEW',
                remainingDays: duration * 7,
                totalWeeks: duration,
                impressions: 0,
                clicks: 0,
              }]);

              setImageUrl('');
              setLandingUrl('');
              setDuration(1);
            } catch (error) {
              Alert.alert('Error', 'Failed to purchase ad slot. Please try again.');
            } finally {
              setIsPurchasing(false);
            }
          },
        },
      ]
    );
  };

  const handleEditCreative = (ad) => {
    setEditingAd(ad);
    setEditImageUrl(ad.imageUrl);
    setEditLandingUrl(ad.landingUrl);
    setEditValidationErrors([]);
    setShowEditModal(true);
  };

  const handleSubmitEdit = () => {
    const validation = validateAdCreative(editImageUrl, editLandingUrl, editingAd.slotType);
    if (!validation.valid) {
      setEditValidationErrors(validation.errors);
      return;
    }
    setEditValidationErrors([]);

    Alert.alert(
      'Resubmit for Review',
      'Your updated creative will be submitted for admin review.\n\nYour current ad continues to run until the new version is approved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Update',
          onPress: () => {
            setMyAds(prev => prev.map(a =>
              a.id === editingAd.id
                ? { ...a, imageUrl: editImageUrl.trim(), landingUrl: editLandingUrl.trim(), status: 'PENDING_REVIEW' }
                : a
            ));
            setShowEditModal(false);
            Alert.alert(
              'Creative Updated',
              'Your updated ad has been resubmitted for admin review. Your current ad continues to run until the new one is approved.'
            );
          },
        },
      ]
    );
  };

  const calculateDiscount = (weeks) => {
    if (weeks >= 52) return 0.40;
    if (weeks >= 26) return 0.30;
    if (weeks >= 12) return 0.20;
    if (weeks >= 4) return 0.10;
    return 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return '#4CAF50';
      case 'PENDING_REVIEW': return '#FF9F66';
      case 'REJECTED': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'APPROVED': return 'Live';
      case 'PENDING_REVIEW': return 'Pending Review';
      case 'REJECTED': return 'Rejected';
      default: return status;
    }
  };

  // Validation error display component
  const ValidationErrors = ({ errors }) => {
    if (!errors || errors.length === 0) return null;
    return (
      <View className="bg-error/10 rounded-xl p-4 mt-3 border border-error/30">
        <View className="flex-row items-center mb-2">
          <Ionicons name="alert-circle" size={18} color="#f44336" />
          <Text className="text-error font-bold text-sm ml-2">Validation Errors</Text>
        </View>
        {errors.map((error, index) => (
          <View key={index} className="flex-row items-start mt-1">
            <Text className="text-error text-xs mr-2">-</Text>
            <Text className="text-error text-xs flex-1">{error}</Text>
          </View>
        ))}
      </View>
    );
  };

  const SlotCard = ({ config, slots, type }) => {
    const activeSlots = slots.filter(s => s.active).length;
    const availableSlots = config.maxSlots - activeSlots;

    return (
      <View className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center mr-4">
              <Ionicons name="megaphone" size={28} color="#FF9F66" />
            </View>
            <View className="flex-1">
              <Text className="text-text font-bold text-lg mb-1">{config.name}</Text>
              <Text className="text-text-secondary text-xs">{config.description}</Text>
            </View>
          </View>
          <View className="bg-primary/20 px-3 py-1 rounded-lg">
            <Text className="text-primary font-bold text-sm">
              {config.price.toLocaleString()} $SKR/week
            </Text>
          </View>
        </View>

        {/* Slot Info */}
        <View className="bg-background-secondary rounded-xl p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Rotation Interval</Text>
            <Text className="text-text font-semibold text-sm">{config.rotationInterval}s</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Max Advertisers</Text>
            <Text className="text-text font-semibold text-sm">{config.maxSlots} slots</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Current Status</Text>
            <Text className="text-text font-semibold text-sm">
              {activeSlots}/{config.maxSlots} occupied
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Avg Views/Week</Text>
            <Text className="text-text font-semibold text-sm">~{config.avgViews.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Image Size</Text>
            <Text className="text-primary font-semibold text-sm">{config.recommendedSize}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-text-secondary text-sm">Formats</Text>
            <Text className="text-text font-semibold text-sm">{config.acceptedFormats}</Text>
          </View>
        </View>

        {/* Rotation Schedule */}
        <View className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/20">
          <Text className="text-primary font-bold text-sm mb-3">
            <Ionicons name="sync" size={16} /> Rotation Schedule
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {slots.slice(0, config.maxSlots).map((slot, index) => (
              <View
                key={slot.id}
                className={`px-3 py-2 rounded-lg ${
                  slot.active
                    ? 'bg-success/20 border border-success/30'
                    : 'bg-background-secondary border border-border'
                }`}
              >
                <Text className={`text-xs font-semibold ${
                  slot.active ? 'text-success' : 'text-text-secondary'
                }`}>
                  Slot {index + 1}: {slot.active ? slot.advertiser : 'Empty'}
                </Text>
              </View>
            ))}
          </View>
          <Text className="text-text-secondary text-xs mt-3 text-center">
            Ads rotate every {config.rotationInterval} seconds across {config.maxSlots} slots
          </Text>
        </View>

        {/* Availability */}
        {availableSlots > 0 ? (
          <View className="bg-success/10 rounded-xl p-3 mb-4">
            <Text className="text-success font-semibold text-center text-sm">
              <Ionicons name="checkmark-circle" size={16} /> {availableSlots} slot{availableSlots > 1 ? 's' : ''} available
            </Text>
          </View>
        ) : (
          <View className="bg-error/10 rounded-xl p-3 mb-4">
            <Text className="text-error font-semibold text-center text-sm">
              <Ionicons name="close-circle" size={16} /> All slots occupied - Join waitlist
            </Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          onPress={() => handlePurchaseSlot(type)}
          disabled={availableSlots === 0}
          className={`rounded-xl p-4 ${
            availableSlots > 0 ? 'bg-primary' : 'bg-background-secondary'
          }`}
        >
          <Text className={`font-bold text-center ${
            availableSlots > 0 ? 'text-white' : 'text-text-secondary'
          }`}>
            <Ionicons name="cart" size={18} /> {
              availableSlots > 0 ? 'Purchase Slot' : 'Waitlist Only'
            }
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="p-6 pb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-text font-black text-3xl mb-2">Ad Slots</Text>
          <Text className="text-text-secondary text-base">
            Advertise on your hub with rotating ad slots
          </Text>
        </View>

        {/* My Active Ads — only show if wallet connected and has ads */}
        {wallet.connected && myAds.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="image" size={20} color="#FF9F66" />
              <Text className="text-text font-bold text-lg ml-2">My Active Ads</Text>
            </View>
            {myAds.map((ad) => (
              <View key={ad.id} className="bg-background-card rounded-2xl p-4 mb-3 border border-border">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center mr-3">
                      <Ionicons
                        name={ad.slotType === 'top' ? 'arrow-up-circle' : 'arrow-down-circle'}
                        size={22}
                        color="#FF9F66"
                      />
                    </View>
                    <View>
                      <Text className="text-text font-bold text-sm">
                        {ad.slotType === 'top' ? 'Top' : 'Bottom'} Slot
                      </Text>
                      <Text className="text-text-secondary text-xs">
                        {ad.remainingDays} days remaining
                      </Text>
                    </View>
                  </View>
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: `${getStatusColor(ad.status)}20` }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: getStatusColor(ad.status) }}
                    >
                      {getStatusLabel(ad.status)}
                    </Text>
                  </View>
                </View>

                {/* Stats row */}
                <View className="flex-row mb-3">
                  <View className="flex-1 bg-background-secondary rounded-lg p-2 mr-2 items-center">
                    <Text className="text-text font-bold text-sm">{ad.impressions.toLocaleString()}</Text>
                    <Text className="text-text-secondary text-xs">Impressions</Text>
                  </View>
                  <View className="flex-1 bg-background-secondary rounded-lg p-2 ml-2 items-center">
                    <Text className="text-text font-bold text-sm">{ad.clicks.toLocaleString()}</Text>
                    <Text className="text-text-secondary text-xs">Clicks</Text>
                  </View>
                </View>

                {/* URL preview */}
                <View className="bg-background-secondary rounded-lg p-2 mb-3">
                  <Text className="text-text-secondary text-xs" numberOfLines={1}>
                    <Ionicons name="image" size={10} color="#666" /> {ad.imageUrl}
                  </Text>
                  <Text className="text-text-secondary text-xs mt-1" numberOfLines={1}>
                    <Ionicons name="link" size={10} color="#666" /> {ad.landingUrl}
                  </Text>
                </View>

                {/* Edit Button */}
                <TouchableOpacity
                  onPress={() => handleEditCreative(ad)}
                  className="bg-primary/15 rounded-xl py-3 border border-primary/25"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="create" size={16} color="#FF9F66" />
                    <Text className="text-primary font-bold text-sm ml-2">
                      Edit Creative
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info Banner */}
        <View className="mx-6 mb-6 bg-primary/10 rounded-2xl p-4 border border-primary/30">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#FF9F66" />
            <View className="flex-1 ml-3">
              <Text className="text-primary font-bold mb-1">How Ad Rotation Works</Text>
              <Text className="text-text-secondary text-sm leading-5">
                Each slot rotates every 15 seconds among up to 8 advertisers. Your ad gets equal exposure with automatic rotation. All ads are reviewed by the admin before going live.
              </Text>
            </View>
          </View>
        </View>

        {/* Ad Slots */}
        <View className="px-6 pb-6">
          <SlotCard config={AD_CONFIG.TOP_SLOT} slots={topSlots} type="top" />
          <SlotCard config={AD_CONFIG.BOTTOM_SLOT} slots={bottomSlots} type="bottom" />
        </View>

        {/* Bulk Discount Info */}
        <View className="mx-6 mb-6 bg-background-card rounded-2xl p-5 border border-border">
          <Text className="text-text font-bold text-lg mb-3">
            <Ionicons name="pricetag" size={20} /> Volume Discounts
          </Text>
          <View className="space-y-2">
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">4 weeks</Text>
              <Text className="text-success font-semibold">10% OFF</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">12 weeks</Text>
              <Text className="text-success font-semibold">20% OFF</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">26 weeks</Text>
              <Text className="text-success font-semibold">30% OFF</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">52 weeks</Text>
              <Text className="text-success font-semibold">40% OFF</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-background rounded-t-3xl p-6 max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text font-black text-2xl">
                  Purchase {selectedSlot === 'top' ? 'Top' : 'Bottom'} Slot
                </Text>
                <TouchableOpacity onPress={() => { setShowPurchaseModal(false); setIsPurchasing(false); }}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Review notice */}
              <View className="bg-primary/10 rounded-xl p-3 mb-5 border border-primary/20">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={18} color="#FF9F66" />
                  <Text className="text-text-secondary text-sm ml-2 flex-1">
                    All ads are reviewed by the admin before going live
                  </Text>
                </View>
              </View>

              {/* Validation Errors */}
              <ValidationErrors errors={validationErrors} />

              {/* Form */}
              <View className="space-y-4">
                <View>
                  <Text className="text-text-secondary text-sm mb-2 mt-4">Ad Image URL</Text>
                  <TextInput
                    value={imageUrl}
                    onChangeText={(text) => { setImageUrl(text); setValidationErrors([]); }}
                    placeholder={`https://cdn.example.com/ad-${selectedSlot === 'top' ? '390x120' : '390x100'}.png`}
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {/* Image specs */}
                  <View className="bg-primary/10 rounded-lg p-3 mt-2 border border-primary/20">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="image" size={14} color="#FF9F66" />
                      <Text className="text-primary font-semibold text-xs ml-1">Image Specifications</Text>
                    </View>
                    <Text className="text-text-secondary text-xs">
                      Dimensions: {selectedSlot === 'top' ? '390 x 120 px' : '390 x 100 px'}
                    </Text>
                    <Text className="text-text-secondary text-xs">
                      Formats: PNG, JPG, or GIF (animated supported)
                    </Text>
                    <Text className="text-text-secondary text-xs">
                      Max file size: 2 MB | HTTPS only
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-text-secondary text-sm mb-2">Landing Page URL</Text>
                  <TextInput
                    value={landingUrl}
                    onChangeText={(text) => { setLandingUrl(text); setValidationErrors([]); }}
                    placeholder="https://yourproject.com"
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View>
                  <Text className="text-text-secondary text-sm mb-2">Duration (weeks)</Text>
                  <View className="flex-row items-center space-x-3">
                    <TouchableOpacity
                      onPress={() => setDuration(Math.max(1, duration - 1))}
                      className="bg-background-secondary w-12 h-12 rounded-xl items-center justify-center border border-border"
                    >
                      <Ionicons name="remove" size={24} color="#FF9F66" />
                    </TouchableOpacity>
                    <View className="flex-1 bg-background-secondary rounded-xl p-4 border border-border">
                      <Text className="text-text text-center font-bold text-lg">{duration}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDuration(duration + 1)}
                      className="bg-background-secondary w-12 h-12 rounded-xl items-center justify-center border border-border"
                    >
                      <Ionicons name="add" size={24} color="#FF9F66" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Price Calculation */}
                <View className="bg-primary/10 rounded-xl p-4 border border-primary/30">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-text-secondary">Base Price</Text>
                    <Text className="text-text font-semibold">
                      {((selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT.price : AD_CONFIG.BOTTOM_SLOT.price) * duration).toLocaleString()} $SKR
                    </Text>
                  </View>
                  {calculateDiscount(duration) > 0 && (
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-success">Discount ({(calculateDiscount(duration) * 100).toFixed(0)}%)</Text>
                      <Text className="text-success font-semibold">
                        -{((selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT.price : AD_CONFIG.BOTTOM_SLOT.price) * duration * calculateDiscount(duration)).toLocaleString()} $SKR
                      </Text>
                    </View>
                  )}
                  <View className="border-t border-primary/20 pt-2 mt-2">
                    <View className="flex-row justify-between">
                      <Text className="text-primary font-bold text-lg">Total</Text>
                      <Text className="text-primary font-black text-lg">
                        {(
                          ((selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT.price : AD_CONFIG.BOTTOM_SLOT.price) * duration) *
                          (1 - calculateDiscount(duration))
                        ).toLocaleString()} $SKR
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Purchase Button */}
                <TouchableOpacity
                  onPress={handleConfirmPurchase}
                  disabled={isPurchasing}
                  className={`rounded-xl p-4 mt-4 ${isPurchasing ? 'bg-gray-500' : 'bg-primary'}`}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name={isPurchasing ? 'hourglass' : 'shield-checkmark'} size={18} color="#fff" />
                    <Text className="text-white font-bold text-center text-lg ml-2">
                      {isPurchasing ? 'Processing...' : 'Purchase & Submit for Review'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Creative Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-background rounded-t-3xl p-6 max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text font-black text-2xl">Edit Creative</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Warning notice */}
              <View className="bg-primary/10 rounded-xl p-4 mb-5 border border-primary/20">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#FF9F66" />
                  <Text className="text-text-secondary text-sm ml-2 flex-1">
                    Modifying your creative will resubmit it for admin review. Your current ad continues to display until the new version is approved.
                  </Text>
                </View>
              </View>

              {/* Validation Errors */}
              <ValidationErrors errors={editValidationErrors} />

              {/* Form */}
              <View className="mt-4">
                <Text className="text-text-secondary text-sm mb-2">New Image URL</Text>
                <TextInput
                  value={editImageUrl}
                  onChangeText={(text) => { setEditImageUrl(text); setEditValidationErrors([]); }}
                  placeholder={`https://cdn.example.com/ad-${editingAd?.slotType === 'top' ? '390x120' : '390x100'}.png`}
                  placeholderTextColor="#666"
                  className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <View className="bg-primary/10 rounded-lg p-3 mt-2 border border-primary/20">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="image" size={14} color="#FF9F66" />
                    <Text className="text-primary font-semibold text-xs ml-1">Required Specifications</Text>
                  </View>
                  <Text className="text-text-secondary text-xs">
                    Dimensions: {editingAd?.slotType === 'top' ? '390 x 120 px' : '390 x 100 px'}
                  </Text>
                  <Text className="text-text-secondary text-xs">
                    Formats: PNG, JPG, or GIF | Max: 2 MB | HTTPS only
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-text-secondary text-sm mb-2">New Landing Page URL</Text>
                <TextInput
                  value={editLandingUrl}
                  onChangeText={(text) => { setEditLandingUrl(text); setEditValidationErrors([]); }}
                  placeholder="https://yourproject.com"
                  placeholderTextColor="#666"
                  className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitEdit}
                className="bg-primary rounded-xl p-4 mt-6"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text className="text-white font-bold text-center text-lg ml-2">
                    Submit for Review
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
