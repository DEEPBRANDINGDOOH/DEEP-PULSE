import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const MOCK_PROPOSALS = [
  {
    id: '1',
    creator: '7xK...9Qz',
    title: 'Tournament System',
    description: 'Monthly tournaments with $SKR prizes for top players',
    targetAmount: 50000,
    currentAmount: 16000,
    backers: 24,
    daysLeft: 12,
    status: 'FUNDING',
  },
  {
    id: '2',
    creator: '2pQ...mNp',
    title: 'Educational Content',
    description: 'Video tutorial series for beginners',
    targetAmount: 30000,
    currentAmount: 25500,
    backers: 18,
    daysLeft: 5,
    status: 'FUNDING',
  },
];

const MOCK_FUNDED = [
  {
    id: '3',
    title: 'Community Events',
    amount: 30000,
    brandReceived: 28500,
    platformFee: 1500,
    status: 'COMPLETED',
  },
];

const MOCK_HUBS = [
  { id: '1', name: 'Solana Gaming' },
  { id: '2', name: 'NFT Artists' },
  { id: '3', name: 'DeFi Alerts' },
];

export default function DAOBoostScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('propose');
  const [selectedHub, setSelectedHub] = useState(MOCK_HUBS[0]);
  const [showHubPicker, setShowHubPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [fundModalVisible, setFundModalVisible] = useState(false);
  const [fundProposal, setFundProposal] = useState(null);
  const [fundAmount, setFundAmount] = useState('100');
  const [proposals, setProposals] = useState(MOCK_PROPOSALS);
  const [funded, setFunded] = useState(MOCK_FUNDED);

  const renderProposeTab = () => (
    <View className="px-6 py-4">
      <View className="bg-background-card rounded-xl p-4 mb-6 border border-border">
        <Text className="text-primary font-semibold mb-2">ℹ️ How it works</Text>
        <Text className="text-text-secondary text-sm leading-5">
          • Submit with 100 $SKR deposit{'\n'}
          • If approved: refund + vault{'\n'}
          • Community funds proposal{'\n'}
          • Brand gets 95%, platform 5%
        </Text>
      </View>

      <Text className="text-text font-semibold mb-2">Proposal Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Enter proposal title..."
        placeholderTextColor="#666"
        className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
      />

      <Text className="text-text font-semibold mb-2">Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe your proposal..."
        placeholderTextColor="#666"
        multiline
        numberOfLines={4}
        className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 h-32 border border-border"
        textAlignVertical="top"
      />

      <Text className="text-text font-semibold mb-2">Target Amount ($SKR)</Text>
      <TextInput
        value={targetAmount}
        onChangeText={setTargetAmount}
        placeholder="10000"
        placeholderTextColor="#666"
        keyboardType="numeric"
        className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-6 border border-border"
      />

      <TouchableOpacity
        onPress={() => {
          if (!title.trim()) {
            Alert.alert('Missing title', 'Enter a proposal title.');
            return;
          }
          if (!description.trim()) {
            Alert.alert('Missing description', 'Describe your proposal.');
            return;
          }
          const amount = parseInt(targetAmount, 10);
          if (!targetAmount || isNaN(amount) || amount < 100) {
            Alert.alert('Invalid amount', 'Target must be at least 100 $SKR.');
            return;
          }
          Alert.alert(
            'Proposal submitted',
            `"${title}" submitted with 100 $SKR deposit. Community can now fund it. (Demo)`,
            [{ text: 'OK', onPress: () => { setTitle(''); setDescription(''); setTargetAmount(''); } }]
          );
        }}
        className="bg-primary rounded-xl py-4"
      >
        <View className="flex-row items-center justify-center">
          <Ionicons name="rocket" size={20} color="#fff" />
          <Text className="text-white font-bold text-base ml-2">Submit (100 $SKR)</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const openFundModal = (proposal) => {
    setFundProposal(proposal);
    setFundAmount('100');
    setFundModalVisible(true);
  };

  const confirmFund = () => {
    if (!fundProposal) return;
    const amount = parseInt(fundAmount, 10);
    if (isNaN(amount) || amount < 100) {
      Alert.alert('Invalid amount', 'Minimum 100 $SKR.');
      return;
    }
    setFundModalVisible(false);
    setFundProposal(null);
    setProposals((prev) =>
      prev.map((p) =>
        p.id === fundProposal.id
          ? {
              ...p,
              currentAmount: p.currentAmount + amount,
              backers: p.backers + 1,
            }
          : p
      )
    );
    Alert.alert('Funded', `You contributed ${amount} $SKR to "${fundProposal.title}". (Demo)`);
  };

  const renderVotesTab = () => (
    <ScrollView className="px-6 py-4">
      {proposals.map((proposal) => (
        <View
          key={proposal.id}
          className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-secondary text-sm">{proposal.creator}</Text>
            <View className="bg-success/20 rounded-full px-3 py-1">
              <Text className="text-success text-xs font-bold">{proposal.status}</Text>
            </View>
          </View>

          {/* Title */}
          <Text className="text-text font-bold text-lg mb-2">{proposal.title}</Text>
          <Text className="text-text-secondary text-sm mb-4 leading-5">
            {proposal.description}
          </Text>

          {/* Progress */}
          <View className="mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-text font-semibold">
                {proposal.currentAmount.toLocaleString()} $SKR
              </Text>
              <Text className="text-text-secondary">
                {Math.round((proposal.currentAmount / proposal.targetAmount) * 100)}%
              </Text>
            </View>
            <View className="bg-background-secondary rounded-full h-2">
              <View
                className="bg-primary rounded-full h-2"
                style={{ width: `${(proposal.currentAmount / proposal.targetAmount) * 100}%` }}
              />
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row justify-between mb-4">
            <View>
              <Text className="text-text font-bold text-lg">
                {proposal.currentAmount.toLocaleString()}
              </Text>
              <Text className="text-text-secondary text-xs">Funded</Text>
            </View>
            <View>
              <Text className="text-text font-bold text-lg">{proposal.backers}</Text>
              <Text className="text-text-secondary text-xs">Backers</Text>
            </View>
            <View>
              <Text className="text-text font-bold text-lg">{proposal.daysLeft}</Text>
              <Text className="text-text-secondary text-xs">Days Left</Text>
            </View>
          </View>

          {/* Fund Button */}
          <TouchableOpacity
            onPress={() => openFundModal(proposal)}
            className="bg-primary rounded-xl py-3"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="cash" size={18} color="#fff" />
              <Text className="text-white font-bold text-sm ml-2">
                Fund (min 100 $SKR)
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  const renderVaultTab = () => (
    <ScrollView className="px-6 py-4">
      <View className="bg-background-card rounded-xl p-5 mb-6 border border-border">
        <Text className="text-primary text-2xl font-bold mb-1">95,000 $SKR</Text>
        <Text className="text-text-secondary">Total This Month</Text>
        <Text className="text-text-secondary text-sm mt-1">
          across {funded.length} proposal{funded.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {funded.map((proposal) => (
        <View
          key={proposal.id}
          className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="bg-success/20 rounded-full px-3 py-1">
              <Text className="text-success text-xs font-bold">FUNDED</Text>
            </View>
            <Text className="text-text-secondary text-sm">{proposal.status}</Text>
          </View>

          <Text className="text-text font-bold text-lg mb-4">{proposal.title}</Text>

          <View className="bg-background-secondary rounded-xl p-4 mb-3">
            <Text className="text-text font-semibold mb-2">
              {proposal.amount.toLocaleString()} $SKR (100%)
            </Text>
            <View className="border-t border-border my-2" />
            <Text className="text-text-secondary text-sm mb-1">Vault Breakdown:</Text>
            <View className="flex-row justify-between mb-1">
              <Text className="text-text-secondary text-sm">Brand (95%)</Text>
              <Text className="text-text font-semibold">
                {proposal.brandReceived.toLocaleString()} $SKR
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-text-secondary text-sm">Platform (5%)</Text>
              <Text className="text-text font-semibold">
                {proposal.platformFee.toLocaleString()} $SKR
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Vault details',
                'Funded proposals are settled on-chain. View on Solana Explorer when connected. (Demo)'
              )
            }
            className="bg-primary/20 rounded-xl py-2 border border-primary mt-2"
          >
            <Text className="text-primary font-semibold text-sm text-center">View on Explorer</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-6 pb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-text font-black text-3xl">DAO Boost</Text>
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
            {MOCK_HUBS.map((hub) => (
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
          {activeTab === 'propose' && 'Propose features'}
          {activeTab === 'votes' && 'Active proposals'}
          {activeTab === 'vault' && 'Funded proposals'}
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-6 mb-4">
        <TouchableOpacity
          onPress={() => setActiveTab('propose')}
          className={`flex-1 py-3 ${activeTab === 'propose' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'propose' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Propose
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('votes')}
          className={`flex-1 py-3 ${activeTab === 'votes' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'votes' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Votes ({proposals.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('vault')}
          className={`flex-1 py-3 ${activeTab === 'vault' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'vault' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Vault ({funded.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'propose' && renderProposeTab()}
      {activeTab === 'votes' && renderVotesTab()}
      {activeTab === 'vault' && renderVaultTab()}

      {/* Fund amount modal (screen-level so it stays mounted when switching tabs) */}
      <Modal
        visible={fundModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFundModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFundModalVisible(false)}
          className="flex-1 bg-black/60 justify-center px-6"
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} className="bg-background-card rounded-2xl p-6 border border-border">
            <Text className="text-text font-bold text-lg mb-1">Fund proposal</Text>
            {fundProposal && (
              <Text className="text-text-secondary text-sm mb-4">{fundProposal.title}</Text>
            )}
            <Text className="text-text font-semibold mb-2">Amount ($SKR)</Text>
            <TextInput
              value={fundAmount}
              onChangeText={setFundAmount}
              placeholder="100"
              placeholderTextColor="#666"
              keyboardType="numeric"
              className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setFundModalVisible(false)}
                className="flex-1 bg-background-secondary rounded-xl py-3 border border-border"
              >
                <Text className="text-text font-semibold text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmFund} className="flex-1 bg-primary rounded-xl py-3">
                <Text className="text-white font-bold text-center">Fund</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
