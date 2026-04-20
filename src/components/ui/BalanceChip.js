/**
 * BalanceChip — persistent $SKR balance display for main screens.
 *
 * Shows the user's current $SKR balance with a subtle pulsing dot,
 * signaling the token-economy nature of the app at a glance.
 *
 * Usage:
 *   <BalanceChip onPress={() => navigation.navigate('Profile')} />
 */
import React, { useEffect, useRef } from 'react';
import { Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { useAppStore } from '../../store/appStore';

function formatBalance(n) {
  if (n == null) return '0';
  const num = Number(n) || 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function BalanceChip({ onPress, className = '' }) {
  const userBalance = useAppStore((state) => state.userBalance);
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Balance: ${formatBalance(userBalance)} SKR tokens`}
      activeOpacity={0.8}
      className={`flex-row items-center px-3 py-1.5 rounded-full bg-background-card border border-border ${className}`}
      style={{
        shadowColor: '#FF9F66',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <Animated.View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#FF9F66',
          marginRight: 6,
          opacity: pulse,
        }}
      />
      <Text className="text-text font-sans-bold text-xs">
        {formatBalance(userBalance)}
      </Text>
      <Text className="text-primary font-sans-bold text-xs ml-1">$SKR</Text>
    </TouchableOpacity>
  );
}
