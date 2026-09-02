const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

/**
 * 웹 클라이언트(web/) 를 Metro 시야에서 제외합니다.
 *
 * web/ 은 이 저장소의 src 를 vite 로 컴파일해 브라우저에 띄우는 별개 프로젝트라
 * 안드로이드 번들에 들어갈 일이 없습니다. 그런데 Metro 는 프로젝트 루트를 통째로
 * 훑기 때문에, 막지 않으면 web/node_modules 의 react·react-dom 까지 크롤링해서
 * 시작이 느려지고 같은 패키지가 두 벌 보이게 됩니다.
 */
const escapeForRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const webDir = path.resolve(__dirname, 'web');
/** web/ 아래 모든 경로 (윈도우 \ 와 posix / 구분자 둘 다) */
const blockWeb = new RegExp(`^${escapeForRegExp(webDir)}[\\\\/].*`);

const config = {
  resolver: {
    /**
     * Metro 기본 sourceExts 에는 mjs 가 없습니다.
     * lucide-react-native 는 진입점이 `dist/esm/lucide-react-native.mjs` 라
     * 이 확장자를 빼면 아이콘을 하나도 못 불러옵니다.
     */
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs'],
    /* 기본 blockList 를 지우지 않고 web/ 규칙만 덧붙입니다. */
    blockList: [defaultConfig.resolver.blockList]
      .flat()
      .filter(Boolean)
      .concat(blockWeb),
  },
};

module.exports = mergeConfig(defaultConfig, config);
