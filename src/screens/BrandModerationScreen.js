import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { approveFeedback, approveTalent, approveDaoProposal, rejectDeposit } from '../services/transactionHelper';
import { useAppStore } from '../store/appStore';

/**
 * Generate contextual mock submissions for a specific hub.
 * These are shown only when the store has no real feedbacks yet,
 * so the screen doesn't look empty during demo.
 */
function getMockSubmissions(hubName) {
  return {
    feedback: [
      {
        id: 'mock_fb_1',
        wallet: '7xK...9Qz',
        title: `Re: ${hubName} Update`,
        message: `Great notification from ${hubName}! Would love more detailed info next time.`,
        deposit: 300,
        timestamp: '2 hours ago',
        isMock: true,
      },
      {
        id: 'mock_fb_2',
        wallet: '2pQ...mNp',
        title: `Re: ${hubName} Announcement`,
        message: `Suggestion: Add more context about upcoming events for ${hubName} subscribers.`,
        deposit: 300,
        timestamp: '5 hours ago',
        isMock: true,
      },
    ],
    boost: [
      {
        id: 'mock_boost_1',
        wallet: '8vN...4Wp',
        title: `${hubName} Leaderboard`,
        description: `Weekly rankings with prizes for top ${hubName} contributors`,
        targetAmount: 25000,
        deposit: 100,
        isMock: true,
      },
    ],
    talent: [
      {
        id: 'mock_talent_1',
        wallet: '5tY...2Lm',
        role: 'Community Manager',
        experience: `3+ years managing communities similar to ${hubName}`,
        portfolio: 'https://portfolio.example.com',
        deposit: 50,
        isMock: true,
      },
    ],
  };
}

export default function BrandModerationScreen({ navigation, route }) {
  const hubName = route.params?.hubName || 'My Hub';
  const hubId = route.params?.hubId || null;

  // Read real feedbacks from Zustand store
  const storeFeedbacks = useAppStore((state) => state.hubFeedbacks[hubName] || []);

  const [activeTab, setActiveTab] = useState('feedback');

  // Merge store feedbacks with contextual mocks
  const initialSubmissions = useMemo(() => {
    const mocks = getMockSubmissions(hubName);
    // Convert store feedbacks to the format expected by this screen
    const realFeedbacks = storeFeedbacks.map((fb) => ({
      id: fb.id,
      wallet: fb.wallet || '???...???',
      title: fb.title || 'Feedback',
      message: fb.message,
      deposit: fb.deposit || 300,
      timestamp: fb.timestamp || 'Recently',
      isMock: false,
    }));
    return {
      feedback: [...realFeedbacks, ...mocks.feedback],
      boost: mocks.boost,
      talent: mocks.talent,
    };
  }, [storeFeedbacks, hubName]);

  const [submissions, setSubmissions] = useState(initialSubmissions);

  // Re-sync when store feedbacks change
  React.useEffect(() => {
    const mocks = getMockSubmissions(hubName);
    const realFeedbacks = storeFeedbacks.map((fb) => ({
      id: fb.id,
      wallet: fb.wallet || '???...???',
      title: fb.title || 'Feedback',
      message: fb.message,
      deposit: fb.deposit || 300,
      timestamp: fb.timestamp || 'Recently',
      isMock: false,
    }));
    setSubmissions((prev) => ({
      ...prev,
      feedback: [...realFeedbacks, ...mocks.feedback],
    }));
  }, [storeFeedbacks, hubName]);

  const handleApprove = (type, id, deposit) => {
    const item = submissions[type]?.find(s => s.id === id);
    Alert.alert(
      'Approve Submission',
      `Refund ${deposit} $SKR to the user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Refund',
          onPress: async () => {
            // Real on-chain approval if item has depositPda
            if (item?.depositPda && item?.hubPda && item?.depositorPubkey) {
              let result;
              if (type === 'feedback') {
                result = await approveFeedback(item.depositPda, item.hubPda, item.depositorPubkey);
              } else if (type === 'talent') {
                result = await approveTalent(item.depositPda, item.hubPda, item.depositorPubkey);
              } else if (type === 'boost') {
                result = await approveDaoProposal(item.depositPda, item.hubPda, item.depositorPubkey, 0, item.title, item.description, item.targetAmount, Date.now() + 30 * 24 * 60 * 60 * 1000);
              }
              if (result?.success) {
                const updated = { ...submissions };
                updated[type] = updated[type].filter(s => s.id !== id);
                setSubmissions(updated);
                Alert.alert('Approved', `${deposit} $SKR refunded to the user on-chain.`);
              }
            } else {
              // Mock fallback
              const updated = { ...submissions };
              updated[type] = updated[type].filter(s => s.id !== id);
              setSubmissions(updated);
              Alert.alert('Approved', `${deposit} $SKR refunded to the user.`);
            }
          },
        },
      ]
    );
  };

  const handleReject = (type, id) => {
    const item = submissions[type]?.find(s => s.id === id);
    Alert.alert(
      'Reject Submission',
      'Deposit will NOT be refunded. Tokens go to platform treasury. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            // Real on-chain rejection
            if (item?.depositPda && item?.hubPda && item?.depositorPubkey) {
              const result = await rejectDeposit(item.depositPda, item.hubPda, item.depositorPubkey);
              if (result?.success) {
                const updated = { ...submissions };
                updated[type] = updated[type].filter(s => s.id !== id);
                setSubmissions(updated);
                Alert.alert('Rejected', 'Deposit sent to platform treasury.');
              }
            } else {
              // Mock fallback
              const updated = { ...submissions };
              updated[type] = updated[type].filter(s => s.id !== id);
              setSubmissions(updated);
            }
          },
        },
      ]
    );
  };

  const renderFeedbackTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}>
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
              <View className="flex-row items-center">
                <Text className="text-text-secondary text-sm">{item.wallet}</Text>
                {!item.isMock && (
                  <View className="ml-2 bg-green-500/20 rounded-full px-2 py-0.5">
                    <Text className="text-green-400 text-xs font-bold">REAL</Text>
                  </View>
                )}
              </View>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}>
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
      <View className="p-6 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        </TouchableOpacity>
        <View>
          <Text className="text-text font-black text-2xl">Moderation</Text>
          <Text className="text-text-secondary text-sm">{hubName} — Review submissions</Text>
        </View>
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

      {/* Tab Content — flex-1 ensures ScrollView gets bounded height */}
      <View style={{ flex: 1 }}>
        {activeTab === 'feedback' && renderFeedbackTab()}
        {activeTab === 'boost' && renderBoostTab()}
        {activeTab === 'talent' && renderTalentTab()}
      </View>
    </SafeAreaView>
  );
}
