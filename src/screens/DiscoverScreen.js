import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AdRotation, { AdRotationManager } from '../components/AdRotation';
import { MOCK_HUBS, MOCK_ADS } from '../config/constants';

export default function DiscoverScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hubs, setHubs] = useState(MOCK_HUBS.map(h => ({ ...h, subscribed: false })));

  const handleAdImpression = (data) => {
    AdRotationManager.trackImpression(data);
  };

  const handleAdClick = (data) => {
    AdRotationManager.trackClick(data);
  };

  const handleSubscribe = (hubId) => {
    setHubs(hubs.map(h =>
      h.id === hubId ? { ...h, subscribed: !h.subscribed } : h
    ));
    const hub = hubs.find(h => h.id === hubId);
    if (hub && !hub.subscribed) {
      Alert.alert('Subscribed!', `You are now subscribed to ${hub.name}. Check My Hubs for updates.`);
    }
  };

  const filteredHubs = hubs.filter(hub =>
    hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hub.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView>
        {/* Header */}
        <View className="p-6 pb-4">
          <Text className="text-text font-black text-3xl mb-2">Discover</Text>
          <Text className="text-text-secondary text-base">Subscribe for FREE</Text>
        </View>

        {/* Search Bar */}
        <View className="px-6 mb-4">
          <View className="bg-background-card rounded-xl px-4 py-3 flex-row items-center border border-border">
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search hubs..."
              placeholderTextColor="#666"
              className="flex-1 ml-3 text-text text-base"
            />
          </View>
        </View>

        {/* TOP AD SLOT */}
        <View className="px-6 mb-6">
          <AdRotation
            ads={MOCK_ADS.TOP}
            slotType="top"
            onAdImpression={handleAdImpression}
            onAdClick={handleAdClick}
          />
        </View>

        {/* Hubs List */}
        <View className="px-6">
          <Text className="text-text font-bold text-xl mb-4">Trending Hubs</Text>

          {filteredHubs.map((hub) => (
            <View
              key={hub.id}
              className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
            >
              {/* Hub Header */}
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center">
                  <Ionicons name={hub.icon} size={24} color="#FF9F66" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-text font-bold text-lg">{hub.name}</Text>
                  <Text className="text-text-secondary text-sm">
                    {hub.subscribers.toLocaleString()} subscribers
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text className="text-text-secondary text-sm mb-4 leading-5">
                {hub.description}
              </Text>

              {/* Category Badge */}
              <View className="flex-row items-center mb-4">
                <View className="bg-primary/20 rounded-full px-3 py-1">
                  <Text className="text-primary text-xs font-semibold">{hub.category}</Text>
                </View>
              </View>

              {/* Subscribe Button */}
              <TouchableOpacity
                onPress={() => handleSubscribe(hub.id)}
                className={`rounded-xl py-3 ${hub.subscribed ? 'bg-background-secondary border border-border' : 'bg-primary'}`}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons
                    name={hub.subscribed ? 'checkmark-circle' : 'notifications'}
                    size={18}
                    color={hub.subscribed ? '#4CAF50' : '#fff'}
                  />
                  <Text className={`font-bold text-base ml-2 ${hub.subscribed ? 'text-text-secondary' : 'text-white'}`}>
                    {hub.subscribed ? 'Subscribed' : 'Subscribe (FREE)'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* BOTTOM AD SLOT */}
        <View className="px-6 mt-4 mb-6">
          <AdRotation
            ads={MOCK_ADS.BOTTOM}
            slotType="bottom"
            onAdImpression={handleAdImpression}
            onAdClick={handleAdClick}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
