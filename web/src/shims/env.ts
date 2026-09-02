/**
 * '@env' 대체 — 앱은 react-native-dotenv 로 .env 값을 읽습니다.
 * 웹에서는 Vite 의 import.meta.env 에서 같은 이름으로 꺼내 넘겨줍니다.
 *
 * 값은 web/.env 에서 VITE_ 접두사로 관리합니다.
 * (앱의 저장소 루트의 .env 와는 별개입니다 — 웹은 프록시 주소를 써야 해서
 *  API 주소가 서로 다릅니다)
 */

/**
 * API 주소를 **절대 URL** 로 만들어 돌려줍니다.
 *
 * 왜 그냥 '/api' 를 넘기면 안 되는가:
 * 앱의 config/env.ts 는 이 값에서 apiOrigin(스킴+호스트)을 뽑아내, 서버가 준
 * '/uploads/a.jpg' 같은 상대 경로 이미지 앞에 붙입니다. 상대 경로를 그대로 주면
 * apiOrigin 이 '/api' 가 되어 이미지 주소가 '/api/uploads/...' 로 깨집니다.
 * 그래서 여기서 현재 페이지 주소를 붙여 'http://localhost:5173/api' 로 만듭니다.
 * (요청은 vite.config.ts 의 proxy 가 실제 서버로 중계합니다)
 */
function resolveBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? '/api').trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    return raw;
  }
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${window.location.origin}${path}`;
}

export const API_BASE_URL = resolveBaseUrl();
export const API_VERSION = import.meta.env.VITE_API_VERSION ?? 'v1';
export const API_TIMEOUT_MS = import.meta.env.VITE_API_TIMEOUT_MS ?? '15000';

/**
 * 앱의 config/kakao.ts 가 이 이름으로 가져가 **카카오맵 appkey** 로 씁니다.
 * 이름과 달리 실제로 필요한 건 JavaScript 키입니다.
 * 로그인(OAuth)에 쓰는 REST API 키는 shims/kakao-login.ts 가 따로 읽습니다.
 */
export const KAKAO_LOGIN_REST_API_KEY =
  import.meta.env.VITE_KAKAO_JS_KEY ?? '';
