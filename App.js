import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { notificationService } from './src/services/notificationService';
import {
  registerFcmToken,
  fetchHubsFromFirestore,
  fetchNotificationsFromFirestore,
  fetchApprovedAdsFromFirestore,
  fetchTalentSubmissions,
  fetchDaoProposals,
  fetchHubFeedbacks,
  fetchPendingAdCreatives,
  fetchCustomDeals,
  fetchAdminConversations,
  fetchDoohCampaigns,
  fetchPendingHubsFromFirestore,
  fetchUserSubscriptions,
  fetchUserScore,
  authenticateWithFirebase,
  initCrashlytics,
  logCrashlyticsError,
  initAppCheck,
} from './src/services/firebaseService';
import { walletAdapter } from './src/services/walletAdapter';
import { useAppStore } from './src/store/appStore';
import { logger } from './src/utils/security';
import { setWalletState } from './src/services/transactionHelper';
import { createNavigationContainerRef } from '@react-navigation/native';

// Screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import MyHubsScreen from './src/screens/MyHubsScreen';
import DAOBoostScreen from './src/screens/DAOBoostScreen';
import TalentScreen from './src/screens/TalentScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdSlotsScreen from './src/screens/AdSlotsScreen';
import AdTypeSelectorScreen from './src/screens/AdTypeSelectorScreen';
import HubDashboardScreen from './src/screens/HubDashboardScreen';
import BrandModerationScreen from './src/screens/BrandModerationScreen';
import BrandBoostScreen from './src/screens/BrandBoostScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminMessagesScreen from './src/screens/AdminMessagesScreen';
import HubNotificationsScreen from './src/screens/HubNotificationsScreen';
import NotificationDetailScreen from './src/screens/NotificationDetailScreen';
import SwipeEarnScreen from './src/screens/SwipeEarnScreen';
import DOOHScreen from './src/screens/DOOHScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

// Global JS error handler for Crashlytics
const defaultHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  logCrashlyticsError(error, isFatal ? 'FATAL_JS_ERROR' : 'JS_ERROR');
  if (defaultHandler) defaultHandler(error, isFatal);
});

/**
 * Navigate to the relevant screen when a notification is tapped.
 * Expects data from FCM remoteMessage.data
 */
function handleNotificationNavigation(data) {
  if (!data || !navigationRef.isReady()) return;

  // Wait briefly for navigation to be ready
  setTimeout(() => {
    try {
      if (data.hubName) {
        // Navigate to the hub's notification list
        navigationRef.navigate('HubNotifications', {
          hubName: data.hubName,
          hubIcon: data.hubIcon || 'notifications',
        });
      } else if (data.screen) {
        // Generic screen navigation from notification payload
        // [B45] Guard against malformed JSON in notification params
        let parsedParams = {};
        try { parsedParams = data.params ? JSON.parse(data.params) : {}; } catch (_) {}
        navigationRef.navigate(data.screen, parsedParams);
      } else {
        // Default: go to Home
        navigationRef.navigate('MainApp', { screen: 'Home' });
      }
    } catch (e) {
      logger.warn('[App] Notification navigation failed:', e.message);
    }
  }, 500);
}

// Custom Tab Icon with glow dot for active state
function TabIcon({ focused, iconName, iconNameOutline, color }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
      <Ionicons
        name={focused ? iconName : iconNameOutline}
        size={focused ? 24 : 22}
        color={color}
      />
      {/* Glow dot indicator */}
      {focused && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#FF9F66',
            marginTop: 4,
            shadowColor: '#FF9F66',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 6,
            elevation: 5,
          }}
        />
      )}
    </View>
  );
}

// Bottom Tab Navigator (Main App)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home: { active: 'home', inactive: 'home-outline' },
            Discover: { active: 'search', inactive: 'search-outline' },
            MyHubs: { active: 'apps', inactive: 'apps-outline' },
            DAO: { active: 'rocket', inactive: 'rocket-outline' },
            Talent: { active: 'briefcase', inactive: 'briefcase-outline' },
            Profile: { active: 'person', inactive: 'person-outline' },
          };
          const icon = icons[route.name] || icons.Home;
          return (
            <TabIcon
              focused={focused}
              iconName={icon.active}
              iconNameOutline={icon.inactive}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: '#FF9F66',
        tabBarInactiveTintColor: '#555',
        tabBarStyle: {
          backgroundColor: '#0c0c0e',
          borderTopColor: '#1a1a1f',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 6,
          // Subtle top shadow
          shadowColor: '#FF9F66',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: -2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="MyHubs" component={MyHubsScreen} options={{ title: 'My Hubs' }} />
      <Tab.Screen name="DAO" component={DAOBoostScreen} />
      <Tab.Screen name="Talent" component={TalentScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App with Stack Navigator
const App = () => {
  // Bootstrap Firebase push notification listeners
  useEffect(() => {
    const bootstrapNotifications = async () => {
      try {
        // Request permission + get FCM token
        const fcmToken = await notificationService.registerForPushNotifications();

        // Register FCM token with Firebase backend (for targeted push)
        if (fcmToken) {
          const walletPubkey = useAppStore.getState().wallet?.publicKey;
          if (walletPubkey) {
            registerFcmToken(fcmToken, walletPubkey).catch(() => {});
          }
          useAppStore.getState().setPushToken(fcmToken);
        }

        // Listen for foreground notifications
        notificationService.addForegroundListener((notification) => {
          logger.log('[App] Foreground notification:', notification.title);
        });

        // Handle notifications that opened the app — navigate to relevant screen
        notificationService.getInitialNotification((data) => {
          logger.log('[App] Notification opened app:', data);
          handleNotificationNavigation(data);
        });

        // Listen for token refresh — re-register with backend
        notificationService.onTokenRefresh((newToken) => {
          logger.log('[App] FCM token refreshed');
          const walletPk = useAppStore.getState().wallet?.publicKey;
          if (walletPk) {
            registerFcmToken(newToken, walletPk).catch(() => {});
          }
          useAppStore.getState().setPushToken(newToken);
        });
      } catch (e) {
        logger.warn('[App] Notification bootstrap failed:', e.message);
      }
    };

    bootstrapNotifications();

    // Initialize Firebase App Check (protects Cloud Functions from abuse)
    initAppCheck();

    // Initialize Firebase Crashlytics (error monitoring)
    const storedWallet = useAppStore.getState().wallet;
    if (storedWallet?.publicKey) {
      initCrashlytics(storedWallet.publicKey);
    } else {
      initCrashlytics(null);
    }

    // Restore wallet state for transactionHelper on app restart
    if (storedWallet?.connected && storedWallet?.publicKey) {
      logger.log('[App] Restoring wallet state from persisted store');
      setWalletState(storedWallet.publicKey, storedWallet.authToken);

      // Auto-authenticate with Firebase Auth if wallet is connected
      const tryFirebaseAuth = async () => {
        try {
          const result = await authenticateWithFirebase(
            storedWallet.publicKey,
            (msg, token) => walletAdapter.signMessage(msg, token),
            storedWallet.authToken,
          );
          if (result.success) {
            logger.log('[App] Firebase Auth restored for:', storedWallet.publicKey);
          } else {
            logger.log('[App] Firebase Auth skipped (non-blocking):', result.error);
          }
        } catch (e) {
          // Non-blocking — app works without Firebase Auth
          logger.warn('[App] Firebase Auth restore failed (non-blocking):', e?.message);
        }
      };
      tryFirebaseAuth();
    }

    // Check hub subscription expiry on app start (detect OVERDUE hubs)
    useAppStore.getState().checkHubSubscriptions();

    // Sync data from Firebase (non-blocking — MERGES with local data)
    const syncFromFirebase = async () => {
      try {
        // Wait for Zustand to finish hydrating from AsyncStorage
        // This prevents the race condition where sync runs before local data is loaded,
        // which would cause Firebase empty results to overwrite locally-created data.
        if (!useAppStore.persist.hasHydrated()) {
          await new Promise(resolve => {
            const unsub = useAppStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          });
        }

        const walletPk = useAppStore.getState().wallet?.publicKey;
        const walletStr = typeof walletPk === 'string' ? walletPk : (walletPk?.toBase58?.() || walletPk?.toString?.() || null);

        const [hubs, pendingHubs, notifications, ads, talents, proposals, feedbacks, pendingAds, deals, conversations, dooh, userSubs, userScore] = await Promise.all([
          fetchHubsFromFirestore(),
          fetchPendingHubsFromFirestore(),
          fetchNotificationsFromFirestore(),
          fetchApprovedAdsFromFirestore(),
          fetchTalentSubmissions(),
          fetchDaoProposals(),
          fetchHubFeedbacks(),
          fetchPendingAdCreatives(),
          fetchCustomDeals(),
          fetchAdminConversations(),
          fetchDoohCampaigns(),
          fetchUserSubscriptions(walletStr),
          fetchUserScore(walletStr),
        ]);
        const store = useAppStore.getState();
        // MERGE Firebase data with local data (not replace).
        // Firebase version wins for existing items; local-only items preserved.
        // null = fetch failed → keep local data entirely.
        if (hubs !== null && hubs !== undefined) store.syncHubsFromFirebase(hubs);
        if (pendingHubs !== null && pendingHubs !== undefined) store.syncPendingHubsFromFirebase(pendingHubs);
        if (notifications !== null && notifications !== undefined) store.syncNotificationsFromFirebase(notifications);
        if (ads !== null && ads !== undefined) store.syncAdsFromFirebase(ads);
        if (talents !== null && talents !== undefined) store.syncTalentSubmissions(talents);
        if (proposals !== null && proposals !== undefined) store.syncDaoProposals(proposals);
        if (feedbacks) store.syncHubFeedbacks(feedbacks);
        if (pendingAds !== null && pendingAds !== undefined) store.syncPendingAdCreatives(pendingAds);
        if (deals !== null && deals !== undefined) store.syncCustomDeals(deals);
        if (conversations !== null && conversations !== undefined) store.setAdminConversations(conversations);
        if (dooh !== null && dooh !== undefined) store.syncDoohCampaigns(dooh);
        // Restore user subscriptions from Firebase (survives cache clear)
        if (userSubs && userSubs.length > 0) {
          const currentSubs = store.subscribedProjects || [];
          if (currentSubs.length === 0) {
            // Only restore if local is empty (cache was cleared)
            store.setSubscribedProjects(userSubs);
          }
        }
        // Restore user score from Firebase
        if (userScore && userScore.score != null) {
          const currentScore = store.userScore || 0;
          // Use server score if higher (or local was reset to 0)
          if (userScore.score > currentScore) {
            store.setUserScore(userScore.score);
          }
        }
        logger.log(`[App] Firebase sync: ${hubs?.length || 0} hubs, ${notifications?.length || 0} notifs, ${ads?.length || 0} ads, ${talents?.length || 0} talents, ${proposals?.length || 0} proposals, ${deals?.length || 0} deals, ${userSubs?.length || 0} subs`);
      } catch (e) {
        logger.warn('[App] Firebase sync failed, using local data:', e?.message);
      }
    };
    syncFromFirebase();

    return () => {
      notificationService.removeForegroundListener();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0c0e" />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Onboarding"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0c0c0e',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: '#FF9F66',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 20,
            },
            cardStyle: { backgroundColor: '#0c0c0e' },
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MainApp"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AdTypeSelector"
            component={AdTypeSelectorScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AdSlots"
            component={AdSlotsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="HubDashboard"
            component={HubDashboardScreen}
            options={{ title: 'Hub Dashboard' }}
          />
          <Stack.Screen
            name="BrandModeration"
            component={BrandModerationScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BrandBoost"
            component={BrandBoostScreen}
            options={{ title: 'Brand Boost' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />
          <Stack.Screen
            name="Admin"
            component={AdminScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AdminMessages"
            component={AdminMessagesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="HubNotifications"
            component={HubNotificationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NotificationDetail"
            component={NotificationDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SwipeEarn"
            component={SwipeEarnScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DOOH"
            component={DOOHScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
