/**
 * Mock Data
 * 
 * Simulated data for development and testing
 * TODO: Replace with real API calls to backend
 */

export const MOCK_PROJECTS = [
  {
    id: '1',
    name: 'Solana Foundation',
    description: 'Official updates from the Solana Foundation',
    category: 'Infrastructure',
    icon: '🌐',
    imageUrl: 'https://via.placeholder.com/100?text=SF',
    subscriberCount: 45230,
    isVerified: true,
    tags: ['Official', 'Network'],
    hubId: 'solana-foundation',
  },
  {
    id: '2',
    name: 'Jupiter',
    description: 'The best swap aggregator on Solana',
    category: 'DeFi',
    icon: '🪐',
    imageUrl: 'https://via.placeholder.com/100?text=JUP',
    subscriberCount: 38420,
    isVerified: true,
    tags: ['DEX', 'Swaps'],
    hubId: 'jupiter',
  },
  {
    id: '3',
    name: 'Magic Eden',
    description: 'Leading NFT marketplace on Solana',
    category: 'NFT',
    icon: '🎨',
    imageUrl: 'https://via.placeholder.com/100?text=ME',
    subscriberCount: 32150,
    isVerified: true,
    tags: ['NFT', 'Marketplace'],
    hubId: 'magic-eden',
  },
  {
    id: '4',
    name: 'Phantom',
    description: 'The friendly crypto wallet built for Solana',
    category: 'Wallet',
    icon: '👻',
    imageUrl: 'https://via.placeholder.com/100?text=PH',
    subscriberCount: 56780,
    isVerified: true,
    tags: ['Wallet', 'Mobile'],
    hubId: 'phantom',
  },
  {
    id: '5',
    name: 'Marinade Finance',
    description: 'Liquid staking protocol for Solana',
    category: 'DeFi',
    icon: '💧',
    imageUrl: 'https://via.placeholder.com/100?text=MAR',
    subscriberCount: 18920,
    isVerified: true,
    tags: ['Staking', 'DeFi'],
    hubId: 'marinade',
  },
  {
    id: '6',
    name: 'Tensor',
    description: 'Professional NFT trading platform',
    category: 'NFT',
    icon: '⚡',
    imageUrl: 'https://via.placeholder.com/100?text=TEN',
    subscriberCount: 15430,
    isVerified: true,
    tags: ['NFT', 'Trading'],
    hubId: 'tensor',
  },
  {
    id: '7',
    name: 'Star Atlas',
    description: 'AAA blockchain gaming metaverse',
    category: 'Gaming',
    icon: '🚀',
    imageUrl: 'https://via.placeholder.com/100?text=SA',
    subscriberCount: 24680,
    isVerified: true,
    tags: ['Gaming', 'Metaverse'],
    hubId: 'star-atlas',
  },
  {
    id: '8',
    name: 'Helium',
    description: 'Decentralized wireless network',
    category: 'Infrastructure',
    icon: '📡',
    imageUrl: 'https://via.placeholder.com/100?text=HNT',
    subscriberCount: 21340,
    isVerified: true,
    tags: ['IoT', 'Network'],
    hubId: 'helium',
  },
];

export const MOCK_ALERTS = [
  {
    id: 'alert-1',
    projectId: '2',
    projectName: 'Jupiter',
    projectIcon: '🪐',
    title: 'New Token Pair Available: BONK/USDC',
    message: 'We just listed BONK/USDC with ultra-low fees. Start trading now and enjoy the best rates on Solana!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
    category: 'Product Update',
    link: 'https://jup.ag/swap/BONK-USDC',
    imageUrl: null,
  },
  {
    id: 'alert-2',
    projectId: '3',
    projectName: 'Magic Eden',
    projectIcon: '🎨',
    title: 'Mad Lads NFT Drop Alert!',
    message: 'The highly anticipated Mad Lads collection is dropping in 1 hour. Get ready to mint! 🔥',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    read: false,
    category: 'NFT Drop',
    link: 'https://magiceden.io/drops',
    imageUrl: 'https://via.placeholder.com/400x200?text=Mad+Lads',
  },
  {
    id: 'alert-3',
    projectId: '1',
    projectName: 'Solana Foundation',
    projectIcon: '🌐',
    title: 'Solana Mobile Chapter 2 Pre-Orders Open',
    message: 'The new Seeker device is available for pre-order with enhanced features and exclusive rewards!',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    read: true,
    category: 'Announcement',
    link: 'https://solanamobile.com',
    imageUrl: 'https://via.placeholder.com/400x200?text=Seeker+2',
  },
  {
    id: 'alert-4',
    projectId: '4',
    projectName: 'Phantom',
    projectIcon: '👻',
    title: 'Security Update v24.3 Available',
    message: 'Important security update released. Please update your Phantom wallet to ensure maximum protection.',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    read: false,
    category: 'Security',
    link: null,
    imageUrl: null,
  },
  {
    id: 'alert-5',
    projectId: '5',
    projectName: 'Marinade Finance',
    projectIcon: '💧',
    title: 'Monthly Staking Rewards Distributed',
    message: 'Your staking rewards for this month have been distributed. Check your wallet to see your earnings!',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    read: true,
    category: 'Rewards',
    link: null,
    imageUrl: null,
  },
  {
    id: 'alert-6',
    projectId: '2',
    projectName: 'Jupiter',
    projectIcon: '🪐',
    title: 'Jupiter Hits $10B Total Volume!',
    message: 'We just crossed $10 billion in total trading volume. Thank you for being part of this incredible journey!',
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
    read: true,
    category: 'Milestone',
    link: 'https://jup.ag',
    imageUrl: null,
  },
  {
    id: 'alert-7',
    projectId: '6',
    projectName: 'Tensor',
    projectIcon: '⚡',
    title: 'New Feature: Portfolio Analytics',
    message: 'Track your NFT portfolio performance with our new advanced analytics dashboard. Available now!',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: true,
    category: 'Product Update',
    link: 'https://tensor.trade',
    imageUrl: null,
  },
  {
    id: 'alert-8',
    projectId: '7',
    projectName: 'Star Atlas',
    projectIcon: '🚀',
    title: 'Showroom Module Beta Launch',
    message: 'The Showroom module is now live in beta. Explore, customize, and showcase your ships!',
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 1.5 days ago
    read: true,
    category: 'Game Update',
    link: null,
    imageUrl: 'https://via.placeholder.com/400x200?text=Showroom',
  },
];

/**
 * Helper function to get alerts for a specific project
 */
export const getAlertsByProject = (projectId) => {
  return MOCK_ALERTS.filter(alert => alert.projectId === projectId);
};

/**
 * Helper function to get project by ID
 */
export const getProjectById = (projectId) => {
  return MOCK_PROJECTS.find(project => project.id === projectId);
};

/**
 * Helper function to get projects by category
 */
export const getProjectsByCategory = (category) => {
  if (category === 'All') {
    return MOCK_PROJECTS;
  }
  return MOCK_PROJECTS.filter(project => project.category === category);
};

/**
 * Helper function to search projects
 */
export const searchProjects = (query) => {
  const lowerQuery = query.toLowerCase();
  return MOCK_PROJECTS.filter(project => 
    project.name.toLowerCase().includes(lowerQuery) ||
    project.description.toLowerCase().includes(lowerQuery) ||
    project.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Helper function to get unread alert count
 */
export const getUnreadAlertCount = () => {
  return MOCK_ALERTS.filter(alert => !alert.read).length;
};
