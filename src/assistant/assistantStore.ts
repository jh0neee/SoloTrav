/**
 * 샛별이 대화 스토어.
 *
 * preferenceStore / badgeStore 와 같은 외부 스토어 방식인데, 여기는 서버가
 * 결과를 **나중에** 밀어주는 구조라 살아있는 SSE 연결까지 함께 관리합니다.
 * 연결을 화면(useEffect)에 두면 탭을 옮길 때마다 끊기고 결과를 잃어버리기
 * 때문에, 요청 상태와 연결을 이 모듈이 함께 들고 있습니다.
 *
 * 화면 생명주기와의 약속:
 *   attach()  화면 진입 — 진행 중인 요청이 있으면 결과를 되찾고 다시 구독
 *   detach()  화면 이탈·백그라운드 — 연결만 끊고 요청은 그대로 둠
 *
 * 대화 내용은 서버가 목록 조회를 제공하지 않아 메모리에만 둡니다.
 * (앱을 껐다 켜면 대화는 비지만, 진행 중이던 요청은 requestId 로 되살릴 수 있게
 *  구조를 맞춰두었습니다)
 */
import { useEffect, useSyncExternalStore } from 'react';
import { assistantApi } from '../api/assistantApi';
import { toApiError } from '../api/errors';
import type { SseConnection } from '../api/sse';
import type { ChatMessage, ChatResult, TravelCourse } from '../types/assistant';

/** 진행 중인 요청 — 결과가 어느 말풍선에 들어가야 하는지 함께 기억합니다 */
export type PendingRequest = {
  requestId: string;
  /** 결과를 채워 넣을 assistant 말풍선 id */
  messageId: string;
};

export type AssistantState = {
  messages: ChatMessage[];
  /** 접수 요청(POST)이 나가 있는 동안 true — 입력창을 잠급니다 */
  isSending: boolean;
  /** 결과를 기다리는 중인 요청. 없으면 null */
  pending: PendingRequest | null;
  /** 대화 자체를 막는 오류. 말풍선 안에 표시되는 오류와는 별개입니다 */
  error: string | null;
};

/** 결과를 기다리는 동안 말풍선에 띄우는 기본 문구 */
const THINKING_TEXT = '샛별이가 코스를 살펴보고 있어요';

/**
 * 결과를 기다리는 최대 시간.
 *
 * 서버가 heartbeat 만 계속 보내고 결과를 영영 안 주는 경우(브로커에 작업이
 * 안 실렸는데 스트림은 살아있는 경우)가 있어, 무한정 기다리지 않도록
 * 절대 상한을 둡니다. heartbeat 로는 연장되지 않습니다.
 */
const RESULT_TIMEOUT_MS = 180000;

const INITIAL: AssistantState = {
  messages: [],
  isSending: false,
  pending: null,
  error: null,
};

let state: AssistantState = INITIAL;
const listeners = new Set<() => void>();

/** 스냅샷 참조가 바뀌어야 구독자가 다시 그립니다. 항상 새 객체로 교체합니다. */
function setState(patch: Partial<AssistantState>): void {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

/** 말풍선 하나만 갈아끼웁니다. 이미 사라진 id 면 아무 일도 하지 않습니다. */
function patchMessage(id: string, patch: Partial<ChatMessage>): void {
  const index = state.messages.findIndex(message => message.id === id);
  if (index === -1) {
    return;
  }
  const messages = [...state.messages];
  messages[index] = { ...messages[index], ...patch };
  setState({ messages });
}

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/** 같은 대화를 서버에서 묶어볼 수 있게 클라이언트가 만들어 보내는 id */
let conversationId = nextId('conv');

/** 살아있는 SSE 연결 (동시에 하나만) */
let stream: SseConnection | null = null;
/** 화면이 떠 있는 동안만 스트림을 엽니다 */
let attached = false;
/** '다시 시도' 가 재사용할 마지막 사용자 입력 */
let lastRequest: { message: string; regionName?: string } | null = null;
/** 결과가 안 올 때 대화를 풀어주는 타이머 */
let watchdog: ReturnType<typeof setTimeout> | null = null;

function closeStream(): void {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
  stream?.close();
  stream = null;
}

/** 결과가 도착했을 때 말풍선을 완성합니다. */
function applyResult(messageId: string, result: ChatResult): void {
  const course: TravelCourse | null = result.course;
  const text =
    result.answer ??
    (course ? '요청하신 코스를 준비했어요.' : '답변을 준비하지 못했어요.');
  patchMessage(messageId, { text, course, state: 'done' });
  setState({ pending: null });
  closeStream();
}

/** 실패했을 때 말풍선을 오류 상태로 바꿉니다. */
function applyFailure(messageId: string, message: string): void {
  patchMessage(messageId, { text: message, course: null, state: 'failed' });
  setState({ pending: null });
  closeStream();
}

/** requestId 를 구독해 결과를 기다립니다. */
function openStream(requestId: string, messageId: string): void {
  closeStream();
  stream = assistantApi.streamResult(requestId, {
    onStatus: (_status, message) => {
      // 서버가 진행 문구를 주면 그대로 쓰고, 없으면 기본 문구를 유지합니다.
      if (message) {
        patchMessage(messageId, { text: message });
      }
    },
    onComplete: result => applyResult(messageId, result),
    onError: error => applyFailure(messageId, error.message),
  });

  watchdog = setTimeout(() => {
    watchdog = null;
    applyFailure(
      messageId,
      '응답이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.',
    );
  }, RESULT_TIMEOUT_MS);
}

export const assistantStore = {
  get(): AssistantState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * 화면 진입. 결과를 기다리던 요청이 있으면
   * (화면을 비운 사이 끝났을 수 있으니) 최종 상태부터 확인하고 이어붙입니다.
   */
  async attach(): Promise<void> {
    attached = true;
    const pending = state.pending;
    if (!pending || stream) {
      return;
    }

    try {
      const result = await assistantApi.fetchResult(pending.requestId);
      if (result.status === 'COMPLETED') {
        applyResult(pending.messageId, result);
        return;
      }
      if (result.status === 'FAILED') {
        applyFailure(
          pending.messageId,
          result.errorMessage ?? '코스를 만들지 못했어요. 다시 시도해주세요.',
        );
        return;
      }
    } catch {
      // 상태 조회가 실패해도 스트림으로 한 번 더 시도해 봅니다.
    }

    // 여전히 진행 중이면 다시 구독합니다.
    // (재연결하면 서버가 현재 상태를 즉시 한 번 보내줍니다)
    if (attached && state.pending?.requestId === pending.requestId) {
      openStream(pending.requestId, pending.messageId);
    }
  },

  /** 화면 이탈·백그라운드 전환 — 연결만 끊고 요청은 살려둡니다. */
  detach(): void {
    attached = false;
    closeStream();
  },

  /**
   * 메시지를 보냅니다.
   * 사용자 말풍선과 '생각 중' 말풍선을 먼저 세워두고, 접수가 되면 그 말풍선에
   * 결과를 채워 넣습니다.
   */
  async send(message: string, regionName?: string): Promise<void> {
    const text = message.trim();
    // 앞 요청이 끝나기 전에는 받지 않습니다.
    // 결과가 어느 말풍선 것인지 뒤섞이는 걸 막기 위해서입니다.
    if (!text || state.isSending || state.pending) {
      return;
    }

    lastRequest = { message: text, regionName };

    const userMessage: ChatMessage = {
      id: nextId('u'),
      role: 'user',
      text,
      course: null,
      state: 'done',
      createdAt: Date.now(),
    };
    const replyMessage: ChatMessage = {
      id: nextId('a'),
      role: 'assistant',
      text: THINKING_TEXT,
      course: null,
      state: 'pending',
      createdAt: Date.now(),
    };

    setState({
      messages: [...state.messages, userMessage, replyMessage],
      isSending: true,
      error: null,
    });

    try {
      const ticket = await assistantApi.requestCourse({
        message: text,
        regionName,
        conversationId,
      });

      // 브로커에 작업이 안 실렸다는 뜻이라 결과가 오지 않습니다.
      // (서버의 RabbitMQ 연결을 확인해야 하는 상황입니다)
      if (ticket.status === 'WAITING_BROKER') {
        setState({ isSending: false });
        applyFailure(
          replyMessage.id,
          '지금은 요청을 처리할 수 없어요. 잠시 후 다시 시도해주세요.',
        );
        return;
      }

      // brokerPublished 가 false 여도 status 가 진행 중이면 곧 실릴 수 있으므로
      // 구독은 해봅니다. 끝내 결과가 없으면 위 watchdog 이 정리합니다.
      if (__DEV__ && !ticket.brokerPublished) {
        console.warn(
          `[saetbyeol] brokerPublished=false 인데 status=${ticket.status} 라 일단 구독합니다.`,
        );
      }

      setState({
        isSending: false,
        pending: { requestId: ticket.requestId, messageId: replyMessage.id },
      });

      // 화면을 이미 떠났다면 연결하지 않습니다. 돌아올 때 attach() 가 되살립니다.
      if (attached) {
        openStream(ticket.requestId, replyMessage.id);
      }
    } catch (caught) {
      const error = toApiError(caught);
      setState({ isSending: false });
      applyFailure(replyMessage.id, error.message);
    }
  },

  /** 실패한 마지막 요청을 같은 내용으로 다시 보냅니다. */
  async retry(): Promise<void> {
    const previous = lastRequest;
    if (!previous || state.isSending || state.pending) {
      return;
    }
    // 실패한 답변 말풍선과 그 위 내 질문을 걷어내고 처음부터 다시 보냅니다.
    const messages = [...state.messages];
    while (
      messages.length > 0 &&
      messages[messages.length - 1].state !== 'done'
    ) {
      messages.pop();
    }
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      messages.pop();
    }
    setState({ messages, error: null });
    await assistantStore.send(previous.message, previous.regionName);
  },

  /** 새 대화 시작 — 대화 내용과 진행 중인 요청을 모두 버립니다. */
  clear(): void {
    closeStream();
    conversationId = nextId('conv');
    lastRequest = null;
    setState({ messages: [], isSending: false, pending: null, error: null });
  },

  /** 로그아웃 시 초기화 */
  reset(): void {
    attached = false;
    assistantStore.clear();
  },
};

/**
 * 대화 상태를 구독합니다.
 * 마운트되어 있는 동안만 스트림이 열리도록 attach/detach 를 여기서 묶습니다.
 */
export function useAssistant(): AssistantState {
  const snapshot = useSyncExternalStore(
    assistantStore.subscribe,
    assistantStore.get,
  );

  useEffect(() => {
    assistantStore.attach();
    return () => assistantStore.detach();
  }, []);

  return snapshot;
}
