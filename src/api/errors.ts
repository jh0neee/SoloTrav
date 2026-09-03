/**
 * 어떤 원인(axios / 네트워크 / SDK)으로 실패했든 화면에서는 ApiError 하나만
 * 다루면 되도록 정규화합니다.
 */
import axios from 'axios';

export class ApiError extends Error {
  /** HTTP 상태 코드. 네트워크 실패 등 응답이 없으면 undefined */
  readonly status?: number;
  /** 서버가 내려준 에러 코드 (있을 때) */
  readonly code?: string;
  /** 서버 응답 원본 — 디버깅용 */
  readonly payload?: unknown;
  /** 서버에 닿지 못한 경우(오프라인·DNS·타임아웃) */
  readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      payload?: unknown;
      isNetworkError?: boolean;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.payload = options.payload;
    this.isNetworkError = options.isNetworkError ?? false;
    // 트랜스파일 환경에서 instanceof 가 깨지지 않도록 프로토타입을 복구합니다.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** 액세스 토큰 만료·무효 */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 리소스 충돌 (구버전 약관 동의 등) */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

/** 서버 에러 바디에서 사람이 읽을 메시지를 최대한 뽑아냅니다. */
function extractMessage(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const body = payload as Record<string, unknown>;
  const candidate = body.message ?? body.error ?? body.detail;
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }
  // NestJS ValidationPipe 는 message 를 배열로 내려주기도 합니다.
  if (Array.isArray(candidate) && typeof candidate[0] === 'string') {
    return candidate.join('\n');
  }
  return null;
}

function extractCode(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }
  const code = (payload as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return new ApiError(
        '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.',
        { isNetworkError: true, code: error.code },
      );
    }
    return new ApiError(
      extractMessage(response.data) ?? `요청에 실패했습니다. (${response.status})`,
      {
        status: response.status,
        code: extractCode(response.data) ?? error.code,
        payload: response.data,
      },
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('알 수 없는 오류가 발생했습니다.');
}
