/**
 * WalletButton Component
 * 
 * Button for connecting/disconnecting wallet using Mobile Wallet Adapter
 * Shows connection status and wallet address when connected
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { walletAdapter, formatPublicKey } from '../services/walletAdapter';

export const WalletButton = ({ variant = 'default', useSignIn = false }) => {
  const { wallet, setWallet, clearWallet } = useAppStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      // Use SIWS (recommended) or basic connect
      const result = useSignIn
        ? await walletAdapter.signInWithSolana()
        : await walletAdapter.connect();

      // Save wallet state
      setWallet({
        connected: true,
        publicKey: result.publicKey,
        authToken: result.authToken,
      });

      Alert.alert(
        'Wallet Connected',
        `Connected to ${result.label || 'wallet'}\n\n${result.publicKey.toString()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Wallet connection error:', error);
      
      let errorMessage = 'Failed to connect wallet. Please try again.';
      
      if (error.message?.includes('declined')) {
        errorMessage = 'You declined the wallet connection.';
      } else if (error.message?.includes('No wallet')) {
        errorMessage = 'No compatible wallet app found. Please install Phantom or Solflare.';
      }
      
      Alert.alert('Connection Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              // Deauthorize with wallet app
              if (wallet.authToken) {
                await walletAdapter.disconnect(wallet.authToken);
              }
              
              // Clear local state
              clearWallet();
              
              Alert.alert('Disconnected', 'Your wallet has been disconnected.', [
                { text: 'OK' }
              ]);
            } catch (error) {
              console.error('Disconnect error:', error);
              // Still clear local state even if deauth fails
              clearWallet();
            }
          },
        },
      ]
    );
  };

  // Compact variant (for header/profile)
  if (variant === 'compact') {
    if (wallet.connected) {
      return (
        <TouchableOpacity
          onPress={handleDisconnect}
          className="flex-row items-center bg-primary/10 px-3 py-2 rounded-lg border border-primary/30"
          activeOpacity={0.7}
        >
          <View className="w-2 h-2 rounded-full bg-primary mr-2" />
          <Text className="text-primary font-semibold text-sm">
            {formatPublicKey(wallet.publicKey)}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleConnect}
        disabled={isConnecting}
        className="flex-row items-center bg-primary px-3 py-2 rounded-lg"
        activeOpacity={0.7}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="wallet-outline" size={16} color="#ffffff" />
            <Text className="text-white font-semibold text-sm ml-1.5">
              Connect
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Full variant (for profile screen)
  if (wallet.connected) {
    return (
      <View className="bg-background-card rounded-2xl p-4 border border-border">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
              <Ionicons name="wallet" size={20} color="#FF6B35" />
            </View>
            <View>
              <Text className="text-text-muted text-xs mb-1">Connected Wallet</Text>
              <Text className="text-text font-semibold text-base">
                {formatPublicKey(wallet.publicKey)}
              </Text>
            </View>
          </View>
          <View className="w-2 h-2 rounded-full bg-primary" />
        </View>

        <TouchableOpacity
          onPress={handleDisconnect}
          className="bg-background-surface py-3 rounded-lg border border-border"
          activeOpacity={0.7}
        >
          <Text className="text-text-secondary text-center font-semibold">
            Disconnect Wallet
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Connect button (default variant)
  return (
    <TouchableOpacity
      onPress={handleConnect}
      disabled={isConnecting}
      className="bg-primary py-4 rounded-xl flex-row items-center justify-center"
      activeOpacity={0.7}
    >
      {isConnecting ? (
        <>
          <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
          <Text className="text-white font-bold text-base">Connecting...</Text>
        </>
      ) : (
        <>
          <Ionicons name="wallet-outline" size={20} color="#ffffff" className="mr-2" />
          <Text className="text-white font-bold text-base">Connect Wallet</Text>
        </>
      )}
    </TouchableOpacity>
  );
};
