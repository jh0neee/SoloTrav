type LogDetails = Record<string, unknown>;

let sequence = 0;
let actionSequence = 0;
let currentActionId = 'initial';

export function getMapActionId() {
  return currentActionId;
}

/** 한 줄 JSON으로 남겨 Metro/adb 로그에서 클릭부터 표시까지 비교합니다. */
export function logMapDiagnostic(
  event: string,
  details: LogDetails = {},
  actionId = currentActionId,
) {
  if (!__DEV__) return;
  console.log(
    '[MapTrace] ' +
      JSON.stringify({
        at: new Date().toISOString(),
        actionId,
        event,
        ...details,
      }),
  );
}

export function beginMapAction(event: string, details: LogDetails) {
  if (!__DEV__) return currentActionId;
  currentActionId = `action-${++actionSequence}`;
  logMapDiagnostic(event, details);
  return currentActionId;
}

function errorSummary(error: unknown) {
  if (error instanceof Error) {
    const apiError = error as Error & {
      status?: number;
      code?: string;
      retryAfterMs?: number;
    };
    return {
      name: error.name,
      message: error.message,
      status: apiError.status,
      code: apiError.code,
      retryAfterMs: apiError.retryAfterMs,
    };
  }
  return { message: String(error) };
}

function printCompletedGroup(
  header: string,
  request: LogDetails,
  response: LogDetails,
  level: 'log' | 'warn' = 'log',
) {
  if (typeof console.groupCollapsed !== 'function') {
    console[level](header, { request, response });
    return;
  }
  console.groupCollapsed(header);
  console.log('요청 조건', request);
  console[level]('결과', response);
  console.groupEnd();
}

/**
 * 지도 화면 전용 API 로그입니다. 운영 빌드에서는 아무것도 출력하지 않습니다.
 * 인증 정보와 전체 대용량 응답 대신 조회 조건, 건수, 일부 샘플만 기록합니다.
 */
export function startMapApiLog(
  name: string,
  request: LogDetails = {},
  actionId = currentActionId,
) {
  const id = ++sequence;
  const startedAt = Date.now();
  logMapDiagnostic('api.start', { requestId: id, name, request }, actionId);
  let finished = false;
  if (__DEV__) console.log(`[MapAPI #${id}] → ${name}`);

  return {
    success(details: LogDetails = {}) {
      if (finished) return;
      finished = true;
      if (!__DEV__) return;
      const elapsedMs = Date.now() - startedAt;
      logMapDiagnostic(
        'api.success',
        { requestId: id, name, elapsedMs, ...details },
        actionId,
      );
      printCompletedGroup(
        `[MapAPI #${id}] ✅ ${name} (${elapsedMs}ms)`,
        request,
        { ...details },
      );
    },
    failure(error: unknown, details: LogDetails = {}) {
      if (finished) return;
      finished = true;
      if (!__DEV__) return;
      const elapsedMs = Date.now() - startedAt;
      logMapDiagnostic(
        'api.failure',
        {
          requestId: id,
          name,
          elapsedMs,
          error: errorSummary(error),
          ...details,
        },
        actionId,
      );
      printCompletedGroup(
        `[MapAPI #${id}] ❌ ${name} (${elapsedMs}ms)`,
        request,
        { ...details, error: errorSummary(error) },
        'warn',
      );
    },
    cancelled(details: LogDetails = {}) {
      if (finished) return;
      finished = true;
      if (!__DEV__) return;
      const elapsedMs = Date.now() - startedAt;
      logMapDiagnostic(
        'api.cancelled',
        { requestId: id, name, elapsedMs, ...details },
        actionId,
      );
      printCompletedGroup(
        `[MapAPI #${id}] ⏹ ${name} (${elapsedMs}ms)`,
        request,
        { ...details },
      );
    },
  };
}

export function mapApiSample<T>(items: T[], size: number = 3) {
  return items.slice(0, size);
}
