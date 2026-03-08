/**
 * Mobile Wallet Adapter Service
 *
 * This service handles ALL wallet interactions using the official
 * Solana Mobile Wallet Adapter protocol.
 *
 * Best practices applied (per Solana Mobile docs):
 * - Auth token persistence with AsyncStorage
 * - MWA 2.0 cluster format: 'solana:devnet'
 * - authorize/reauthorize in EVERY transact() session
 * - onWalletNotFound handler on every transact() call
 * - Prefer signAndSendTransactions over separate sign + send
 * - Blockhash fetching inside transact() to avoid expiration
 * - Dynamic Connection (supports network switching)
 * - Sign In With Solana (SIWS) support
 * - Retry logic for transient failures
 *
 * Reference: https://docs.solanamobile.com/react-native/using_mobile_wallet_adapter
 */

// MWA availability — set to false for Expo Go, true for custom native build
// In Expo Go, the native SolanaMobileWalletAdapter TurboModule is not available
// so we must NOT require the MWA packages (they crash on import)
const MWA_ENABLED = true; // Enabled for Seeker release build

let transact = null;
let SolanaMobileWalletAdapterProtocolError = null;
let mwaAvailable = false;

if (MWA_ENABLED) {
  try {
    transact = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js').transact;
    const protocol = require('@solana-mobile/mobile-wallet-adapter-protocol');
    SolanaMobileWalletAdapterProtocolError = protocol.SolanaMobileWalletAdapterProtocolError;
    mwaAvailable = true;
    logger.log('[WalletAdapter] MWA native module loaded');
  } catch (e) {
    logger.warn('[WalletAdapter] MWA import failed:', e.message);
  }
} else {
  logger.log('[WalletAdapter] MWA disabled — running in mock mode (Expo Go)');
}

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_IDENTITY, getRpcEndpoint, getCluster, STORAGE_KEYS, USE_DEVNET } from '../config/constants';
import { logger } from '../utils/security';

/**
 * Handler called when no compatible wallet app is found on device.
 * Opens the Play Store to search for Solana wallets.
 */
const onWalletNotFound = () => {
  Linking.openURL(
    'https://play.google.com/store/search?q=solana+wallet&c=apps'
  );
};

/**
 * Mobile Wallet Adapter Service
 *
 * All methods use the transact() pattern for secure sessions.
 * Every transact() session includes authorization per MWA best practices.
 */
class MobileWalletAdapterService {
  constructor() {
    this._connection = null;
    this._currentEndpoint = null;
  }

  /**
   * Dynamic Connection getter.
   * Recreates the Connection if the RPC endpoint has changed
   * (e.g., switching between devnet and mainnet).
   */
  get connection() {
    const endpoint = getRpcEndpoint();
    if (!this._connection || this._currentEndpoint !== endpoint) {
      this._connection = new Connection(endpoint, 'confirmed');
      this._currentEndpoint = endpoint;
    }
    return this._connection;
  }

  /**
   * Connect wallet using Mobile Wallet Adapter
   *
   * This initiates the MWA flow:
   * 1. User selects wallet app (Phantom, Solflare, etc.)
   * 2. Wallet app opens and prompts authorization
   * 3. User approves
   * 4. We receive publicKey and authToken
   *
   * @returns {Promise<{publicKey: PublicKey, authToken: string, label: string, walletUriBase: string}>}
   */
  async connect() {
    // Fallback for Expo Go where MWA native module is unavailable
    if (!mwaAvailable || !transact) {
      logger.warn('[WalletAdapter] MWA not available — using dev mock wallet');
      const mockPublicKey = new PublicKey('7xKLuJkm9QPZWF8yKJp9kn6YLddgjA18BxvFQCc9Qz4');
      return {
        publicKey: mockPublicKey,
        authToken: 'mock-auth-token-dev',
        label: 'Dev Wallet (Expo Go)',
        walletUriBase: '',
      };
    }

    try {
      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          chain: getCluster(),
          identity: APP_IDENTITY,
        });

        const firstAccount = authorization.accounts[0];

        // MWA returns address as Base64EncodedAddress — decode to bytes for PublicKey
        let publicKey;
        try {
          // Try base64 decode first (MWA 2.0 protocol format)
          const decoded = require('buffer').Buffer.from(firstAccount.address, 'base64');
          publicKey = new PublicKey(decoded);
        } catch {
          // Fallback: maybe it's already base58 (WalletAccount format)
          publicKey = new PublicKey(firstAccount.address);
        }

        // Save auth_token for future sessions
        if (authorization.auth_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_AUTH_TOKEN, authorization.auth_token);
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PUBLIC_KEY, publicKey.toString());
        }

        return {
          publicKey,
          authToken: authorization.auth_token,
          label: firstAccount.label,
          walletUriBase: authorization.wallet_uri_base,
        };
      }, { onWalletNotFound });

      logger.log('Wallet connected:', result.publicKey.toString());

      // [B50] Firebase Auth only on mainnet (release APK).
      // On devnet, signMessage() opens a 2nd wallet dialog that blocks the connection flow.
      // Firestore rules are open — no auth needed on devnet for hackathon demo.
      if (!USE_DEVNET) {
        // Delay Firebase Auth to avoid interfering with the connection Alert/navigation
        setTimeout(() => {
          import('./firebaseService').then(fb => {
            fb.authenticateWithFirebase(
              result.publicKey.toString(),
              (msg, token) => this.signMessage(msg, token),
              result.authToken,
            ).then(authResult => {
              if (authResult.success) {
                logger.log('[WalletAdapter] Firebase Auth successful');
              } else {
                logger.warn('[WalletAdapter] Firebase Auth skipped:', authResult.error || 'unavailable');
              }
            }).catch(e => logger.warn('[WalletAdapter] Firebase Auth error (non-blocking):', e?.message));
          }).catch(() => {});
        }, 3000); // 3s delay so wallet connection completes first
      }

      return result;
    } catch (error) {
      logger.warn('[WalletAdapter] Connection failed:', error?.message || error);
      this._handleMwaError(error);
    }
  }

  /**
   * Sign In With Solana (SIWS)
   *
   * Combines authorize + signMessage for secure wallet authentication.
   * This is the recommended approach per Solana Mobile docs.
   *
   * @param {string} [domain] - The domain requesting sign-in
   * @param {string} [statement] - Human-readable statement shown in wallet
   * @returns {Promise<{publicKey: PublicKey, authToken: string, signInOutput: object}>}
   */
  async signInWithSolana(domain = 'deeppulse.app', statement = 'Sign in to DEEP Pulse') {
    try {
      const result = await transact(async (wallet) => {
        const signInInput = {
          domain,
          statement,
          chainId: getCluster() === 'solana:mainnet-beta' ? 'mainnet' : 'devnet',
        };

        const authorization = await wallet.authorize({
          chain: getCluster(),
          identity: APP_IDENTITY,
          sign_in_payload: signInInput,
        });

        const firstAccount = authorization.accounts[0];
        let publicKey;
        try {
          const decoded = require('buffer').Buffer.from(firstAccount.address, 'base64');
          publicKey = new PublicKey(decoded);
        } catch {
          publicKey = new PublicKey(firstAccount.address);
        }

        if (authorization.auth_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_AUTH_TOKEN, authorization.auth_token);
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PUBLIC_KEY, publicKey.toString());
        }

        return {
          publicKey,
          authToken: authorization.auth_token,
          label: firstAccount.label,
          walletUriBase: authorization.wallet_uri_base,
          signInOutput: authorization.sign_in_result,
        };
      }, { onWalletNotFound });

      logger.log('SIWS authentication successful:', result.publicKey.toString());
      return result;
    } catch (error) {
      logger.warn('[WalletAdapter] SIWS failed:', error?.message || error);
      this._handleMwaError(error);
    }
  }

  /**
   * Auto-reconnect using stored auth_token
   *
   * Call this on app startup to restore previous session
   *
   * @returns {Promise<{publicKey: PublicKey, authToken: string} | null>}
   */
  async autoConnect() {
    try {
      const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_AUTH_TOKEN);

      if (!savedToken) {
        logger.log('No saved session found');
        return null;
      }

      logger.log('Attempting auto-reconnect...');
      const result = await this.reauthorize(savedToken);
      logger.log('Auto-reconnect successful');
      return result;
    } catch (error) {
      logger.log('Auto-reconnect failed, clearing saved session');
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_PUBLIC_KEY);
      return null;
    }
  }

  /**
   * Re-authorize using stored auth_token
   *
   * This is faster than full authorization and maintains
   * the same session. Use this when app restarts and we
   * have a saved auth_token.
   *
   * @param {string} authToken - Previously stored auth_token
   * @returns {Promise<{publicKey: PublicKey, authToken: string}>}
   */
  async reauthorize(authToken) {
    try {
      const result = await transact(async (wallet) => {
        const authorization = await wallet.reauthorize({
          auth_token: authToken,
          identity: APP_IDENTITY,
        });

        const firstAccount = authorization.accounts[0];
        let publicKey;
        try {
          const decoded = require('buffer').Buffer.from(firstAccount.address, 'base64');
          publicKey = new PublicKey(decoded);
        } catch {
          publicKey = new PublicKey(firstAccount.address);
        }

        // Update stored token (it may have been refreshed)
        if (authorization.auth_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_AUTH_TOKEN, authorization.auth_token);
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_PUBLIC_KEY, publicKey.toString());
        }

        return {
          publicKey,
          authToken: authorization.auth_token,
          label: firstAccount.label,
        };
      }, { onWalletNotFound });

      logger.log('Wallet reauthorized:', result.publicKey.toString());
      return result;
    } catch (error) {
      logger.warn('[WalletAdapter] Reauthorization failed:', error?.message || error);

      // If reauth fails, token is invalid - clear it
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_PUBLIC_KEY);

      throw new Error('Session expired. Please reconnect your wallet.');
    }
  }

  /**
   * Disconnect wallet (deauthorize)
   *
   * This revokes the authorization and clears the session
   *
   * @param {string} authToken - Current auth_token
   */
  async disconnect(authToken) {
    // NOTE: We intentionally do NOT call transact() + wallet.deauthorize() here.
    // Calling transact() opens the wallet app dialog, which confuses users
    // (looks like a new connection instead of a disconnect).
    // Instead, we just clear the local session. The auth_token will expire naturally.
    // This is safe because the wallet app doesn't retain any sensitive state.
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_PUBLIC_KEY);
      logger.log('Wallet disconnected (local session cleared)');
    } catch (error) {
      logger.warn('Disconnect storage cleanup warning:', error?.message || error);
    }
  }

  /**
   * Sign a transaction (without sending)
   *
   * NOTE: MWA 2.0 recommends signAndSendTransactions for most cases.
   * Use this only when you need to inspect the signed transaction before sending.
   *
   * @param {Transaction} transaction - Unsigned transaction
   * @param {string} authToken - Current auth_token
   * @returns {Promise<Transaction>} Signed transaction
   */
  async signTransaction(transaction, authToken) {
    try {
      const signedTransaction = await transact(async (wallet) => {
        // REQUIRED: Authorize within every transact() session
        const authResult = authToken
          ? await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY })
          : await wallet.authorize({ chain: getCluster(), identity: APP_IDENTITY });

        // Update stored auth token if refreshed
        if (authResult.auth_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_AUTH_TOKEN, authResult.auth_token);
        }

        // Web3js wrapper returns T[] directly (not { signedTransactions })
        const signedTxs = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signedTxs[0];
      }, { onWalletNotFound });

      logger.log('Transaction signed');
      return signedTransaction;
    } catch (error) {
      logger.warn('[WalletAdapter] Transaction signing error:', error?.message || error);
      this._handleMwaError(error);
    }
  }

  /**
   * Sign and send a transaction (preferred MWA 2.0 approach)
   *
   * Uses wallet.signAndSendTransactions() within a single transact() session.
   * Fetches a fresh blockhash inside the session to avoid expiration.
   *
   * @param {Transaction} transaction - Unsigned transaction
   * @param {string} authToken - Current auth_token
   * @returns {Promise<string>} Transaction signature
   */
  async signAndSendTransaction(transaction, authToken) {
    try {
      const signature = await transact(async (wallet) => {
        // Authorize within session
        const authResult = authToken
          ? await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY })
          : await wallet.authorize({ chain: getCluster(), identity: APP_IDENTITY });

        if (authResult.auth_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_AUTH_TOKEN, authResult.auth_token);
        }

        // Fetch fresh blockhash inside transact() to avoid expiration
        const { blockhash, lastValidBlockHeight } =
          await this.connection.getLatestBlockhash();

        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;

        // Use signAndSendTransactions for the combined flow (MWA 2.0 best practice)
        const [sig] = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return sig;
      }, { onWalletNotFound });

      logger.log('Transaction sent:', signature);
      return signature;
    } catch (error) {
      logger.warn('[WalletAdapter] Sign and send error:', error?.message || error);
      this._handleMwaError(error);
    }
  }

  /**
   * Sign a message
   *
   * For signing arbitrary messages (authentication, etc.)
   *
   * @param {Uint8Array | string} message - Message to sign
   * @param {string} authToken - Current auth_token
   * @returns {Promise<Uint8Array>} Signature
   */
  async signMessage(message, authToken) {
    try {
      const result = await transact(async (wallet) => {
        // REQUIRED: Authorize within every transact() session
        const authResult = authToken
          ? await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY })
          : await wallet.authorize({ chain: getCluster(), identity: APP_IDENTITY });

        if (authResult.auth_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_AUTH_TOKEN, authResult.auth_token);
        }

        const messageBytes = typeof message === 'string'
          ? new TextEncoder().encode(message)
          : message;

        // addresses is required by MWA — pass the Base64EncodedAddress from authResult
        const signedMessages = await wallet.signMessages({
          addresses: [authResult.accounts[0].address],
          payloads: [messageBytes],
        });

        return signedMessages[0];
      }, { onWalletNotFound });

      logger.log('Message signed');
      return result;
    } catch (error) {
      logger.warn('[WalletAdapter] Message signing error:', error?.message || error);
      this._handleMwaError(error);
    }
  }

  /**
   * Get account balance
   *
   * @param {PublicKey} publicKey - Wallet address
   * @returns {Promise<number>} Balance in SOL
   */
  async getBalance(publicKey) {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      logger.warn('[WalletAdapter] Balance fetch error:', error?.message || error);
      return 0;
    }
  }

  /**
   * Create and send a simple SOL transfer transaction
   *
   * Fetches blockhash INSIDE transact() to avoid expiration.
   * Uses signAndSendTransactions for the combined flow.
   *
   * @param {PublicKey} from - Sender address
   * @param {PublicKey} to - Recipient address
   * @param {number} amount - Amount in SOL
   * @param {string} authToken - Current auth_token
   * @returns {Promise<string>} Transaction signature
   */
  async sendSOL(from, to, amount, authToken) {
    try {
      const signature = await transact(async (wallet) => {
        const { SystemProgram } = await import('@solana/web3.js');

        // Authorize within session
        const authResult = authToken
          ? await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY })
          : await wallet.authorize({ chain: getCluster(), identity: APP_IDENTITY });

        if (authResult.auth_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.WALLET_AUTH_TOKEN, authResult.auth_token);
        }

        // Get FRESH blockhash inside transact() - critical!
        const { blockhash, lastValidBlockHeight } =
          await this.connection.getLatestBlockhash();

        const transaction = new Transaction({
          feePayer: from,
          blockhash,
          lastValidBlockHeight,
        });

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: from,
            toPubkey: to,
            lamports: Math.round(amount * 1e9), // [B55] Avoid floating-point precision errors
          })
        );

        const [sig] = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return sig;
      }, { onWalletNotFound });

      logger.log('SOL transferred:', signature);
      return signature;
    } catch (error) {
      logger.warn('[WalletAdapter] SOL transfer error:', error?.message || error);
      this._handleMwaError(error);
    }
  }

  /**
   * Retry wrapper for transient failures
   *
   * Automatically retries failed operations with exponential backoff.
   * Each retry creates a new transact() session per MWA best practices.
   *
   * @param {Function} operation - Async operation to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<any>} Operation result
   */
  async retryOperation(operation, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry user cancellations
        if (error.code === 4001 || error.message?.includes('declined')) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        logger.log(`Retry attempt ${attempt + 1} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Handle MWA-specific errors with user-friendly messages
   * @private
   */
  _handleMwaError(error) {
    if (SolanaMobileWalletAdapterProtocolError && error instanceof SolanaMobileWalletAdapterProtocolError) {
      switch (error.code) {
        case 4001:
          throw new Error('User declined wallet connection');
        case -32001:
          throw new Error('No wallet app found. Please install Phantom or Solflare from Play Store.');
        case -32002:
          throw new Error('Connection timed out. Please try again.');
        case -32602:
          throw new Error('Transaction is invalid. Please check the parameters.');
        case -32603:
          throw new Error('Wallet error occurred. Please restart your wallet app.');
        default:
          throw new Error(`Wallet error (${error.code}): ${error.message}`);
      }
    }

    if (error.message?.includes('user declined')) {
      throw new Error('User declined wallet connection');
    }

    throw error;
  }
}

// Export singleton instance
export const walletAdapter = new MobileWalletAdapterService();

/**
 * Helper function to format public key for display
 * Example: "7xK...9Qz"
 */
export const formatPublicKey = (publicKey) => {
  if (!publicKey) return '';

  const key = typeof publicKey === 'string' ? publicKey : publicKey.toString();
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

/**
 * Helper to check if device supports MWA
 *
 * Note: MWA only works on Android devices with compatible wallets
 */
export const isMobileWalletAdapterSupported = () => {
  const { Platform } = require('react-native');
  return Platform.OS === 'android';
};
