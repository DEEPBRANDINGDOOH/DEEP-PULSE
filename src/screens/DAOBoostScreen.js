import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { submitDaoProposal, contributeToVault } from '../services/transactionHelper';
import { checkRateLimit, MAX_LENGTHS } from '../utils/security';

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
    hub: 'Solana Gaming',
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
    hub: 'NFT Artists',
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

// Fallback hubs if store is empty (first launch)
const FALLBACK_HUBS = [
  { id: '1', name: 'Solana Gaming' },
  { id: '2', name: 'NFT Artists' },
  { id: '3', name: 'DeFi Alerts' },
];

export default function DAOBoostScreen({ navigation }) {
  const { wallet } = useAppStore();
  // Read active hubs from Zustand store (includes user-created hubs)
  const storeHubs = useAppStore((state) => state.hubs);
  const filteredHubs = storeHubs.filter(h => h.status === 'ACTIVE').map(h => ({ id: h.id, name: h.name }));
  const activeHubs = filteredHubs.length > 0 ? filteredHubs : FALLBACK_HUBS;
  // DAO proposals from Zustand store (persisted) + mock data for demo
  const storeDaoProposals = useAppStore((state) => state.daoProposals) || [];
  const addDaoProposal = useAppStore((state) => state.addDaoProposal);
  const updateDaoProposal = useAppStore((state) => state.updateDaoProposal);
  const [activeTab, setActiveTab] = useState('propose');
  const [selectedHub, setSelectedHub] = useState(activeHubs[0] || FALLBACK_HUBS[0]);
  const [showHubPicker, setShowHubPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [fundModalVisible, setFundModalVisible] = useState(false);
  const [fundProposal, setFundProposal] = useState(null);
  const [fundAmount, setFundAmount] = useState('100');
  // Merge store proposals with mocks (mocks only in __DEV__)
  const proposals = [...storeDaoProposals, ...(__DEV__ ? MOCK_PROPOSALS : [])];
  const [funded, setFunded] = useState(MOCK_FUNDED);

  const renderProposeTab = () => (
    <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
      <View className="bg-background-card rounded-xl p-4 mb-6 border border-border">
        <View className="flex-row items-center mb-2">
          <Ionicons name="information-circle" size={18} color="#FF9F66" />
          <Text className="text-primary font-semibold ml-2">How it works</Text>
        </View>
        <Text className="text-text-secondary text-sm leading-5">
          {'\u2022'} Propose a mission or idea to your favorite brand{'\n'}
          {'\u2022'} Deposit 100 $SKR (refunded if the brand approves){'\n'}
          {'\u2022'} The brand reviews and accepts or declines your proposal{'\n'}
          {'\u2022'} Approved? → The community funds it with $SKR{'\n'}
          {'\u2022'} Once funded, the brand receives 95% to execute it{'\n'}
          {'\u2022'} Platform keeps only 5% — fully transparent
        </Text>
      </View>

      <Text className="text-text font-semibold mb-2">Proposal Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Enter proposal title..."
        placeholderTextColor="#666"
        maxLength={MAX_LENGTHS.PROPOSAL_TITLE}
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
        maxLength={MAX_LENGTHS.PROPOSAL_DESCRIPTION}
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
        onPress={async () => {
          if (!checkRateLimit('dao_submit')) return;
          if (!__DEV__ && !wallet?.connected) {
            Alert.alert('Wallet Required', 'Please connect your wallet to submit a DAO proposal.\n\nA 100 $SKR deposit is required.');
            return;
          }
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
          // Real on-chain proposal submission
          if (selectedHub?.hubPda) {
            const depositIndex = Date.now() % 1000000;
            const result = await submitDaoProposal(selectedHub.hubPda, `${title}: ${description}`, depositIndex);
            if (result.success) {
              setTitle(''); setDescription(''); setTargetAmount('');
            }
          } else {
            // Mock fallback — persist in Zustand store so it survives navigation
            const newProposal = {
              id: `prop_${Date.now()}`,
              creator: wallet.publicKey ? wallet.publicKey.toString().slice(0, 3) + '...' + wallet.publicKey.toString().slice(-3) : 'You',
              wallet: wallet.publicKey ? wallet.publicKey.toString().slice(0, 3) + '...' + wallet.publicKey.toString().slice(-3) : '???...???',
              title: title.trim(),
              description: description.trim(),
              targetAmount: parseInt(targetAmount, 10) || 10000,
              currentAmount: 0,
              backers: 0,
              hub: selectedHub?.name || 'Unknown',
              hubId: selectedHub?.id || null,
              status: 'ACTIVE',
              daysLeft: 30,
              deposit: 100,
              submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              isMock: false,
            };
            addDaoProposal(newProposal);
            Alert.alert(
              'Proposal submitted',
              `"${title}" submitted with 100 $SKR deposit. Community can now fund it.`,
              [{ text: 'OK', onPress: () => { setTitle(''); setDescription(''); setTargetAmount(''); } }]
            );
          }
        }}
        className="bg-primary rounded-xl py-4"
      >
        <View className="flex-row items-center justify-center">
          <Ionicons name="rocket" size={20} color="#fff" />
          <Text className="text-white font-bold text-base ml-2">Submit (100 $SKR)</Text>
        </View>
      </TouchableOpacity>
      <View className="h-6" />
    </ScrollView>
  );

  const openFundModal = (proposal) => {
    if (!__DEV__ && !wallet?.connected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to fund a DAO proposal.');
      return;
    }
    setFundProposal(proposal);
    setFundAmount('100');
    setFundModalVisible(true);
  };

  const confirmFund = async () => {
    if (!fundProposal) return;
    const amount = parseInt(fundAmount, 10);
    if (isNaN(amount) || amount < 100) {
      Alert.alert('Invalid amount', 'Minimum 100 $SKR.');
      return;
    }
    setFundModalVisible(false);

    // Real on-chain contribution
    if (fundProposal.vaultPda) {
      const result = await contributeToVault(fundProposal.vaultPda, amount);
      if (result.success) {
        updateDaoProposal(fundProposal.id, {
          currentAmount: (fundProposal.currentAmount || 0) + amount,
          backers: (fundProposal.backers || 0) + 1,
        });
      }
    } else {
      // Mock fallback — update in store (persisted) for real proposals, local for mocks
      if (!fundProposal.isMock && storeDaoProposals.find(p => p.id === fundProposal.id)) {
        updateDaoProposal(fundProposal.id, {
          currentAmount: (fundProposal.currentAmount || 0) + amount,
          backers: (fundProposal.backers || 0) + 1,
        });
      }
      Alert.alert('Funded', `You contributed ${amount} $SKR to "${fundProposal.title}".`);
    }
    setFundProposal(null);
  };

  const renderVotesTab = () => {
    const hubProposals = proposals.filter(p => p.hub === selectedHub?.name);
    return (
    <ScrollView className="px-6 py-4">
      {hubProposals.length === 0 ? (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="document-text-outline" size={48} color="#666" />
          <Text className="text-text-secondary text-base mt-4 text-center">No proposals yet for {selectedHub?.name}</Text>
          <Text className="text-text-muted text-sm mt-2 text-center">Be the first to propose an idea!</Text>
        </View>
      ) : hubProposals.map((proposal) => (
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
  };

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
