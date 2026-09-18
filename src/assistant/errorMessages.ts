/**
 * AI 샛별이 에러 안내 문구 생성 및 시간 포맷 유틸리티.
 *
 * 백엔드 앱 표시 규칙:
 * 1. 일일 한도 초과: HTTP 403, code=AI_USAGE_LIMIT_EXCEEDED
 *    -> "호출할 수 있는 AI 한도를 초과했습니다. 초기화까지 약 1시간 20분 남았습니다."
 * 2. HTTP 요청 빈도 제한: HTTP 429, Retry-After 헤더
 *    -> "호출할 수 있는 AI 한도를 초과했습니다. 초기화까지 약 1분 남았습니다."
 * 3. 제공사 호출 제한·크레딧 부족·연결 오류: status=FAILED, errorCode=AI_PROVIDER_UNAVAILABLE
 *    -> "현재 요청량이 많아 AI를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요."
 * 4. 답변 생성 실패: status=FAILED, errorCode=AI_RESPONSE_FAILED
 *    -> "AI 답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."
 * 5. 브로커 연결 실패 또는 응답 시간 초과: errorCode=AI_SERVICE_UNAVAILABLE 또는 AI_RESPONSE_TIMEOUT
 *    -> "현재 요청량이 많아 AI를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요."
 */

import { ApiError, toApiError } from '../api/errors';

export const MSG_PROVIDER_UNAVAILABLE =
  '현재 요청량이 많아 AI를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.';
export const MSG_RESPONSE_FAILED =
  'AI 답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.';
export const MSG_SERVICE_UNAVAILABLE =
  '현재 요청량이 많아 AI를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.';

/**
 * 남은 초(seconds)를 "약 1시간 20분", "약 1분", "약 30초" 형태로 변환합니다.
 */
export function formatRemainingTime(seconds: number): string {
  const sec = Math.max(1, Math.round(seconds));
  if (sec >= 3600) {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return minutes > 0 ? `약 ${hours}시간 ${minutes}분` : `약 ${hours}시간`;
  }
  if (sec >= 60) {
    const minutes = Math.ceil(sec / 60);
    return `약 ${minutes}분`;
  }
  return `약 ${sec}초`;
}

/**
 * 한국시간(KST, UTC+9) 기준 다음 자정(00:00)까지 남은 초를 계산합니다.
 */
export function getSecondsUntilKstMidnight(): number {
  const now = new Date();
  // UTC 기준 ms에 KST 9시간을 더합니다.
  const nowUtc = now.getTime() + now.getTimezoneOffset() * 60000;
  const nowKst = new Date(nowUtc + 9 * 3600000);

  const midnightKst = new Date(nowKst);
  midnightKst.setHours(24, 0, 0, 0);

  return Math.max(0, Math.floor((midnightKst.getTime() - nowKst.getTime()) / 1000));
}

export type AssistantErrorResolution = {
  text: string;
  isLimitExceeded: boolean;
  isRateLimited: boolean;
};

/**
 * 에러 객체(ApiError, AxiosError, ChatResult error 등)를 분석하여
 * 사용자에게 보여줄 적절한 안내 문구와 플래그를 도출합니다.
 */
export function resolveAssistantErrorMessage(error: unknown): AssistantErrorResolution {
  const apiError = toApiError(error);
  const status = apiError.status;
  const code = apiError.code;
  const payload = apiError.payload as Record<string, unknown> | undefined;

  // 1. 사용자 일일 한도 초과 (HTTP 403, code=AI_USAGE_LIMIT_EXCEEDED)
  if (status === 403 || code === 'AI_USAGE_LIMIT_EXCEEDED') {
    // 서버가 이미 초기화 시간을 포함한 문구를 보낸 경우 우선 사용
    if (
      apiError.message &&
      apiError.message !== 'AI_USAGE_LIMIT_EXCEEDED' &&
      !apiError.message.includes('Forbidden') &&
      !apiError.message.includes('403') &&
      apiError.message.includes('초기화')
    ) {
      return {
        text: apiError.message,
        isLimitExceeded: true,
        isRateLimited: false,
      };
    }

    let remainingSeconds: number | null = null;
    if (payload && typeof payload.resetAfterSeconds === 'number') {
      remainingSeconds = payload.resetAfterSeconds;
    } else if (payload && typeof payload.resetsAt === 'string') {
      const resetsAtMs = Date.parse(payload.resetsAt);
      if (Number.isFinite(resetsAtMs)) {
        remainingSeconds = Math.max(0, Math.floor((resetsAtMs - Date.now()) / 1000));
      }
    } else if (apiError.retryAfterMs) {
      remainingSeconds = Math.floor(apiError.retryAfterMs / 1000);
    }

    if (remainingSeconds === null || remainingSeconds <= 0) {
      remainingSeconds = getSecondsUntilKstMidnight();
    }

    const timeText = formatRemainingTime(remainingSeconds);
    return {
      text: `호출할 수 있는 AI 한도를 초과했습니다. 초기화까지 ${timeText} 남았습니다.`,
      isLimitExceeded: true,
      isRateLimited: false,
    };
  }

  // 2. HTTP 요청 빈도 제한 (HTTP 429)
  if (status === 429) {
    if (
      apiError.message &&
      !apiError.message.includes('429') &&
      apiError.message.includes('초기화')
    ) {
      return {
        text: apiError.message,
        isLimitExceeded: false,
        isRateLimited: true,
      };
    }

    const seconds = apiError.retryAfterMs
      ? Math.floor(apiError.retryAfterMs / 1000)
      : 60;
    const timeText = formatRemainingTime(seconds);
    return {
      text: `호출할 수 있는 AI 한도를 초과했습니다. 초기화까지 ${timeText} 남았습니다.`,
      isLimitExceeded: false,
      isRateLimited: true,
    };
  }

  // 3. 제공사 호출 제한 / 크레딧 부족 / 연결 오류
  if (code === 'AI_PROVIDER_UNAVAILABLE') {
    return {
      text: MSG_PROVIDER_UNAVAILABLE,
      isLimitExceeded: false,
      isRateLimited: false,
    };
  }

  // 4. 답변 생성 실패
  if (code === 'AI_RESPONSE_FAILED') {
    return {
      text: MSG_RESPONSE_FAILED,
      isLimitExceeded: false,
      isRateLimited: false,
    };
  }

  // 5. 브로커 연결 실패 또는 응답 시간 초과
  if (code === 'AI_SERVICE_UNAVAILABLE' || code === 'AI_RESPONSE_TIMEOUT') {
    return {
      text: MSG_SERVICE_UNAVAILABLE,
      isLimitExceeded: false,
      isRateLimited: false,
    };
  }

  // 서버가 준 메시지가 일반적인 텍스트이면 우선 반영
  if (
    apiError.message &&
    !apiError.isNetworkError &&
    !apiError.message.includes('알 수 없는') &&
    !apiError.message.includes('Request failed') &&
    !apiError.message.includes('404') &&
    !apiError.message.includes('500')
  ) {
    return {
      text: apiError.message,
      isLimitExceeded: false,
      isRateLimited: false,
    };
  }

  // 기본 일시적 장애 안내
  return {
    text: MSG_SERVICE_UNAVAILABLE,
    isLimitExceeded: false,
    isRateLimited: false,
  };
}

