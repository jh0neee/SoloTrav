/**
 * 액세스 토큰 재발급 (POST /auth/refresh).
 *
 * client.ts 의 401 인터셉터와 authService 양쪽에서 쓰이며,
 * 동시에 여러 요청이 401 을 받아도 재발급은 한 번만 나가도록(single flight)
 * 진행 중인 Promise 를 공유합니다.
 *
 * 인터셉터가 이 모듈을 쓰므로 apiClient 를 import 하면 순환 참조가 되어,
 * 반드시 인터셉터 없는 plainClient 로 요청합니다.
 */
import { ENDPOINTS } from './endpoints';
import { plainClient } from './http';
import { toAuthSession } from './mappers';
import { tokenStorage } from '../storage/tokenStorage';
import type { AuthTokens } from '../types/auth';
import type { RefreshTokenRequest } from './dto';

let inFlight: Promise<AuthTokens | null> | null = null;

/** 재발급이 최종 실패했을 때(=재로그인 필요) 알림받을 콜백. authService 가 등록합니다. */
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

async function requestRefresh(): Promise<AuthTokens | null> {
  const refreshToken = tokenStorage.get()?.refreshToken;
  if (!refreshToken) {
    return null;
  }

  const body: RefreshTokenRequest = { refreshToken };
  const { data } = await plainClient.post(ENDPOINTS.refresh(), body);
  const session = toAuthSession(data);

  // 서버가 refresh token 을 회전시키지 않으면 기존 값을 유지합니다.
  const tokens: AuthTokens = {
    accessToken: session.tokens.accessToken,
    refreshToken: session.tokens.refreshToken ?? refreshToken,
  };
  await tokenStorage.save(tokens);
  return tokens;
}

/**
 * 토큰 재발급을 시도합니다.
 * @returns 새 토큰. 재발급이 불가능하면 null (이 경우 저장된 토큰은 비워집니다)
 */
export function refreshSession(): Promise<AuthTokens | null> {
  if (inFlight) {
    return inFlight;
  }

  const hadRefreshToken = !!tokenStorage.get()?.refreshToken;
  inFlight = requestRefresh()
    .catch(() => null)
    .then(async tokens => {
      if (!tokens) {
        await tokenStorage.clear();
        if (hadRefreshToken) {
          sessionExpiredHandler?.();
        }
      }
      return tokens;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
