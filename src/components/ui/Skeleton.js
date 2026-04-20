/**
 * Skeleton — Shimmering placeholder for loading states.
 *
 * Usage:
 *   <SkeletonCard />               // generic card-sized skeleton
 *   <SkeletonCard height={80} />   // custom height
 *   <SkeletonList count={3} />     // stack of 3
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

export function SkeletonCard({ height = 96, className = '', style = {} }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={`bg-background-card rounded-2xl overflow-hidden mb-3 ${className}`}
      style={[
        {
          height,
          opacity,
          borderWidth: 1,
          borderColor: '#25252b',
        },
        style,
      ]}
    >
      {/* Inner content suggestion — avatar + 2 lines */}
      <View className="flex-row items-center p-4" style={{ height: '100%' }}>
        <View className="w-10 h-10 rounded-full" style={{ backgroundColor: '#222228' }} />
        <View className="flex-1 ml-3">
          <View className="h-3 rounded" style={{ backgroundColor: '#222228', width: '60%', marginBottom: 8 }} />
          <View className="h-2 rounded" style={{ backgroundColor: '#222228', width: '85%' }} />
        </View>
      </View>
    </Animated.View>
  );
}

export function SkeletonList({ count = 3, height = 96 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={height} />
      ))}
    </View>
  );
}

export default SkeletonCard;
