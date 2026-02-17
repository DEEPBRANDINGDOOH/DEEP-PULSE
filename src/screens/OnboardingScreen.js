import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Welcome to\nDEEP Pulse',
    description: 'Your Web3 Notification Hub\n\nStay connected to your favorite Solana projects',
    icon: 'notifications',
    color: '#FF9F66',
  },
  {
    id: 2,
    title: 'Subscribe\nfor FREE',
    description: 'Never miss updates\n\nGet instant notifications completely FREE',
    icon: 'rocket',
    color: '#4CAF50',
  },
  {
    id: 3,
    title: 'Engage\n& Earn',
    description: 'Your voice matters\n\nSend feedback, propose ideas, earn $SKR',
    icon: 'diamond',
    color: '#2196F3',
  },
  {
    id: 4,
    title: 'DAO\nGovernance',
    description: 'Shape the future\n\nFund proposals - Only 5% platform fee',
    icon: 'people',
    color: '#9C27B0',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({ x: nextSlide * width, animated: true });
    } else {
      navigation.replace('MainApp');
    }
  };

  const handleSkip = () => {
    navigation.replace('MainApp');
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Skip Button */}
      <View className="absolute top-4 right-6 z-10">
        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-text-secondary text-base font-semibold">Skip →</Text>
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
          <View key={slide.id} style={{ width }} className="flex-1 items-center justify-center px-8">
            {/* Icon */}
            <View
              className="w-32 h-32 rounded-full items-center justify-center mb-12"
              style={{ backgroundColor: `${slide.color}20` }}
            >
              <Ionicons name={slide.icon} size={64} color={slide.color} />
            </View>

            {/* Title */}
            <Text className="text-text font-black text-4xl text-center mb-6">
              {slide.title}
            </Text>

            {/* Description */}
            <Text className="text-text-secondary text-lg text-center leading-7">
              {slide.description}
            </Text>

            {/* Connect Wallet (last slide) */}
            {index === SLIDES.length - 1 && (
              <TouchableOpacity
                onPress={handleNext}
                className="mt-12 bg-primary rounded-xl px-8 py-4"
              >
                <View className="flex-row items-center">
                  <Ionicons name="wallet" size={24} color="#fff" />
                  <Text className="text-white font-bold text-lg ml-2">Connect Wallet</Text>
                </View>
              </TouchableOpacity>
            )}

            {index === SLIDES.length - 1 && (
              <TouchableOpacity onPress={handleNext} className="mt-4">
                <Text className="text-text-secondary text-sm">Browse as Guest</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dots Indicator */}
      <View className="flex-row justify-center mb-8">
        {SLIDES.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full mx-1 ${
              index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-border'
            }`}
          />
        ))}
      </View>

      {/* Next Button (not on last slide) */}
      {currentSlide < SLIDES.length - 1 && (
        <View className="px-8 mb-8">
          <TouchableOpacity
            onPress={handleNext}
            className="bg-primary rounded-xl py-4"
          >
            <Text className="text-white font-bold text-lg text-center">Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
