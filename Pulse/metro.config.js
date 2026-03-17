const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Zustand v4's package.json "exports" field has an "import" condition that
// resolves to .mjs files containing `import.meta`, which Metro does not support.
// Zustand also has a "react-native" condition that points to safe CJS files.
// Adding "react-native" first ensures Metro picks the CJS build instead.
config.resolver.unstable_conditionNames = [
    'react-native',
    'browser',
    'require',
    'default',
];

module.exports = config;
