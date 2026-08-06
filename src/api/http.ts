/**
 * axios 인스턴스 생성기.
 *
 * - `createHttpClient()` : 인터셉터가 붙지 않은 순수 인스턴스
 * - `plainClient`        : 토큰 재발급처럼 인터셉터를 타면 안 되는 요청 전용
 *
 * 인터셉터가 붙은 실제 사용 인스턴스는 ./client.ts 의 `apiClient` 입니다.
 */
import axios, { type AxiosInstance } from 'axios';
import { env } from '../config/env';
import { userAgent } from '../config/userAgent';

export function createHttpClient(): AxiosInstance {
  return axios.create({
    baseURL: env.apiBaseUrl,
    timeout: env.apiTimeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // 카카오 네이티브 로그인은 user-agent 를 필수 헤더로 요구합니다.
      // 특정 요청만 챙기면 빠뜨리기 쉬워 모든 요청에 기본으로 실어 보냅니다.
      'User-Agent': userAgent,
    },
  });
}

/**
 * 인터셉터 없는 인스턴스.
 * 재발급 요청이 401 을 받으면 다시 재발급을 시도하는 무한 루프를 막기 위해
 * apiClient 와 분리했습니다.
 */
export const plainClient = createHttpClient();
