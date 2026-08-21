const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    /**
     * Metro 기본 sourceExts 에는 mjs 가 없습니다.
     * lucide-react-native 는 진입점이 `dist/esm/lucide-react-native.mjs` 라
     * 이 확장자를 빼면 아이콘을 하나도 못 불러옵니다.
     */
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
