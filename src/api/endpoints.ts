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

  // 마이페이지
  /** 내 정보 조회 */
  me: () => `/users/me`,
  /** 내 여행 취향 프롬프트 조회(GET) / 등록·편집(POST) */
  travelPreferences: () => `/users/me/travel-preferences`,
  /** 내 여행 배지 조회 */
  travelBadges: () => `/users/me/travel-badges`,

  // 여행 기록
  /** 여행 기록 조회(GET) / 등록(POST) */
  travelRecords: () => `/travel-records`,
  /** 내 여행 기록 조회 */
  myTravelRecords: () => `/travel-records/me`,
  /** 기록 수정(PATCH) / 삭제(DELETE) */
  travelRecord: (recordId: string) =>
    `/travel-records/${encodeURIComponent(recordId)}`,
  /** 기록 이미지 업로드 (multipart/form-data) */
  travelRecordImages: (recordId: string) =>
    `/travel-records/${encodeURIComponent(recordId)}/images`,

  // 피드 좋아요
  /** 기록 좋아요(POST) / 취소(DELETE) */
  recordLikes: (recordId: string) =>
    `/travel-records/${encodeURIComponent(recordId)}/likes`,

  // SOS
  /** 현위치 기준 가장 가까운 안전 시설 조회 */
  safetyFacilities: (params: {
    latitude: string;
    longitude: string;
    limit?: number;
  }) => withQuery(`/sos/safety-facilities`, params),

  // 댓글
  /** 기록의 댓글 조회(GET) / 등록(POST) */
  recordComments: (recordId: string) =>
    `/travel-records/${encodeURIComponent(recordId)}/comments`,
  /** 댓글 수정(PATCH) / 삭제(DELETE) — 기록 id 가 아니라 댓글 id 기준입니다 */
  comment: (commentId: string) =>
    `/travel-records/comments/${encodeURIComponent(commentId)}`,
  /** 댓글 좋아요(POST) / 취소(DELETE) */
  commentLikes: (commentId: string) =>
    `/travel-records/comments/${encodeURIComponent(commentId)}/likes`,
} as const;
