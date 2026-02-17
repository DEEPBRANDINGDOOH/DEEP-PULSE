import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const MOCK_SUBMISSIONS = {
  feedback: [
    {
      id: '1',
      wallet: '7xK...9Qz',
      title: 'Re: Game Launch',
      message: 'Great timing! More details next time would help...',
      deposit: 400,
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      wallet: '2pQ...mNp',
      title: 'Re: NFT Drop',
      message: 'Suggestion for improvement: Add rarity tiers info',
      deposit: 400,
      timestamp: '5 hours ago',
    },
  ],
  boost: [
    {
      id: '3',
      wallet: '8vN...4Wp',
      title: 'Leaderboard System',
      description: 'Weekly rankings with prizes',
      targetAmount: 25000,
      deposit: 100,
    },
  ],
  talent: [
    {
      id: '4',
      wallet: '5tY...2Lm',
      role: 'Community Manager',
      experience: '3+ years managing Discord communities',
      portfolio: 'https://portfolio.example.com',
      deposit: 50,
    },
  ],
};

export default function BrandModerationScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('feedback');
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS);

  const handleApprove = (type, id, deposit) => {
    Alert.alert(
      'Approve Submission',
      `Refund ${deposit} $SKR to the user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Refund',
          onPress: () => {
            console.log(`Approved ${type}:`, id);
            // TODO: Call API to approve & refund
            // Remove from list
            const updated = { ...submissions };
            updated[type] = updated[type].filter(s => s.id !== id);
            setSubmissions(updated);
          },
        },
      ]
    );
  };

  const handleReject = (type, id) => {
    Alert.alert(
      'Reject Submission',
      'Deposit will NOT be refunded. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            console.log(`Rejected ${type}:`, id);
            // TODO: Call API to reject (no refund)
            // Remove from list
            const updated = { ...submissions };
            updated[type] = updated[type].filter(s => s.id !== id);
            setSubmissions(updated);
          },
        },
      ]
    );
  };

  const renderFeedbackTab = () => (
    <ScrollView className="px-6 py-4">
      {submissions.feedback.length === 0 ? (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text className="text-text-secondary text-base mt-4 text-center">
            All feedback reviewed!
          </Text>
        </View>
      ) : (
        submissions.feedback.map((item) => (
          <View
            key={item.id}
            className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary text-sm">{item.wallet}</Text>
              <View className="bg-primary/20 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-bold">{item.deposit} $SKR</Text>
              </View>
            </View>

            <Text className="text-text font-bold text-base mb-2">{item.title}</Text>
            <Text className="text-text-secondary text-sm mb-3 leading-5">{item.message}</Text>
            <Text className="text-text-secondary text-xs mb-4">{item.timestamp}</Text>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => handleApprove('feedback', item.id, item.deposit)}
                className="flex-1 bg-success/20 rounded-xl py-3 mr-2 border border-success"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text className="text-success font-bold ml-2">Approve</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReject('feedback', item.id)}
                className="flex-1 bg-error/20 rounded-xl py-3 ml-2 border border-error"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="close-circle" size={18} color="#f44336" />
                  <Text className="text-error font-bold ml-2">Reject</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderBoostTab = () => (
    <ScrollView className="px-6 py-4">
      {submissions.boost.length === 0 ? (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text className="text-text-secondary text-base mt-4 text-center">
            All DAO proposals reviewed!
          </Text>
        </View>
      ) : (
        submissions.boost.map((item) => (
          <View
            key={item.id}
            className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary text-sm">{item.wallet}</Text>
              <View className="bg-primary/20 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-bold">{item.deposit} $SKR</Text>
              </View>
            </View>

            <Text className="text-text font-bold text-lg mb-2">{item.title}</Text>
            <Text className="text-text-secondary text-sm mb-3 leading-5">
              {item.description}
            </Text>
            <Text className="text-text font-semibold mb-4">
              Target: {item.targetAmount.toLocaleString()} $SKR
            </Text>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => handleApprove('boost', item.id, item.deposit)}
                className="flex-1 bg-success/20 rounded-xl py-3 mr-2 border border-success"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text className="text-success font-bold ml-2">Approve</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReject('boost', item.id)}
                className="flex-1 bg-error/20 rounded-xl py-3 ml-2 border border-error"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="close-circle" size={18} color="#f44336" />
                  <Text className="text-error font-bold ml-2">Reject</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderTalentTab = () => (
    <ScrollView className="px-6 py-4">
      {submissions.talent.length === 0 ? (
        <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text className="text-text-secondary text-base mt-4 text-center">
            All talent submissions reviewed!
          </Text>
        </View>
      ) : (
        submissions.talent.map((item) => (
          <View
            key={item.id}
            className="bg-background-card rounded-2xl p-5 mb-4 border border-border"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-secondary text-sm">{item.wallet}</Text>
              <View className="bg-primary/20 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-bold">{item.deposit} $SKR</Text>
              </View>
            </View>

            <Text className="text-text font-bold text-lg mb-2">{item.role}</Text>
            <Text className="text-text-secondary text-sm mb-3 leading-5">
              {item.experience}
            </Text>
            <Text className="text-text-secondary text-sm mb-4">
              Portfolio: {item.portfolio}
            </Text>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => handleApprove('talent', item.id, item.deposit)}
                className="flex-1 bg-success/20 rounded-xl py-3 mr-2 border border-success"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text className="text-success font-bold ml-2">Retain</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReject('talent', item.id)}
                className="flex-1 bg-error/20 rounded-xl py-3 ml-2 border border-error"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="close-circle" size={18} color="#f44336" />
                  <Text className="text-error font-bold ml-2">Reject</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-6 pb-4">
        <Text className="text-text font-black text-3xl mb-2">Moderation</Text>
        <Text className="text-text-secondary text-base">Review submissions</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-6 mb-4">
        <TouchableOpacity
          onPress={() => setActiveTab('feedback')}
          className={`flex-1 py-3 ${activeTab === 'feedback' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'feedback' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Feedback ({submissions.feedback.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('boost')}
          className={`flex-1 py-3 ${activeTab === 'boost' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'boost' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Boost ({submissions.boost.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('talent')}
          className={`flex-1 py-3 ${activeTab === 'talent' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'talent' ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            Talent ({submissions.talent.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'feedback' && renderFeedbackTab()}
      {activeTab === 'boost' && renderBoostTab()}
      {activeTab === 'talent' && renderTalentTab()}
    </SafeAreaView>
  );
}
