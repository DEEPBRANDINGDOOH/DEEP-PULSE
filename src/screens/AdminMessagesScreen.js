import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';

const MOCK_CONVERSATIONS = [
  {
    id: 'conv_1',
    hubName: 'DeFi Alerts',
    hubIcon: 'trending-up',
    brandWallet: '7xK...9Qz',
    unreadCount: 2,
    lastMessage: 'Your ad for the swap promotion has been approved.',
    lastMessageTime: '2 hours ago',
    lastMessageFrom: 'admin',
    messages: [
      { id: 'm1', from: 'admin', text: 'Welcome to DEEP Pulse! Your hub "DeFi Alerts" is now active.', time: 'Feb 15, 10:00 AM', tag: 'General' },
      { id: 'm2', from: 'brand', text: 'Thank you! We just submitted our first ad creative for the top slot.', time: 'Feb 16, 2:30 PM', tag: null },
      { id: 'm3', from: 'admin', text: 'We noticed the landing URL redirects to a different domain. Can you confirm this is intentional?', time: 'Feb 17, 9:15 AM', tag: 'Ad Review' },
      { id: 'm4', from: 'brand', text: 'Yes, that is our campaign landing page hosted on a partner domain. We can provide verification if needed.', time: 'Feb 17, 11:45 AM', tag: null },
      { id: 'm5', from: 'admin', text: 'Your ad for the swap promotion has been approved.', time: 'Feb 20, 3:00 PM', tag: 'Ad Review' },
    ],
  },
  {
    id: 'conv_2',
    hubName: 'NFT Artists',
    hubIcon: 'color-palette',
    brandWallet: '2pQ...mNp',
    unreadCount: 1,
    lastMessage: 'We have updated our creative as requested. Please review.',
    lastMessageTime: '5 hours ago',
    lastMessageFrom: 'brand',
    messages: [
      { id: 'm1', from: 'admin', text: 'Hi, your bottom ad slot creative needs to be resized. Current dimensions do not match the required 390x100 px.', time: 'Feb 19, 1:00 PM', tag: 'Ad Review' },
      { id: 'm2', from: 'brand', text: 'We have updated our creative as requested. Please review.', time: 'Feb 20, 10:00 AM', tag: null },
    ],
  },
  {
    id: 'conv_3',
    hubName: 'Solana Gaming',
    hubIcon: 'game-controller',
    brandWallet: '8vN...4Wp',
    unreadCount: 0,
    lastMessage: 'Your hub subscription renews in 5 days.',
    lastMessageTime: '1 day ago',
    lastMessageFrom: 'admin',
    messages: [
      { id: 'm1', from: 'admin', text: 'Your hub subscription renews in 5 days. Please ensure sufficient $SKR balance.', time: 'Feb 21, 9:00 AM', tag: 'Account' },
    ],
  },
];

const TAG_COLORS = {
  General: '#2196F3',
  'Ad Review': '#FF9F66',
  Account: '#9C27B0',
};

export default function AdminMessagesScreen({ navigation, route }) {
  const isFromBrand = route.params?.fromBrand || false;
  const brandHubName = route.params?.hubName || null;
  const hubIcon = route.params?.hubIcon || 'apps';

  // Read persisted conversations from Zustand store (falls back to mock on first load)
  const storeConversations = useAppStore((state) => state.adminConversations);
  const setStoreConversations = useAppStore((state) => state.setAdminConversations);
  const updateStoreConversation = useAppStore((state) => state.updateAdminConversation);

  // If brand navigates with a hub name not in existing conversations, create one
  const getInitialConversations = () => {
    const base = storeConversations || MOCK_CONVERSATIONS;
    if (brandHubName && !base.find(c => c.hubName === brandHubName)) {
      return [
        {
          id: `conv_${brandHubName.replace(/\s/g, '_')}`,
          hubName: brandHubName,
          hubIcon: hubIcon,
          brandWallet: 'Your Wallet',
          unreadCount: 1,
          lastMessage: `Welcome! Your hub "${brandHubName}" is under review. You can message the admin here.`,
          lastMessageTime: 'Just now',
          lastMessageFrom: 'admin',
          messages: [
            { id: 'm1', from: 'admin', text: `Welcome! Your hub "${brandHubName}" is under review. Feel free to ask any questions about the approval process.`, time: 'Just now', tag: 'General' },
          ],
        },
        ...base,
      ];
    }
    return base;
  };

  const initialConvs = getInitialConversations();
  const [conversations, setConversations] = useState(initialConvs);
  const [selectedConv, setSelectedConv] = useState(
    brandHubName ? initialConvs.find(c => c.hubName === brandHubName) || null : null
  );

  // Persist conversations to Zustand store whenever they change
  useEffect(() => {
    setStoreConversations(conversations);
  }, [conversations]);
  const [messageText, setMessageText] = useState('');
  const [selectedTag, setSelectedTag] = useState('General');

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const fromWho = isFromBrand ? 'brand' : 'admin';
    const newMessage = {
      id: `m_${Date.now()}`,
      from: fromWho,
      text: messageText.trim(),
      time: 'Just now',
      tag: fromWho === 'admin' ? selectedTag : null,
    };

    setConversations(prev => prev.map(conv =>
      conv.id === selectedConv.id
        ? {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: messageText.trim(),
            lastMessageTime: 'Just now',
            lastMessageFrom: fromWho,
          }
        : conv
    ));

    setSelectedConv(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      lastMessage: messageText.trim(),
      lastMessageTime: 'Just now',
      lastMessageFrom: fromWho,
    }));

    setMessageText('');
  };

  // Conversation list view
  if (!selectedConv) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="p-6 pb-4 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#FF9F66" />
          </TouchableOpacity>
          <View>
            <Text className="text-text font-black text-2xl">
              {isFromBrand ? 'Admin Messages' : 'Brand Messages'}
            </Text>
            <Text className="text-text-secondary text-sm">
              {isFromBrand ? 'Messages from platform admin' : 'Direct messages with hub owners'}
            </Text>
          </View>
        </View>

        <ScrollView className="px-6">
          {/* FIX: Filter conversations for brand view — only show their hub */}
          {(() => {
            const displayedConversations = isFromBrand && brandHubName
              ? conversations.filter(c => c.hubName === brandHubName)
              : conversations;

            return displayedConversations.length === 0 ? (
              <View className="bg-background-card rounded-2xl p-8 items-center border border-border">
                <Ionicons name="chatbubbles-outline" size={48} color="#666" />
                <Text className="text-text-secondary text-base mt-4 text-center">
                  No conversations yet
                </Text>
              </View>
            ) : (
              displayedConversations.map((conv) => (
                <TouchableOpacity
                  key={conv.id}
                  onPress={() => setSelectedConv(conv)}
                  className="bg-background-card rounded-2xl p-4 mb-3 border border-border"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-3">
                      <Ionicons name={conv.hubIcon} size={24} color="#FF9F66" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-text font-bold">{conv.hubName}</Text>
                        <Text className="text-text-secondary text-xs">{conv.lastMessageTime}</Text>
                      </View>
                      <Text className="text-text-secondary text-xs mt-0.5">{conv.brandWallet}</Text>
                      <Text className="text-text-secondary text-sm mt-1" numberOfLines={1}>
                        {/* FIX: "You:" prefix depends on who is viewing */}
                        {(isFromBrand ? conv.lastMessageFrom === 'brand' : conv.lastMessageFrom === 'admin') ? 'You: ' : ''}
                        {conv.lastMessage}
                      </Text>
                    </View>
                    {conv.unreadCount > 0 && (
                      <View className="bg-primary rounded-full w-6 h-6 items-center justify-center ml-2">
                        <Text className="text-white text-xs font-bold">{conv.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            );
          })()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Conversation detail view
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-4 pb-3 flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => {
          // If brand came from hub dashboard and only has one conversation, go straight back
          if (isFromBrand && brandHubName) {
            navigation.goBack();
          } else {
            setSelectedConv(null);
          }
        }} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#FF9F66" />
        </TouchableOpacity>
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
          <Ionicons name={selectedConv.hubIcon} size={20} color="#FF9F66" />
        </View>
        <View className="flex-1">
          <Text className="text-text font-bold">{selectedConv.hubName}</Text>
          <Text className="text-text-secondary text-xs">{selectedConv.brandWallet}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={selectedConv.messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isAdmin = item.from === 'admin';
          const isMine = isFromBrand ? !isAdmin : isAdmin;

          return (
            <View className={`mb-3 ${isMine ? 'items-end' : 'items-start'}`}>
              {/* Tag badge */}
              {item.tag && (
                <View
                  className="rounded-full px-2 py-0.5 mb-1"
                  style={{ backgroundColor: `${TAG_COLORS[item.tag] || '#666'}20` }}
                >
                  <Text className="text-xs font-semibold" style={{ color: TAG_COLORS[item.tag] || '#666' }}>
                    {item.tag}
                  </Text>
                </View>
              )}
              {/* Bubble */}
              <View
                className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                  isMine
                    ? 'rounded-br-sm'
                    : 'rounded-bl-sm'
                }`}
                style={{
                  backgroundColor: isMine ? '#FF9F66' : '#1a1a1f',
                  borderWidth: isMine ? 0 : 1,
                  borderColor: '#2a2a30',
                }}
              >
                <Text className={`text-sm ${isMine ? 'text-white' : 'text-text'}`}>
                  {item.text}
                </Text>
              </View>
              <Text className="text-text-secondary text-xs mt-1">{item.time}</Text>
            </View>
          );
        }}
      />

      {/* Tag selector (admin only) */}
      {!isFromBrand && (
        <View className="px-4 py-2 flex-row items-center border-t border-border">
          <Text className="text-text-secondary text-xs mr-2">Tag:</Text>
          {Object.keys(TAG_COLORS).map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full mr-2 ${selectedTag === tag ? '' : 'border border-border'}`}
              style={selectedTag === tag ? { backgroundColor: `${TAG_COLORS[tag]}30` } : {}}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: selectedTag === tag ? TAG_COLORS[tag] : '#666' }}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-4 py-3 flex-row items-end border-t border-border">
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
            className="flex-1 bg-background-card rounded-2xl px-4 py-3 text-text mr-3 border border-border"
            style={{ maxHeight: 100 }}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              messageText.trim() ? 'bg-primary' : 'bg-border'
            }`}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
