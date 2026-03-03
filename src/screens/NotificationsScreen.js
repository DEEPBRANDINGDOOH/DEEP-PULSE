/**
 * Notifications Screen
 * 
 * Display all notifications/alerts
 * Filter by read/unread status
 * Mark as read functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { AlertCard } from '../components/AlertCard';
import { fetchNotificationsFromFirestore } from '../services/firebaseService';

export default function NotificationsScreen({ navigation, route }) {
  const { alerts, markAlertAsRead, markAllAlertsAsRead, getUnreadCount } =
    useAppStore();
  const hubNotifications = useAppStore((state) => state.hubNotifications);
  const readHubNotificationIds = useAppStore((state) => state.readHubNotificationIds) || [];
  const markHubNotificationRead = useAppStore((state) => state.markHubNotificationRead);
  const markAllHubNotificationsRead = useAppStore((state) => state.markAllHubNotificationsRead);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);

  // Auto-scroll to specific alert if passed via navigation
  useEffect(() => {
    if (route.params?.alertId) {
      // Small delay to ensure FlatList is rendered before scrolling
      setTimeout(() => {
        const index = alerts.findIndex((a) => a.id === route.params.alertId);
        if (index !== -1 && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }
      }, 300);
    }
  }, [route.params?.alertId]);

  // Merge hub notifications (brand-sent, persisted) with legacy alerts (mock, non-persisted)
  const allNotifications = React.useMemo(() => {
    const hubNotifs = Object.values(hubNotifications || {}).flat().map(n => ({
      id: n.id,
      projectId: n.hubName,
      projectName: n.hubName,
      projectIcon: n.hubIcon || 'apps',
      hubName: n.hubName,
      hubIcon: n.hubIcon || 'apps',
      hubLogoUrl: n.hubLogoUrl,
      title: n.title,
      message: n.message || n.fullMessage,
      fullMessage: n.fullMessage || n.message,
      timestamp: n.timestamp || 'Recently',
      read: readHubNotificationIds.includes(n.id),
      category: 'Hub Update',
      link: n.link,
      reactions: n.reactions || 0,
      comments: n.comments || 0,
      isNew: !readHubNotificationIds.includes(n.id),
    }));
    return [...hubNotifs, ...alerts];
  }, [hubNotifications, alerts, readHubNotificationIds]);

  const filteredAlerts = React.useMemo(() => {
    if (filter === 'unread') {
      return allNotifications.filter((a) => !a.read);
    }
    return allNotifications;
  }, [allNotifications, filter]);

  const unreadCount = getUnreadCount();
  const unreadHubCount = allNotifications.filter(n => n.category === 'Hub Update' && !n.read).length;
  const totalUnread = unreadCount + unreadHubCount;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const freshNotifs = await fetchNotificationsFromFirestore();
      if (freshNotifs && freshNotifs.length > 0) {
        // Use syncNotificationsFromFirebase (merge by ID) — NOT addHubNotification (which duplicates)
        const syncNotifs = useAppStore.getState().syncNotificationsFromFirebase;
        syncNotifs(freshNotifs);
      }
    } catch (e) {
      // Silent fail — pull-to-refresh is non-critical
    }
    setRefreshing(false);
  };

  const handleMarkAllRead = () => {
    markAllAlertsAsRead();
    markAllHubNotificationsRead();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text text-3xl font-bold mb-1">
              Notifications
            </Text>
            <Text className="text-text-secondary text-sm">
              {totalUnread} unread notification{totalUnread !== 1 ? 's' : ''}
            </Text>
          </View>

          {totalUnread > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              className="bg-background-card px-3 py-2 rounded-lg border border-border"
              activeOpacity={0.7}
            >
              <Text className="text-primary font-semibold text-sm">
                Mark All Read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="px-5 mb-4 flex-row">
        <TouchableOpacity
          onPress={() => setFilter('all')}
          className={`flex-1 py-3 rounded-lg mr-2 ${
            filter === 'all' ? 'bg-primary' : 'bg-background-card border border-border'
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`text-center font-semibold ${
              filter === 'all' ? 'text-white' : 'text-text-secondary'
            }`}
          >
            All ({allNotifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter('unread')}
          className={`flex-1 py-3 rounded-lg ${
            filter === 'unread' ? 'bg-primary' : 'bg-background-card border border-border'
          }`}
          activeOpacity={0.7}
        >
          <Text
            className={`text-center font-semibold ${
              filter === 'unread' ? 'text-white' : 'text-text-secondary'
            }`}
          >
            Unread ({totalUnread})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      <FlatList
        ref={flatListRef}
        data={filteredAlerts}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to offset estimate if index is out of range
          flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
          />
        }
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onMarkAsRead={markAlertAsRead}
            onPress={() => {
              markAlertAsRead(item.id);
              if (item.category === 'Hub Update') markHubNotificationRead(item.id);
              // Map alert schema to notification schema for NotificationDetailScreen
              const notification = {
                ...item,
                hubName: item.hubName || item.projectName || 'Alert',
                hubIcon: item.hubIcon || item.projectIcon || 'notifications',
                fullMessage: item.fullMessage || item.message || '',
                reactions: item.reactions || 0,
                comments: item.comments || 0,
                isNew: !item.read,
                timestamp: item.timestamp || item.createdAt || 'Recently',
              };
              navigation.navigate('NotificationDetail', { notification });
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <View className="items-center py-12">
            <Ionicons name="notifications-off-outline" size={64} color="#666666" />
            <Text className="text-text-secondary text-center mt-4 text-base">
              {filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </Text>
            <Text className="text-text-muted text-center mt-2 text-sm px-8">
              {filter === 'unread'
                ? 'All caught up!'
                : 'Subscribe to projects to start receiving alerts'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
