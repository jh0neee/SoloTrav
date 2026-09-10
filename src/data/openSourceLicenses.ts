/**
 * 오픈소스 라이선스 고지 목록
 */

export interface OpenSourceLibrary {
  name: string;
  version: string;
  license: string;
  repository?: string;
  description: string;
  licenseText?: string;
}

export const OPEN_SOURCE_LIBRARIES: OpenSourceLibrary[] = [
  {
    name: 'React Native',
    version: '0.86.0',
    license: 'MIT',
    repository: 'https://github.com/facebook/react-native',
    description: 'A framework for building native apps with React.',
  },
  {
    name: 'React',
    version: '19.2.3',
    license: 'MIT',
    repository: 'https://github.com/facebook/react',
    description: 'The library for web and native user interfaces.',
  },
  {
    name: 'Phosphor Icons (phosphor-react-native)',
    version: '3.0.6',
    license: 'MIT',
    repository: 'https://github.com/duongdev/phosphor-react-native',
    description: 'Flexible icon family for React Native interfaces.',
  },
  {
    name: 'React Native Safe Area Context',
    version: '5.5.2',
    license: 'MIT',
    repository: 'https://github.com/th3rdwave/react-native-safe-area-context',
    description: 'A flexible way to handle safe area insets in React Native.',
  },
  {
    name: 'React Native WebView',
    version: '14.0.1',
    license: 'MIT',
    repository: 'https://github.com/react-native-webview/react-native-webview',
    description: 'React Native Cross-Platform WebView.',
  },
  {
    name: 'React Native SVG',
    version: '15.15.5',
    license: 'MIT',
    repository: 'https://github.com/software-mansion/react-native-svg',
    description: 'SVG library for React Native on iOS and Android.',
  },
  {
    name: 'Axios',
    version: '1.19.0',
    license: 'MIT',
    repository: 'https://github.com/axios/axios',
    description: 'Promise based HTTP client for the browser and node.js.',
  },
  {
    name: '@react-native-async-storage/async-storage',
    version: '3.1.1',
    license: 'MIT',
    repository: 'https://github.com/react-native-async-storage/async-storage',
    description: 'An asynchronous, unencrypted, persistent, key-value storage system for React Native.',
  },
  {
    name: '@react-native-seoul/kakao-login',
    version: '6.0.4',
    license: 'MIT',
    repository: 'https://github.com/react-native-seoul/react-native-kakao-login',
    description: 'React Native Kakao Login library for iOS and Android.',
  },
  {
    name: 'react-native-image-picker',
    version: '8.2.1',
    license: 'Apache-2.0',
    repository: 'https://github.com/react-native-image-picker/react-native-image-picker',
    description: 'A React Native module that allows you to use native UI to select media from the device library or directly from the camera.',
  },
  {
    name: '@react-native-community/geolocation',
    version: '3.4.0',
    license: 'MIT',
    repository: 'https://github.com/michalchudziak/react-native-geolocation',
    description: 'Geolocation API for React Native.',
  },
  {
    name: 'react-native-color-matrix-image-filters',
    version: '8.0.2',
    license: 'MIT',
    repository: 'https://github.com/iyegoroff/react-native-color-matrix-image-filters',
    description: 'Color matrix image filters for React Native.',
  },
];

