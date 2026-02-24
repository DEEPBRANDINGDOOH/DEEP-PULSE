/**
 * GradientButton — Premium button with gradient-like effect and glow
 * Uses layered Views to simulate gradient without expo-linear-gradient
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function GradientButton({
  title,
  onPress,
  icon = null,
  disabled = false,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost'
  size = 'large', // 'small' | 'medium' | 'large'
  pulse = false,
  style = {},
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse && !disabled) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [pulse, disabled]);

  const sizeConfig = {
    small: { py: 'py-2.5', px: 'px-4', text: 'text-sm', iconSize: 16 },
    medium: { py: 'py-3', px: 'px-5', text: 'text-base', iconSize: 18 },
    large: { py: 'py-4', px: 'px-6', text: 'text-lg', iconSize: 22 },
  };

  const s = sizeConfig[size] || sizeConfig.large;

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        className={`rounded-2xl ${s.py} ${s.px} border border-primary/40`}
        style={style}
      >
        <View className="flex-row items-center justify-center">
          {icon && <Ionicons name={icon} size={s.iconSize} color="#FF9F66" style={{ marginRight: 8 }} />}
          <Text className={`text-primary font-bold ${s.text}`}>{title}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        className={`rounded-2xl ${s.py} ${s.px} bg-background-card border border-border`}
        style={[
          {
            shadowColor: '#FF9F66',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          },
          style,
        ]}
      >
        <View className="flex-row items-center justify-center">
          {icon && <Ionicons name={icon} size={s.iconSize} color="#FF9F66" style={{ marginRight: 8 }} />}
          <Text className={`text-text font-bold ${s.text}`}>{title}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Primary variant — simulated gradient with layered backgrounds
  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={{
          shadowColor: '#FF9F66',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: disabled ? 0 : 0.4,
          shadowRadius: 16,
          elevation: disabled ? 0 : 10,
        }}
      >
        <View
          className={`rounded-2xl ${s.py} ${s.px} overflow-hidden`}
          style={{ backgroundColor: disabled ? '#333' : '#FF9F66' }}
        >
          {/* Highlight overlay — simulates gradient top */}
          {!disabled && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            />
          )}
          <View className="flex-row items-center justify-center">
            {icon && <Ionicons name={icon} size={s.iconSize} color="#fff" style={{ marginRight: 8 }} />}
            <Text className={`text-white font-black ${s.text}`}>{title}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
