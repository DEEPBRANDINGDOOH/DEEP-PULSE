/**
 * AdRotation Component
 * 
 * Automatically rotates ads every 15 seconds
 * Handles both Top and Bottom ad slots
 * Tracks impressions and clicks
 * 
 * Features:
 * - 15-second rotation timer
 * - Up to 8 ads per slot
 * - Fair rotation algorithm
 * - Click tracking
 * - Impression tracking
 * - Smooth transitions
 * - Loading states
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Ad Rotation Configuration
const ROTATION_CONFIG = {
  INTERVAL: 15, // seconds
  MAX_ADS: 8,
  TRANSITION_DURATION: 300, // ms
};

export default function AdRotation({ 
  ads = [], 
  slotType = 'top', // 'top' or 'bottom'
  onAdClick = null,
  onAdImpression = null,
  style = {},
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  // Filter active ads (max 8)
  const activeAds = ads.slice(0, ROTATION_CONFIG.MAX_ADS).filter(ad => ad.active);

  // Get current ad
  const currentAd = activeAds[currentIndex];

  // Slot dimensions — larger for better visibility
  const slotHeight = slotType === 'top' ? 120 : 100;

  // Track impression when ad changes
  useEffect(() => {
    if (currentAd && onAdImpression) {
      onAdImpression({
        adId: currentAd.id,
        advertiserId: currentAd.advertiserId,
        slotType,
        timestamp: new Date().toISOString(),
      });
    }
  }, [currentIndex, currentAd]);

  // Rotation timer
  useEffect(() => {
    if (activeAds.length === 0) return;

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start rotation
    timerRef.current = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ROTATION_CONFIG.TRANSITION_DURATION,
        useNativeDriver: true,
      }).start(() => {
        // Change ad
        setCurrentIndex((prev) => (prev + 1) % activeAds.length);
        
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ROTATION_CONFIG.TRANSITION_DURATION,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATION_CONFIG.INTERVAL * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeAds.length, fadeAnim]);

  // Handle ad click
  const handleAdClick = async () => {
    if (!currentAd || !currentAd.landingUrl) return;

    // Track click
    if (onAdClick) {
      onAdClick({
        adId: currentAd.id,
        advertiserId: currentAd.advertiserId,
        slotType,
        landingUrl: currentAd.landingUrl,
        timestamp: new Date().toISOString(),
      });
    }

    // Open landing page
    try {
      const supported = await Linking.canOpenURL(currentAd.landingUrl);
      if (supported) {
        await Linking.openURL(currentAd.landingUrl);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open landing page');
    }
  };

  // No ads available
  if (activeAds.length === 0) {
    return (
      <View 
        className="bg-background-secondary border border-border rounded-xl items-center justify-center"
        style={[{ height: slotHeight }, style]}
      >
        <Ionicons name="megaphone-outline" size={32} color="#666" />
        <Text className="text-text-secondary text-sm mt-2">
          No ads available
        </Text>
        <Text className="text-text-secondary text-xs mt-1">
          Purchase a {slotType} slot to advertise here
        </Text>
      </View>
    );
  }

  // Loading state
  if (!currentAd) {
    return (
      <View 
        className="bg-background-secondary border border-border rounded-xl items-center justify-center"
        style={[{ height: slotHeight }, style]}
      >
        <ActivityIndicator size="small" color="#FF9F66" />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          height: slotHeight,
          opacity: fadeAnim,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handleAdClick}
        activeOpacity={0.8}
        className="relative rounded-xl overflow-hidden border border-border bg-background-secondary"
        style={{ height: slotHeight }}
      >
        {/* Ad Image */}
        {currentAd.imageUrl ? (
          <Image
            source={{ uri: currentAd.imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-background-card">
            <Ionicons name="image-outline" size={32} color="#666" />
            <Text className="text-text-secondary text-xs mt-2">Ad Image</Text>
          </View>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <View className="absolute inset-0 bg-background-secondary items-center justify-center">
            <ActivityIndicator size="small" color="#FF9F66" />
          </View>
        )}

        {/* Ad Badge */}
        <View className="absolute top-2 left-2">
          <View className="bg-black/70 px-2 py-1 rounded">
            <Text className="text-white text-xs font-semibold">
              Ad {currentIndex + 1}/{activeAds.length}
            </Text>
          </View>
        </View>

        {/* Slot Type Badge */}
        <View className="absolute top-2 right-2">
          <View className="bg-primary/80 px-2 py-1 rounded">
            <Text className="text-white text-xs font-bold uppercase">
              {slotType}
            </Text>
          </View>
        </View>

        {/* Rotation Indicator */}
        <View className="absolute bottom-2 left-2 right-2">
          <View className="bg-black/70 rounded-full h-1 overflow-hidden">
            <RotationProgress 
              duration={ROTATION_CONFIG.INTERVAL}
              key={currentIndex} // Reset on ad change
            />
          </View>
        </View>

        {/* Click indicator */}
        <View className="absolute bottom-2 right-2">
          <View className="bg-black/70 px-2 py-1 rounded-full flex-row items-center">
            <Ionicons name="open-outline" size={12} color="#fff" />
            <Text className="text-white text-xs ml-1 font-semibold">
              Tap to visit
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Rotation Progress Bar
 * Shows visual progress of 15-second rotation
 */
function RotationProgress({ duration }) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate from 0 to 100% over duration
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start();
  }, []);

  const width = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      className="h-full bg-primary"
      style={{ width }}
    />
  );
}

/**
 * Ad Rotation Manager (Analytics & State)
 * Tracks all impressions and clicks
 */
export class AdRotationManager {
  static impressions = [];
  static clicks = [];

  static trackImpression(data) {
    this.impressions.push({
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    // In production: Send to analytics server
    console.log('[AdRotation] Impression:', data);
  }

  static trackClick(data) {
    this.clicks.push({
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    // In production: Send to analytics server
    console.log('[AdRotation] Click:', data);
  }

  static getStats(adId) {
    const impressions = this.impressions.filter(i => i.adId === adId).length;
    const clicks = this.clicks.filter(c => c.adId === adId).length;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return {
      impressions,
      clicks,
      ctr: ctr.toFixed(2),
    };
  }

  static getAllStats() {
    const adIds = [...new Set([
      ...this.impressions.map(i => i.adId),
      ...this.clicks.map(c => c.adId),
    ])];

    return adIds.map(adId => ({
      adId,
      ...this.getStats(adId),
    }));
  }

  static clearStats() {
    this.impressions = [];
    this.clicks = [];
  }
}
