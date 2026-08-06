/**
 * API 경로(라우터) 중앙 관리.
 * 서버 라우트가 바뀌면 이 파일만 수정하면 됩니다.
 * 경로는 baseURL(env.apiBaseUrl = .../api/v1) 기준의 상대 경로입니다.
 */

type QueryValue = string | number | boolean | undefined | null;

/** undefined/null 인 값은 빼고 쿼리스트링을 붙입니다. */
function withQuery(path: string, params?: Record<string, QueryValue>): string {
  if (!params) {
    return path;
  }
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );
  if (entries.length === 0) {
    return path;
  }
  const query = entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
  return `${path}?${query}`;
}

export const ENDPOINTS = {
  // 인증 — 카카오
  /** Kakao Native 앱 설정 조회 */
  kakaoNativeConfig: () => `/auth/kakao/native/config`,
  /** Kakao 웹 OAuth 인가 URL 조회 */
  kakaoAuthUrl: (params?: { redirectUri?: string; state?: string }) =>
    withQuery(`/auth/kakao/auth-url`, params),
  /** Kakao 웹 OAuth callback 로그인 */
  kakaoCallback: (params: { code: string; state?: string }) =>
    withQuery(`/auth/kakao/callback`, params),
  /** Kakao Native SDK access token 로그인 */
  kakaoNativeLogin: () => `/auth/kakao/native`,

  // 인증 — 세션
  /** 서비스 refresh token 으로 JWT 재발급 */
  refresh: () => `/auth/refresh`,
  /** 서비스 refresh token 폐기 */
  logout: () => `/auth/logout`,
} as const;
