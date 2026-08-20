/**
 * Server-Sent Events 수신기 (XMLHttpRequest 기반).
 *
 * 브라우저 기본 `EventSource` 는 Authorization 헤더를 붙일 수 없어서
 * Bearer JWT 를 쓰는 우리 API 에는 쓸 수 없습니다. React Native 의 XHR 은
 * readyState 3(LOADING) 동안 `responseText` 를 조금씩 채워주므로,
 * 이미 읽은 길이를 기억해두고 새로 들어온 부분만 잘라 파싱합니다.
 *
 * 여기서는 "바이트를 이벤트로 쪼개는 일" 만 합니다. 재연결·토큰 재발급 같은
 * 정책은 이 모듈을 쓰는 쪽(assistantApi)에 둡니다.
 */
import { ApiError } from './errors';

/** 파싱된 SSE 이벤트 한 개 */
export type SseMessage = {
  /** `event:` 필드. 생략되면 스펙에 따라 'message' */
  event: string;
  /** `data:` 필드들을 개행으로 이어붙인 값 */
  data: string;
  id: string | null;
};

export type SseHandlers = {
  /** 첫 바이트가 도착해 스트림이 열렸을 때 */
  onOpen?: () => void;
  onMessage: (message: SseMessage) => void;
  /**
   * 스트림이 끝났을 때. 서버가 정상적으로 닫으면 error 는 null 입니다.
   * `close()` 로 우리가 직접 끊은 경우에는 호출되지 않습니다.
   */
  onClose: (error: ApiError | null) => void;
};

export type SseConnection = {
  close: () => void;
};

export type SseOptions = {
  /** 절대 URL (baseURL 이 적용되지 않습니다) */
  url: string;
  headers?: Record<string, string>;
  handlers: SseHandlers;
};

/** 이벤트 구분자 — 빈 줄(\n\n, \r\n\r\n, \r\r) */
const EVENT_DELIMITER = /\r\n\r\n|\n\n|\r\r/;
const LINE_DELIMITER = /\r\n|\n|\r/;

/** 한 이벤트 블록(빈 줄로 끝나는 덩어리)을 필드별로 해석합니다. */
function parseEvent(chunk: string): SseMessage | null {
  let event = 'message';
  let id: string | null = null;
  const dataLines: string[] = [];

  for (const line of chunk.split(LINE_DELIMITER)) {
    // ':' 로 시작하는 줄은 주석(연결 유지용)입니다.
    if (!line || line.startsWith(':')) {
      continue;
    }
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const raw = separator === -1 ? '' : line.slice(separator + 1);
    // 스펙상 콜론 뒤 공백 한 칸은 값에 포함하지 않습니다.
    const value = raw.startsWith(' ') ? raw.slice(1) : raw;

    if (field === 'event') {
      event = value;
    } else if (field === 'data') {
      dataLines.push(value);
    } else if (field === 'id') {
      id = value;
    }
    // retry 는 재연결 정책을 우리가 직접 정하므로 무시합니다.
  }

  if (dataLines.length === 0 && event === 'message') {
    return null;
  }
  return { event, data: dataLines.join('\n'), id };
}

/** 스트림 도중 받은 HTTP 에러를 ApiError 로 정규화합니다. */
function toStreamError(status: number, body: string): ApiError {
  let message: string | null = null;
  try {
    const parsed = JSON.parse(body);
    const candidate = parsed?.message ?? parsed?.error;
    if (typeof candidate === 'string' && candidate.trim()) {
      message = candidate;
    }
  } catch {
    // 본문이 JSON 이 아니면 상태 코드로만 안내합니다.
  }
  return new ApiError(message ?? `스트림 연결에 실패했습니다. (${status})`, {
    status,
    payload: body,
  });
}

/**
 * SSE 스트림을 엽니다.
 * @returns 연결 핸들. `close()` 로 언제든 끊을 수 있고, 끊으면 onClose 는 오지 않습니다.
 */
export function openSseConnection({
  url,
  headers = {},
  handlers,
}: SseOptions): SseConnection {
  const xhr = new XMLHttpRequest();

  let closed = false;
  let opened = false;
  /** responseText 중 이미 파싱한 길이 — 새로 들어온 부분만 잘라 씁니다 */
  let consumed = 0;
  /** 아직 빈 줄을 못 만난 마지막 조각 */
  let buffer = '';

  const finish = (error: ApiError | null) => {
    if (closed) {
      return;
    }
    closed = true;
    handlers.onClose(error);
  };

  const drain = () => {
    const text: string = xhr.responseText ?? '';
    if (text.length <= consumed) {
      return;
    }
    buffer += text.slice(consumed);
    consumed = text.length;

    const chunks = buffer.split(EVENT_DELIMITER);
    // 마지막 조각은 아직 이어질 수 있으므로 버퍼에 남겨둡니다.
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const message = parseEvent(chunk);
      if (message) {
        handlers.onMessage(message);
      }
    }
  };

  xhr.open('GET', url, true);
  // 스트림은 오래 열려 있어야 하므로 타임아웃을 걸지 않습니다.
  xhr.timeout = 0;
  xhr.setRequestHeader('Accept', 'text/event-stream');
  xhr.setRequestHeader('Cache-Control', 'no-cache');
  Object.entries(headers).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
  });

  xhr.onreadystatechange = () => {
    if (closed) {
      return;
    }
    const { readyState, status } = xhr;
    if (readyState !== XMLHttpRequest.LOADING && readyState !== XMLHttpRequest.DONE) {
      return;
    }

    // 4xx/5xx 는 본문이 SSE 가 아니라 에러 JSON 입니다. 다 받은 뒤 한 번에 처리합니다.
    if (status >= 400) {
      if (readyState === XMLHttpRequest.DONE) {
        finish(toStreamError(status, xhr.responseText ?? ''));
      }
      return;
    }

    if (!opened) {
      opened = true;
      handlers.onOpen?.();
    }
    drain();

    if (readyState === XMLHttpRequest.DONE) {
      // 서버가 연결을 닫았습니다. complete/error 를 이미 받았는지는 호출부가 판단합니다.
      finish(null);
    }
  };

  xhr.onerror = () => {
    finish(
      new ApiError('연결이 끊어졌습니다. 네트워크 상태를 확인해주세요.', {
        isNetworkError: true,
      }),
    );
  };

  xhr.send();

  return {
    close: () => {
      if (closed) {
        return;
      }
      // 먼저 닫힘으로 표시해야 abort 가 부르는 콜백들이 onClose 를 다시 쏘지 않습니다.
      closed = true;
      xhr.abort();
    },
  };
}
