import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import MyHubsScreen from './src/screens/MyHubsScreen';
import DAOBoostScreen from './src/screens/DAOBoostScreen';
import TalentScreen from './src/screens/TalentScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdSlotsScreen from './src/screens/AdSlotsScreen';
import HubDashboardScreen from './src/screens/HubDashboardScreen';
import BrandModerationScreen from './src/screens/BrandModerationScreen';
import BrandBoostScreen from './src/screens/BrandBoostScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AdminScreen from './src/screens/AdminScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator (Main App)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'MyHubs') {
            iconName = focused ? 'apps' : 'apps-outline';
          } else if (route.name === 'DAO') {
            iconName = focused ? 'rocket' : 'rocket-outline';
          } else if (route.name === 'Talent') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF9F66',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#333',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Onboarding"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0a0a0a',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: '#FF9F66',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 20,
            },
            cardStyle: { backgroundColor: '#0a0a0a' },
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
            options={{ title: 'Moderation' }}
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
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
