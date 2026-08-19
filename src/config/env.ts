/**
 * .env 원본 값을 앱에서 쓰기 좋은 형태로 정규화한 설정 객체.
 * 앱 코드에서는 `@env` 를 직접 import 하지 말고 항상 이 파일을 통해 접근합니다.
 * (검증·기본값·타입 변환을 한 곳에 모으기 위함)
 */
import { API_BASE_URL, API_VERSION, API_TIMEOUT_MS } from '@env';

/** 끝의 슬래시를 제거해 경로를 이어붙일 때 `//` 가 생기지 않게 합니다. */
function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/** 값이 비어 있으면 즉시 실패시켜 설정 누락을 개발 중에 잡습니다. */
function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `[env] ${name} 가 비어 있습니다. .env 를 확인한 뒤 Metro 를 --reset-cache 로 재시작하세요.`,
    );
  }
  return trimmed;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/**
 * 스킴+호스트+포트만 남깁니다. (http://hj.tcs.local:3000/api → http://hj.tcs.local:3000)
 * 서버가 '/uploads/a.jpg' 같은 상대 경로를 내려줄 때 앞에 붙일 주소입니다.
 */
function originOf(url: string): string {
  const match = /^[a-z][a-z0-9+.-]*:\/\/[^/]+/i.exec(url);
  return match ? match[0] : stripTrailingSlash(url);
}

const baseUrl = stripTrailingSlash(required('API_BASE_URL', API_BASE_URL));
const version = required('API_VERSION', API_VERSION);

export const env = {
  /** 예: http://hj.tcs.local:3000/api/v1 */
  apiBaseUrl: `${baseUrl}/${version}`,
  /** 예: http://hj.tcs.local:3000 — 상대 경로를 절대 URL 로 만들 때 씁니다. */
  apiOrigin: originOf(baseUrl),
  apiTimeoutMs: toPositiveInt(API_TIMEOUT_MS, 15000),
} as const;
