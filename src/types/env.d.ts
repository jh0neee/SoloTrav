/**
 * react-native-dotenv 가 주입하는 `@env` 모듈의 타입 선언.
 * .env 에 키를 추가하면 여기에도 함께 선언해야 합니다.
 * 모든 값은 문자열로 들어오므로 숫자 변환은 src/config/env.ts 에서 처리합니다.
 */
declare module '@env' {
  export const API_BASE_URL: string;
  export const API_VERSION: string;
  export const API_TIMEOUT_MS: string;
  export const KAKAO_LOGIN_REST_API_KEY: string;
}
