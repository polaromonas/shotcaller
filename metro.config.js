const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web imports a .wasm binary; treat it as an asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
