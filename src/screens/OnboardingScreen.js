import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';
import PulseOrb from '../components/ui/PulseOrb';
import GradientButton from '../components/ui/GradientButton';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Welcome to\nDEEP Pulse',
    subtitle: 'Your Web3 Notification Hub',
    description: 'Stay connected to your favorite Solana projects in real-time',
    icon: 'notifications',
    color: '#FF9F66',
    orbColor2: '#e88b52',
  },
  {
    id: 2,
    title: 'Subscribe\nfor FREE',
    subtitle: 'Zero cost, full access',
    description: 'Get instant notifications from hubs you love — completely free, no wallet needed',
    icon: 'rocket',
    color: '#4CAF50',
    orbColor2: '#2E7D32',
  },
  {
    id: 3,
    title: 'Engage\n& Earn $SKR',
    subtitle: 'Your voice has value',
    description: 'Send feedback, submit talent profiles, propose ideas — earn $SKR tokens for your contributions',
    icon: 'diamond',
    color: '#2196F3',
    orbColor2: '#1565C0',
  },
  {
    id: 4,
    title: 'DAO\nGovernance',
    subtitle: 'Shape the future',
    description: 'Fund proposals, vote on ideas, grow communities — only 5% platform fee',
    icon: 'people',
    color: '#9C27B0',
    orbColor2: '#6A1B9A',
  },
];

/**
 * Animated slide content — each element animates in with stagger
 */
function AnimatedSlideContent({ slide, isActive, isLastSlide, onGetStarted, onConnectWallet, isConnecting }) {
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const descTranslate = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(40)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Reset all values
      iconScale.setValue(0);
      iconRotate.setValue(0);
      titleOpacity.setValue(0);
      titleTranslate.setValue(30);
      subtitleOpacity.setValue(0);
      descOpacity.setValue(0);
      descTranslate.setValue(20);
      buttonsOpacity.setValue(0);
      buttonsTranslate.setValue(40);
      ringScale.setValue(0.6);
      ringOpacity.setValue(0);

      // Staggered entrance animations
      Animated.sequence([
        // Ring expands
        Animated.parallel([
          Animated.spring(ringScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        // Icon bounces in
        Animated.parallel([
          Animated.spring(iconScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
          Animated.timing(iconRotate, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        // Title slides up
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(titleTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        // Subtitle fades in
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        // Description slides up
        Animated.parallel([
          Animated.timing(descOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(descTranslate, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
        // Buttons slide up (last slide only)
        ...(isLastSlide ? [
          Animated.parallel([
            Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(buttonsTranslate, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
          ]),
        ] : []),
      ]).start();

      // Continuous ring pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isActive]);

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width }} className="flex-1 items-center justify-center px-8">
      {/* Animated ring behind icon */}
      <Animated.View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 2,
          borderColor: `${slide.color}30`,
          position: 'absolute',
          top: height * 0.12,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />

      {/* Outer glow ring */}
      <Animated.View
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: `${slide.color}15`,
          position: 'absolute',
          top: height * 0.1,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />

      {/* Icon Container */}
      <Animated.View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: `${slide.color}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40,
          transform: [{ scale: iconScale }],
          shadowColor: slide.color,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 15,
        }}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name={slide.icon} size={56} color={slide.color} />
        </Animated.View>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        className="text-text font-black text-center"
        style={{
          fontSize: 38,
          lineHeight: 44,
          letterSpacing: -1,
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslate }],
        }}
      >
        {slide.title}
      </Animated.Text>

      {/* Subtitle badge */}
      <Animated.View
        style={{
          opacity: subtitleOpacity,
          marginTop: 16,
          backgroundColor: `${slide.color}15`,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: `${slide.color}25`,
        }}
      >
        <Text style={{ color: slide.color, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>
          {slide.subtitle}
        </Text>
      </Animated.View>

      {/* Description */}
      <Animated.Text
        className="text-text-secondary text-center"
        style={{
          fontSize: 16,
          lineHeight: 24,
          marginTop: 20,
          paddingHorizontal: 12,
          opacity: descOpacity,
          transform: [{ translateY: descTranslate }],
        }}
      >
        {slide.description}
      </Animated.Text>

      {/* Action Buttons (last slide) */}
      {isLastSlide && (
        <Animated.View
          style={{
            marginTop: 48,
            width: '100%',
            paddingHorizontal: 8,
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslate }],
          }}
        >
          {/* Primary: Get Started */}
          <GradientButton
            title="Get Started"
            icon="arrow-forward-circle"
            onPress={onGetStarted}
            pulse={true}
          />

          {/* Secondary: Connect Wallet */}
          <View style={{ marginTop: 12 }}>
            <GradientButton
              title={isConnecting ? 'Connecting...' : 'Connect Wallet'}
              icon={isConnecting ? null : 'wallet'}
              onPress={onConnectWallet}
              disabled={isConnecting}
              variant="secondary"
            />
          </View>

          <Text className="text-text-muted text-xs text-center mt-4">
            Wallet only needed for $SKR transactions
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const scrollViewRef = useRef(null);
  const { setWallet } = useAppStore();

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const result = await walletAdapter.connect();
      setWallet({
        connected: true,
        publicKey: result.publicKey,
        authToken: result.authToken,
      });
      Alert.alert(
        'Wallet Connected',
        `Connected to ${result.label || 'wallet'}`,
        [{ text: 'OK', onPress: () => navigation.replace('MainApp') }]
      );
    } catch (error) {
      console.error('Wallet connection error:', error);
      let errorMessage = 'Failed to connect wallet. Please try again.';
      if (error.message?.includes('declined')) {
        errorMessage = 'You declined the wallet connection.';
      } else if (error.message?.includes('No wallet')) {
        errorMessage = 'No compatible wallet app found. Please install Phantom or Solflare.';
      }
      Alert.alert('Connection Failed', errorMessage, [
        { text: 'Try Again', style: 'cancel' },
        { text: 'Continue as Guest', onPress: () => navigation.replace('MainApp') },
      ]);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({ x: nextSlide * width, animated: true });
    }
  };

  const handleSkip = () => {
    navigation.replace('MainApp');
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentSlide) {
      setCurrentSlide(slideIndex);
    }
  };

  const currentColor = SLIDES[currentSlide]?.color || '#FF9F66';

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Dynamic background orbs — change color with slide */}
      <PulseOrb color={currentColor} size={300} top={-100} left={-100} opacity={0.07} delay={0} />
      <PulseOrb color={SLIDES[currentSlide]?.orbColor2 || '#e88b52'} size={200} top={height * 0.5} left={width - 80} opacity={0.05} delay={1000} />
      <PulseOrb color={currentColor} size={150} top={height * 0.7} left={-50} opacity={0.04} delay={2000} />

      {/* Skip Button */}
      <View className="absolute top-4 right-6 z-10">
        <TouchableOpacity
          onPress={handleSkip}
          className="px-4 py-2 rounded-full bg-background-card border border-border"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-text-secondary text-sm font-bold">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <AnimatedSlideContent
            key={slide.id}
            slide={slide}
            isActive={index === currentSlide}
            isLastSlide={index === SLIDES.length - 1}
            onGetStarted={() => navigation.replace('MainApp')}
            onConnectWallet={handleConnectWallet}
            isConnecting={isConnecting}
          />
        ))}
      </ScrollView>

      {/* Bottom: Dots + Next button */}
      <View className="pb-8 px-8">
        {/* Dots Indicator — modern capsule style */}
        <View className="flex-row justify-center mb-6">
          {SLIDES.map((slide, index) => (
            <View
              key={index}
              className="h-1.5 rounded-full mx-1"
              style={{
                width: index === currentSlide ? 32 : 8,
                backgroundColor: index === currentSlide ? currentColor : '#2a2a30',
                shadowColor: index === currentSlide ? currentColor : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
              }}
            />
          ))}
        </View>

        {/* Next Button (not on last slide) */}
        {currentSlide < SLIDES.length - 1 && (
          <GradientButton
            title="Next"
            icon="arrow-forward"
            onPress={handleNext}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
