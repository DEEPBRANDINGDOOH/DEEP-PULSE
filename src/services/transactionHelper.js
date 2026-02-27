/**
 * Transaction Helper
 *
 * Bridges UI screens with programService for real Solana transactions.
 * Handles wallet connection checks, loading states, error handling,
 * and user-friendly feedback for all on-chain actions.
 */

import { Alert } from 'react-native';
import { programService } from './programService';
import { walletAdapter } from './walletAdapter';
import { notificationService } from './notificationService';
import { PRICING, DEPOSITS } from '../config/constants';
import { logger } from '../utils/security';

// ============================================
// WALLET STATE
// ============================================

let _walletPublicKey = null;
let _authToken = null;

export const setWalletState = (publicKey, authToken) => {
  _walletPublicKey = publicKey;
  _authToken = authToken;
};

export const getWalletPublicKey = () => _walletPublicKey;
export const getAuthToken = () => _authToken;
export const isWalletConnected = () => _walletPublicKey !== null;

// ============================================
// GENERIC TRANSACTION WRAPPER
// ============================================

/**
 * Execute a blockchain transaction with proper error handling
 * @param {string} actionName - Human-readable action name (for alerts)
 * @param {Function} txFn - Async function that executes the transaction
 * @param {Object} options - Optional callbacks
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export const executeTransaction = async (actionName, txFn, options = {}) => {
  const { onSuccess, onError, requiresWallet = true } = options;

  // In __DEV__ mode, skip wallet check and return mock success
  if (__DEV__ && requiresWallet && !isWalletConnected()) {
    logger.log(`[Transaction] ${actionName} — DEV mock (no wallet)`);
    const mockResult = {
      signature: `mock_${actionName.replace(/\s/g, '_')}_${Date.now()}`,
      message: `${actionName} completed (dev mock)`,
    };
    if (onSuccess) {
      onSuccess(mockResult);
    }
    return { success: true, result: mockResult };
  }

  // Check wallet connection (production only reaches here)
  if (requiresWallet && !isWalletConnected()) {
    Alert.alert(
      'Wallet Required',
      'Please connect your wallet first to perform this action.',
      [{ text: 'OK' }]
    );
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    const result = await txFn();

    if (onSuccess) {
      onSuccess(result);
    }

    return { success: true, result };
  } catch (error) {
    console.error(`[Transaction] ${actionName} failed:`, error);

    const errorMessage = _parseError(error);

    if (onError) {
      onError(errorMessage);
    } else {
      Alert.alert(
        `${actionName} Failed`,
        errorMessage,
        [{ text: 'OK' }]
      );
    }

    return { success: false, error: errorMessage };
  }
};

// ============================================
// HUB OPERATIONS
// ============================================

/**
 * Subscribe to a hub (free, only rent cost in SOL)
 */
export const subscribeToHub = async (hubPda) => {
  return executeTransaction('Subscribe', async () => {
    const result = await programService.subscribeToHub(hubPda);
    // Subscribe to FCM topic for push notifications
    try {
      await notificationService.subscribeToHub(hubPda.toString());
    } catch (e) {
      logger.warn('[FCM] Topic subscribe failed (non-blocking):', e.message);
    }
    return result;
  }, {
    onSuccess: () => {
      Alert.alert('Subscribed!', 'You are now subscribed to this hub. You will receive notifications.');
    },
  });
};

/**
 * Unsubscribe from a hub (rent returned)
 */
export const unsubscribeFromHub = async (hubPda) => {
  return executeTransaction('Unsubscribe', async () => {
    const result = await programService.unsubscribeFromHub(hubPda);
    // Unsubscribe from FCM topic
    try {
      await notificationService.unsubscribeFromHub(hubPda.toString());
    } catch (e) {
      logger.warn('[FCM] Topic unsubscribe failed (non-blocking):', e.message);
    }
    return result;
  }, {
    onSuccess: () => {
      Alert.alert('Unsubscribed', 'You have been unsubscribed from this hub.');
    },
  });
};

/**
 * Create a new hub (brand pays HUB_CREATION $SKR)
 */
export const createHub = async (name, description, category, hubIndex) => {
  return executeTransaction('Create Hub', async () => {
    const result = await programService.createHub(name, description, category, hubIndex);
    return result;
  }, {
    onSuccess: () => {
      Alert.alert(
        'Hub Created!',
        `Your hub "${name}" has been created. ${PRICING.HUB_CREATION} $SKR charged for the first month.`
      );
    },
  });
};

// ============================================
// DEPOSIT OPERATIONS (Feedback / DAO / Talent)
// ============================================

/**
 * Submit feedback on a notification (FEEDBACK deposit in $SKR escrow)
 */
export const submitFeedback = async (hubPda, feedbackText, depositIndex) => {
  return executeTransaction('Submit Feedback', async () => {
    const contentHash = await programService.hashContent(feedbackText);
    const result = await programService.createDeposit(
      hubPda,
      'feedback',
      contentHash,
      depositIndex
    );
    return result;
  }, {
    onSuccess: () => {
      Alert.alert(
        'Feedback Submitted',
        `Your feedback has been submitted. ${DEPOSITS.FEEDBACK} $SKR deposited in escrow — refunded when the brand approves.`
      );
    },
  });
};

/**
 * Submit a DAO Boost proposal (DAO_PROPOSAL deposit in $SKR escrow)
 */
export const submitDaoProposal = async (hubPda, proposalText, depositIndex) => {
  return executeTransaction('Submit Proposal', async () => {
    const contentHash = await programService.hashContent(proposalText);
    const result = await programService.createDeposit(
      hubPda,
      'daoProposal',
      contentHash,
      depositIndex
    );
    return result;
  }, {
    onSuccess: () => {
      Alert.alert(
        'Proposal Submitted',
        `Your DAO Boost proposal has been submitted. ${DEPOSITS.DAO_PROPOSAL} $SKR deposited in escrow — refunded when approved.`
      );
    },
  });
};

/**
 * Submit talent showcase (TALENT deposit in $SKR escrow)
 */
export const submitTalent = async (hubPda, talentText, depositIndex) => {
  return executeTransaction('Submit Talent', async () => {
    const contentHash = await programService.hashContent(talentText);
    const result = await programService.createDeposit(
      hubPda,
      'talent',
      contentHash,
      depositIndex
    );
    return result;
  }, {
    onSuccess: () => {
      Alert.alert(
        'Talent Submitted',
        `Your talent submission is in review. ${DEPOSITS.TALENT} $SKR deposited in escrow — refunded when the brand approves.`
      );
    },
  });
};

// ============================================
// DAO VAULT OPERATIONS
// ============================================

/**
 * Contribute to a DAO vault
 */
export const contributeToVault = async (vaultPda, amount) => {
  return executeTransaction('Contribute', async () => {
    const result = await programService.contributeToVault(vaultPda, amount);
    return result;
  }, {
    onSuccess: () => {
      Alert.alert(
        'Contribution Successful',
        `You contributed ${amount} $SKR to this DAO Boost. 95% goes to the brand, 5% to the platform.`
      );
    },
  });
};

// ============================================
// AD SLOT OPERATIONS
// ============================================

/**
 * Purchase an ad slot
 */
export const purchaseAdSlot = async (hubPda, slotType, slotIndex, imageUrlHash, landingUrlHash, durationWeeks) => {
  return executeTransaction('Purchase Ad', async () => {
    const result = await programService.purchaseAdSlot(
      hubPda,
      slotType,
      slotIndex,
      imageUrlHash,
      landingUrlHash,
      durationWeeks
    );
    return result;
  }, {
    onSuccess: () => {
      const price = slotType === 'top' ? PRICING.TOP_AD_SLOT : slotType === 'lockscreen' ? PRICING.LOCKSCREEN_AD : PRICING.BOTTOM_AD_SLOT;
      Alert.alert(
        'Ad Slot Purchased',
        `Your ${slotType} ad slot has been purchased for ${durationWeeks} week(s) at ${price * durationWeeks} $SKR.`
      );
    },
  });
};

// ============================================
// MODERATION OPERATIONS (Brand moderator)
// ============================================

/**
 * Approve feedback (refund to user)
 */
export const approveFeedback = async (depositPda, hubPda, depositorPubkey) => {
  return executeTransaction('Approve Feedback', async () => {
    return programService.approveFeedback(depositPda, hubPda, depositorPubkey);
  });
};

/**
 * Approve talent (refund to user)
 */
export const approveTalent = async (depositPda, hubPda, depositorPubkey) => {
  return executeTransaction('Approve Talent', async () => {
    return programService.approveTalent(depositPda, hubPda, depositorPubkey);
  });
};

/**
 * Approve DAO proposal (refund + create vault)
 */
export const approveDaoProposal = async (depositPda, hubPda, depositorPubkey, vaultIndex, title, description, targetAmount, expiresAt) => {
  return executeTransaction('Approve Proposal', async () => {
    return programService.approveDaoProposal(
      depositPda, hubPda, depositorPubkey,
      vaultIndex, title, description, targetAmount, expiresAt
    );
  });
};

/**
 * Reject any deposit (tokens go to treasury)
 */
export const rejectDeposit = async (depositPda, hubPda, depositorPubkey) => {
  return executeTransaction('Reject Deposit', async () => {
    return programService.rejectDeposit(depositPda, hubPda, depositorPubkey);
  });
};

// ============================================
// SCORING OPERATIONS
// ============================================

/**
 * Initialize user score (call once per user)
 */
export const initUserScore = async () => {
  return executeTransaction('Initialize Score', async () => {
    return programService.initUserScore();
  }, {
    onSuccess: () => {
      logger.log('[Transaction] User score initialized on-chain');
    },
  });
};

// ============================================
// READ OPERATIONS (No wallet needed)
// ============================================

/**
 * Fetch all hubs from on-chain
 */
export const fetchAllHubs = async () => {
  try {
    return await programService.fetchAllHubs();
  } catch (error) {
    logger.warn('[Read] fetchAllHubs failed, using mock data:', error.message);
    return null; // Screens fall back to mock data when null
  }
};

/**
 * Fetch user subscriptions
 */
export const fetchUserSubscriptions = async (userPubkey) => {
  try {
    return await programService.fetchUserSubscriptions(userPubkey);
  } catch (error) {
    logger.warn('[Read] fetchUserSubscriptions failed:', error.message);
    return null;
  }
};

/**
 * Fetch user score
 */
export const fetchUserScore = async (userPubkey) => {
  try {
    return await programService.fetchUserScore(userPubkey);
  } catch (error) {
    logger.warn('[Read] fetchUserScore failed:', error.message);
    return null;
  }
};

/**
 * Fetch DAO vaults for a hub
 */
export const fetchVaultsForHub = async (hubPda) => {
  try {
    return await programService.fetchOpenVaultsForHub(hubPda);
  } catch (error) {
    logger.warn('[Read] fetchVaultsForHub failed:', error.message);
    return null;
  }
};

/**
 * Fetch platform config
 */
export const fetchPlatformConfig = async () => {
  try {
    return await programService.fetchPlatformConfig();
  } catch (error) {
    logger.warn('[Read] fetchPlatformConfig failed:', error.message);
    return null;
  }
};

// ============================================
// ERROR PARSING
// ============================================

function _parseError(error) {
  const msg = error.message || error.toString();

  // User cancelled
  if (msg.includes('declined') || msg.includes('cancelled') || msg.includes('4001')) {
    return 'Transaction cancelled by user.';
  }

  // Insufficient funds
  if (msg.includes('insufficient') || msg.includes('0x1')) {
    return 'Insufficient $SKR balance. Please get more tokens to perform this action.';
  }

  // Account not found
  if (msg.includes('Account does not exist') || msg.includes('AccountNotFound')) {
    return 'Account not found on-chain. The platform may need to be initialized first.';
  }

  // No wallet found
  if (msg.includes('No wallet') || msg.includes('-32001')) {
    return 'No Solana wallet found. Please install Phantom or Solflare.';
  }

  // Network error
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Custom program error
  const programErrorMatch = msg.match(/custom program error: (0x[0-9a-fA-F]+)/);
  if (programErrorMatch) {
    return `Program error: ${programErrorMatch[1]}. Check transaction on Solscan for details.`;
  }

  return msg.length > 120 ? msg.substring(0, 120) + '...' : msg;
}
