/**
 * AlertCard Component
 * 
 * Displays a single alert/notification card
 * Used in Home screen and Notifications screen
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';

export const AlertCard = ({ alert, onPress, onMarkAsRead }) => {
  const handleLinkPress = () => {
    if (alert.link) {
      Linking.openURL(alert.link);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true });

  return (
    <TouchableOpacity
      onPress={() => {
        if (!alert.read && onMarkAsRead) {
          onMarkAsRead(alert.id);
        }
        if (onPress) {
          onPress(alert);
        }
      }}
      className={`bg-background-card rounded-2xl p-4 mb-3 border ${
        alert.read ? 'border-border' : 'border-primary/30'
      }`}
      activeOpacity={0.7}
    >
      {/* Header: Project info + timestamp */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-2">
            <Ionicons name={alert.projectIcon} size={20} color="#FF9F66" />
          </View>
          <View className="flex-1">
            <Text className="text-text font-semibold text-base">
              {alert.projectName}
            </Text>
            <Text className="text-text-muted text-xs">{timeAgo}</Text>
          </View>
        </View>
        
        {/* Unread indicator */}
        {!alert.read && (
          <View className="w-2 h-2 rounded-full bg-primary ml-2" />
        )}
      </View>

      {/* Alert title */}
      <Text className="text-text font-bold text-lg mb-2">
        {alert.title}
      </Text>

      {/* Alert message */}
      <Text className="text-text-secondary text-sm leading-5 mb-3">
        {alert.message}
      </Text>

      {/* Alert image (if exists) */}
      {alert.imageUrl && (
        <Image
          source={{ uri: alert.imageUrl }}
          className="w-full h-40 rounded-xl mb-3"
          resizeMode="cover"
        />
      )}

      {/* Footer: Category + Link */}
      <View className="flex-row items-center justify-between">
        {/* Category badge */}
        <View className="bg-background-surface px-3 py-1.5 rounded-full">
          <Text className="text-primary text-xs font-semibold">
            {alert.category}
          </Text>
        </View>

        {/* Link button */}
        {alert.link && (
          <TouchableOpacity
            onPress={handleLinkPress}
            className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-full"
            activeOpacity={0.7}
          >
            <Text className="text-primary text-xs font-semibold mr-1">
              View
            </Text>
            <Ionicons name="open-outline" size={12} color="#FF6B35" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};
