/** RN 전역 — vite.config.ts 의 define 으로 주입됩니다. */
declare const __DEV__: boolean;

/**
 * react-native-web 은 자체 TS 타입을 싣지 않습니다.
 * API 가 react-native 와 같은 모양이라 RN 타입을 그대로 빌려 씁니다.
 */
declare module 'react-native-web' {
  export * from 'react-native';
}

interface Window {
  /** 카카오 JS SDK (index.html 에서 로드) */
  Kakao?: any;
}
