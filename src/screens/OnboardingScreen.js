/**
 * OnboardingScreen — Redesigned for Hackathon
 *
 * 4 slides:
 * 1. DEEP PULSE — "Direct line between Brands & Community"
 * 2. Features showcase — Hub Notifications, DAO Brand Boost, Show Your Talent
 * 3. Earn While You Engage — DEEP Score tiers progression
 * 4. "Let's grow together." — Connect Wallet / Browse as Guest
 */

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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { walletAdapter } from '../services/walletAdapter';
import { setWalletState, initUserScore } from '../services/transactionHelper';

const { width } = Dimensions.get('window');

// ========================================
// SLIDE DATA
// ========================================

const SLIDES = [
  {
    id: 1,
    title: 'DEEP PULSE',
    subtitle: 'Direct line between Brands & Community',
    description: 'The decentralized notification hub built for Solana Mobile. Real-time alerts from DeFi, NFT, Gaming & DAO projects.',
    type: 'hero',
  },
  {
    id: 2,
    title: 'What You Can Do',
    subtitle: 'Three powerful features',
    description: '',
    type: 'features',
    features: [
      { name: 'Hub Notifications', icon: 'notifications', color: '#4CAF50', desc: 'Subscribe & get alpha first' },
      { name: 'DAO Brand Boost', icon: 'people', color: '#9C27B0', desc: 'Community-funded sponsorships' },
      { name: 'Show Your Talent', icon: 'star', color: '#2196F3', desc: 'Get hired by top projects' },
    ],
  },
  {
    id: 3,
    title: 'Earn While You Engage',
    subtitle: 'DEEP Score — 5 Tiers',
    description: 'Every action earns you DEEP Score points. Rise through the ranks from Bronze to Legend.',
    type: 'tiers',
    tiers: [
      { name: 'Bronze', icon: 'star', color: '#CD7F32' },
      { name: 'Silver', icon: 'shield', color: '#C0C0C0' },
      { name: 'Gold', icon: 'medal', color: '#FFD700' },
      { name: 'Diamond', icon: 'diamond', color: '#00BCD4' },
      { name: 'Legend', icon: 'trophy', color: '#FF9F66' },
    ],
  },
  {
    id: 4,
    title: "Let's grow together.",
    subtitle: '',
    description: 'Connect your Solana wallet to unlock on-chain features, or start exploring as a guest.',
    type: 'connect',
  },
];

// ========================================
// ANIMATED COMPONENTS
// ========================================

function PulsingRing({ color, size, delay = 0 }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 2500, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.8, duration: 0, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.4, duration: 0, useNativeDriver: true }),
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

// Hero visual — 3 concentric pulsing rings with center icon
function HeroVisual() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 200, width: 200, marginBottom: 40 }}>
      <PulsingRing color="#FF9F66" size={200} delay={0} />
      <PulsingRing color="#FF9F66" size={260} delay={600} />
      <PulsingRing color="#FF9F66" size={320} delay={1200} />
      <Animated.View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#FF9F6630',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulseAnim }],
          borderWidth: 2,
          borderColor: '#FF9F6660',
        }}
      >
        <Ionicons name="pulse" size={48} color="#FF9F66" />
      </Animated.View>
    </View>
  );
}

// Feature card with staggered fade-in
function FeatureCard({ feature, index }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: index * 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${feature.color}10`,
        borderWidth: 1,
        borderColor: `${feature.color}30`,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        width: '100%',
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: `${feature.color}25`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Ionicons name={feature.icon} size={26} color={feature.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fafafa', fontWeight: '800', fontSize: 16 }}>
          {feature.name}
        </Text>
        <Text style={{ color: '#9898a0', fontSize: 13, marginTop: 2 }}>
          {feature.desc}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={`${feature.color}80`} />
    </Animated.View>
  );
}

// Tier badge with sweep highlight
function TierBadge({ tier, index, total }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        delay: index * 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        alignItems: 'center',
        marginHorizontal: 6,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: `${tier.color}20`,
          borderWidth: 2,
          borderColor: `${tier.color}50`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        <Ionicons name={tier.icon} size={22} color={tier.color} />
      </View>
      <Text style={{ color: tier.color, fontSize: 10, fontWeight: '700' }}>
        {tier.name}
      </Text>
      {/* Arrow between tiers (except last) */}
      {index < total - 1 && (
        <View style={{ position: 'absolute', right: -14, top: 18 }}>
          <Ionicons name="chevron-forward" size={12} color="#3a3a42" />
        </View>
      )}
    </Animated.View>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function OnboardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const scrollViewRef = useRef(null);
  const { setWallet } = useAppStore();

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const result = await walletAdapter.connect();
      const pubKeyStr = result.publicKey?.toString ? result.publicKey.toString() : result.publicKey;
      setWallet({
        connected: true,
        publicKey: pubKeyStr,
        authToken: result.authToken,
      });
      setWalletState(result.publicKey, result.authToken);
      initUserScore().catch(() => {});
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

  // Render slide content based on type
  const renderSlideContent = (slide, index) => {
    switch (slide.type) {
      case 'hero':
        return (
          <>
            <HeroVisual />
            <Text style={{
              color: '#FF9F66',
              fontSize: 36,
              fontWeight: '900',
              textAlign: 'center',
              letterSpacing: 3,
              marginBottom: 14,
            }}>
              {slide.title}
            </Text>
            <View style={{
              backgroundColor: '#FF9F6615',
              borderRadius: 20,
              paddingHorizontal: 18,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: '#FF9F6630',
              marginBottom: 16,
            }}>
              <Text style={{ color: '#FF9F66', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                {slide.subtitle}
              </Text>
            </View>
            <Text style={{
              color: '#9898a0',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
              paddingHorizontal: 12,
            }}>
              {slide.description}
            </Text>
          </>
        );

      case 'features':
        return (
          <>
            <Text style={{
              color: '#fafafa',
              fontSize: 28,
              fontWeight: '900',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              {slide.title}
            </Text>
            <Text style={{
              color: '#9898a0',
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 28,
            }}>
              {slide.subtitle}
            </Text>
            <View style={{ width: '100%', paddingHorizontal: 4 }}>
              {slide.features.map((feature, i) => (
                <FeatureCard key={feature.name} feature={feature} index={i} />
              ))}
            </View>
          </>
        );

      case 'tiers':
        return (
          <>
            <Text style={{
              color: '#fafafa',
              fontSize: 28,
              fontWeight: '900',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              {slide.title}
            </Text>
            <View style={{
              backgroundColor: '#FF9F6615',
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: '#FF9F6630',
              marginBottom: 20,
            }}>
              <Text style={{ color: '#FF9F66', fontWeight: '800', fontSize: 12 }}>
                {slide.subtitle}
              </Text>
            </View>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
              paddingHorizontal: 8,
            }}>
              {slide.tiers.map((tier, i) => (
                <TierBadge key={tier.name} tier={tier} index={i} total={slide.tiers.length} />
              ))}
            </View>
            <Text style={{
              color: '#9898a0',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
              paddingHorizontal: 12,
            }}>
              {slide.description}
            </Text>
            {/* Swipe-to-Earn teaser */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FF9F6610',
              borderWidth: 1,
              borderColor: '#FF9F6625',
              borderRadius: 14,
              padding: 14,
              marginTop: 20,
              width: '100%',
            }}>
              <Ionicons name="phone-portrait" size={22} color="#FF9F66" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: '#fafafa', fontWeight: '700', fontSize: 13 }}>
                  Swipe-to-Earn
                </Text>
                <Text style={{ color: '#9898a0', fontSize: 11, marginTop: 2 }}>
                  Interact with ads on your lock screen to earn bonus points
                </Text>
              </View>
            </View>
          </>
        );

      case 'connect':
        return (
          <>
            {/* Pulsing icon */}
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 120, marginBottom: 24 }}>
              <PulsingRing color="#FF9F66" size={120} delay={0} />
              <PulsingRing color="#FF9F66" size={160} delay={500} />
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#FF9F6625',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="rocket" size={32} color="#FF9F66" />
              </View>
            </View>

            <Text style={{
              color: '#fafafa',
              fontSize: 28,
              fontWeight: '900',
              textAlign: 'center',
              marginBottom: 12,
            }}>
              {slide.title}
            </Text>
            <Text style={{
              color: '#9898a0',
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
              paddingHorizontal: 8,
              marginBottom: 8,
            }}>
              {slide.description}
            </Text>

            {/* Action Buttons */}
            <View style={{ marginTop: 28, width: '100%' }}>
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
          </>
        );

      default:
        return null;
    }
  };

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
            {renderSlideContent(slide, index)}
          </View>
        ))}
      </ScrollView>

      {/* Bottom: Dots + Next */}
      <View style={{ paddingBottom: 32, paddingHorizontal: 32 }}>
        {/* Dots — always orange accent */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
          {SLIDES.map((slide, index) => (
            <View
              key={index}
              style={{
                height: 5,
                borderRadius: 3,
                marginHorizontal: 4,
                width: index === currentSlide ? 28 : 8,
                backgroundColor: index === currentSlide ? '#FF9F66' : '#2a2a30',
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
