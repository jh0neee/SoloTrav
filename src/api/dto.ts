/**
 * 서버 응답 원형(DTO) 타입.
 *
 * 서버가 camelCase / snake_case 중 무엇으로 내려주는지, 응답을 `data` 로 한 번
 * 감싸는지가 확정되지 않아 두 형태를 모두 선택적으로 선언해두었습니다.
 * 실제 스펙이 확정되면 쓰지 않는 쪽을 지우고 mappers.ts 의 fallback 도 함께
 * 정리하면 됩니다.
 */

/**
 * 서버 공통 응답 봉투.
 *
 * 실제 확인된 형태(POST /auth/kakao/native, 2026-08-06):
 *   { payload: {...}, meta, code: 'OK', message: 'SUCCESS',
 *     status: 201, error: null, ok: true, sort, summary }
 *
 * 알맹이는 `payload` 에 들어옵니다. `data` 는 다른 엔드포인트가 그 이름을 쓸
 * 경우를 대비해 남겨둔 fallback 입니다.
 */
export type Envelope<T> = T & { payload?: T; data?: T };

export type AuthTokensDto = {
  accessToken?: string;
  access_token?: string;
  token?: string;

  refreshToken?: string;
  refresh_token?: string;
};

export type AuthUserDto = {
  id?: string | number;
  userId?: string | number;

  /** 카카오 회원번호. 지금은 쓰지 않지만 서버가 함께 내려줍니다. */
  kakaoId?: string | number;

  nickname?: string;
  nickName?: string;
  name?: string;

  email?: string | null;

  profileImageUrl?: string | null;
  profile_image_url?: string | null;
  profileImage?: string | null;
};

/**
 * POST /auth/kakao/native, GET /auth/kakao/callback, POST /auth/refresh 응답
 * (봉투를 벗긴 뒤의 알맹이).
 *
 * 확인된 형태는 `{ user: {...}, tokens: { accessToken, refreshToken } }` 입니다.
 * 최상위에 토큰이 평평하게 오는 형태(AuthTokensDto)도 함께 받아둔 이유는
 * /auth/refresh 응답을 아직 못 봤기 때문입니다.
 */
export type AuthResponseDto = AuthTokensDto & {
  tokens?: AuthTokensDto;
  user?: AuthUserDto;
  profile?: AuthUserDto;
};

/** GET /auth/kakao/native/config 응답 */
export type KakaoNativeConfigDto = {
  nativeAppKey?: string;
  native_app_key?: string;
  appKey?: string;
  scopes?: string[];
  scope?: string;
};

/** GET /auth/kakao/auth-url 응답 */
export type KakaoAuthUrlDto = {
  authUrl?: string;
  auth_url?: string;
  url?: string;
};

/**
 * POST /auth/kakao/native 요청 바디.
 * 여기 담기는 두 토큰은 우리 서비스 JWT 가 아니라 **카카오가 발급한** 토큰입니다.
 * 서버가 카카오에 검증을 걸고, 그 대가로 서비스 JWT 를 내려줍니다.
 */
export type KakaoNativeLoginRequest = {
  accessToken: string;
  refreshToken: string;
};

/** POST /auth/refresh, POST /auth/logout 요청 바디 */
export type RefreshTokenRequest = {
  refreshToken: string;
};

/**
 * GET /users/me 응답(봉투를 벗긴 뒤).
 * 로그인 응답의 user 와 같은 모양으로 보고 AuthUserDto 를 재사용합니다.
 * 사용자 정보를 한 겹 더 감싸 내려주는 경우도 있어 user/profile 도 함께 봅니다.
 */
export type UserMeDto = AuthUserDto & {
  user?: AuthUserDto;
  profile?: AuthUserDto;
};

/**
 * 여행 취향 프롬프트 (GET/POST 공통).
 *
 * 카테고리 8개는 스펙상 자유 형식 객체(`{}`)라 안쪽 필드를 서버가 정해두지
 * 않았습니다. 그래서 앱이 "필드 id → 답변" 맵을 그대로 넣고, 나중에 모양이
 * 바뀌면 알아볼 수 있도록 schemaVersion 을 함께 올립니다.
 */
export type PreferenceCategoryDto = Record<
  string,
  string | string[] | number | null
>;

export type TravelPreferenceDto = {
  schemaVersion?: string;
  trip?: PreferenceCategoryDto;
  mobility?: PreferenceCategoryDto;
  tempo?: PreferenceCategoryDto;
  avoid?: PreferenceCategoryDto;
  activity?: PreferenceCategoryDto;
  food?: PreferenceCategoryDto;
  stay?: PreferenceCategoryDto;
  budget?: PreferenceCategoryDto;
  freeText?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * GET /users/me/travel-badges 응답의 배지 한 개.
 *
 * 응답을 아직 실측하지 못해 이름·획득 여부에 흔히 쓰이는 필드명을 함께 받아둡니다.
 * 배열이 `{ badges: [...] }` / `{ items: [...] }` 로 감싸 오는 경우도 있어
 * mapper 에서 함께 처리합니다.
 */
export type TravelBadgeDto = {
  id?: string | number;
  code?: string;
  badgeId?: string | number;

  name?: string;
  title?: string;
  badgeName?: string;

  description?: string;
  desc?: string;

  /** 서버가 아이콘 키를 준다면 사용하고, 없으면 앱이 정합니다. */
  icon?: string;

  earned?: boolean;
  isEarned?: boolean;
  acquired?: boolean;
  /** 획득 일시. 값이 있으면 획득한 것으로 봅니다. */
  earnedAt?: string | null;
  acquiredAt?: string | null;
};

/** 배지 목록을 한 겹 더 감싸 내려주는 경우 대응 */
export type TravelBadgeListDto = {
  badges?: TravelBadgeDto[];
  items?: TravelBadgeDto[];
  list?: TravelBadgeDto[];
};

/** POST /users/me/travel-preferences 요청 바디 (모든 키를 채워 보냅니다) */
export type TravelPreferenceRequest = Required<
  Omit<TravelPreferenceDto, 'freeText' | 'meta'>
> & {
  freeText: string;
  meta: Record<string, unknown>;
};
