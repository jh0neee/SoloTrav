/**
 * 서버 응답(DTO) → 앱 도메인 모델 변환.
 * 화면·서비스 코드가 서버 필드명 변화에 흔들리지 않도록 여기서 한 번 흡수합니다.
 */
import { ApiError } from './errors';
import type {
  AuthResponseDto,
  AuthUserDto,
  Envelope,
  KakaoAuthUrlDto,
  KakaoNativeConfigDto,
  UserMeDto,
} from './dto';
import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  KakaoNativeConfig,
  WithdrawalResult,
} from '../types/auth';

/** 공통 응답 봉투(`{ payload: {...} }`)를 한 겹 벗깁니다. */
export function unwrap<T extends object>(
  payload: Envelope<T> | undefined | null,
): T {
  if (!payload) {
    return {} as T;
  }
  const inner = payload.payload ?? payload.data;
  if (inner && typeof inner === 'object') {
    return inner as T;
  }
  return payload as T;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function toAuthUser(dto: AuthUserDto | undefined): AuthUser | null {
  if (!dto) {
    return null;
  }
  const id = dto.id ?? dto.userId;
  if (id === undefined || id === null) {
    return null;
  }
  return {
    id: String(id),
    // 표시용 기본값을 여기서 만들지 않습니다. "서버가 안 준 것"과 "서버가 준 값"을
    // 섞어버리면 화면에서 구분할 수 없어져서, 비었으면 null 그대로 넘깁니다.
    nickname: firstString(dto.nickname, dto.nickName, dto.name),
    email: firstString(dto.email),
    profileImageUrl: firstString(
      dto.profileImageUrl,
      dto.profile_image_url,
      dto.profileImage,
    ),
  };
}

/** 로그인/재발급 응답 → 세션. accessToken 이 없으면 실패로 간주합니다. */
export function toAuthSession(payload: unknown): AuthSession {
  const dto = unwrap(payload as Envelope<AuthResponseDto>);

  // 로그인 응답은 토큰을 `tokens` 아래에 한 겹 더 넣어 내려줍니다.
  // 최상위 평평한 형태는 아직 못 본 /auth/refresh 응답을 위한 fallback 입니다.
  const tokenSource = dto.tokens ?? dto;

  const accessToken = firstString(
    tokenSource.accessToken,
    tokenSource.access_token,
    tokenSource.token,
  );
  if (!accessToken) {
    // 화면에는 메시지만 보이고 응답 원본은 ApiError 안에 갇혀 버려서,
    // 개발 중에는 실제로 뭐가 내려왔는지 Metro 콘솔에 찍어줍니다.
    // (필드명이 다른 건지, JSON 이 아닌 게 온 건지 여기서 바로 갈립니다)
    if (__DEV__) {
      console.warn(
        '[toAuthSession] accessToken 을 찾지 못했습니다. 응답 원본:',
        typeof payload,
        JSON.stringify(payload, null, 2),
      );
    }
    throw new ApiError('로그인 응답에 accessToken 이 없습니다.', {
      payload,
    });
  }

  const tokens: AuthTokens = {
    accessToken,
    refreshToken: firstString(
      tokenSource.refreshToken,
      tokenSource.refresh_token,
    ),
  };

  return { tokens, user: toAuthUser(dto.user ?? dto.profile) };
}

/**
 * GET /users/me 응답 → 사용자.
 * 사용자 객체를 user/profile 로 한 겹 더 감싸 주는 경우까지 받아둡니다.
 */
export function toMeUser(payload: unknown): AuthUser {
  const dto = unwrap(payload as Envelope<UserMeDto>);
  const user = toAuthUser(dto.user ?? dto.profile ?? dto);
  if (!user) {
    throw new ApiError('내 정보 응답을 해석할 수 없습니다.', { payload });
  }
  return user;
}

export function toKakaoNativeConfig(payload: unknown): KakaoNativeConfig {
  const dto = unwrap(payload as Envelope<KakaoNativeConfigDto>);
  const scopes = Array.isArray(dto.scopes)
    ? dto.scopes
    : typeof dto.scope === 'string'
    ? dto.scope.split(/[\s,]+/).filter(Boolean)
    : [];

  return {
    nativeAppKey: firstString(dto.nativeAppKey, dto.native_app_key, dto.appKey),
    scopes,
  };
}

export function toKakaoAuthUrl(payload: unknown): string {
  const dto = unwrap(payload as Envelope<KakaoAuthUrlDto>);
  const url = firstString(dto.authUrl, dto.auth_url, dto.url);
  if (!url) {
    throw new ApiError('인가 URL 응답을 해석할 수 없습니다.', { payload });
  }
  return url;
}

export type ParsedTermsInfo = {
  version: string | null;
  url: string | null;
  raw: unknown;
};

export function toTermsInfo(payload: unknown): ParsedTermsInfo {
  const unwrapped = unwrap(payload as Envelope<Record<string, unknown>>);

  function findHex64(node: unknown): string | null {
    if (!node) return null;
    if (typeof node === 'string' && /^[a-f0-9]{64}$/i.test(node.trim())) {
      return node.trim();
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findHex64(item);
        if (found) return found;
      }
    } else if (typeof node === 'object') {
      for (const val of Object.values(node as Record<string, unknown>)) {
        const found = findHex64(val);
        if (found) return found;
      }
    }
    return null;
  }

  function findUrl(node: unknown): string | null {
    if (!node) return null;
    if (typeof node === 'string' && /^https?:\/\//i.test(node.trim())) {
      return node.trim();
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findUrl(item);
        if (found) return found;
      }
    } else if (typeof node === 'object') {
      for (const val of Object.values(node as Record<string, unknown>)) {
        const found = findUrl(val);
        if (found) return found;
      }
    }
    return null;
  }

  const rec = (unwrapped && typeof unwrapped === 'object' ? unwrapped : {}) as Record<string, unknown>;
  const directVersion = rec.version ?? rec.termsVersion ?? rec.hash ?? rec.documentHash;
  const version = (typeof directVersion === 'string' && /^[a-f0-9]{64}$/i.test(directVersion.trim()))
    ? directVersion.trim()
    : findHex64(unwrapped);

  const directUrl = rec.url ?? rec.termsUrl ?? rec.link ?? rec.documentUrl;
  const url = (typeof directUrl === 'string' && /^https?:\/\//i.test(directUrl.trim()))
    ? directUrl.trim()
    : findUrl(unwrapped);

  return { version, url, raw: payload };
}

/** 서버가 준 ISO 문자열 → Date. 형식이 어긋나면 null 로 두고 화면에서 숨깁니다. */
function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** DELETE /auth/me 응답 → 탈퇴 예약 결과 (봉투 없이 평평하게 내려옵니다) */
export function toWithdrawalResult(payload: unknown): WithdrawalResult {
  const dto = (payload ?? {}) as Record<string, unknown>;
  return {
    requestedAt: toDate(dto.requestedAt),
    purgeAfter: toDate(dto.purgeAfter),
  };
}
