import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { notificationService } from './src/services/notificationService';
import { registerFcmToken } from './src/services/firebaseService';
import { useAppStore } from './src/store/appStore';
import { logger } from './src/utils/security';
import { setWalletState } from './src/services/transactionHelper';

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

        // Handle notifications that opened the app
        notificationService.getInitialNotification((data) => {
          logger.log('[App] Notification opened app:', data);
          // TODO: Navigate to relevant screen based on data
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

    // Restore wallet state for transactionHelper on app restart
    const storedWallet = useAppStore.getState().wallet;
    if (storedWallet?.connected && storedWallet?.publicKey) {
      logger.log('[App] Restoring wallet state from persisted store');
      setWalletState(storedWallet.publicKey, storedWallet.authToken);
    }

    return () => {
      notificationService.removeForegroundListener();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0c0e" />
      <NavigationContainer>
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
            options={{ title: 'Admin Dashboard' }}
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
