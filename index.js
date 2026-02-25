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

import { AppRegistry } from 'react-native';
import App from './App';

// Register as 'main' for Expo Go compatibility, and also with app name
AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent('DeepPulse', () => App);
