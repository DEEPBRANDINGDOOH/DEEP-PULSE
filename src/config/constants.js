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
  uri: 'https://deep-pulse.web.app',
  icon: 'favicon.ico',
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

// Platform admin wallet — receives all platform fees
export const ADMIN_WALLET = "89Ez94pHfSNAUAPYrN7y3UmEfh4ggxr9biA4AS2nXVZc";

// Multi-sig support (add more admin wallets here)
export const ADMIN_WALLETS = [
  ADMIN_WALLET,
  // "SECOND_ADMIN_WALLET", // For future multi-sig
];

// Check if wallet is admin
export const isAdmin = (walletAddress) => {
  if (__DEV__) return true; // Mock admin in development
  return ADMIN_WALLETS.includes(walletAddress);
};

// ========================================
// DEEP SCORE ALGORITHM v2 (TOP 100 LEADERBOARD)
// ========================================
// Principle: ON-CHAIN and high-value actions yield much more
// than passive actions. Daily caps prevent easy farming.

export const SCORING_COEFFICIENTS = {
  // --- ON-CHAIN actions (high value) ---
  DAO_BOOST: 50,          // MAXIMUM — direct financial contribution to DAO
  HUB_CREATION: 40,       // VERY HIGH — creates value for the ecosystem
  TALENT_SUBMIT: 25,      // HIGH — demonstrates expertise
  SEND_FEEDBACK: 15,      // MEDIUM-HIGH — real engagement with a hub

  // --- SOCIAL actions (medium value) ---
  SUBSCRIBE_HUB: 5,       // MEDIUM — engagement but easy
  PROPOSAL_VOTE: 8,       // MEDIUM — DAO participation

  // --- PASSIVE actions (low value, capped) ---
  READ_NOTIFICATION: 0.5, // LOW — passive, capped at 10/day = 5 pts max
  CLICK_AD: 0.3,          // VERY LOW — passive

  // --- Swipe-to-Earn (very low, capped) ---
  SWIPE_SKIP: 0.2,        // MINIMAL — just unlocking the phone
  SWIPE_ENGAGE: 0.5,      // LOW — light engagement with content
};

// Daily caps to prevent farming
export const DAILY_CAPS = {
  SWIPE_POINTS: 3,           // Max 3 pts/day from swipe
  READ_NOTIFICATION: 5,      // Max 5 pts/day from reads
  CLICK_AD: 3,               // Max 3 pts/day from ad clicks
  SUBSCRIBE_HUB: 15,         // Max 3 hubs/day = 15 pts
};

// Streak bonus (consecutive days of on-chain activity)
export const STREAK_BONUS = {
  NONE: 1.0,       // 0-2 days
  WEEK: 1.1,       // 3-6 days
  BIWEEK: 1.15,    // 7-13 days
  MONTH: 1.25,     // 14-29 days
  VETERAN: 1.4,    // 30+ days
};

export const TIME_DECAY = {
  VERY_ACTIVE: 1.0,  // ≤7 days since last on-chain action
  ACTIVE: 0.85,      // ≤30 days
  LESS_ACTIVE: 0.6,  // ≤90 days
  INACTIVE: 0.3,     // >90 days — score collapses if inactive
};

export const DIVERSITY_MULTIPLIER = {
  COMPLETE_USER: 1.2,   // 5+ different action types
  GOOD_ENGAGEMENT: 1.1, // 3-4 types
  BASIC: 1.0,           // <3 types
};

// Diminishing returns: beyond N actions of the same type,
// each subsequent action yields less and less
export const DIMINISHING_RETURNS = {
  DAO_BOOST: { threshold: 5, decay: 0.85 },       // -15% per boost after the 5th
  TALENT_SUBMIT: { threshold: 3, decay: 0.80 },   // -20% after the 3rd
  SEND_FEEDBACK: { threshold: 10, decay: 0.90 },   // -10% after the 10th
  SUBSCRIBE_HUB: { threshold: 8, decay: 0.75 },    // -25% after the 8th
};

/**
 * Calculate DEEP Score v2
 * Harder to farm, rewards real contributors.
 */
export const calculateUserScore = (actions, recentActivityDays, actionTypesCount, streakDays = 0) => {
  let baseScore = 0;

  // Sum all action points with diminishing returns
  Object.keys(actions).forEach(actionType => {
    const count = actions[actionType] || 0;
    const coefficient = SCORING_COEFFICIENTS[actionType] || 0;
    const dr = DIMINISHING_RETURNS[actionType];

    if (dr && count > dr.threshold) {
      // Normal points up to threshold
      baseScore += dr.threshold * coefficient;
      // Reduced points after threshold
      const extra = count - dr.threshold;
      let reducedPoints = 0;
      for (let i = 0; i < extra; i++) {
        reducedPoints += coefficient * Math.pow(dr.decay, i + 1);
      }
      baseScore += reducedPoints;
    } else {
      baseScore += count * coefficient;
    }
  });

  // Apply time decay (inactivity penalty)
  let timeDecay = TIME_DECAY.INACTIVE;
  if (recentActivityDays <= 7) timeDecay = TIME_DECAY.VERY_ACTIVE;
  else if (recentActivityDays <= 30) timeDecay = TIME_DECAY.ACTIVE;
  else if (recentActivityDays <= 90) timeDecay = TIME_DECAY.LESS_ACTIVE;

  // Apply diversity multiplier
  let diversityMult = DIVERSITY_MULTIPLIER.BASIC;
  if (actionTypesCount >= 5) diversityMult = DIVERSITY_MULTIPLIER.COMPLETE_USER;
  else if (actionTypesCount >= 3) diversityMult = DIVERSITY_MULTIPLIER.GOOD_ENGAGEMENT;

  // Apply streak bonus
  let streakBonus = STREAK_BONUS.NONE;
  if (streakDays >= 30) streakBonus = STREAK_BONUS.VETERAN;
  else if (streakDays >= 14) streakBonus = STREAK_BONUS.MONTH;
  else if (streakDays >= 7) streakBonus = STREAK_BONUS.BIWEEK;
  else if (streakDays >= 3) streakBonus = STREAK_BONUS.WEEK;

  const finalScore = Math.round(baseScore * timeDecay * diversityMult * streakBonus);
  return finalScore;
};

// ========================================
// USER TIERS
// ========================================

export const USER_TIERS = {
  LEGEND:  { min: 5000, max: 10000, icon: 'trophy',      color: '#FFD700', name: 'Legend' },
  DIAMOND: { min: 2500, max: 4999,  icon: 'diamond',     color: '#B9F2FF', name: 'Diamond' },
  GOLD:    { min: 1000, max: 2499,  icon: 'medal',       color: '#FFA500', name: 'Gold' },
  SILVER:  { min: 300,  max: 999,   icon: 'shield-half', color: '#C0C0C0', name: 'Silver' },
  BRONZE:  { min: 0,    max: 299,   icon: 'star',        color: '#CD7F32', name: 'Bronze' },
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
  FEEDBACK: 300,      // $SKR
  DAO_PROPOSAL: 100,  // $SKR
  TALENT: 50,         // $SKR
};

// ========================================
// SUBSCRIPTION & ADS PRICING
// ========================================

export const PRICING = {
  FEEDBACK: 300,              // $SKR per feedback
  TALENT: 50,                 // $SKR per talent submission
  DAO_BOOST: 100,             // $SKR per proposal deposit
  HUB_CREATION: 2000,         // $SKR per month
  TOP_AD_SLOT: 800,           // $SKR per week
  BOTTOM_AD_SLOT: 600,        // $SKR per week
  LOCKSCREEN_AD: 1000,        // $SKR per week (premium lock screen overlay)
  GLOBAL_NOTIFICATION: 1000,  // $SKR per notification
  PUSH_NOTIFICATION_AD: 1500, // $SKR per week (sponsored rich push to all hub subscribers)
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
  : 'https://us-central1-deep-pulse.cloudfunctions.net';

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
  score: 1340,
  tier: 'GOLD',
  subscriptions: 5,
  notifications: 127,
  streakDays: 12,
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
  LOCKSCREEN: [
    {
      id: 'ad_lock_1',
      advertiserId: '7xK...9Qz',
      contentUrl: 'https://via.placeholder.com/1080x1920/FF9F66/FFFFFF?text=Seeker+Launch',
      imageUrl: 'https://via.placeholder.com/1080x1920/FF9F66/FFFFFF?text=Seeker+Launch',
      title: 'Solana Seeker Pre-Order',
      brand: 'Solana Mobile',
      landingUrl: 'https://solanamobile.com',
      clickUrl: 'https://solanamobile.com',
      active: true,
    },
    {
      id: 'ad_lock_2',
      advertiserId: '2pQ...mNp',
      contentUrl: 'https://via.placeholder.com/1080x1920/4CAF50/FFFFFF?text=Jupiter+DEX',
      imageUrl: 'https://via.placeholder.com/1080x1920/4CAF50/FFFFFF?text=Jupiter+DEX',
      title: 'Trade on Jupiter',
      brand: 'Jupiter Exchange',
      landingUrl: 'https://jup.ag',
      clickUrl: 'https://jup.ag',
      active: true,
    },
    {
      id: 'ad_lock_3',
      advertiserId: '5tY...2Lm',
      contentUrl: 'https://via.placeholder.com/1080x1920/9C27B0/FFFFFF?text=Magic+Eden+NFT',
      imageUrl: 'https://via.placeholder.com/1080x1920/9C27B0/FFFFFF?text=Magic+Eden+NFT',
      title: 'Discover NFTs',
      brand: 'Magic Eden',
      landingUrl: 'https://magiceden.io',
      clickUrl: 'https://magiceden.io',
      active: true,
    },
  ],
};

// ========================================
// PUSH NOTIFICATION ADS (mock data)
// ========================================

export const MOCK_RICH_NOTIFICATION_ADS = [
  {
    id: 'rich_notif_1',
    advertiserId: '7xK...9Qz',
    title: 'Jupiter: Swap with zero fees this week!',
    body: 'Trade any SPL token on Jupiter with 0% fees. Limited time offer for Seeker users.',
    ctaLabel: 'Swap Now',
    ctaUrl: 'https://jup.ag',
    brand: 'Jupiter Exchange',
    active: true,
  },
  {
    id: 'rich_notif_2',
    advertiserId: '2pQ...mNp',
    title: 'Tensor: New NFT collection dropping!',
    body: 'Exclusive Solana Seeker NFT collection. First 500 minters get a bonus airdrop.',
    ctaLabel: 'Mint Now',
    ctaUrl: 'https://tensor.trade',
    brand: 'Tensor',
    active: true,
  },
];

// ========================================
// DOOH (Digital Out-Of-Home) INVENTORY
// ========================================

export const DOOH_INVENTORY = [
  { id: 'transit', label: 'Transit Networks', description: 'Airports, Metro, Railway Stations' },
  { id: 'retail', label: 'Premium Retail', description: 'Shopping Centers, Flagship Stores' },
  { id: 'urban', label: 'Urban Outdoor', description: 'Billboards, Street Furniture, Digital Kiosks' },
  { id: 'corporate', label: 'Corporate Spaces', description: 'Office Towers, Business Districts' },
  { id: 'entertainment', label: 'Entertainment & Leisure', description: 'Stadiums, Cinemas, Venues' },
  { id: 'institutional', label: 'Healthcare, Education & Financial', description: 'Institutions' },
];
