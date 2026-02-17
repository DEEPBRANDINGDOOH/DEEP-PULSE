const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro config with polyfill resolution for @solana/web3.js.
 * See: https://docs.solanamobile.com/react-native/polyfill-guides/polyfills
 */
const config = {
  resolver: {
    extraNodeModules: {
      crypto: require.resolve('react-native-get-random-values'),
      buffer: require.resolve('buffer'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
