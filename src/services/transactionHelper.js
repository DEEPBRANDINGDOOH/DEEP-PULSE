/**
 * Transaction Helper
 *
 * Bridges UI screens with programService for real Solana transactions.
 * Handles wallet connection checks, loading states, error handling,
 * and user-friendly feedback for all on-chain actions.
 */

import { Alert } from 'react-native';
import { programService } from './programService';
import { notificationService } from './notificationService';
import { PRICING, DEPOSITS, MOCK_TRANSACTIONS } from '../config/constants';
import { logger } from '../utils/security';
import { showToast } from '../components/ui/Toast';

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

/**
 * Check if wallet has enough $SKR balance before a transaction.
 * Skips check in __DEV__ mode when wallet is not connected.
 * @param {number} requiredAmount - Minimum $SKR needed
 * @param {string} actionName - Human-readable action name (for error alert)
 * @returns {Promise<boolean>} true if balance is sufficient (or check skipped)
 */
export const checkSkrBalance = async (requiredAmount, actionName) => {
  // [B46] Skip balance check when transactions are mocked (program not on mainnet yet)
  if (MOCK_TRANSACTIONS) return true;
  try {
    const { PublicKey } = require('@solana/web3.js');
    const pubkey = typeof _walletPublicKey === 'string'
      ? new PublicKey(_walletPublicKey)
      : _walletPublicKey;
    const balance = await programService.getSkrBalance(pubkey);
    if (balance < requiredAmount) {
      Alert.alert(
        'Insufficient $SKR',
        `${actionName} requires ${requiredAmount} $SKR but you only have ${balance.toFixed(2)} $SKR.\n\nPlease acquire more $SKR tokens to continue.`
      );
      return false;
    }
    return true;
  } catch (e) {
    logger.warn('[Balance] Check failed (proceeding anyway):', e.message);
    return true; // Let the transaction attempt proceed if balance check fails
  }
};

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

  // [B46] Mock transactions when program not deployed on-chain
  // Wallet connection is real (MWA), but $SKR transactions are simulated
  if (MOCK_TRANSACTIONS) {
    logger.log(`[Transaction] ${actionName} — mock (program not deployed on-chain yet)`);
    const mockResult = {
      signature: `devnet_mock_${actionName.replace(/\s/g, '_')}_${Date.now()}`,
      message: `${actionName} completed (devnet simulation)`,
    };
    if (onSuccess) {
      onSuccess(mockResult);
    }
    return { success: true, result: mockResult };
  }

  // Production: check wallet connection
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
    // [B48] Use logger.warn to avoid red LogBox banners in dev mode
    logger.warn(`[Transaction] ${actionName} failed:`, error?.message || error);

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
      showToast({ type: 'success', title: 'Subscribed!', message: 'You will receive notifications from this hub.' });
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
      showToast({ type: 'info', title: 'Unsubscribed', message: 'You will no longer receive notifications from this hub.' });
    },
  });
};

/**
 * Create a new hub (brand pays HUB_CREATION $SKR)
 */
export const createHub = async (name, description, category, hubIndex) => {
  if (!(await checkSkrBalance(PRICING.HUB_CREATION, 'Create Hub'))) return { success: false, error: 'Insufficient balance' };
  return executeTransaction('Create Hub', async () => {
    const result = await programService.createHub(name, description, category, hubIndex);
    return result;
  }, {
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Hub Created!',
        message: `"${name}" is live. ${PRICING.HUB_CREATION} $SKR charged for the first month.`,
        duration: 3500,
      });
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
  if (!(await checkSkrBalance(DEPOSITS.FEEDBACK, 'Submit Feedback'))) return { success: false, error: 'Insufficient balance' };
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
      showToast({
        type: 'success',
        title: 'Feedback Submitted',
        message: `${DEPOSITS.FEEDBACK} $SKR in escrow — refunded when the brand approves.`,
        duration: 3500,
      });
    },
  });
};

/**
 * Submit a DAO Boost proposal (DAO_PROPOSAL deposit in $SKR escrow)
 */
export const submitDaoProposal = async (hubPda, proposalText, depositIndex) => {
  if (!(await checkSkrBalance(DEPOSITS.DAO_PROPOSAL, 'Submit Proposal'))) return { success: false, error: 'Insufficient balance' };
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
      showToast({
        type: 'success',
        title: 'Proposal Submitted',
        message: `${DEPOSITS.DAO_PROPOSAL} $SKR in escrow — refunded when approved.`,
        duration: 3500,
      });
    },
  });
};

/**
 * Submit talent showcase (TALENT deposit in $SKR escrow)
 */
export const submitTalent = async (hubPda, talentText, depositIndex) => {
  if (!(await checkSkrBalance(DEPOSITS.TALENT, 'Submit Talent'))) return { success: false, error: 'Insufficient balance' };
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
      showToast({
        type: 'success',
        title: 'Talent Submitted',
        message: `In review. ${DEPOSITS.TALENT} $SKR in escrow — refunded when the brand approves.`,
        duration: 3500,
      });
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
  if (!(await checkSkrBalance(amount, 'Contribute to Vault'))) return { success: false, error: 'Insufficient balance' };
  return executeTransaction('Contribute', async () => {
    const result = await programService.contributeToVault(vaultPda, amount);
    return result;
  }, {
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Contribution Successful',
        message: `You contributed ${amount} $SKR. 95% to the brand, 5% to the platform.`,
        duration: 3500,
      });
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
      showToast({
        type: 'success',
        title: 'Ad Slot Purchased',
        message: `${slotType} slot · ${durationWeeks} week(s) · ${price * durationWeeks} $SKR`,
        duration: 3500,
      });
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
