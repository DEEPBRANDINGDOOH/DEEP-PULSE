/**
 * GenesisHero — full-width showcase card for Solana Mobile Seeker Genesis Token holders.
 *
 * Only renders when `hasGenesisToken === true`. Highlights the perks (multiplier,
 * priority access, boosts) with a gradient gold border. Replaces the tiny "SEEKER"
 * badge with a proper feature showcase.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../../store/appStore';

export default function GenesisHero() {
  const hasGenesisToken = useAppStore((state) => state.hasGenesisToken);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasGenesisToken) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasGenesisToken, shimmer]);

  if (!hasGenesisToken) return null;

  const glowOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });

  return (
    <View
      className="rounded-2xl p-5 mb-4 overflow-hidden"
      style={{
        backgroundColor: '#16161a',
        borderWidth: 1.5,
        borderColor: '#EAB308',
        shadowColor: '#EAB308',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {/* Animated gold glow overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#EAB308',
          opacity: glowOpacity.interpolate({
            inputRange: [0.25, 0.55],
            outputRange: [0.03, 0.08],
          }),
        }}
      />

      {/* Top gold accent line */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: '#EAB308',
          opacity: glowOpacity,
        }}
      />

      {/* Header */}
      <View className="flex-row items-center mb-3">
        <View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{ backgroundColor: 'rgba(234,179,8,0.18)' }}
        >
          <Ionicons name="diamond" size={22} color="#EAB308" />
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-text font-sans-bold text-base">Seeker Genesis Holder</Text>
            <View
              className="ml-2 rounded-full px-2 py-0.5"
              style={{ backgroundColor: 'rgba(234,179,8,0.15)' }}
            >
              <Text style={{ fontSize: 9, color: '#EAB308', fontWeight: '800', letterSpacing: 0.5 }}>
                VERIFIED
              </Text>
            </View>
          </View>
          <Text className="text-text-muted text-xs mt-0.5">Solana Mobile exclusive</Text>
        </View>
      </View>

      {/* Perks list */}
      <View className="mt-2">
        <Perk icon="flash" color="#EAB308" text="+15% DEEP Score bonus on every action" />
        <Perk icon="rocket" color="#EAB308" text="Priority access to new hubs" />
        <Perk icon="gift" color="#EAB308" text="Exclusive ad-free feed option" />
        <Perk icon="trophy" color="#EAB308" text="Early access to DAO Boost proposals" />
      </View>
    </View>
  );
}

function Perk({ icon, color, text }) {
  return (
    <View className="flex-row items-center py-1.5">
      <Ionicons name={icon} size={14} color={color} />
      <Text className="text-text-secondary text-sm ml-2.5 flex-1">{text}</Text>
    </View>
  );
}
