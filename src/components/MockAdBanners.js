/**
 * Mock Ad Banners — Local React Native components
 *
 * Replaces placeholder.com URLs with real-looking banners
 * rendered locally using Ionicons + styled Views.
 * No external URL dependency — works offline at hackathon demo.
 */

import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ========================================
// TOP SLOT BANNERS (390 x 120)
// ========================================

export function JupiterBanner() {
  return (
    <View style={{
      height: 120, borderRadius: 12, padding: 16,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#0B1A0F',
      borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.3)',
    }}>
      <View style={{
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Ionicons name="planet" size={28} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#4CAF50', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 }}>
          Jupiter
        </Text>
        <Text style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>
          Swap any token. Best price guaranteed.
        </Text>
        <View style={{
          backgroundColor: '#4CAF50', borderRadius: 8,
          paddingHorizontal: 14, paddingVertical: 5,
          marginTop: 6, alignSelf: 'flex-start',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Swap Now</Text>
        </View>
      </View>
    </View>
  );
}

export function MarinadeBanner() {
  return (
    <View style={{
      height: 120, borderRadius: 12, padding: 16,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#0B1420',
      borderWidth: 1, borderColor: 'rgba(33, 150, 243, 0.3)',
    }}>
      <View style={{
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Ionicons name="water" size={28} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#2196F3', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 }}>
          Marinade
        </Text>
        <Text style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>
          Stake SOL, earn mSOL. 7.2% APY.
        </Text>
        <View style={{
          backgroundColor: '#2196F3', borderRadius: 8,
          paddingHorizontal: 14, paddingVertical: 5,
          marginTop: 6, alignSelf: 'flex-start',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Stake Now</Text>
        </View>
      </View>
    </View>
  );
}

export function RaydiumBanner() {
  return (
    <View style={{
      height: 120, borderRadius: 12, padding: 16,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#0F0B20',
      borderWidth: 1, borderColor: 'rgba(0, 188, 212, 0.3)',
    }}>
      <View style={{
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#00BCD4', alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Ionicons name="flash" size={28} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#00BCD4', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 }}>
          Raydium
        </Text>
        <Text style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>
          Concentrated liquidity. Maximum yield.
        </Text>
        <View style={{
          backgroundColor: '#00BCD4', borderRadius: 8,
          paddingHorizontal: 14, paddingVertical: 5,
          marginTop: 6, alignSelf: 'flex-start',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Provide Liquidity</Text>
        </View>
      </View>
    </View>
  );
}

// ========================================
// BOTTOM SLOT BANNERS (390 x 100)
// ========================================

export function TensorBanner() {
  return (
    <View style={{
      height: 100, borderRadius: 12, padding: 14,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#150B20',
      borderWidth: 1, borderColor: 'rgba(156, 39, 176, 0.3)',
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#9C27B0', alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name="images" size={24} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#9C27B0', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>
          Tensor
        </Text>
        <Text style={{ color: '#ccc', fontSize: 11, marginTop: 2 }}>
          Trade NFTs. Lowest fees on Solana.
        </Text>
        <View style={{
          backgroundColor: '#9C27B0', borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 4,
          marginTop: 5, alignSelf: 'flex-start',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>Browse Collections</Text>
        </View>
      </View>
    </View>
  );
}

export function MagicEdenBanner() {
  return (
    <View style={{
      height: 100, borderRadius: 12, padding: 14,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#200B14',
      borderWidth: 1, borderColor: 'rgba(233, 30, 99, 0.3)',
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#E91E63', alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name="diamond" size={24} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#E91E63', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>
          Magic Eden
        </Text>
        <Text style={{ color: '#ccc', fontSize: 11, marginTop: 2 }}>
          The #1 NFT marketplace. Cross-chain.
        </Text>
        <View style={{
          backgroundColor: '#E91E63', borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 4,
          marginTop: 5, alignSelf: 'flex-start',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>Explore NFTs</Text>
        </View>
      </View>
    </View>
  );
}

// ========================================
// LOCKSCREEN BANNERS (full-screen style, but rendered in container)
// ========================================

export function SeekerLockBanner() {
  return (
    <View style={{
      flex: 1, borderRadius: 16, padding: 24,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: '#0c0c0e',
      borderWidth: 1, borderColor: 'rgba(255, 159, 102, 0.3)',
    }}>
      <View style={{
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: '#FF9F66', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Ionicons name="phone-portrait" size={36} color="#fff" />
      </View>
      <Text style={{ color: '#FF9F66', fontWeight: '900', fontSize: 22, textAlign: 'center' }}>
        Solana Seeker
      </Text>
      <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        The crypto-native phone. Pre-order now.
      </Text>
      <View style={{
        backgroundColor: '#FF9F66', borderRadius: 12,
        paddingHorizontal: 24, paddingVertical: 10,
        marginTop: 16,
      }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Pre-Order</Text>
      </View>
    </View>
  );
}

export function JupiterLockBanner() {
  return (
    <View style={{
      flex: 1, borderRadius: 16, padding: 24,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: '#0B1A0F',
      borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.3)',
    }}>
      <View style={{
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Ionicons name="planet" size={36} color="#fff" />
      </View>
      <Text style={{ color: '#4CAF50', fontWeight: '900', fontSize: 22, textAlign: 'center' }}>
        Jupiter Exchange
      </Text>
      <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        Swap any token with the best price on Solana.
      </Text>
      <View style={{
        backgroundColor: '#4CAF50', borderRadius: 12,
        paddingHorizontal: 24, paddingVertical: 10,
        marginTop: 16,
      }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Start Swapping</Text>
      </View>
    </View>
  );
}

export function MagicEdenLockBanner() {
  return (
    <View style={{
      flex: 1, borderRadius: 16, padding: 24,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: '#200B14',
      borderWidth: 1, borderColor: 'rgba(156, 39, 176, 0.3)',
    }}>
      <View style={{
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: '#9C27B0', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Ionicons name="diamond" size={36} color="#fff" />
      </View>
      <Text style={{ color: '#9C27B0', fontWeight: '900', fontSize: 22, textAlign: 'center' }}>
        Magic Eden NFTs
      </Text>
      <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
        Discover the hottest collections on Solana.
      </Text>
      <View style={{
        backgroundColor: '#9C27B0', borderRadius: 12,
        paddingHorizontal: 24, paddingVertical: 10,
        marginTop: 16,
      }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Explore Now</Text>
      </View>
    </View>
  );
}

// ========================================
// LOOKUP MAP — Maps ad ID → Component
// ========================================

const AD_COMPONENT_MAP = {
  // Top slot
  'ad_top_1': JupiterBanner,
  'ad_top_2': MarinadeBanner,
  'ad_top_3': RaydiumBanner,
  // Bottom slot
  'ad_bottom_1': TensorBanner,
  'ad_bottom_2': MagicEdenBanner,
  // Lockscreen
  'ad_lock_1': SeekerLockBanner,
  'ad_lock_2': JupiterLockBanner,
  'ad_lock_3': MagicEdenLockBanner,
};

/**
 * Get the local mock ad component for a given ad ID.
 * Returns null if no local component exists (fallback to imageUrl).
 */
export function getMockAdComponent(adId) {
  return AD_COMPONENT_MAP[adId] || null;
}
