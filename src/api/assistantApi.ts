/**
 * 샛별이 API.
 *
 *   1) requestCourse()  POST  — 요청을 접수하고 requestId 를 받습니다.
 *   2) streamResult()   SSE   — 결과를 실시간으로 받습니다.
 *   3) fetchResult()    GET   — 스트림을 놓쳤을 때 최종 상태를 되찾습니다.
 *
 * 취향 JSON 은 보내지 않습니다. 서버가 로그인한 사용자의 저장된 취향을
 * 알아서 붙입니다.
 *
 * 스트림만 apiClient(axios)가 아니라 XHR(sse.ts)을 씁니다. axios 로는 응답을
 * 조각조각 읽을 수 없기 때문입니다. 그래서 axios 인터셉터가 해주던 두 가지 —
 * Authorization 첨부와 401 재발급 — 를 이 파일에서 직접 처리합니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
import { refreshSession } from './sessionRefresh';
import { openSseConnection, type SseConnection } from './sse';
import {
  toChatResult,
  toChatStatus,
  toChatTicket,
} from './assistantMappers';
import { env } from '../config/env';
import { userAgent } from '../config/userAgent';
import { tokenStorage } from '../storage/tokenStorage';
import type { SaetbyeolChatRequest } from './assistantDto';
import type {
  AssistantRequestStatus,
  ChatResult,
  ChatTicket,
} from '../types/assistant';

export type ChatStreamHandlers = {
  /** 진행 상태가 갱신될 때 (로딩 문구 교체용) */
  onStatus?: (status: AssistantRequestStatus, message: string | null) => void;
  /** 코스 생성 성공 — 스트림은 이 시점에 닫힙니다 */
  onComplete: (result: ChatResult) => void;
  /** 코스 생성 실패 또는 연결 실패 — 스트림은 이 시점에 닫힙니다 */
  onError: (error: ApiError) => void;
};

/** SSE 로 오는 이벤트 이름 */
const EVENT_STATUS = 'status';
const EVENT_HEARTBEAT = 'heartbeat';
const EVENT_COMPLETE = 'complete';
const EVENT_ERROR = 'error';

function parseEventData(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const assistantApi = {
  /**
   * POST /ai/saetbyeol/chat — 코스 생성 요청 접수.
   * 응답에 requestId 가 없으면 스트림을 열 수 없으므로 실패로 봅니다.
   */
  requestCourse: async (body: SaetbyeolChatRequest): Promise<ChatTicket> => {
    const { data } = await apiClient.post(ENDPOINTS.saetbyeolChat(), body);
    const ticket = toChatTicket(data);
    if (!ticket) {
      throw new ApiError('요청을 접수하지 못했어요. 잠시 후 다시 시도해주세요.', {
        payload: data,
      });
    }
    // 결과가 안 올 때 원인이 앱인지 서버인지 가르는 첫 단서입니다.
    // (접수는 됐는지 / 브로커에 실렸는지)
    if (__DEV__) {
      console.log(
        `[saetbyeol] 접수 ${ticket.requestId} status=${ticket.status} brokerPublished=${ticket.brokerPublished}`,
        data,
      );
    }
    return ticket;
  },

  /**
   * GET /ai/saetbyeol/chat/{requestId} — 최종 상태 조회.
   * 앱을 껐다 켰거나 화면을 떠났다 돌아왔을 때 결과를 되찾는 용도입니다.
   */
  fetchResult: async (requestId: string): Promise<ChatResult> => {
    const { data } = await apiClient.get(
      ENDPOINTS.saetbyeolChatResult(requestId),
    );
    return toChatResult(data, requestId);
  },

  /**
   * GET /ai/saetbyeol/chat/{requestId}/stream — 결과 SSE 구독.
   *
   * 끊겼을 때의 정책은 가이드를 그대로 따릅니다.
   *  - 401 : 토큰을 한 번 재발급하고 같은 requestId 로 다시 연결
   *  - 일시적 끊김 : 한 번만 재연결 (서버가 현재 상태를 즉시 다시 보내줍니다)
   *  - 그 이후 : 실패로 처리
   *
   * @returns 구독 핸들. 화면 이탈·백그라운드 전환 시 반드시 close() 하세요.
   */
  streamResult: (
    requestId: string,
    handlers: ChatStreamHandlers,
  ): SseConnection => {
    const url = `${env.apiBaseUrl}${ENDPOINTS.saetbyeolChatStream(requestId)}`;

    let connection: SseConnection | null = null;
    /** complete/error 를 받았거나 호출부가 닫았으면 더 이상 아무것도 하지 않습니다 */
    let settled = false;
    let refreshed = false;
    let reconnected = false;

    const settle = (finish: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      connection?.close();
      finish();
    };

    const connect = () => {
      if (settled) {
        return;
      }
      const accessToken = tokenStorage.get()?.accessToken;

      connection = openSseConnection({
        url,
        headers: {
          // 카카오 로그인 흐름과 동일하게 user-agent 를 항상 실어 보냅니다.
          'User-Agent': userAgent,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        handlers: {
          onMessage: message => {
            if (settled) {
              return;
            }
            if (__DEV__ && message.event !== EVENT_HEARTBEAT) {
              console.log(`[saetbyeol] SSE ${message.event}`, message.data);
            }
            switch (message.event) {
              case EVENT_HEARTBEAT:
                // 연결 유지 신호 — 무시합니다.
                return;
              case EVENT_STATUS: {
                const { status, message: text } = toChatStatus(
                  parseEventData(message.data),
                );
                handlers.onStatus?.(status, text);
                return;
              }
              case EVENT_COMPLETE: {
                const result = toChatResult(
                  parseEventData(message.data),
                  requestId,
                );
                settle(() => handlers.onComplete(result));
                return;
              }
              case EVENT_ERROR: {
                const result = toChatResult(
                  parseEventData(message.data),
                  requestId,
                );
                settle(() =>
                  handlers.onError(
                    new ApiError(
                      result.errorMessage ??
                        '코스를 만들지 못했어요. 다시 시도해주세요.',
                    ),
                  ),
                );
                return;
              }
              default:
                // 이름 없는 message 이벤트로 결과를 보내는 서버 구현도 있어
                // 상태가 종료 상태면 결과로 받아들입니다.
                {
                  const result = toChatResult(
                    parseEventData(message.data),
                    requestId,
                  );
                  if (result.status === 'COMPLETED') {
                    settle(() => handlers.onComplete(result));
                  } else if (result.status === 'FAILED') {
                    settle(() =>
                      handlers.onError(
                        new ApiError(
                          result.errorMessage ??
                            '코스를 만들지 못했어요. 다시 시도해주세요.',
                        ),
                      ),
                    );
                  }
                }
            }
          },

          onClose: async error => {
            if (settled) {
              return;
            }

            // 액세스 토큰 만료 — 한 번 재발급하고 다시 붙습니다.
            if (error?.status === 401 && !refreshed) {
              refreshed = true;
              const tokens = await refreshSession();
              if (tokens) {
                connect();
                return;
              }
            }

            // 남의 requestId 를 구독하면 403 입니다. 재연결해도 소용없습니다.
            if (error?.status === 403) {
              settle(() =>
                handlers.onError(
                  new ApiError('이 대화를 볼 수 있는 권한이 없어요.', {
                    status: 403,
                  }),
                ),
              );
              return;
            }

            // 결과를 못 받고 끊겼습니다(네트워크 끊김 또는 서버가 그냥 닫음).
            // 가이드대로 같은 requestId 로 한 번만 다시 연결합니다.
            if (!reconnected) {
              reconnected = true;
              connect();
              return;
            }

            settle(() =>
              handlers.onError(
                error ??
                  new ApiError('연결이 끊어졌어요. 다시 시도해주세요.', {
                    isNetworkError: true,
                  }),
              ),
            );
          },
        },
      });
    };

    connect();

    return {
      close: () => {
        settled = true;
        connection?.close();
      },
    };
  },
};
