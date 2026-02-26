/**
 * DOOH Screen — Digital Out-Of-Home Campaign Brief
 *
 * Brands with an existing hub can submit a campaign brief
 * for programmatic DOOH advertising worldwide.
 * Accessible from HubDashboard only.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DOOH_INVENTORY } from '../config/constants';

export default function DOOHScreen({ navigation, route }) {
  const hubName = route.params?.hubName || 'My Hub';

  // Form state
  const [campaignTitle, setCampaignTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetLocations, setTargetLocations] = useState('');
  const [preferredDates, setPreferredDates] = useState('');
  const [selectedInventory, setSelectedInventory] = useState([]);
  const [budget, setBudget] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleInventory = (id) => {
    setSelectedInventory((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!campaignTitle.trim()) {
      Alert.alert('Missing Field', 'Please enter a campaign title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Field', 'Please enter a campaign description.');
      return;
    }
    if (!targetLocations.trim()) {
      Alert.alert('Missing Field', 'Please enter target cities or countries.');
      return;
    }
    if (!preferredDates.trim()) {
      Alert.alert('Missing Field', 'Please enter your preferred campaign dates.');
      return;
    }
    if (selectedInventory.length === 0) {
      Alert.alert('Missing Selection', 'Please select at least one inventory type.');
      return;
    }
    if (!budget.trim() || isNaN(parseInt(budget, 10))) {
      Alert.alert('Invalid Budget', 'Please enter a valid campaign budget in USD.');
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid contact email.');
      return;
    }

    const selectedLabels = selectedInventory
      .map((id) => DOOH_INVENTORY.find((inv) => inv.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    Alert.alert(
      'Submit Campaign Brief?',
      `Campaign: ${campaignTitle}\nLocations: ${targetLocations}\nInventory: ${selectedLabels}\nBudget: $${parseInt(budget, 10).toLocaleString()} USD`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            setIsSubmitting(true);
            // Simulate submission
            setTimeout(() => {
              setIsSubmitting(false);
              Alert.alert(
                'Campaign Brief Submitted!',
                'Our team will contact you within 24 hours with a quote and available DOOH inventory in your target locations.\n\nThank you for choosing DEEP PULSE DOOH.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            }, 1500);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="p-6 pb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
            <View className="flex-row items-center">
              <Ionicons name="arrow-back" size={24} color="#FF9F66" />
              <Text className="text-primary font-semibold ml-2">Back to {hubName}</Text>
            </View>
          </TouchableOpacity>
          <Text className="text-text font-black text-3xl mb-2">DOOH Worldwide</Text>
          <Text className="text-text-secondary text-base leading-6">
            Digital Out-Of-Home Campaign Brief
          </Text>
        </View>

        {/* Info Banner */}
        <View className="mx-6 mb-6 bg-primary/10 rounded-2xl p-5 border border-primary/30">
          <View className="flex-row items-start">
            <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center">
              <Ionicons name="globe" size={24} color="#FF9F66" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-primary font-bold text-base mb-2">
                Premium DOOH Inventory
              </Text>
              <Text className="text-text-secondary text-sm leading-5">
                Premium programmatic digital out-of-home inventory across high-traffic global venues through our network of international partners.
              </Text>
            </View>
          </View>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Campaign Title */}
          <Text className="text-text font-semibold mb-2">Campaign Title *</Text>
          <TextInput
            value={campaignTitle}
            onChangeText={setCampaignTitle}
            placeholder="e.g. Spring 2026 Brand Awareness"
            placeholderTextColor="#666"
            className="bg-background-card border border-border rounded-xl px-4 py-3 text-text mb-5"
          />

          {/* Description */}
          <Text className="text-text font-semibold mb-2">Campaign Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your campaign objectives and target audience..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-background-card border border-border rounded-xl px-4 py-3 text-text mb-5 h-28"
          />

          {/* Target Locations */}
          <Text className="text-text font-semibold mb-2">Target Cities / Countries *</Text>
          <TextInput
            value={targetLocations}
            onChangeText={setTargetLocations}
            placeholder="e.g. New York, London, Tokyo, Dubai..."
            placeholderTextColor="#666"
            className="bg-background-card border border-border rounded-xl px-4 py-3 text-text mb-5"
          />

          {/* Preferred Dates */}
          <Text className="text-text font-semibold mb-2">Preferred Dates *</Text>
          <TextInput
            value={preferredDates}
            onChangeText={setPreferredDates}
            placeholder="e.g. March 15 - April 15, 2026"
            placeholderTextColor="#666"
            className="bg-background-card border border-border rounded-xl px-4 py-3 text-text mb-5"
          />

          {/* Inventory Selection */}
          <Text className="text-text font-semibold mb-2">Select Inventory *</Text>
          <Text className="text-text-secondary text-xs mb-3">
            Choose the types of DOOH placements that interest you
          </Text>

          {DOOH_INVENTORY.map((item) => {
            const isSelected = selectedInventory.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleInventory(item.id)}
                className={`rounded-xl p-4 mb-3 flex-row items-center border ${
                  isSelected ? 'bg-primary/10 border-primary/40' : 'bg-background-card border-border'
                }`}
              >
                <View className={`w-6 h-6 rounded-md items-center justify-center mr-3 ${
                  isSelected ? 'bg-primary' : 'bg-background-secondary border border-border'
                }`}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${isSelected ? 'text-primary' : 'text-text'}`}>
                    {item.label}
                  </Text>
                  <Text className="text-text-secondary text-xs mt-0.5">{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Budget */}
          <Text className="text-text font-semibold mb-2 mt-2">Campaign Budget (USD) *</Text>
          <View className="flex-row items-center bg-background-card border border-border rounded-xl px-4 py-3 mb-5">
            <Text className="text-text-secondary text-lg mr-2">$</Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder="e.g. 5000"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              className="flex-1 text-text text-base"
            />
            <Text className="text-text-secondary text-sm">USD</Text>
          </View>

          {/* Contact Email */}
          <Text className="text-text font-semibold mb-2">Contact Email *</Text>
          <TextInput
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="you@brand.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-background-card border border-border rounded-xl px-4 py-3 text-text mb-6"
          />

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`py-5 rounded-2xl mb-4 ${isSubmitting ? 'bg-primary/50' : 'bg-primary'}`}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-center">
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text className="text-white font-bold text-base ml-2">Submit Campaign Brief</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Disclaimer */}
          <View className="bg-background-card rounded-xl p-4 mb-8 border border-border">
            <Text className="text-text-secondary text-xs leading-5 text-center">
              Our DOOH team will review your brief and contact you within 24 hours with available inventory, pricing, and a custom proposal. All campaigns are managed by our international partners network.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
