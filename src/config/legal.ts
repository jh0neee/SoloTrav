/** 법적 고지 문서와 약관 동의 화면 설정. */

export const PRIVACY_POLICY_URL =
  'https://narrow-currant-57e.notion.site/3ce4e03f580580c08babf260951894b6';

// 이용약관 문서가 확정되면 공개 URL을 넣습니다. 백엔드 연동 뒤에는 로그인
// 응답의 현재 약관 URL과 버전을 기준으로 대체할 예정입니다.
export const TERMS_OF_SERVICE_URL =
  'https://app.notion.com/p/3d04e03f580580fd915ee9cf107483b4';

/** 현재 서비스 이용약관 최신 버전 (GET /terms/service 기준 기본값) */
export const CURRENT_TERMS_VERSION =
  '7973f2c0fb603d1afc3f29f03766511c5514653e1dad88aec94b7f588093b354';

/**
 * 약관 화면 강제 노출 플래그.
 * 실제 API 연동이 완료되었으므로 기본값은 false이며,
 * 사용자의 실제 약관 동의 상태(GET /auth/terms)에 따라 노출됩니다.
 */
export const FORCE_TERMS_AGREEMENT_PREVIEW = false;
