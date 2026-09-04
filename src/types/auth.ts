/**
 * 인증 도메인 모델.
 * 서버 응답(DTO)이 아니라 앱 안에서 돌아다니는 형태입니다.
 * DTO → 도메인 변환은 src/api/mappers.ts 가 담당합니다.
 */

/** 우리 서비스가 발급한 JWT 쌍 */
export type AuthTokens = {
  accessToken: string;
  refreshToken: string | null;
};

/**
 * 로그인한 사용자.
 * 서버가 nickname/email/profileImage 를 null 로 내려주는 경우가 있어
 * id 를 뺀 나머지는 전부 nullable 입니다.
 * 표시용 기본값('여행자' 등)은 여기가 아니라 user/userStore 에서 채웁니다.
 */
export type AuthUser = {
  id: string;
  nickname: string | null;
  email: string | null;
  profileImageUrl: string | null;
};

/** 로그인 결과 = 토큰 + 사용자 */
export type AuthSession = {
  tokens: AuthTokens;
  user: AuthUser | null;
};

/** GET /auth/kakao/native/config 결과 */
export type KakaoNativeConfig = {
  /** 서버에 설정된 카카오 네이티브 앱 키 (네이티브 설정 검증용) */
  nativeAppKey: string | null;
  /** 서버가 요구하는 추가 동의 항목 */
  scopes: string[];
};

/** 인증 상태 머신 */
export type AuthStatus =
  | 'restoring'
  | 'authenticated'
  | 'unauthenticated'
  | 'guest';

/** DELETE /auth/me 응답 — 회원 탈퇴 예약 결과 */
export type WithdrawalResult = {
  /** 탈퇴를 접수한 시각 */
  requestedAt: Date | null;
  /** 이 시각 이후 정기 작업에서 데이터가 영구 삭제됩니다 */
  purgeAfter: Date | null;
};
