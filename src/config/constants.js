/**
 * DEEP Pulse - Constants & Configuration
 * FIXED: Added APP_IDENTITY and getRpcEndpoint() for MWA compliance
 */

// ========================================
// MOBILE WALLET ADAPTER IDENTITY
// ========================================

/**
 * App Identity for Mobile Wallet Adapter
 * This is displayed to users when they authorize the app
 */
export const APP_IDENTITY = {
  name: 'Deep Pulse',
  uri: 'https://deeppulse.app', // Replace with your actual domain
  icon: 'favicon.ico', // Relative to uri, or absolute URL
};

// ========================================
// SOLANA CONFIGURATION
// ========================================

export const SOLANA_CONFIG = {
  NETWORK: __DEV__ ? 'devnet' : 'mainnet-beta',
  RPC_ENDPOINT_DEV: 'https://api.devnet.solana.com',
  RPC_ENDPOINT_PROD: 'https://api.mainnet-beta.solana.com',

  // DEEP Pulse Program ID (single monolithic Anchor program)
  // Replace after `anchor deploy` with the actual deployed program ID
  PROGRAM_ID: '33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4',

  // $SKR Token — EXISTING SPL token on Solana
  SKR_MINT: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
  SKR_DECIMALS: 6,
};

/**
 * Get RPC Endpoint based on environment
 * Used by walletAdapter to connect to Solana network
 */
export const getRpcEndpoint = () => {
  return __DEV__ 
    ? SOLANA_CONFIG.RPC_ENDPOINT_DEV 
    : SOLANA_CONFIG.RPC_ENDPOINT_PROD;
};

/**
 * Get cluster name in MWA 2.0 format
 */
export const getCluster = () => {
  return __DEV__ ? 'solana:devnet' : 'solana:mainnet-beta';
};

// ========================================
// STORAGE KEYS (AsyncStorage)
// ========================================

export const STORAGE_KEYS = {
  WALLET_PUBLIC_KEY: '@deep_pulse:wallet_address',
  WALLET_AUTH_TOKEN: '@deep_pulse:auth_token',
  SUBSCRIBED_HUBS: '@deep_pulse:subscribed_hubs',
  NOTIFICATION_TOKEN: '@deep_pulse:notification_token',
  THEME_PREFERENCE: '@deep_pulse:theme_preference',
};

// ========================================
// NOTIFICATION CONFIGURATION
// ========================================

export const NOTIFICATION_CONFIG = {
  channelId: 'deep-pulse-notifications',
  channelName: 'DEEP Pulse Notifications',
  channelDescription: 'Notifications from your subscribed hubs',
  sound: 'default',
  vibrate: [0, 250, 250, 250],
};

// ========================================
// ADMIN CONFIGURATION
// ========================================

// TODO: Replace with your actual admin wallet address
export const ADMIN_WALLET = "YOUR_WALLET_HERE";

// Multi-sig support (add more admin wallets here)
export const ADMIN_WALLETS = [
  // ADMIN_WALLET, // Uncomment and add your wallet
  // "SECOND_ADMIN_WALLET", // For multi-sig
];

// Check if wallet is admin
export const isAdmin = (walletAddress) => {
  if (__DEV__) return true; // Mock admin in development
  return ADMIN_WALLETS.includes(walletAddress);
};

// ========================================
// SCORING ALGORITHM (TOP 100 LEADERBOARD)
// ========================================

export const SCORING_COEFFICIENTS = {
  DAO_BOOST: 10.0,        // MAXIMUM - DAO contribution
  TALENT_SUBMIT: 7.0,     // TRÈS ÉLEVÉ - Talent submission
  SEND_FEEDBACK: 5.0,     // ÉLEVÉ - Send feedback
  SUBSCRIBE_HUB: 3.0,     // MOYEN - Subscribe to hub
  READ_NOTIFICATION: 1.0, // BAS - Read notification
  CLICK_AD: 0.5,          // MINIMAL - Click on ad
};

export const TIME_WEIGHT = {
  VERY_ACTIVE: 1.2,  // ≤7 days
  ACTIVE: 1.0,       // ≤30 days
  LESS_ACTIVE: 0.8,  // ≤90 days
  INACTIVE: 0.6,     // >90 days
};

export const QUALITY_MULTIPLIER = {
  COMPLETE_USER: 1.3,  // 5+ action types
  GOOD_ENGAGEMENT: 1.1, // 3+ action types
  BASIC: 1.0,          // <3 action types
};

// Calculate user score
export const calculateUserScore = (actions, recentActivityDays, actionTypesCount) => {
  let baseScore = 0;
  
  // Sum all action points
  Object.keys(actions).forEach(actionType => {
    const count = actions[actionType] || 0;
    const coefficient = SCORING_COEFFICIENTS[actionType] || 0;
    baseScore += count * coefficient;
  });
  
  // Apply time weight
  let timeWeight = TIME_WEIGHT.INACTIVE;
  if (recentActivityDays <= 7) timeWeight = TIME_WEIGHT.VERY_ACTIVE;
  else if (recentActivityDays <= 30) timeWeight = TIME_WEIGHT.ACTIVE;
  else if (recentActivityDays <= 90) timeWeight = TIME_WEIGHT.LESS_ACTIVE;
  
  // Apply quality multiplier
  let qualityMult = QUALITY_MULTIPLIER.BASIC;
  if (actionTypesCount >= 5) qualityMult = QUALITY_MULTIPLIER.COMPLETE_USER;
  else if (actionTypesCount >= 3) qualityMult = QUALITY_MULTIPLIER.GOOD_ENGAGEMENT;
  
  const finalScore = Math.round(baseScore * timeWeight * qualityMult);
  return finalScore;
};

// ========================================
// USER TIERS
// ========================================

export const USER_TIERS = {
  LEGEND: { min: 901, max: 1000, icon: 'trophy', color: '#FFD700', name: 'Legend' },
  DIAMOND: { min: 751, max: 900, icon: 'diamond', color: '#B9F2FF', name: 'Diamond' },
  GOLD: { min: 501, max: 750, icon: 'medal', color: '#FFA500', name: 'Gold' },
  SILVER: { min: 251, max: 500, icon: 'shield-half', color: '#C0C0C0', name: 'Silver' },
  BRONZE: { min: 0, max: 250, icon: 'star', color: '#CD7F32', name: 'Bronze' },
};

export const getTierFromScore = (score) => {
  if (score >= USER_TIERS.LEGEND.min) return USER_TIERS.LEGEND;
  if (score >= USER_TIERS.DIAMOND.min) return USER_TIERS.DIAMOND;
  if (score >= USER_TIERS.GOLD.min) return USER_TIERS.GOLD;
  if (score >= USER_TIERS.SILVER.min) return USER_TIERS.SILVER;
  return USER_TIERS.BRONZE;
};

// ========================================
// DEPOSIT AMOUNTS
// ========================================

export const DEPOSITS = {
  FEEDBACK: 400,      // $SKR
  DAO_PROPOSAL: 100,  // $SKR
  TALENT: 50,         // $SKR
};

// ========================================
// SUBSCRIPTION & ADS PRICING
// ========================================

export const PRICING = {
  HUB_SUBSCRIPTION: 2000,     // $SKR per month
  TOP_AD_SLOT: 2000,          // $SKR per week
  BOTTOM_AD_SLOT: 1500,       // $SKR per week
  GLOBAL_NOTIFICATION: 1000,  // $SKR per notification
};

// ========================================
// AD SLOTS CONFIGURATION
// ========================================

export const AD_SLOTS = {
  MAX_ADVERTISERS: 8,     // Max per slot
  ROTATION_INTERVAL: 15,  // Seconds
  TOP_SLOT_HEIGHT: 120,   // Pixels
  BOTTOM_SLOT_HEIGHT: 100, // Pixels
};

// ========================================
// DAO VAULT SPLIT
// ========================================

export const DAO_SPLIT = {
  BRAND: 0.95,    // 95%
  PLATFORM: 0.05, // 5%
};

// ========================================
// API ENDPOINTS
// ========================================

export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://api.deeppulse.app/api';

export const API_ENDPOINTS = {
  // Users
  USER_PROFILE: '/users/profile',
  USER_SCORE: '/users/score',
  TOP_100: '/users/top100',
  
  // Hubs
  HUBS_LIST: '/hubs',
  HUB_DETAILS: '/hubs/:id',
  HUB_SUBSCRIBE: '/hubs/:id/subscribe',
  HUB_UNSUBSCRIBE: '/hubs/:id/unsubscribe',
  
  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_APPROVE_HUB: '/admin/hubs/:id/approve',
  ADMIN_SUSPEND_HUB: '/admin/hubs/:id/suspend',
  ADMIN_GLOBAL_NOTIFICATION: '/admin/notifications/global',
  
  // DAO
  DAO_PROPOSALS: '/dao/:hubId/proposals',
  DAO_CREATE: '/dao/:hubId/create',
  DAO_FUND: '/dao/:hubId/fund',
  
  // Talent
  TALENT_SUBMIT: '/talent/:hubId/submit',
  TALENT_BROWSE: '/talent/:hubId/browse',
  TALENT_MINE: '/talent/mine',
  
  // Notifications
  NOTIFICATIONS_LIST: '/notifications',
  NOTIFICATIONS_READ: '/notifications/:id/read',
  
  // Ads
  ADS_PURCHASE: '/ads/purchase',
  ADS_LIST: '/ads',
};

// ========================================
// MOCK DATA (for development)
// ========================================

export const MOCK_ENABLED = __DEV__;

export const MOCK_USER = {
  wallet: '7xKL...9Qz',
  balance: 2450,
  score: 715,
  tier: 'GOLD',
  subscriptions: 5,
  notifications: 127,
};

export const MOCK_HUBS = [
  {
    id: '1',
    name: 'Solana Gaming',
    description: 'Latest gaming news and updates',
    category: 'Gaming',
    subscribers: 12500,
    icon: 'game-controller',
  },
  {
    id: '2',
    name: 'NFT Artists',
    description: 'Daily NFT drops and artist spotlights',
    category: 'NFT',
    subscribers: 8200,
    icon: 'color-palette',
  },
  {
    id: '3',
    name: 'DeFi Alerts',
    description: 'Real-time DeFi protocol updates',
    category: 'DeFi',
    subscribers: 15700,
    icon: 'trending-up',
  },
];

export const MOCK_ADS = {
  TOP: [
    {
      id: 'ad_top_1',
      advertiserId: '7xK...9Qz',
      imageUrl: 'https://via.placeholder.com/390x120/FF9F66/FFFFFF?text=Jupiter+Swap',
      landingUrl: 'https://jup.ag',
      active: true,
    },
    {
      id: 'ad_top_2',
      advertiserId: '2pQ...mNp',
      imageUrl: 'https://via.placeholder.com/390x120/4CAF50/FFFFFF?text=Marinade',
      landingUrl: 'https://marinade.finance',
      active: true,
    },
  ],
  BOTTOM: [
    {
      id: 'ad_bottom_1',
      advertiserId: '8vN...4Wp',
      imageUrl: 'https://via.placeholder.com/390x100/9C27B0/FFFFFF?text=Tensor',
      landingUrl: 'https://tensor.trade',
      active: true,
    },
  ],
};
