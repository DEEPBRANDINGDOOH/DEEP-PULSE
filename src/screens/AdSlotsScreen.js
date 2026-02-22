/**
 * Ad Slots Screen
 * 
 * Allows brands to purchase ad slots on their hubs
 * - Top Ad Slot: 2,000 $SKR/week (8 max, rotates every 15s)
 * - Bottom Ad Slot: 1,500 $SKR/week (8 max, rotates every 15s)
 * 
 * Features:
 * - View available slots
 * - Purchase slots with $SKR
 * - Upload ad creative
 * - Set landing page URL
 * - View rotation schedule
 * - Analytics dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';

// Ad Slot Configuration
const AD_CONFIG = {
  TOP_SLOT: {
    price: 2000, // $SKR per week
    maxSlots: 8,
    rotationInterval: 15, // seconds
    width: 390,
    height: 80,
    position: 'top',
    name: 'Top Ad Slot',
    description: 'Premium placement above content feed',
    avgViews: 3125, // per week per slot
  },
  BOTTOM_SLOT: {
    price: 1500, // $SKR per week
    maxSlots: 8,
    rotationInterval: 15, // seconds
    width: 390,
    height: 60,
    position: 'bottom',
    name: 'Bottom Ad Slot',
    description: 'Standard placement below content feed',
    avgViews: 2500, // per week per slot
  },
};

export default function AdSlotsScreen({ route, navigation }) {
  const { hubId } = route.params || {};
  const { wallet } = useAppStore();
  
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  // Purchase form state
  const [imageUrl, setImageUrl] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [duration, setDuration] = useState(1); // weeks
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Mock data - in production, fetch from blockchain
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
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!imageUrl.trim() || !landingUrl.trim()) {
      Alert.alert('Missing Information', 'Please provide both image URL and landing page URL');
      return;
    }

    // Validate URLs
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(imageUrl) || !urlRegex.test(landingUrl)) {
      Alert.alert('Invalid URL', 'Please provide valid URLs starting with http:// or https://');
      return;
    }

    setIsPurchasing(true);

    const config = selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT : AD_CONFIG.BOTTOM_SLOT;
    const totalCost = config.price * duration;

    try {
      // In production: Create transaction to pay for ad slot
      Alert.alert(
        'Confirm Purchase',
        `Purchase ${config.name}?\n\nCost: ${totalCost} $SKR (${duration} week${duration > 1 ? 's' : ''})\nRotation: Every ${config.rotationInterval}s with up to ${config.maxSlots} ads\n\nThis demo uses a simulated transaction.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setIsPurchasing(false) },
          {
            text: 'Purchase',
            onPress: async () => {
              try {
                // Simulate transaction
                await new Promise(resolve => setTimeout(resolve, 2000));

                Alert.alert(
                  'Ad Slot Purchased!',
                  `Your ${config.name} is now active!\n\n• Rotation: Every ${config.rotationInterval} seconds\n• Position: ${config.maxSlots} slots max\n• Duration: ${duration} week${duration > 1 ? 's' : ''}\n• Expected views: ~${config.avgViews * duration}\n\nYour ad will start showing immediately.`,
                  [{
                    text: 'OK',
                    onPress: () => {
                      setShowPurchaseModal(false);
                    }
                  }]
                );

                // Reset form
                setImageUrl('');
                setLandingUrl('');
                setDuration(1);
                setShowPurchaseModal(false);
              } catch (error) {
                Alert.alert('Error', 'Failed to purchase ad slot. Please try again.');
              } finally {
                setIsPurchasing(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to purchase ad slot');
      setIsPurchasing(false);
    }
  };

  const calculateDiscount = (weeks) => {
    if (weeks >= 52) return 0.40; // 40% off
    if (weeks >= 26) return 0.30; // 30% off
    if (weeks >= 12) return 0.20; // 20% off
    if (weeks >= 4) return 0.10; // 10% off
    return 0;
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
          <View className="flex-row justify-between">
            <Text className="text-text-secondary text-sm">Avg Views/Week</Text>
            <Text className="text-text font-semibold text-sm">~{config.avgViews.toLocaleString()}</Text>
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
            availableSlots > 0 
              ? 'bg-primary' 
              : 'bg-background-secondary'
          }`}
        >
          <Text className={`font-bold text-center ${
            availableSlots > 0 ? 'text-white' : 'text-text-secondary'
          }`}>
            <Ionicons name="cart" size={18} /> {
              availableSlots > 0 
                ? 'Purchase Slot' 
                : 'Waitlist Only'
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

        {/* Info Banner */}
        <View className="mx-6 mb-6 bg-primary/10 rounded-2xl p-4 border border-primary/30">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#FF9F66" />
            <View className="flex-1 ml-3">
              <Text className="text-primary font-bold mb-1">How Ad Rotation Works</Text>
              <Text className="text-text-secondary text-sm leading-5">
                Each slot rotates every 15 seconds among up to 8 advertisers. Your ad gets equal exposure with automatic rotation. Analytics provided in real-time.
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
                <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View className="space-y-4">
                <View>
                  <Text className="text-text-secondary text-sm mb-2">Ad Image URL</Text>
                  <TextInput
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder={`https://example.com/ad-${selectedSlot === 'top' ? '390x80' : '390x60'}.png`}
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    autoCapitalize="none"
                  />
                  <Text className="text-text-secondary text-xs mt-1">
                    Size: {selectedSlot === 'top' ? '390×80px' : '390×60px'} (PNG, JPG, or GIF)
                  </Text>
                </View>

                <View>
                  <Text className="text-text-secondary text-sm mb-2">Landing Page URL</Text>
                  <TextInput
                    value={landingUrl}
                    onChangeText={setLandingUrl}
                    placeholder="https://yourproject.com"
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    autoCapitalize="none"
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

                {/* Rotation Info */}
                <View className="bg-background-secondary rounded-xl p-4 border border-border">
                  <Text className="text-text font-semibold mb-2">
                    <Ionicons name="sync" size={16} /> Rotation Details
                  </Text>
                  <Text className="text-text-secondary text-sm mb-1">
                    • Rotates every 15 seconds
                  </Text>
                  <Text className="text-text-secondary text-sm mb-1">
                    • Up to 8 ads per slot
                  </Text>
                  <Text className="text-text-secondary text-sm">
                    • Equal exposure for all advertisers
                  </Text>
                </View>

                {/* Purchase Button */}
                <TouchableOpacity
                  onPress={handleConfirmPurchase}
                  disabled={isPurchasing}
                  className={`rounded-xl p-4 mt-4 ${isPurchasing ? 'bg-gray-500' : 'bg-primary'}`}
                >
                  <Text className="text-white font-bold text-center text-lg">
                    {isPurchasing ? 'Processing...' : `Purchase for ${(
                      ((selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT.price : AD_CONFIG.BOTTOM_SLOT.price) * duration) * 
                      (1 - calculateDiscount(duration))
                    ).toLocaleString()} $SKR`}
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
