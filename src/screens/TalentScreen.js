import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { submitTalent } from '../services/transactionHelper';
import { isValidEmail, isValidHttpUrl, checkRateLimit, MAX_LENGTHS } from '../utils/security';

const MOCK_TALENTS = [
  {
    id: '1',
    role: 'UI/UX Designer',
    rating: 4.9,
    experience: '5+ years',
    skills: ['Figma', 'React', 'Web3'],
    availability: '2 weeks',
    rate: 5000,
    anonymous: true,
    hub: 'NFT Artists',
  },
  {
    id: '2',
    role: 'Full Stack Dev',
    rating: 4.8,
    experience: '3+ years',
    skills: ['Rust', 'Solana', 'Node.js'],
    availability: '1 month',
    rate: 8000,
    anonymous: true,
    hub: 'Solana Gaming',
  },
];

// MOCK_MY_SUBMISSIONS moved to appStore.js (Zustand talentSubmissions) for persistence

// Fallback hubs if store is empty (first launch)
const FALLBACK_HUBS = [
  { id: '1', name: 'Solana Gaming' },
  { id: '2', name: 'NFT Artists' },
  { id: '3', name: 'DeFi Alerts' },
];

const ROLE_OPTIONS = [
  'UI/UX Designer',
  'Full Stack Dev',
  'Smart Contract Dev',
  'Community Manager',
  'Content Creator',
  'Marketing Specialist',
];

export default function TalentScreen({ navigation }) {
  const { wallet } = useAppStore();
  // Read active hubs from Zustand store (includes user-created hubs)
  const storeHubs = useAppStore((state) => state.hubs);
  const filteredHubs = storeHubs.filter(h => h.status === 'ACTIVE').map(h => ({ id: h.id, name: h.name }));
  const activeHubs = filteredHubs.length > 0 ? filteredHubs : FALLBACK_HUBS;
  // Read talent submissions from Zustand store (persisted)
  const mySubmissions = useAppStore((state) => state.talentSubmissions);
  const addTalentSubmission = useAppStore((state) => state.addTalentSubmission);
  const [activeTab, setActiveTab] = useState('submit');
  const [selectedHub, setSelectedHub] = useState(activeHubs[0] || FALLBACK_HUBS[0]);
  const [showHubPicker, setShowHubPicker] = useState(false);
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [experience, setExperience] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [email, setEmail] = useState('');
  const [talents, setTalents] = useState(MOCK_TALENTS);

  // BUG #6 FIX: Re-sync selectedHub when store hubs change
  useEffect(() => {
    if (selectedHub && !activeHubs.find(h => h.id === selectedHub.id)) {
      setSelectedHub(activeHubs[0] || FALLBACK_HUBS[0]);
    }
  }, [activeHubs.length]);

  const renderSubmitTab = () => (
    <ScrollView className="px-6 py-4">
      <View className="bg-background-card rounded-xl p-4 mb-6 border border-border">
        <View className="flex-row items-center mb-2">
          <Ionicons name="information-circle" size={18} color="#FF9F66" />
          <Text className="text-primary font-semibold ml-2">How it works</Text>
        </View>
        <Text className="text-text-secondary text-sm leading-5">
          {'\u2022'} Showcase your talent to your favorite brand/project{'\n'}
          {'\u2022'} Deposit 50 $SKR to prove you're serious{'\n'}
          {'\u2022'} The brand reviews your profile privately{'\n'}
          {'\u2022'} Hired? → Refunded + the brand contacts you when they need you{'\n'}
          {'\u2022'} Not selected? → Your deposit goes to the hub's vault
        </Text>
      </View>

      <Text className="text-text font-semibold mb-2">Role</Text>
      <TouchableOpacity
        onPress={() => setShowRolePicker(!showRolePicker)}
        className="bg-background-secondary rounded-xl px-4 py-3 mb-1 border border-border flex-row items-center justify-between"
      >
        <Text className="text-text">{role}</Text>
        <Ionicons name="chevron-down" size={20} color="#FF9F66" />
      </TouchableOpacity>
      {showRolePicker && (
        <View className="bg-background-card rounded-xl border border-border mb-3">
          {ROLE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => {
                setRole(option);
                setShowRolePicker(false);
              }}
              className="px-4 py-3 border-b border-border"
            >
              <Text className={`font-semibold ${option === role ? 'text-primary' : 'text-text'}`}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {!showRolePicker && <View className="mb-3" />}

      <Text className="text-text font-semibold mb-2">Experience & Skills</Text>
      <TextInput
        value={experience}
        onChangeText={setExperience}
        placeholder="Your experience & skills..."
        placeholderTextColor="#666"
        multiline
        numberOfLines={4}
        maxLength={MAX_LENGTHS.TALENT_SKILLS}
        className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 h-32 border border-border"
        textAlignVertical="top"
      />

      <Text className="text-text font-semibold mb-2">Portfolio URL</Text>
      <TextInput
        value={portfolio}
        onChangeText={setPortfolio}
        placeholder="https://..."
        placeholderTextColor="#666"
        maxLength={MAX_LENGTHS.URL}
        className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
      />

      <Text className="text-text font-semibold mb-2">Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        placeholderTextColor="#666"
        keyboardType="email-address"
        autoCapitalize="none"
        maxLength={MAX_LENGTHS.EMAIL}
        className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-6 border border-border"
      />

      <TouchableOpacity
        className="bg-primary rounded-xl py-4"
        onPress={() => {
          if (!checkRateLimit('submit_talent')) return;
          if (!__DEV__ && !wallet.connected) {
            Alert.alert('Wallet Required', 'Please connect your wallet to submit a talent profile.\n\nA 50 $SKR deposit is required.');
            return;
          }
          if (!experience.trim()) {
            Alert.alert('Error', 'Please fill in your experience & skills.');
            return;
          }
          if (!email.trim()) {
            Alert.alert('Error', 'Please provide your email address.');
            return;
          }
          Alert.alert(
            'Submit Talent',
            `Submit as "${role}" to ${selectedHub.name}?\n\n50 $SKR deposit required.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Submit', onPress: async () => {
                // Real on-chain talent submission
                if (selectedHub?.hubPda) {
                  const depositIndex = Date.now() % 1000000;
                  const talentContent = `${role} | ${experience} | ${portfolio} | ${email}`;
                  const result = await submitTalent(selectedHub.hubPda, talentContent, depositIndex);
                  if (result.success) {
                    setExperience('');
                    setPortfolio('');
                    setEmail('');
                  }
                } else {
                  // Mock fallback — add to Zustand store + talents lists
                  const newSubmission = {
                    id: `sub_${Date.now()}`,
                    role: role,
                    hub: selectedHub.name,
                    status: 'REVIEW',
                    submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                    expectedDays: '3-5',
                  };
                  addTalentSubmission(newSubmission);
                  setTalents(prev => [...prev, {
                    id: `talent_${Date.now()}`,
                    role: role,
                    rating: 0,
                    experience: experience.trim(),
                    skills: experience.split(',').map(s => s.trim()).slice(0, 3),
                    availability: 'Available',
                    rate: 0,
                    anonymous: true,
                    hub: selectedHub?.name,
                  }]);
                  Alert.alert('Submitted!', `Your "${role}" submission to ${selectedHub.name} has been sent for review.\n\n50 $SKR deposited in escrow.`);
                  setExperience('');
                  setPortfolio('');
                  setEmail('');
                }
              }},
            ]
          );
        }}
      >
        <View className="flex-row items-center justify-center">
          <Ionicons name="paper-plane" size={20} color="#fff" />
          <Text className="text-white font-bold text-base ml-2">Submit (50 $SKR)</Text>
        </View>
      </TouchableOpacity>
      <View className="h-8" />
    </ScrollView>
  );

  const renderBrowseTab = () => {
    const hubTalents = talents.filter(t => t.hub === selectedHub?.name);
    return (
    <ScrollView className="px-6 py-4">
      {hubTalents.length === 0 ? (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="people-outline" size={48} color="#666" />
          <Text className="text-text-secondary text-base mt-4 text-center">No talent profiles for {selectedHub?.name}</Text>
          <Text className="text-text-muted text-sm mt-2 text-center">Submit your profile in the Submit tab!</Text>
        </View>
      ) : hubTalents.map((talent) => (
        <View
          key={talent.id}
          className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="briefcase" size={24} color="#FF9F66" />
              <Text className="text-text font-bold text-lg ml-2">{talent.role}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text className="text-text font-semibold ml-1">{talent.rating}/5</Text>
            </View>
          </View>

          {talent.anonymous && (
            <View className="bg-background-secondary rounded-xl p-3 mb-3 flex-row items-center">
              <Ionicons name="lock-closed" size={16} color="#666" />
              <Text className="text-text-secondary text-sm ml-2">Anonymous</Text>
            </View>
          )}

          {/* Skills */}
          <View className="flex-row flex-wrap mb-3">
            {talent.skills.map((skill, idx) => (
              <View key={idx} className="bg-primary/20 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-primary text-xs font-semibold">{skill}</Text>
              </View>
            ))}
          </View>

          {/* Details */}
          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="briefcase-outline" size={16} color="#666" />
              <Text className="text-text-secondary text-sm ml-2">
                {talent.experience} experience
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text className="text-text-secondary text-sm ml-2">
                Available: {talent.availability}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text className="text-text-secondary text-sm ml-2">
                Rate: {talent.rate.toLocaleString()} $SKR
              </Text>
            </View>
          </View>

          {/* Contact Button */}
          <TouchableOpacity
            onPress={() => {
              if (talent.anonymous) {
                Alert.alert(
                  'Anonymous Profile',
                  `This talent prefers to remain anonymous.\n\nRole: ${talent.role}\nRate: ${talent.rate.toLocaleString()} $SKR\nAvailability: ${talent.availability}\n\nContact will be revealed after hiring through the hub.`
                );
              } else {
                Alert.alert('Contact', `Role: ${talent.role}\nRate: ${talent.rate.toLocaleString()} $SKR`);
              }
            }}
            className="bg-primary/20 rounded-xl py-3 border border-primary"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="mail" size={16} color="#FF9F66" />
              <Text className="text-primary font-bold text-sm ml-2">View Contact</Text>
            </View>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
  };

  const renderMineTab = () => (
    <ScrollView className="px-6 py-4">
      <Text className="text-text font-semibold text-lg mb-4">Current Submission</Text>

      {mySubmissions.map((sub) => (
        <View
          key={sub.id}
          className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text font-bold text-lg">{sub.role}</Text>
            <View className="bg-primary/20 rounded-full px-3 py-1">
              <Text className="text-primary text-xs font-bold">{sub.status}</Text>
            </View>
          </View>

          <Text className="text-text-secondary text-sm mb-2">{sub.hub}</Text>

          <View className="bg-background-secondary rounded-xl p-4 mb-3">
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar" size={16} color="#666" />
              <Text className="text-text-secondary text-sm ml-2">
                Submitted: {sub.submittedDate}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time" size={16} color="#666" />
              <Text className="text-text-secondary text-sm ml-2">
                Expected decision: {sub.expectedDays} days
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Edit Submission',
                `Edit your "${sub.role}" submission to ${sub.hub}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Edit', onPress: () => {
                    setRole(sub.role);
                    setActiveTab('submit');
                    Alert.alert('Editing', 'Update your submission details and re-submit.');
                  }},
                ]
              );
            }}
            className="bg-background-secondary rounded-xl py-3 border border-border"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="create" size={16} color="#FF9F66" />
              <Text className="text-primary font-semibold text-sm ml-2">
                Edit Submission
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ))}

      <Text className="text-text font-semibold text-lg mb-4 mt-4">
        Previous Submissions
      </Text>

      <View className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text font-bold text-base">Developer</Text>
          <View className="bg-success/20 rounded-full px-3 py-1">
            <Text className="text-success text-xs font-bold">RETAINED</Text>
          </View>
        </View>
        <Text className="text-text-secondary text-sm mb-2">DeFi Alerts</Text>
        <View className="flex-row items-center">
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text className="text-success text-sm ml-2">
            Hired + 50 $SKR refunded
          </Text>
        </View>
      </View>

      <View className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text font-bold text-base">Designer</Text>
          <View className="bg-error/20 rounded-full px-3 py-1">
            <Text className="text-error text-xs font-bold">REJECTED</Text>
          </View>
        </View>
        <Text className="text-text-secondary text-sm mb-2">NFT Artists</Text>
        <View className="flex-row items-center">
          <Ionicons name="close-circle" size={16} color="#f44336" />
          <Text className="text-error text-sm ml-2">Not selected</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-6 pb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-text font-black text-3xl">Showcase Talent</Text>
        </View>
        
        {/* Hub Selector */}
        <TouchableOpacity
          onPress={() => setShowHubPicker(!showHubPicker)}
          className="bg-background-card rounded-xl px-4 py-3 border border-border flex-row items-center justify-between mb-2"
        >
          <Text className="text-text font-semibold">{selectedHub.name}</Text>
          <Ionicons name="chevron-down" size={20} color="#FF9F66" />
        </TouchableOpacity>
        
        {/* Hub Picker Dropdown */}
        {showHubPicker && (
          <View className="bg-background-card rounded-xl border border-border mb-2">
            {activeHubs.map((hub) => (
              <TouchableOpacity
                key={hub.id}
                onPress={() => {
                  setSelectedHub(hub);
                  setShowHubPicker(false);
                }}
                className="px-4 py-3 border-b border-border"
              >
                <Text className={`font-semibold ${hub.id === selectedHub.id ? 'text-primary' : 'text-text'}`}>
                  {hub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text className="text-text-secondary text-base">
          {activeTab === 'submit' && 'Get noticed'}
          {activeTab === 'browse' && `${talents.length} talents`}
          {activeTab === 'mine' && 'Your submissions'}
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-6 mb-4">
        <TouchableOpacity
          onPress={() => setActiveTab('submit')}
          className={`flex-1 py-3 ${activeTab === 'submit' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'submit' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Submit
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('browse')}
          className={`flex-1 py-3 ${activeTab === 'browse' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'browse' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Browse ({talents.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('mine')}
          className={`flex-1 py-3 ${activeTab === 'mine' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'mine' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Mine ({mySubmissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'submit' && renderSubmitTab()}
      {activeTab === 'browse' && renderBrowseTab()}
      {activeTab === 'mine' && renderMineTab()}
    </SafeAreaView>
  );
}
