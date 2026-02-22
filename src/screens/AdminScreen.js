import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTierFromScore, PRICING } from '../config/constants';
import { useAppStore } from '../store/appStore';

const MOCK_TOP_100 = [
  { rank: 1, wallet: '7xK...9Qz', score: 945, boost: 12, talent: 5, feedback: 8 },
  { rank: 2, wallet: '2pQ...mNp', score: 887, boost: 8, talent: 4, feedback: 12 },
  { rank: 3, wallet: '8vN...4Wp', score: 832, boost: 10, talent: 3, feedback: 6 },
  { rank: 4, wallet: '5tY...2Lm', score: 776, boost: 6, talent: 6, feedback: 10 },
  { rank: 5, wallet: '3fR...8Kp', score: 723, boost: 7, talent: 2, feedback: 9 },
];

const MOCK_STATS = {
  totalUsers: 47832,
  activeHubs: 23,
  totalRevenue: 892450,
  monthlyGrowth: 34,
};

const MOCK_PENDING_HUBS = [
  {
    id: '1',
    name: 'Crypto Traders',
    creator: '4mL...7Np',
    subscribers: 0,
    status: 'PENDING',
    createdDate: 'Feb 08, 2026',
  },
  {
    id: '2',
    name: 'Solana Devs',
    creator: '9xT...2Qw',
    subscribers: 0,
    status: 'PENDING',
    createdDate: 'Feb 09, 2026',
  },
];

export default function AdminScreen({ navigation }) {
  const { wallet } = useAppStore();
  const [activeSection, setActiveSection] = useState('overview');
  const [globalNotifTitle, setGlobalNotifTitle] = useState('');
  const [globalNotifMessage, setGlobalNotifMessage] = useState('');

  const handleApproveHub = (hubId, hubName) => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet to approve hubs.');
      return;
    }
    Alert.alert(
      'Approve Hub',
      `Approve "${hubName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            console.log('Approved hub:', hubId);
            // TODO: Call API
          },
        },
      ]
    );
  };

  const handleSuspendHub = (hubId, hubName) => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', 'Please connect your admin wallet to manage hubs.');
      return;
    }
    Alert.alert(
      'Suspend Hub',
      `Suspend "${hubName}" for non-payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: () => {
            console.log('Suspended hub:', hubId);
            // TODO: Call API
          },
        },
      ]
    );
  };

  const handleSendGlobalNotification = () => {
    if (!wallet.connected) {
      Alert.alert('Wallet Required', `Please connect your admin wallet to send global notifications.\n\nCost: ${PRICING.GLOBAL_NOTIFICATION} $SKR.`);
      return;
    }
    Alert.alert(
      'Send Global Notification',
      `This will send to ALL users. Cost: ${PRICING.GLOBAL_NOTIFICATION} $SKR. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            console.log('Sending global notification');
            // TODO: Call API
            setGlobalNotifTitle('');
            setGlobalNotifMessage('');
          },
        },
      ]
    );
  };

  const handleExportTop100 = () => {
    console.log('Exporting Top 100 to CSV');
    // TODO: Generate and download CSV
    Alert.alert('Export', 'Top 100 CSV exported successfully!');
  };

  const renderOverview = () => (
    <ScrollView className="px-6 py-4">
      {/* Stats Grid */}
      <View className="flex-row flex-wrap mb-6">
        <View className="w-1/2 pr-2 mb-3">
          <View className="bg-background-card rounded-xl p-4 border border-border">
            <Text className="text-text font-black text-2xl mb-1">
              {MOCK_STATS.totalUsers.toLocaleString()}
            </Text>
            <Text className="text-text-secondary text-xs">Total Users</Text>
          </View>
        </View>
        <View className="w-1/2 pl-2 mb-3">
          <View className="bg-background-card rounded-xl p-4 border border-border">
            <Text className="text-text font-black text-2xl mb-1">{MOCK_STATS.activeHubs}</Text>
            <Text className="text-text-secondary text-xs">Active Hubs</Text>
          </View>
        </View>
        <View className="w-1/2 pr-2 mb-3">
          <View className="bg-background-card rounded-xl p-4 border border-border">
            <Text className="text-primary font-black text-2xl mb-1">
              {MOCK_STATS.totalRevenue.toLocaleString()}
            </Text>
            <Text className="text-text-secondary text-xs">Revenue ($SKR)</Text>
          </View>
        </View>
        <View className="w-1/2 pl-2 mb-3">
          <View className="bg-background-card rounded-xl p-4 border border-border">
            <Text className="text-success font-black text-2xl mb-1">+{MOCK_STATS.monthlyGrowth}%</Text>
            <Text className="text-text-secondary text-xs">Monthly Growth</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text className="text-text font-bold text-lg mb-3">Quick Actions</Text>

      <TouchableOpacity
        onPress={() => setActiveSection('top100')}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <Text className="text-text font-semibold ml-3">Top 100 Leaderboard</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActiveSection('hubs')}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="apps" size={24} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Manage Hubs</Text>
        </View>
        <View className="flex-row items-center">
          <View className="bg-primary rounded-full w-6 h-6 items-center justify-center mr-2">
            <Text className="text-white text-xs font-bold">{MOCK_PENDING_HUBS.length}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActiveSection('globalNotif')}
        className="bg-background-card rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
      >
        <View className="flex-row items-center">
          <Ionicons name="megaphone" size={24} color="#FF9F66" />
          <Text className="text-text font-semibold ml-3">Global Notification</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTop100 = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity
        onPress={() => setActiveSection('overview')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>

      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-text font-black text-2xl">Top 100</Text>
          <Text className="text-text-secondary text-sm">Leaderboard Rankings</Text>
        </View>
        <TouchableOpacity
          onPress={handleExportTop100}
          className="bg-primary/20 rounded-xl px-4 py-2 border border-primary"
        >
          <View className="flex-row items-center">
            <Ionicons name="download" size={16} color="#FF9F66" />
            <Text className="text-primary font-semibold ml-1 text-sm">Export CSV</Text>
          </View>
        </TouchableOpacity>
      </View>

      {MOCK_TOP_100.map((entry) => {
        const tier = getTierFromScore(entry.score);
        return (
          <View
            key={entry.rank}
            className="bg-background-card rounded-xl p-4 mb-3 border border-border"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                  <Text className="text-text font-black">#{entry.rank}</Text>
                </View>
                <View className="ml-3">
                  <Text className="text-text font-bold">{entry.wallet}</Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name={tier.icon} size={16} color={tier.color} />
                    <Text className="text-text-secondary text-xs ml-1">{tier.name}</Text>
                  </View>
                </View>
              </View>
              <Text className="text-primary font-black text-xl">{entry.score}</Text>
            </View>

            <View className="flex-row justify-around mt-2 pt-2 border-t border-border">
              <View className="items-center">
                <Text className="text-text font-semibold">{entry.boost}</Text>
                <Text className="text-text-secondary text-xs">DAO</Text>
              </View>
              <View className="items-center">
                <Text className="text-text font-semibold">{entry.talent}</Text>
                <Text className="text-text-secondary text-xs">Talent</Text>
              </View>
              <View className="items-center">
                <Text className="text-text font-semibold">{entry.feedback}</Text>
                <Text className="text-text-secondary text-xs">Feedback</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderHubsManagement = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity
        onPress={() => setActiveSection('overview')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>

      <Text className="text-text font-black text-2xl mb-4">Manage Hubs</Text>

      <Text className="text-text font-semibold mb-3">Pending Approval</Text>

      {MOCK_PENDING_HUBS.map((hub) => (
        <View
          key={hub.id}
          className="bg-background-card rounded-xl p-4 mb-3 border border-border"
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-text font-bold text-lg">{hub.name}</Text>
            <View className="bg-primary/20 rounded-full px-3 py-1">
              <Text className="text-primary text-xs font-bold">{hub.status}</Text>
            </View>
          </View>

          <Text className="text-text-secondary text-sm mb-1">Creator: {hub.creator}</Text>
          <Text className="text-text-secondary text-sm mb-3">Created: {hub.createdDate}</Text>

          <View className="flex-row">
            <TouchableOpacity
              onPress={() => handleApproveHub(hub.id, hub.name)}
              className="flex-1 bg-success/20 rounded-xl py-2 mr-2 border border-success"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text className="text-success font-semibold ml-1 text-sm">Approve</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSuspendHub(hub.id, hub.name)}
              className="flex-1 bg-error/20 rounded-xl py-2 ml-2 border border-error"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="close-circle" size={16} color="#f44336" />
                <Text className="text-error font-semibold ml-1 text-sm">Reject</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderGlobalNotification = () => (
    <ScrollView className="px-6 py-4">
      <TouchableOpacity
        onPress={() => setActiveSection('overview')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        <Text className="text-primary font-semibold ml-2">Back to Overview</Text>
      </TouchableOpacity>

      <Text className="text-text font-black text-2xl mb-2">Global Notification</Text>
      <Text className="text-text-secondary text-sm mb-4">
        Send to ALL users • Cost: {PRICING.GLOBAL_NOTIFICATION} $SKR
      </Text>

      <View className="bg-background-card rounded-xl p-5 mb-6 border border-border">
        <Text className="text-text font-semibold mb-2">Title</Text>
        <TextInput
          value={globalNotifTitle}
          onChangeText={setGlobalNotifTitle}
          placeholder="Notification title..."
          placeholderTextColor="#666"
          className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 border border-border"
        />

        <Text className="text-text font-semibold mb-2">Message</Text>
        <TextInput
          value={globalNotifMessage}
          onChangeText={setGlobalNotifMessage}
          placeholder="Notification message..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          className="bg-background-secondary rounded-xl px-4 py-3 text-text mb-4 h-32 border border-border"
          textAlignVertical="top"
        />

        <TouchableOpacity
          onPress={handleSendGlobalNotification}
          disabled={!globalNotifTitle || !globalNotifMessage}
          className={`rounded-xl py-4 ${
            globalNotifTitle && globalNotifMessage ? 'bg-primary' : 'bg-border'
          }`}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="send" size={18} color="#fff" />
            <Text className="text-white font-bold ml-2">
              Send ({PRICING.GLOBAL_NOTIFICATION} $SKR)
            </Text>
          </View>
        </TouchableOpacity>
      </View>
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
          <Text className="text-text font-black text-3xl">Admin</Text>
          <Text className="text-text-secondary text-sm">Platform Management</Text>
        </View>
      </View>

      {/* Content */}
      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'top100' && renderTop100()}
      {activeSection === 'hubs' && renderHubsManagement()}
      {activeSection === 'globalNotif' && renderGlobalNotification()}
    </SafeAreaView>
  );
}
