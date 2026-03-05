/**
 * Internationalization (i18n) Configuration
 * 
 * Supports: English, French, Spanish, Chinese
 * User can change language in Profile screen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './security';

const STORAGE_KEY = '@deep_pulse/language';

// Language translations
export const translations = {
  en: {
    // Navigation
    home: 'Home',
    discover: 'Discover',
    brandBoost: 'Brand Boost',
    notifications: 'Notifications',
    alerts: 'Alerts',
    profile: 'Profile',

    // Home Screen
    homeTitle: 'DEEP Pulse',
    homeSubtitle: 'Solana Notifications',
    liveAlerts: 'Live Alerts',
    popularProjects: 'Popular Projects',
    viewAll: 'View All',
    
    // Discover Screen
    discoverTitle: 'Discover',
    discoverSubtitle: 'Find and subscribe to Web3 projects',
    searchPlaceholder: 'Search projects...',
    allCategory: 'All',
    
    // Brand Boost Screen
    brandBoostTitle: 'Brand Boost',
    brandBoostSubtitle: 'Create your notification hub and reach thousands of Solana users instantly',
    createHub: 'Create Your Hub',
    monthlyFee: 'Monthly Fee',
    skrPerMonth: '$SKR/month',
    unlimitedNotifications: 'Unlimited notifications',
    
    // Notifications Screen
    notificationsTitle: 'Notifications',
    unreadNotifications: 'unread notification',
    unreadNotificationsPlural: 'unread notifications',
    markAllRead: 'Mark All Read',
    allTab: 'All',
    unreadTab: 'Unread',
    
    // Profile Screen
    profileTitle: 'Profile',
    profileSubtitle: 'Manage your account and preferences',
    wallet: 'Wallet',
    connectedWallet: 'Connected Wallet',
    connectWallet: 'Connect Wallet',
    disconnectWallet: 'Disconnect Wallet',
    statistics: 'Statistics',
    subscriptions: 'Subscriptions',
    features: 'Features',
    settings: 'Settings',
    language: 'Language',
    selectLanguage: 'Select Language',
    
    // Common
    subscribe: 'Subscribe',
    subscribed: 'Subscribed',
    unsubscribe: 'Unsubscribe',
    subscribers: 'subscribers',
    view: 'View',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    save: 'Save',
    
    // Categories
    defi: 'DeFi',
    nft: 'NFT',
    gaming: 'Gaming',
    wallet: 'Wallet',
    infrastructure: 'Infrastructure',
    dao: 'DAO',
    metaverse: 'Metaverse',
    
    // Alert Categories
    productUpdate: 'Product Update',
    nftDrop: 'NFT Drop',
    security: 'Security',
    announcement: 'Announcement',
    rewards: 'Rewards',
    milestone: 'Milestone',
    gameUpdate: 'Game Update',
    
    // Time
    hoursAgo: 'hours ago',
    hourAgo: 'hour ago',
    minutesAgo: 'minutes ago',
    minuteAgo: 'minute ago',
    justNow: 'just now',
    daysAgo: 'days ago',
    dayAgo: 'day ago',
  },

  fr: {
    // Navigation
    home: 'Accueil',
    discover: 'Découvrir',
    brandBoost: 'Brand Boost',
    notifications: 'Notifications',
    alerts: 'Alertes',
    profile: 'Profil',

    // Home Screen
    homeTitle: 'DEEP Pulse',
    homeSubtitle: 'Notifications Solana',
    liveAlerts: 'Alertes en Direct',
    popularProjects: 'Projets Populaires',
    viewAll: 'Voir Tout',
    
    // Discover Screen
    discoverTitle: 'Découvrir',
    discoverSubtitle: 'Trouvez et abonnez-vous aux projets Web3',
    searchPlaceholder: 'Rechercher des projets...',
    allCategory: 'Tous',
    
    // Brand Boost Screen
    brandBoostTitle: 'Brand Boost',
    brandBoostSubtitle: 'Créez votre hub de notifications et touchez des milliers d\'utilisateurs Solana',
    createHub: 'Créer Votre Hub',
    monthlyFee: 'Frais Mensuels',
    skrPerMonth: '$SKR/mois',
    unlimitedNotifications: 'Notifications illimitées',
    
    // Notifications Screen
    notificationsTitle: 'Notifications',
    unreadNotifications: 'notification non lue',
    unreadNotificationsPlural: 'notifications non lues',
    markAllRead: 'Tout Marquer Comme Lu',
    allTab: 'Toutes',
    unreadTab: 'Non Lues',
    
    // Profile Screen
    profileTitle: 'Profil',
    profileSubtitle: 'Gérez votre compte et vos préférences',
    wallet: 'Portefeuille',
    connectedWallet: 'Portefeuille Connecté',
    connectWallet: 'Connecter le Portefeuille',
    disconnectWallet: 'Déconnecter le Portefeuille',
    statistics: 'Statistiques',
    subscriptions: 'Abonnements',
    features: 'Fonctionnalités',
    settings: 'Paramètres',
    language: 'Langue',
    selectLanguage: 'Choisir la Langue',
    
    // Common
    subscribe: 'S\'abonner',
    subscribed: 'Abonné',
    unsubscribe: 'Se Désabonner',
    subscribers: 'abonnés',
    view: 'Voir',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',
    save: 'Enregistrer',
    
    // Categories
    defi: 'DeFi',
    nft: 'NFT',
    gaming: 'Jeux',
    wallet: 'Portefeuille',
    infrastructure: 'Infrastructure',
    dao: 'DAO',
    metaverse: 'Métaverse',
    
    // Alert Categories
    productUpdate: 'Mise à Jour',
    nftDrop: 'Drop NFT',
    security: 'Sécurité',
    announcement: 'Annonce',
    rewards: 'Récompenses',
    milestone: 'Jalon',
    gameUpdate: 'Mise à Jour Jeu',
    
    // Time
    hoursAgo: 'heures',
    hourAgo: 'heure',
    minutesAgo: 'minutes',
    minuteAgo: 'minute',
    justNow: 'à l\'instant',
    daysAgo: 'jours',
    dayAgo: 'jour',
  },

  es: {
    // Navigation
    home: 'Inicio',
    discover: 'Descubrir',
    brandBoost: 'Brand Boost',
    notifications: 'Notificaciones',
    alerts: 'Alertas',
    profile: 'Perfil',

    // Home Screen
    homeTitle: 'DEEP Pulse',
    homeSubtitle: 'Notificaciones Solana',
    liveAlerts: 'Alertas en Vivo',
    popularProjects: 'Proyectos Populares',
    viewAll: 'Ver Todo',
    
    // Discover Screen
    discoverTitle: 'Descubrir',
    discoverSubtitle: 'Encuentra y suscríbete a proyectos Web3',
    searchPlaceholder: 'Buscar proyectos...',
    allCategory: 'Todos',
    
    // Brand Boost Screen
    brandBoostTitle: 'Brand Boost',
    brandBoostSubtitle: 'Crea tu hub de notificaciones y alcanza miles de usuarios de Solana al instante',
    createHub: 'Crear Tu Hub',
    monthlyFee: 'Tarifa Mensual',
    skrPerMonth: '$SKR/mes',
    unlimitedNotifications: 'Notificaciones ilimitadas',
    
    // Notifications Screen
    notificationsTitle: 'Notificaciones',
    unreadNotifications: 'notificación sin leer',
    unreadNotificationsPlural: 'notificaciones sin leer',
    markAllRead: 'Marcar Todo Como Leído',
    allTab: 'Todas',
    unreadTab: 'Sin Leer',
    
    // Profile Screen
    profileTitle: 'Perfil',
    profileSubtitle: 'Administra tu cuenta y preferencias',
    wallet: 'Billetera',
    connectedWallet: 'Billetera Conectada',
    connectWallet: 'Conectar Billetera',
    disconnectWallet: 'Desconectar Billetera',
    statistics: 'Estadísticas',
    subscriptions: 'Suscripciones',
    features: 'Características',
    settings: 'Configuración',
    language: 'Idioma',
    selectLanguage: 'Seleccionar Idioma',
    
    // Common
    subscribe: 'Suscribirse',
    subscribed: 'Suscrito',
    unsubscribe: 'Cancelar Suscripción',
    subscribers: 'suscriptores',
    view: 'Ver',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Cerrar',
    save: 'Guardar',
    
    // Categories
    defi: 'DeFi',
    nft: 'NFT',
    gaming: 'Juegos',
    wallet: 'Billetera',
    infrastructure: 'Infraestructura',
    dao: 'DAO',
    metaverse: 'Metaverso',
    
    // Alert Categories
    productUpdate: 'Actualización',
    nftDrop: 'Lanzamiento NFT',
    security: 'Seguridad',
    announcement: 'Anuncio',
    rewards: 'Recompensas',
    milestone: 'Hito',
    gameUpdate: 'Actualización Juego',
    
    // Time
    hoursAgo: 'horas',
    hourAgo: 'hora',
    minutesAgo: 'minutos',
    minuteAgo: 'minuto',
    justNow: 'ahora',
    daysAgo: 'días',
    dayAgo: 'día',
  },

  zh: {
    // Navigation
    home: '首页',
    discover: '发现',
    brandBoost: '品牌推广',
    notifications: '通知',
    alerts: '提醒',
    profile: '个人资料',

    // Home Screen
    homeTitle: 'DEEP Pulse',
    homeSubtitle: 'Solana 通知',
    liveAlerts: '实时提醒',
    popularProjects: '热门项目',
    viewAll: '查看全部',
    
    // Discover Screen
    discoverTitle: '发现',
    discoverSubtitle: '查找并订阅 Web3 项目',
    searchPlaceholder: '搜索项目...',
    allCategory: '全部',
    
    // Brand Boost Screen
    brandBoostTitle: '品牌推广',
    brandBoostSubtitle: '创建您的通知中心，立即触及数千名 Solana 用户',
    createHub: '创建您的中心',
    monthlyFee: '月费',
    skrPerMonth: '$SKR/月',
    unlimitedNotifications: '无限通知',
    
    // Notifications Screen
    notificationsTitle: '通知',
    unreadNotifications: '未读通知',
    unreadNotificationsPlural: '未读通知',
    markAllRead: '全部标记为已读',
    allTab: '全部',
    unreadTab: '未读',
    
    // Profile Screen
    profileTitle: '个人资料',
    profileSubtitle: '管理您的账户和偏好设置',
    wallet: '钱包',
    connectedWallet: '已连接钱包',
    connectWallet: '连接钱包',
    disconnectWallet: '断开钱包',
    statistics: '统计',
    subscriptions: '订阅',
    features: '功能',
    settings: '设置',
    language: '语言',
    selectLanguage: '选择语言',
    
    // Common
    subscribe: '订阅',
    subscribed: '已订阅',
    unsubscribe: '取消订阅',
    subscribers: '订阅者',
    view: '查看',
    cancel: '取消',
    confirm: '确认',
    close: '关闭',
    save: '保存',
    
    // Categories
    defi: 'DeFi',
    nft: 'NFT',
    gaming: '游戏',
    wallet: '钱包',
    infrastructure: '基础设施',
    dao: 'DAO',
    metaverse: '元宇宙',
    
    // Alert Categories
    productUpdate: '产品更新',
    nftDrop: 'NFT 发布',
    security: '安全',
    announcement: '公告',
    rewards: '奖励',
    milestone: '里程碑',
    gameUpdate: '游戏更新',
    
    // Time
    hoursAgo: '小时前',
    hourAgo: '小时前',
    minutesAgo: '分钟前',
    minuteAgo: '分钟前',
    justNow: '刚刚',
    daysAgo: '天前',
    dayAgo: '天前',
  },
};

// Available languages
export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

// Language Manager Class
class LanguageManager {
  constructor() {
    this.currentLanguage = 'en';
    this.listeners = [];
  }

  async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved]) {
        this.currentLanguage = saved;
      }
    } catch (error) {
      logger.error('Error loading language:', error);
    }
  }

  async setLanguage(code) {
    if (!translations[code]) {
      logger.error('Language not supported:', code);
      return;
    }

    this.currentLanguage = code;
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
    } catch (error) {
      logger.error('Error saving language:', error);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(code));
  }

  getLanguage() {
    return this.currentLanguage;
  }

  t(key) {
    return translations[this.currentLanguage][key] || key;
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
}

// Singleton instance
export const i18n = new LanguageManager();

// React Hook
import { useState, useEffect } from 'react';

export const useTranslation = () => {
  const [language, setLanguage] = useState(i18n.getLanguage());

  useEffect(() => {
    const unsubscribe = i18n.addListener(setLanguage);
    return unsubscribe;
  }, []);

  return {
    t: (key) => i18n.t(key),
    language,
    setLanguage: (code) => i18n.setLanguage(code),
    languages,
  };
};
