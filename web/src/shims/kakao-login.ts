/**
 * @react-native-seoul/kakao-login 대체 — 웹에는 네이티브 SDK 가 없습니다.
 *
 * 예전에는 이 파일이 브라우저에서 직접 OAuth 를 돌렸습니다(팝업 → code →
 * kauth 토큰 교환). 지금은 그 흐름을 쓰지 않습니다.
 *
 * 이유: 이 카카오 앱은 [보안 > Client Secret] 이 켜져 있습니다. 시크릿 없이
 * code 를 토큰으로 바꾸면 카카오가 `invalid_client / KOE010` 으로 거절하고,
 * 시크릿은 브라우저에 내려줄 수 있는 값이 아닙니다. 그래서 교환은 서버가
 * 하고(카카오에 등록된 redirect_uri 도 서버 콜백입니다), 웹 로그인은
 * src/web/kakaoWebLogin.ts + src/overrides/authService.ts 가 담당합니다.
 *
 * 이 파일에는 로그인이 아닌 나머지(세션 해제)만 남습니다.
 */

/** 앱 코드가 참조하는 타입 — 웹에서 실제로 채워지지는 않습니다. */
export type KakaoOAuthToken = {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  scopes?: string[];
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
};

/**
 * kapi 는 CORS 를 열어주지 않습니다.
 * vite.config.ts 의 proxy 가 /kapi 를 카카오 서버로 중계합니다.
 */
const API_PROXY = '/kapi';

/**
 * 웹에서는 호출되지 않아야 합니다.
 *
 * 앱의 authService.loginWithKakao 가 이 함수를 부르는데, 웹에서는 그
 * authService 자체가 src/overrides/authService.ts 로 교체됩니다. 여기까지
 * 왔다면 오버라이드가 안 걸린 것이므로, 조용히 실패하지 않게 알려줍니다.
 */
export async function login(): Promise<KakaoOAuthToken> {
  throw new Error(
    '웹에서는 카카오 네이티브 로그인을 쓸 수 없습니다. ' +
      'vite.config.ts 의 moduleOverrides 에 authService 교체가 걸려 있는지 확인해주세요.',
  );
}

export const loginWithKakaoTalk = login;
export const loginWithKakaoAccount = login;

/**
 * 카카오 세션 해제.
 * 우리 서버의 로그아웃에 딸린 부가 작업이라, 실패해도 흐름을 막지 않습니다.
 * (앱의 signOutFromKakao 이 이미 try/catch 로 감싸고 있습니다)
 *
 * 서버 주도 로그인에서는 카카오 access token 이 브라우저에 없어 이 호출은
 * 사실상 아무 일도 하지 않습니다. 브라우저에 남은 kakao.com 세션까지 끊으려면
 * 서버가 카카오 로그아웃 URL 로 보내주는 별도 흐름이 필요합니다.
 */
export async function logout(): Promise<void> {
  await fetch(`${API_PROXY}/v1/user/logout`, { method: 'POST' }).catch(() => {});
}

export async function unlink(): Promise<void> {
  await fetch(`${API_PROXY}/v1/user/unlink`, { method: 'POST' }).catch(() => {});
}

export default { login, logout, unlink };
