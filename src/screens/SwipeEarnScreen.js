import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import lockScreenService from '../services/lockScreenService';
import { MOCK_ADS } from '../config/constants';

/**
 * SwipeEarnScreen — Dashboard for the Swipe-to-Earn (LockScreen Overlay) feature.
 *
 * Shows:
 * - Enable/disable toggle
 * - Today's stats (ads seen, points earned)
 * - Progress bar (ads today / max)
 * - How it works explanation
 * - Points history (mock for now)
 *
 * On service start, pushes the lockscreen ad queue to the native module.
 * In production, this would fetch approved ads from the blockchain/backend.
 */
export default function SwipeEarnScreen({ navigation }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    adsToday: 0,
    adsThisHour: 0,
    totalPoints: 0,
    maxAdsPerDay: 15,
    maxAdsPerHour: 3,
    enabled: false,
  });

  // Load initial stats
  useEffect(() => {
    loadStats();
  }, []);

  // Listen for swipe events
  useEffect(() => {
    const unsubscribe = lockScreenService.onSwipe((event) => {
      // Refresh stats after each swipe
      loadStats();

      // Show a brief feedback (optional)
      if (event.points > 0) {
        // Points will be reflected in stats refresh
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Push lockscreen ad creatives to the native Android module.
   * In production: fetches approved lockscreen ads from blockchain/backend.
   * In dev: uses MOCK_ADS.LOCKSCREEN data.
   */
  const pushLockscreenAds = useCallback(async () => {
    if (!lockScreenService.isAvailable()) return;

    try {
      // Transform ads to the format expected by the native module
      const lockscreenAds = (MOCK_ADS.LOCKSCREEN || []).map(ad => ({
        contentUrl: ad.contentUrl || ad.imageUrl,
        title: ad.title || 'Sponsored',
        brand: ad.brand || ad.advertiserId || 'Brand',
        clickUrl: ad.clickUrl || ad.landingUrl || '',
      }));

      if (lockscreenAds.length > 0) {
        const queued = await lockScreenService.pushAdQueue(lockscreenAds);
        console.log(`[SwipeEarn] Pushed ${queued} lockscreen ads to native module`);
      }
    } catch (e) {
      console.warn('[SwipeEarn] Failed to push ad queue:', e);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const currentStats = await lockScreenService.getStats();
      setStats(currentStats);
      setIsEnabled(currentStats.enabled);

      // If service is running, make sure ad queue is populated
      if (currentStats.enabled) {
        pushLockscreenAds();
      }
    } catch (e) {
      console.warn('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  }, [pushLockscreenAds]);

  /**
   * Toggle the Swipe-to-Earn feature ON/OFF.
   */
  const handleToggle = async (value) => {
    if (value) {
      // Enable
      const started = await lockScreenService.requestPermissionAndStart();
      if (started) {
        setIsEnabled(true);
        await pushLockscreenAds(); // Push ad queue to native module
        loadStats();
      }
    } else {
      // Disable
      Alert.alert(
        'Disable Swipe-to-Earn?',
        'You will no longer earn points from the lock screen.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await lockScreenService.stop();
              setIsEnabled(false);
              loadStats();
            },
          },
        ]
      );
    }
  };

  if (!lockScreenService.isAvailable()) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="phone-portrait-outline" size={64} color="#666" />
          <Text className="text-text text-lg font-bold mt-4 text-center">
            Available on Android only
          </Text>
          <Text className="text-text-secondary text-sm mt-2 text-center">
            Swipe-to-Earn uses the Android lock screen to display
            sponsored content and reward you with DEEP Score points.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = stats.maxAdsPerDay > 0
    ? Math.min((stats.adsToday / stats.maxAdsPerDay) * 100, 100)
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-text font-bold text-lg">Swipe-to-Earn</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-6 py-4">

        {/* Security & Privacy Reassurance */}
        {!isEnabled && (
          <View className="bg-green-500/10 rounded-2xl p-5 mb-4 border border-green-500/30">
            <View className="flex-row items-center mb-3">
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text className="text-green-400 font-bold text-base ml-3">Your data is safe</Text>
            </View>
            <View className="mb-2">
              <View className="flex-row items-start mb-2">
                <Text className="text-green-400 mr-2">✅</Text>
                <Text className="text-text text-xs flex-1">Only displays sponsored content on your lock screen</Text>
              </View>
              <View className="flex-row items-start mb-2">
                <Text className="text-green-400 mr-2">✅</Text>
                <Text className="text-text text-xs flex-1">Counts your swipes to earn DEEP Score points</Text>
              </View>
              <View className="flex-row items-start mb-2">
                <Text className="text-red-400 mr-2">❌</Text>
                <Text className="text-text text-xs flex-1">Cannot read your passwords or personal data</Text>
              </View>
              <View className="flex-row items-start mb-2">
                <Text className="text-red-400 mr-2">❌</Text>
                <Text className="text-text text-xs flex-1">Cannot access your wallet or sign transactions</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-red-400 mr-2">❌</Text>
                <Text className="text-text text-xs flex-1">Cannot modify or interact with other apps</Text>
              </View>
            </View>
            <View className="bg-green-500/10 rounded-xl p-3 mt-2">
              <Text className="text-text-secondary text-xs">
                🔐 Your wallet is protected by SeedVault — no app can access it without your biometric approval. DEEP Pulse code is 100% open source on GitHub.
              </Text>
            </View>
          </View>
        )}

        {/* Main Toggle Card */}
        <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-4">
                <Ionicons name="swap-horizontal" size={24} color="#FF9F66" />
              </View>
              <View className="flex-1">
                <Text className="text-text font-bold text-base">Lock Screen</Text>
                <Text className="text-text-secondary text-xs mt-1">
                  {isEnabled ? 'Active — earning points' : 'Inactive'}
                </Text>
              </View>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#3e3e3e', true: '#FF9F66' }}
              thumbColor={isEnabled ? '#fff' : '#888'}
            />
          </View>

          {isEnabled && (
            <View className="bg-background/50 rounded-xl p-3">
              <Text className="text-text-secondary text-xs">
                Max {stats.maxAdsPerDay} contents/day • Max {stats.maxAdsPerHour}/hour • Can be disabled anytime
              </Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View className="flex-row mb-4" style={{ gap: 12 }}>
          {/* Points */}
          <View className="flex-1 bg-background-card rounded-2xl p-4 border border-border items-center">
            <Ionicons name="star" size={28} color="#FFD700" />
            <Text className="text-primary font-black text-2xl mt-2">
              {loading ? '...' : stats.totalPoints}
            </Text>
            <Text className="text-text-secondary text-xs mt-1">Points Earned</Text>
          </View>

          {/* Ads Today */}
          <View className="flex-1 bg-background-card rounded-2xl p-4 border border-border items-center">
            <Ionicons name="eye" size={28} color="#4FC3F7" />
            <Text className="text-text font-black text-2xl mt-2">
              {loading ? '...' : `${stats.adsToday}/${stats.maxAdsPerDay}`}
            </Text>
            <Text className="text-text-secondary text-xs mt-1">Today</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="bg-background-card rounded-2xl p-4 mb-4 border border-border">
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-xs">Today's Progress</Text>
            <Text className="text-text text-xs font-bold">{Math.round(progressPercent)}%</Text>
          </View>
          <View className="h-3 bg-background rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
          <Text className="text-text-secondary text-xs mt-2">
            {stats.adsToday >= stats.maxAdsPerDay
              ? '✅ Daily limit reached — come back tomorrow!'
              : `${stats.maxAdsPerDay - stats.adsToday} contents remaining today`}
          </Text>
        </View>

        {/* How it Works */}
        <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
          <Text className="text-text font-bold text-base mb-4">How it works</Text>

          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center mr-3">
                <Text className="text-green-400 font-bold">1</Text>
              </View>
              <Text className="text-text text-sm flex-1">
                Sponsored content appears when you turn on your screen
              </Text>
            </View>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-blue-500/20 items-center justify-center mr-3">
                <Text className="text-blue-400 font-bold">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text text-sm">Swipe to interact</Text>
                <Text className="text-text-secondary text-xs mt-1">
                  → Right = Unlock (+0.2 pts){'\n'}
                  ← Left = Learn more (+0.5 pts)
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-2">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-yellow-500/20 items-center justify-center mr-3">
                <Text className="text-yellow-400 font-bold">3</Text>
              </View>
              <Text className="text-text text-sm flex-1">
                Your points increase your DEEP Score and tier rank
              </Text>
            </View>
          </View>
        </View>

        {/* Points Breakdown */}
        <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
          <Text className="text-text font-bold text-base mb-3">Points Breakdown</Text>

          <View className="flex-row justify-between py-2 border-b border-border">
            <View className="flex-row items-center">
              <Ionicons name="arrow-forward" size={16} color="#4CAF50" />
              <Text className="text-text text-sm ml-2">Swipe right (skip)</Text>
            </View>
            <Text className="text-green-400 font-bold">+0.2 pts</Text>
          </View>

          <View className="flex-row justify-between py-2 border-b border-border">
            <View className="flex-row items-center">
              <Ionicons name="arrow-back" size={16} color="#2196F3" />
              <Text className="text-text text-sm ml-2">Swipe left (engage)</Text>
            </View>
            <Text className="text-blue-400 font-bold">+0.5 pts</Text>
          </View>

          <View className="flex-row justify-between py-2 border-b border-border">
            <View className="flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#FF9F66" />
              <Text className="text-text text-sm ml-2">Daily lockscreen cap</Text>
            </View>
            <Text className="text-primary font-bold">3 pts max</Text>
          </View>

          <View className="flex-row justify-between py-2">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={16} color="#999" />
              <Text className="text-text-secondary text-xs ml-2 flex-1">
                To rank up, contribute to DAO (+50), submit talent (+25) or send feedback (+15)
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <View className="bg-background-card/50 rounded-xl p-4 mb-8">
          <View className="flex-row items-start">
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" style={{ marginTop: 2 }} />
            <Text className="text-text-secondary text-xs ml-3 flex-1">
              Your data stays private. Content is targeted by hub category,
              not personal data. You can disable this feature
              anytime from this screen.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
