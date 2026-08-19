/**
 * 앱 전역 API 클라이언트.
 *
 * 요청 인터셉터  : 저장된 access token 을 Authorization 헤더에 자동으로 붙입니다.
 * 응답 인터셉터  : 401 을 받으면 토큰을 한 번 재발급한 뒤 원 요청을 재시도하고,
 *                 실패하면 ApiError 로 정규화해서 던집니다.
 *
 * 인증이 필요 없는 요청도 이 인스턴스를 그대로 쓰면 됩니다(토큰이 없으면 헤더가
 * 붙지 않을 뿐입니다).
 */
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { createHttpClient } from './http';
import { ENDPOINTS } from './endpoints';
import { toApiError } from './errors';
import { refreshSession } from './sessionRefresh';
import { tokenStorage } from '../storage/tokenStorage';

/** 재시도는 요청당 한 번만 — 무한 루프 방지 플래그 */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const apiClient = createHttpClient();

apiClient.interceptors.request.use(config => {
  const accessToken = tokenStorage.get()?.accessToken;
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

// 개발 중에는 어떤 요청이 어떤 상태로 돌아왔는지 한 줄로 남깁니다.
// "엉뚱한 주소로 갔는지 / 200 인데 본문이 이상한지" 를 구분하는 용도입니다.
if (__DEV__) {
  apiClient.interceptors.response.use(
    response => {
      console.log(
        `[api] ${response.config.method?.toUpperCase()} ${response.config.url} → ${
          response.status
        }`,
      );
      return response;
    },
    (error: AxiosError) => {
      console.log(
        `[api] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${
          error.response?.status ?? error.code ?? 'no response'
        }`,
      );
      return Promise.reject(error);
    },
  );
}

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // 재발급 요청 자체와 로그아웃은 재시도 대상에서 뺍니다.
    // 로그아웃은 이미 토큰을 지운 뒤에 나가므로, 여기서 재발급을 시도하면
    // "세션 만료" 콜백이 떠서 정상 로그아웃인데 만료 안내가 뜹니다.
    const skipRetryPaths: string[] = [ENDPOINTS.refresh(), ENDPOINTS.logout()];

    const canRetry =
      status === 401 &&
      !!config &&
      !config._retried &&
      !skipRetryPaths.includes(config.url ?? '');

    if (canRetry) {
      config._retried = true;
      const tokens = await refreshSession();
      if (tokens) {
        config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
        return apiClient(config);
      }
    }

    return Promise.reject(toApiError(error));
  },
);
