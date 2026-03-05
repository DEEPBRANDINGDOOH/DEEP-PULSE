/**
 * @format
 * DEEP Pulse - Entry Point
 *
 * IMPORTANT: Polyfills must be imported BEFORE any Solana imports.
 * @solana/web3.js requires crypto.getRandomValues and Buffer globals
 * on React Native. See: https://docs.solanamobile.com/react-native/polyfill-guides/web3-js
 */

// Polyfills required for @solana/web3.js on React Native
// IMPORTANT: react-native-get-random-values MUST be first (before any Solana imports)
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { AppRegistry, LogBox } from 'react-native';
import App from './App';

// [B47] Suppress known non-critical warnings in dev LogBox
// Cloud Function fallbacks, Firebase sync retries, and score saves are expected
LogBox.ignoreLogs([
  'Cloud Function call failed',
  'Cloud Functions not initialized',
  'Cloud Functions not available',
  'saveUserScore',
  'trackEvent failed',
  'trackEvent Firestore failed',
  'fetchUserScore failed',
  'Firestore write failed',
  '[ERROR]',           // Our logger.error → console.warn wrapper
  'Non-serializable',  // Zustand persist warning
  'new NativeEventEmitter', // RN compatibility warning
]);

// Setup Firebase background message handler (must be at root level, outside components)
import { notificationService } from './src/services/notificationService';
notificationService.setupBackgroundHandler();

// Register as 'main' for Expo Go compatibility, and also with app name
AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent('DeepPulse', () => App);
