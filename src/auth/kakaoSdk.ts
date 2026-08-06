/**
 * 카카오 네이티브 SDK 래퍼.
 *
 * @react-native-seoul/kakao-login 을 이 파일 밖으로 새어나가지 않게 감싸서
 * - 앱 나머지 코드는 "카카오 access token 문자열"만 알면 되도록 하고
 * - 사용자가 로그인 창을 닫은 경우를 에러가 아닌 취소로 구분합니다.
 *
 * login() 은 카카오톡이 설치돼 있으면 카카오톡으로, 아니면 카카오계정 웹으로
 * 알아서 분기합니다(라이브러리 내부 처리).
 */
import { login, logout } from '@react-native-seoul/kakao-login';

/**
 * 카카오가 발급한 토큰 쌍.
 * 서버(POST /auth/kakao/native)가 둘 다 요구하므로 함께 들고 나갑니다.
 */
export type KakaoTokens = {
  accessToken: string;
  refreshToken: string;
};

/** 사용자가 로그인 창을 스스로 닫았을 때 */
export class KakaoLoginCancelled extends Error {
  constructor() {
    super('카카오 로그인이 취소되었습니다.');
    this.name = 'KakaoLoginCancelled';
    Object.setPrototypeOf(this, KakaoLoginCancelled.prototype);
  }
}

/**
 * 취소 판별.
 * SDK 가 취소에도 일반 에러 코드('RNKakaoLogins')를 그대로 쓰기 때문에
 * 메시지로 구분할 수밖에 없습니다. (Android/iOS 문구가 서로 다름)
 */
function isCancelledError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /cancel|취소/i.test(message);
}

/**
 * 카카오 로그인 후 카카오가 발급한 토큰 쌍을 돌려줍니다.
 * 이 토큰은 우리 서버(POST /auth/kakao/native)에 넘겨 서비스 JWT 로 교환합니다.
 *
 * @throws {KakaoLoginCancelled} 사용자가 취소한 경우
 */
export async function signInWithKakao(): Promise<KakaoTokens> {
  try {
    const token = await login();
    if (!token?.accessToken || !token?.refreshToken) {
      throw new Error('카카오 토큰을 받지 못했습니다.');
    }
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
    };
  } catch (error) {
    if (isCancelledError(error)) {
      throw new KakaoLoginCancelled();
    }
    throw error;
  }
}

/**
 * 카카오 세션 해제.
 * 서비스 로그아웃의 부가 작업이라 실패해도 흐름을 막지 않습니다.
 */
export async function signOutFromKakao(): Promise<void> {
  try {
    await logout();
  } catch {
    // 이미 로그아웃 상태이거나 SDK 초기화 전일 수 있습니다. 무시합니다.
  }
}
