/**
 * DEEP Pulse — Security Utilities
 *
 * Centralized security helpers used across the app:
 * - safeOpenURL: validates URLs before opening (prevents injection)
 * - logger: environment-aware logging (no sensitive data in production)
 * - validateEmail: proper email regex validation
 * - sanitizeText: basic text sanitization
 * - rateLimiter: simple client-side rate limiting
 */

import { Linking, Alert } from 'react-native';

// ========================================
// SAFE URL OPENING
// ========================================

/**
 * Validate that a URL uses a safe protocol (http/https only)
 * Prevents javascript://, data://, tel://, sms:// injection attacks
 *
 * @param {string} url - URL to validate
 * @returns {boolean} true if URL is safe to open
 */
export const isValidHttpUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Safely open a URL after validation
 * Only opens http:// and https:// URLs
 *
 * @param {string} url - URL to open
 * @param {string} [context] - Optional context for error messages (e.g. "notification link")
 */
export const safeOpenURL = (url, context = 'link') => {
  if (!isValidHttpUrl(url)) {
    Alert.alert('Invalid Link', `This ${context} cannot be opened because the URL is invalid or uses an unsupported protocol.`);
    return;
  }
  Linking.openURL(url.trim()).catch(() => {
    Alert.alert('Cannot Open', `Failed to open this ${context}. Please try again.`);
  });
};

// ========================================
// DISCORD WEBHOOK VALIDATION
// ========================================

/**
 * Validate a Discord webhook URL strictly
 * Must be https://discord.com/api/webhooks/{id}/{token}
 *
 * @param {string} url - Webhook URL
 * @returns {boolean}
 */
export const isValidDiscordWebhook = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'discord.com' &&
      parsed.pathname.startsWith('/api/webhooks/') &&
      parsed.pathname.split('/').length >= 5 // /api/webhooks/{id}/{token}
    );
  } catch {
    return false;
  }
};

// ========================================
// EMAIL VALIDATION
// ========================================

/**
 * Validate email address with proper regex
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 simplified regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

// ========================================
// ENVIRONMENT-AWARE LOGGER
// ========================================

/**
 * Logger that only outputs in development mode
 * Prevents sensitive data (FCM tokens, signatures, keys) from leaking in production
 */
export const logger = {
  log: (...args) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args) => {
    // Errors always logged (useful for crash reporting)
    console.error(...args);
  },
  // For truly sensitive data — only in development
  sensitive: (...args) => {
    if (__DEV__) console.log('[SENSITIVE]', ...args);
  },
};

// ========================================
// RATE LIMITER
// ========================================

const _rateLimitMap = new Map();

/**
 * Simple client-side rate limiter
 * Prevents rapid-fire submissions (spam protection)
 *
 * @param {string} action - Action identifier (e.g. 'submit_feedback')
 * @param {number} cooldownMs - Cooldown in milliseconds (default: 5000ms)
 * @returns {boolean} true if action is allowed, false if rate-limited
 */
export const checkRateLimit = (action, cooldownMs = 5000) => {
  const now = Date.now();
  const lastTime = _rateLimitMap.get(action) || 0;

  if (now - lastTime < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - (now - lastTime)) / 1000);
    Alert.alert('Too Fast', `Please wait ${remainingSec} second${remainingSec > 1 ? 's' : ''} before trying again.`);
    return false;
  }

  _rateLimitMap.set(action, now);
  return true;
};

// ========================================
// IMAGE URL VALIDATION
// ========================================

/**
 * Validate image URL protocol (http/https only)
 * Prevents data://, file://, javascript:// image loading
 *
 * @param {string} url - Image URL
 * @returns {boolean}
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

// ========================================
// TEXT LENGTH CONSTANTS (match on-chain struct sizes)
// ========================================

export const MAX_LENGTHS = {
  HUB_NAME: 64,
  HUB_DESCRIPTION: 256,
  NOTIFICATION_TITLE: 100,
  NOTIFICATION_BODY: 500,
  FEEDBACK_TEXT: 500,
  PROPOSAL_TITLE: 100,
  PROPOSAL_DESCRIPTION: 500,
  TALENT_NAME: 64,
  TALENT_SKILLS: 256,
  URL: 256,
  DISCORD_WEBHOOK: 256,
  EMAIL: 128,
  DOOH_BRAND: 64,
  DOOH_CAMPAIGN: 128,
  DOOH_BRIEF: 1000,
  DOOH_BUDGET: 20,
};
