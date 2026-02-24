/**
 * ProjectCard Component
 * 
 * Displays a project/hub card with subscribe button
 * Used in Home screen and Discover screen
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';

export const ProjectCard = ({ project, onPress }) => {
  const { isSubscribed, subscribeToProject, unsubscribeFromProject } = useAppStore();
  const subscribed = isSubscribed(project.id);

  const handleSubscribe = async (e) => {
    e.stopPropagation(); // Prevent card press
    
    if (subscribed) {
      await unsubscribeFromProject(project.id);
    } else {
      await subscribeToProject(project.id);
    }
  };

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(project)}
      className="bg-background-card rounded-2xl p-4 mb-3 border border-border"
      activeOpacity={0.7}
    >
      {/* Header: Icon + Name */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-start flex-1">
          {/* Project icon */}
          <View className="w-14 h-14 rounded-xl bg-background-surface items-center justify-center mr-3">
            <Ionicons name={project.icon} size={28} color="#FF9F66" />
          </View>

          {/* Project info */}
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-text font-bold text-lg mr-2">
                {project.name}
              </Text>
              {project.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
            
            <Text className="text-text-secondary text-sm leading-5" numberOfLines={2}>
              {project.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Tags */}
      <View className="flex-row flex-wrap mb-3">
        <View className="bg-background-surface px-2 py-1 rounded mr-2 mb-1">
          <Text className="text-primary text-xs font-semibold">
            {project.category}
          </Text>
        </View>
        {project.tags.slice(0, 2).map((tag, index) => (
          <View key={index} className="bg-background-surface px-2 py-1 rounded mr-2 mb-1">
            <Text className="text-text-muted text-xs">
              {tag}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer: Subscribers + Subscribe button */}
      <View className="flex-row items-center justify-between pt-3 border-t border-border">
        {/* Subscriber count */}
        <View className="flex-row items-center">
          <Ionicons name="people-outline" size={16} color="#999999" />
          <Text className="text-text-secondary text-sm ml-1.5">
            {formatCount(project.subscriberCount)} subscribers
          </Text>
        </View>

        {/* Subscribe button */}
        <TouchableOpacity
          onPress={handleSubscribe}
          className={`flex-row items-center px-4 py-2 rounded-lg ${
            subscribed 
              ? 'bg-primary/10 border border-primary/30' 
              : 'bg-primary'
          }`}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={subscribed ? "checkmark-circle" : "add-circle-outline"} 
            size={16} 
            color={subscribed ? "#FF6B35" : "#ffffff"}
          />
          <Text className={`ml-1.5 text-sm font-semibold ${
            subscribed ? 'text-primary' : 'text-white'
          }`}>
            {subscribed ? 'Subscribed' : 'Subscribe'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};
