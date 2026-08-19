/**
 * 서버로 보낼 User-Agent 문자열.
 *
 * POST /auth/kakao/native 가 user-agent 를 필수 헤더로 요구합니다.
 * RN 도 XHR 기본 UA(iOS: CFNetwork/Darwin, Android: okhttp)를 붙여주긴 하지만
 * 플랫폼마다 형식이 제각각이고 앱 버전이 담기지 않아 서버가 기기를 구분할 수
 * 없습니다. 그래서 앱이 직접 만들어 싣습니다.
 *
 * 예) SoloTravelMate/0.0.1 (android 36)
 */
import { Platform } from 'react-native';
import { version as appVersion } from '../../package.json';

export const APP_NAME = 'SoloTravelMate';

export const userAgent = `${APP_NAME}/${appVersion} (${Platform.OS} ${String(
  Platform.Version,
)})`;
