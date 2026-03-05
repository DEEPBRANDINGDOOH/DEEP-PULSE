/**
 * PulseOrb — Animated pulsing circle for backgrounds
 * Creates that modern "living" feel behind content
 */
import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export default function PulseOrb({
  color = '#FF9F66',
  size = 200,
  top = 0,
  left = 0,
  opacity = 0.08,
  delay = 0,
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(opacity * 0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: opacity,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: opacity * 0.6,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}
    />
  );
}
