/**
 * Ad Type Selector Screen
 *
 * Intermediate screen between HubDashboard and AdSlotsScreen.
 * Organizes ad types into two categories:
 *   - In-App Ads: Top Ad Slot, Bottom Ad Slot
 *   - Out-of-App Ads: Lockscreen Ad, Rich Notification Ad
 *
 * Also shows a summary of active ads and volume discounts.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { PRICING } from '../config/constants';

// Mock active ads count (matches MOCK_MY_ADS in AdSlotsScreen)
const MOCK_ACTIVE_ADS_COUNT = 2;

// Ad type definitions
const AD_TYPES = {
  IN_APP: [
    {
      key: 'top',
      name: 'Top Ad Slot',
      icon: 'arrow-up-circle',
      price: PRICING.TOP_AD_SLOT,
      description: 'Premium placement above content feed',
      maxSlots: 8,
      occupiedSlots: 3, // Mock data
      rotationInfo: 'Rotates every 15s among up to 8 advertisers',
      dimensions: '390 x 120 px',
    },
    {
      key: 'bottom',
      name: 'Bottom Ad Slot',
      icon: 'arrow-down-circle',
      price: PRICING.BOTTOM_AD_SLOT,
      description: 'Standard placement below content feed',
      maxSlots: 8,
      occupiedSlots: 1, // Mock data
      rotationInfo: 'Rotates every 15s among up to 8 advertisers',
      dimensions: '390 x 100 px',
    },
  ],
  OUT_OF_APP: [
    {
      key: 'lockscreen',
      name: 'Lockscreen Ad',
      icon: 'phone-portrait',
      price: PRICING.LOCKSCREEN_AD,
      description: 'Full-screen premium overlay (Swipe-to-Earn)',
      maxSlots: 4,
      occupiedSlots: 2, // Mock data
      rotationInfo: 'Fixed display, max 4 advertisers',
      dimensions: '1080 x 1920 px',
      isPremium: true,
    },
    {
      key: 'rich_notif',
      name: 'Rich Notification Ad',
      icon: 'notifications',
      price: PRICING.PUSH_NOTIFICATION_AD,
      description: 'Branded push notification to all hub subscribers',
      maxSlots: null, // No slot limit
      occupiedSlots: null,
      rotationInfo: '1 guaranteed push per day for campaign duration',
      dimensions: 'Title + Body + CTA + optional image',
      isSponsored: true,
    },
  ],
};

// Volume discounts
const VOLUME_DISCOUNTS = [
  { weeks: 4, discount: '10%' },
  { weeks: 12, discount: '20%' },
  { weeks: 26, discount: '30%' },
  { weeks: 52, discount: '40%' },
];

export default function AdTypeSelectorScreen({ navigation, route }) {
  const { wallet } = useAppStore();
  const hubId = route.params?.hubId;
  const hubName = route.params?.hubName;

  const handleSelectType = (slotType) => {
    navigation.navigate('AdSlots', { slotType, hubId, hubName });
  };

  const AdTypeCard = ({ adType }) => {
    const available = adType.maxSlots ? adType.maxSlots - adType.occupiedSlots : null;

    return (
      <TouchableOpacity
        onPress={() => handleSelectType(adType.key)}
        className="bg-background-card rounded-2xl p-4 mb-3 border border-border"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          {/* Icon */}
          <View
            className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
              adType.isPremium ? 'bg-primary/15' : adType.isSponsored ? 'bg-success/15' : 'bg-primary/10'
            }`}
          >
            <Ionicons
              name={adType.icon}
              size={24}
              color={adType.isSponsored ? '#4CAF50' : '#FF9F66'}
            />
          </View>

          {/* Info */}
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-text font-bold text-base">{adType.name}</Text>
              {adType.isPremium && (
                <View className="bg-primary/20 rounded-full px-2 py-0.5 ml-2">
                  <Text className="text-primary text-xs font-bold">PREMIUM</Text>
                </View>
              )}
              {adType.isSponsored && (
                <View className="bg-yellow-500/20 rounded-full px-2 py-0.5 ml-2">
                  <Text className="text-yellow-400 text-xs font-bold">SPONSORED</Text>
                </View>
              )}
            </View>
            <Text className="text-text-secondary text-xs mt-0.5">{adType.description}</Text>
            <View className="flex-row items-center mt-2">
              <Text className="text-primary font-bold text-sm">
                {adType.price.toLocaleString()} $SKR/week
              </Text>
              {available !== null && (
                <Text className={`text-xs ml-3 font-semibold ${available > 0 ? 'text-success' : 'text-red-400'}`}>
                  {available > 0 ? `${available}/${adType.maxSlots} available` : 'All occupied'}
                </Text>
              )}
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>
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
            Choose your ad type to reach your audience
          </Text>
        </View>

        {/* In-App Ads Category */}
        <View className="px-6 mb-2">
          <View className="flex-row items-center mb-3">
            <Ionicons name="phone-portrait-outline" size={18} color="#FF9F66" />
            <Text className="text-primary font-bold text-sm ml-2 uppercase tracking-wider">In-App Ads</Text>
          </View>
          {AD_TYPES.IN_APP.map((adType) => (
            <AdTypeCard key={adType.key} adType={adType} />
          ))}
        </View>

        {/* Out-of-App Ads Category */}
        <View className="px-6 mb-2">
          <View className="flex-row items-center mb-3 mt-2">
            <Ionicons name="globe-outline" size={18} color="#FF9F66" />
            <Text className="text-primary font-bold text-sm ml-2 uppercase tracking-wider">Out-of-App Ads</Text>
          </View>
          {AD_TYPES.OUT_OF_APP.map((adType) => (
            <AdTypeCard key={adType.key} adType={adType} />
          ))}
        </View>

        {/* My Active Ads */}
        {(__DEV__ || wallet.connected) && MOCK_ACTIVE_ADS_COUNT > 0 && (
          <View className="px-6 mb-4">
            <TouchableOpacity
              onPress={() => handleSelectType('my_ads')}
              className="bg-background-card rounded-2xl p-4 border border-border flex-row items-center"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-xl bg-blue-500/10 items-center justify-center mr-4">
                <Ionicons name="image" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-text font-bold text-base">My Active Ads</Text>
                <Text className="text-text-secondary text-xs">
                  {MOCK_ACTIVE_ADS_COUNT} active campaign{MOCK_ACTIVE_ADS_COUNT > 1 ? 's' : ''}
                </Text>
              </View>
              <View className="bg-blue-500/20 rounded-full px-2.5 py-1 mr-2">
                <Text className="text-blue-400 text-xs font-bold">{MOCK_ACTIVE_ADS_COUNT}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Volume Discounts */}
        <View className="mx-6 mb-6 bg-background-card rounded-2xl p-5 border border-border">
          <View className="flex-row items-center mb-3">
            <Ionicons name="pricetag" size={20} color="#FF9F66" />
            <Text className="text-text font-bold text-lg ml-2">Volume Discounts</Text>
          </View>
          <Text className="text-text-secondary text-xs mb-3">
            Book longer campaigns and save on all ad types
          </Text>
          {VOLUME_DISCOUNTS.map((d, i) => (
            <View key={i} className="flex-row justify-between py-2">
              <Text className="text-text-secondary">{d.weeks} weeks</Text>
              <Text className="text-success font-semibold">{d.discount} OFF</Text>
            </View>
          ))}
        </View>

        {/* How it works info */}
        <View className="mx-6 mb-6 bg-primary/10 rounded-2xl p-4 border border-primary/30">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#FF9F66" />
            <View className="flex-1 ml-3">
              <Text className="text-primary font-bold mb-1">How It Works</Text>
              <Text className="text-text-secondary text-sm leading-5">
                1. Select an ad type{'\n'}
                2. Upload your creative or enter details{'\n'}
                3. Pay with $SKR tokens{'\n'}
                4. Ad is submitted for admin review{'\n'}
                5. Once approved, your ad goes live!
              </Text>
            </View>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
