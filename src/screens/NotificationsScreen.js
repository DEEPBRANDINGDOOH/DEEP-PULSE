/**
 * Notifications Screen
 * 
 * Display all notifications/alerts
 * Filter by read/unread status
 * Mark as read functionality
 */

import React, { useState, useEffect } from 'react';
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

export default function NotificationsScreen({ navigation, route }) {
  const { alerts, markAlertAsRead, markAllAlertsAsRead, getUnreadCount } =
    useAppStore();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [refreshing, setRefreshing] = useState(false);

  // Auto-scroll to specific alert if passed via navigation
  useEffect(() => {
    if (route.params?.alertId) {
      const index = alerts.findIndex((a) => a.id === route.params.alertId);
      if (index !== -1) {
        // TODO: Scroll to index
      }
    }
  }, [route.params?.alertId]);

  const filteredAlerts = React.useMemo(() => {
    if (filter === 'unread') {
      return alerts.filter((a) => !a.read);
    }
    return alerts;
  }, [alerts, filter]);

  const unreadCount = getUnreadCount();

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch fresh alerts
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleMarkAllRead = () => {
    markAllAlertsAsRead();
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
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {unreadCount > 0 && (
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
            All ({alerts.length})
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
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
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
              navigation.navigate('NotificationDetail', { notification: item });
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
