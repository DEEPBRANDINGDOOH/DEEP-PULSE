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

/**
 * SwipeEarnScreen — Dashboard for the Swipe-to-Earn (LockScreen Overlay) feature.
 *
 * Shows:
 * - Enable/disable toggle
 * - Today's stats (ads seen, points earned)
 * - Progress bar (ads today / max)
 * - How it works explanation
 * - Points history (mock for now)
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

  const loadStats = useCallback(async () => {
    try {
      const currentStats = await lockScreenService.getStats();
      setStats(currentStats);
      setIsEnabled(currentStats.enabled);
    } catch (e) {
      console.warn('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Toggle the Swipe-to-Earn feature ON/OFF.
   */
  const handleToggle = async (value) => {
    if (value) {
      // Enable
      const started = await lockScreenService.requestPermissionAndStart();
      if (started) {
        setIsEnabled(true);
        loadStats();
      }
    } else {
      // Disable
      Alert.alert(
        'Désactiver Swipe-to-Earn ?',
        'Vous ne gagnerez plus de points sur l\'écran de verrouillage.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Désactiver',
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
            Disponible uniquement sur Android
          </Text>
          <Text className="text-text-secondary text-sm mt-2 text-center">
            Le Swipe-to-Earn utilise l'écran de verrouillage Android pour afficher
            du contenu sponsorisé et vous récompenser en points $SKR.
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

        {/* Main Toggle Card */}
        <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-4">
                <Ionicons name="swap-horizontal" size={24} color="#FF9F66" />
              </View>
              <View className="flex-1">
                <Text className="text-text font-bold text-base">Écran de verrouillage</Text>
                <Text className="text-text-secondary text-xs mt-1">
                  {isEnabled ? 'Actif — vous gagnez des points' : 'Inactif'}
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
                Max {stats.maxAdsPerDay} contenus/jour • Max {stats.maxAdsPerHour}/heure • Désactivable à tout moment
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
            <Text className="text-text-secondary text-xs mt-1">Points gagnés</Text>
          </View>

          {/* Ads Today */}
          <View className="flex-1 bg-background-card rounded-2xl p-4 border border-border items-center">
            <Ionicons name="eye" size={28} color="#4FC3F7" />
            <Text className="text-text font-black text-2xl mt-2">
              {loading ? '...' : `${stats.adsToday}/${stats.maxAdsPerDay}`}
            </Text>
            <Text className="text-text-secondary text-xs mt-1">Aujourd'hui</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="bg-background-card rounded-2xl p-4 mb-4 border border-border">
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-xs">Progression du jour</Text>
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
              ? '✅ Limite quotidienne atteinte — revenez demain !'
              : `${stats.maxAdsPerDay - stats.adsToday} contenus restants aujourd'hui`}
          </Text>
        </View>

        {/* How it Works */}
        <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
          <Text className="text-text font-bold text-base mb-4">Comment ça marche ?</Text>

          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center mr-3">
                <Text className="text-green-400 font-bold">1</Text>
              </View>
              <Text className="text-text text-sm flex-1">
                Du contenu sponsorisé s'affiche quand vous allumez l'écran
              </Text>
            </View>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-blue-500/20 items-center justify-center mr-3">
                <Text className="text-blue-400 font-bold">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-text text-sm">Swipez pour interagir</Text>
                <Text className="text-text-secondary text-xs mt-1">
                  → Droite = Déverrouiller (+5 pts){'\n'}
                  ← Gauche = En savoir plus (+10 pts)
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
                Vos points augmentent votre score et votre tier
              </Text>
            </View>
          </View>
        </View>

        {/* Points Breakdown */}
        <View className="bg-background-card rounded-2xl p-6 mb-4 border border-border">
          <Text className="text-text font-bold text-base mb-3">Barème de points</Text>

          <View className="flex-row justify-between py-2 border-b border-border">
            <View className="flex-row items-center">
              <Ionicons name="arrow-forward" size={16} color="#4CAF50" />
              <Text className="text-text text-sm ml-2">Swipe droite (skip)</Text>
            </View>
            <Text className="text-green-400 font-bold">+5 pts</Text>
          </View>

          <View className="flex-row justify-between py-2 border-b border-border">
            <View className="flex-row items-center">
              <Ionicons name="arrow-back" size={16} color="#2196F3" />
              <Text className="text-text text-sm ml-2">Swipe gauche (engage)</Text>
            </View>
            <Text className="text-blue-400 font-bold">+10 pts</Text>
          </View>

          <View className="flex-row justify-between py-2">
            <View className="flex-row items-center">
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text className="text-text text-sm ml-2">Max/jour (15 × engage)</Text>
            </View>
            <Text className="text-yellow-400 font-bold">150 pts</Text>
          </View>
        </View>

        {/* Privacy Note */}
        <View className="bg-background-card/50 rounded-xl p-4 mb-8">
          <View className="flex-row items-start">
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" style={{ marginTop: 2 }} />
            <Text className="text-text-secondary text-xs ml-3 flex-1">
              Vos données restent privées. Le contenu est ciblé par catégorie de hub,
              pas par données personnelles. Vous pouvez désactiver cette fonctionnalité
              à tout moment depuis cet écran.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
