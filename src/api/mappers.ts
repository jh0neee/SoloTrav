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
} from './dto';
import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  KakaoNativeConfig,
} from '../types/auth';

/** 공통 응답 봉투(`{ payload: {...} }`)를 한 겹 벗깁니다. */
function unwrap<T extends object>(payload: Envelope<T> | undefined | null): T {
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
    nickname: firstString(dto.nickname, dto.nickName, dto.name) ?? '여행자',
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
