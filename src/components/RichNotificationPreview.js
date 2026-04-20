/**
 * RichNotificationPreview — animated showcase of the app's killer ad feature.
 *
 * Cycles through 3 mock "sponsored lockscreen push" notifications, sliding in
 * from the right every 4 seconds with realistic iOS/Android lockscreen styling.
 * This explains visually why Rich Notification Ads cost 1500 $SKR/week vs 600.
 *
 * Usage: mount on DiscoverScreen or a landing section.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const MOCK_RICH_NOTIFS = [
  {
    brand: 'Solana Mobile',
    icon: 'phone-portrait',
    accent: '#14F195',
    title: 'Seeker drops in 48h',
    body: 'Reserve your device now — exclusive DEEP Pulse perks for early buyers.',
    cta: 'Reserve',
  },
  {
    brand: 'Claynosaurz',
    icon: 'cube',
    accent: '#FF6B6B',
    title: 'Genesis mint live',
    body: '2000 Claymakers minted. Last 500 spots before public release.',
    cta: 'Mint now',
  },
  {
    brand: 'Nobody Sausage',
    icon: 'flame',
    accent: '#FF9F66',
    title: 'DAO vote open',
    body: 'Vote on S2 merch drop. Holders get 20% off — 6h remaining.',
    cta: 'Vote',
  },
];

export default function RichNotificationPreview() {
  const [activeIdx, setActiveIdx] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Slide out current
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -40,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Swap content + reset position off-screen right
        setActiveIdx((prev) => (prev + 1) % MOCK_RICH_NOTIFS.length);
        slideX.setValue(40);
        // Slide in new
        Animated.parallel([
          Animated.timing(slideX, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [slideX, opacity]);

  const notif = MOCK_RICH_NOTIFS[activeIdx];

  return (
    <View className="mx-6 mb-6">
      {/* Section label */}
      <View className="flex-row items-center mb-3">
        <View
          className="w-7 h-7 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255,159,102,0.15)' }}
        >
          <Ionicons name="sparkles" size={14} color="#FF9F66" />
        </View>
        <Text className="text-text font-sans-bold text-base ml-2">Rich Notification Ads</Text>
        <View className="ml-2 bg-primary/15 rounded-full px-2 py-0.5">
          <Text className="text-primary text-[9px] font-sans-bold" style={{ letterSpacing: 0.5 }}>
            PREMIUM
          </Text>
        </View>
      </View>

      {/* Mock lockscreen frame */}
      <View
        className="bg-background-card rounded-2xl overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: '#2a2a30',
          shadowColor: '#FF9F66',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 10,
          height: 140,
          padding: 14,
          justifyContent: 'center',
        }}
      >
        {/* Lockscreen gradient hint */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: '#FF9F66',
            opacity: 0.7,
          }}
        />

        <Animated.View
          style={{
            transform: [{ translateX: slideX }],
            opacity,
          }}
        >
          <View className="flex-row items-start">
            <View
              className="w-9 h-9 rounded-lg items-center justify-center"
              style={{ backgroundColor: notif.accent + '22' }}
            >
              <Ionicons name={notif.icon} size={18} color={notif.accent} />
            </View>
            <View className="flex-1 ml-3">
              <View className="flex-row items-center">
                <Text className="text-text font-sans-bold text-sm flex-1" numberOfLines={1}>
                  {notif.brand}
                </Text>
                <View className="bg-primary/15 rounded-sm px-1.5 py-0.5">
                  <Text className="text-primary text-[8px] font-sans-bold" style={{ letterSpacing: 0.5 }}>
                    SPONSORED
                  </Text>
                </View>
                <Text className="text-text-muted text-[10px] ml-2">now</Text>
              </View>
              <Text
                className="text-text font-sans-semibold text-sm mt-1"
                numberOfLines={1}
              >
                {notif.title}
              </Text>
              <Text className="text-text-secondary text-xs mt-0.5" numberOfLines={2}>
                {notif.body}
              </Text>
              <View
                className="self-start mt-2 rounded-lg px-3 py-1"
                style={{ backgroundColor: notif.accent + '22', borderWidth: 1, borderColor: notif.accent + '55' }}
              >
                <Text className="font-sans-bold text-xs" style={{ color: notif.accent }}>
                  {notif.cta} →
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Dots indicator */}
      <View className="flex-row justify-center mt-3">
        {MOCK_RICH_NOTIFS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === activeIdx ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeIdx ? '#FF9F66' : '#2a2a30',
              marginHorizontal: 3,
            }}
          />
        ))}
      </View>

      {/* Subtle copy */}
      <Text className="text-text-muted text-[11px] text-center mt-2 italic">
        Brands pay 1,500 $SKR/week to reach your lockscreen
      </Text>
    </View>
  );
}
