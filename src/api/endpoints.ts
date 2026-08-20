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

  // 관광정보 (한국관광공사 TourAPI 프록시)
  /**
   * 위치기반 관광정보 조회: /locationBasedList2
   * 좌표(mapX/mapY)와 반경(radius, m)으로 주변 콘텐츠를 가져옵니다.
   */
  tourLocationBased: (params: Record<string, QueryValue>) =>
    withQuery(`/travel/information/location-based-list`, params),
  /** 키워드 검색: /searchKeyword2 */
  tourSearchKeyword: (params: Record<string, QueryValue>) =>
    withQuery(`/travel/information/search-keyword`, params),
  /** 행사정보 조회: /searchFestival2 */
  tourSearchFestival: (params: Record<string, QueryValue>) =>
    withQuery(`/travel/information/search-festival`, params),
  /** 공통정보 조회(개요·주소·좌표): /detailCommon2 */
  tourDetailCommon: (params: Record<string, QueryValue>) =>
    withQuery(`/travel/information/detail-common`, params),
  /** 소개정보 조회(운영시간·휴무일·주차): /detailIntro2 */
  tourDetailIntro: (params: Record<string, QueryValue>) =>
    withQuery(`/travel/information/detail-intro`, params),
  /** 이미지정보 조회: /detailImage2 */
  tourDetailImage: (params: Record<string, QueryValue>) =>
    withQuery(`/travel/information/detail-image`, params),

  // 관광사진갤러리
  /**
   * 관광사진 키워드 검색: /gallerySearchList1
   * 좌표 파라미터가 없어 키워드(장소명·지역명)로만 찾을 수 있습니다.
   */
  gallerySearch: (params: Record<string, QueryValue>) =>
    withQuery(`/travel/photozone/gallery-search-list`, params),

  // 지역안전지수 (행정안전부)
  /**
   * 시도명으로 지역안전지수 조회 — 해당 시도의 SIDO 행 + 시군구 행이 함께 옵니다.
   *
   * 목록 엔드포인트(`/travel/regional-safety`)도 있지만 파라미터 조합에 따라
   * 500 이 나거나 빈 배열을 돌려주는 상태라, 안정적으로 동작하는 이쪽만 씁니다.
   */
  regionalSafetyBySido: (params: { sido: string; baseYear?: string }) =>
    withQuery(`/travel/regional-safety/sido`, params),

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
