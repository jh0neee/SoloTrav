/** 법적 고지 문서와 약관 동의 화면 설정. */

export const PRIVACY_POLICY_URL =
  'https://narrow-currant-57e.notion.site/3ce4e03f580580c08babf260951894b6';

// 이용약관 문서가 확정되면 공개 URL을 넣습니다. 백엔드 연동 뒤에는 로그인
// 응답의 현재 약관 URL과 버전을 기준으로 대체할 예정입니다.
export const TERMS_OF_SERVICE_URL =
  'https://app.notion.com/p/3d04e03f580580fd915ee9cf107483b4';

/** 기존 가입자도 UI를 확인할 수 있도록 개발 빌드에서만 약관 화면을 노출합니다. */
export const FORCE_TERMS_AGREEMENT_PREVIEW = __DEV__;
