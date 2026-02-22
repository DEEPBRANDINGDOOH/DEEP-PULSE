import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Welcome to DEEP Pulse',
    subtitle: 'Your Web3 Notification Hub',
    description: 'Stay connected to your favorite Solana projects in real-time',
    icon: 'notifications',
    color: '#FF9F66',
  },
  {
    id: 2,
    title: 'Subscribe for FREE',
    subtitle: 'Zero cost, full access',
    description: 'Get instant notifications from hubs you love — completely free, no wallet needed',
    icon: 'rocket',
    color: '#4CAF50',
  },
  {
    id: 3,
    title: 'Engage & Earn $SKR',
    subtitle: 'Your voice has value',
    description: 'Send feedback, submit talent profiles, propose ideas — earn $SKR tokens',
    icon: 'diamond',
    color: '#2196F3',
  },
  {
    id: 4,
    title: 'DAO Governance',
    subtitle: 'Shape the future',
    description: 'Fund proposals, vote on ideas, grow communities — only 5% platform fee',
    icon: 'people',
    color: '#9C27B0',
  },
];

function PulsingRing({ color, size, delay = 0 }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.1, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.9, duration: 2000, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}
    />
  );
}

function IconBounce({ icon, color }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 160, width: 160, marginBottom: 32 }}>
      <PulsingRing color={color} size={160} delay={0} />
      <PulsingRing color={color} size={200} delay={500} />
      <Animated.View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: `${color}20`,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
          shadowColor: color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        <Ionicons name={icon} size={44} color={color} />
      </Animated.View>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0c0c0e' }}>
      {/* Skip Button */}
      <View style={{ position: 'absolute', top: 16, right: 24, zIndex: 10 }}>
        <TouchableOpacity
          onPress={handleSkip}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: '#16161a',
            borderWidth: 1,
            borderColor: '#2a2a30',
          }}
        >
          <Text style={{ color: '#9898a0', fontSize: 13, fontWeight: '700' }}>Skip</Text>
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
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, index) => (
          <View
            key={slide.id}
            style={{
              width,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
            }}
          >
            {/* Animated Icon */}
            <IconBounce icon={slide.icon} color={slide.color} />

            {/* Title */}
            <Text
              style={{
                color: '#fafafa',
                fontSize: 30,
                fontWeight: '900',
                textAlign: 'center',
                letterSpacing: -0.5,
                marginBottom: 12,
              }}
            >
              {slide.title}
            </Text>

            {/* Subtitle badge */}
            <View
              style={{
                backgroundColor: `${slide.color}20`,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: `${slide.color}30`,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: slide.color, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>
                {slide.subtitle}
              </Text>
            </View>

            {/* Description */}
            <Text
              style={{
                color: '#9898a0',
                fontSize: 15,
                lineHeight: 22,
                textAlign: 'center',
                paddingHorizontal: 8,
              }}
            >
              {slide.description}
            </Text>

            {/* Action Buttons (last slide only) */}
            {index === SLIDES.length - 1 && (
              <View style={{ marginTop: 36, width: '100%' }}>
                {/* Get Started */}
                <TouchableOpacity
                  onPress={() => navigation.replace('MainApp')}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#FF9F66',
                    borderRadius: 16,
                    paddingVertical: 16,
                    marginBottom: 12,
                    shadowColor: '#FF9F66',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17, marginLeft: 8 }}>
                      Get Started
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Connect Wallet */}
                <TouchableOpacity
                  onPress={handleConnectWallet}
                  disabled={isConnecting}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#16161a',
                    borderRadius: 16,
                    paddingVertical: 16,
                    borderWidth: 1,
                    borderColor: '#2a2a30',
                    shadowColor: '#FF9F66',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="wallet" size={20} color="#FF9F66" />
                    <Text style={{ color: '#fafafa', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>
                      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <Text style={{ color: '#6b6b73', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
                  Wallet only needed for $SKR transactions
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Bottom: Dots + Next */}
      <View style={{ paddingBottom: 32, paddingHorizontal: 32 }}>
        {/* Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
          {SLIDES.map((slide, index) => (
            <View
              key={index}
              style={{
                height: 5,
                borderRadius: 3,
                marginHorizontal: 4,
                width: index === currentSlide ? 28 : 8,
                backgroundColor: index === currentSlide ? currentColor : '#2a2a30',
              }}
            />
          ))}
        </View>

        {/* Next Button (not on last slide) */}
        {currentSlide < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#FF9F66',
              borderRadius: 16,
              paddingVertical: 16,
              shadowColor: '#FF9F66',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 14,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, marginLeft: 8 }}>Next</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
