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
import { userStore } from '../user/userStore';
import { tokenStorage } from '../storage/tokenStorage';
import {
  FALLBACK_GUIDE_TEXT,
  THINKING_PHASES,
  getFallbackPrompts,
} from './suggestions';

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
const THINKING_TEXT = THINKING_PHASES[0].text;

/**
 * 결과를 기다리는 최대 시간 (초과 시 답변 불가 및 추천 칩 안내로 전환).
 * 모바일 사용자 경험을 위해 기존 180초에서 35초로 최적화했습니다.
 */
const RESULT_TIMEOUT_MS = 35000;

/** 둘러보기(게스트 모드) 시 심사관 및 체험용으로 제공할 안심 추천 코스 샘플 */
const GUEST_SAMPLE_COURSE: TravelCourse = {
  title: '단양 안심 힐링 1일 코스',
  summary:
    '도담삼봉 산책부터 구경시장 마늘먹거리, 남한강 잔도길 야경까지 여유롭고 안전한 코스예요.',
  estimatedTotalCostKrw: 38000,
  days: [
    {
      day: 1,
      title: '1일차: 단양의 절경과 여유로운 산책',
      stops: [
        {
          time: '10:30',
          title: '도담삼봉 & 석문',
          category: 'NATURE_WALK',
          description:
            '남한강 한가운데 우뚝 솟은 삼봉과 시원한 강바람을 느끼며 힐링하는 명소입니다.',
          transport: '단양역에서 버스 또는 택시 10분',
          estimatedCostKrw: 3000,
          notes: [
            '물안개 피는 아침 시간대 방문 추천',
            '보행로 정비가 잘 되어 있어 혼자 걷기 좋습니다.',
          ],
        },
        {
          time: '12:30',
          title: '단양 구경시장',
          category: 'FOOD',
          description:
            '마늘떡갈비, 마늘만두 등 단양 특산물 먹거리를 혼자서도 부담 없이 맛볼 수 있는 전통시장입니다.',
          transport: '도담삼봉에서 시내버스 12분',
          estimatedCostKrw: 15000,
          notes: ['소포장 포장이 잘 되어 있어 1인 식사에 적합합니다.'],
        },
        {
          time: '14:30',
          title: '남한강 뷰 카페 산책',
          category: 'CAFE',
          description:
            '강변을 바라보며 조용히 책을 읽거나 휴식을 취하기 좋은 통유리 카페입니다.',
          transport: '도보 5분',
          estimatedCostKrw: 6000,
          notes: ['창가 1인석 완비', '안심식당 인증 업소'],
        },
        {
          time: '17:00',
          title: '단양강 잔도길',
          category: 'WALK',
          description:
            '강변 절벽을 따라 조성된 친환경 산책로로, 일몰과 함께 켜지는 야간 조명이 아름답습니다.',
          transport: '구경시장에서 도보 15분',
          estimatedCostKrw: 0,
          notes: [
            '야간 가로등 및 안전 CCTV 설치 구역',
            '경사가 완만하여 편안한 도보 이동 가능',
          ],
        },
      ],
    },
  ],
  safetyNotes: [
    '단양강 잔도길은 전 구간 안전 CCTV 및 비상벨이 설치된 안심 산책로입니다.',
    '구경시장 인근은 밤 9시 이후 대중교통 배차가 줄어드니 이동 시간을 미리 확인해주세요.',
  ],
  assumptions: [
    '교통 상황 및 기상 조건에 따라 소요 시간이 일부 변동될 수 있습니다.',
    '입장료 및 식비는 1인 기준 예상 금액입니다.',
  ],
};

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
  if (!result.answer && !course) {
    applyFailure(messageId, FALLBACK_GUIDE_TEXT);
    return;
  }
  const text =
    result.answer ??
    (course ? '요청하신 코스를 준비했어요.' : '답변을 준비하지 못했어요.');
  patchMessage(messageId, { text, course, requestId: result.requestId, state: 'done' });
  setState({ pending: null });
  closeStream();
}

/** 실패했거나 답변이 불가할 때 말풍선을 친절한 안내 문구와 추천 칩으로 전환합니다. */
function applyFailure(messageId: string, customMessage?: string): void {
  const prompts = getFallbackPrompts(lastRequest?.regionName);
  const text = customMessage ?? FALLBACK_GUIDE_TEXT;
  patchMessage(messageId, {
    text,
    course: null,
    requestId: null,
    state: 'failed',
    suggestedPrompts: prompts,
    isFallback: true,
  });
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
    onError: _error => applyFailure(messageId, FALLBACK_GUIDE_TEXT),
  });

  watchdog = setTimeout(() => {
    watchdog = null;
    applyFailure(messageId, FALLBACK_GUIDE_TEXT);
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
        applyFailure(pending.messageId, FALLBACK_GUIDE_TEXT);
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
      requestId: null,
      state: 'done',
      createdAt: Date.now(),
    };
    const replyMessage: ChatMessage = {
      id: nextId('a'),
      role: 'assistant',
      text: THINKING_TEXT,
      course: null,
      requestId: null,
      state: 'pending',
      createdAt: Date.now(),
    };

    setState({
      messages: [...state.messages, userMessage, replyMessage],
      isSending: true,
      error: null,
    });

    if (userStore.get()?.id === 'guest' || !tokenStorage.get()?.accessToken) {
      setTimeout(() => {
        applyResult(replyMessage.id, {
          requestId: 'guest-sample-course',
          status: 'COMPLETED',
          answer:
            '둘러보기(게스트 모드)를 위한 맞춤 추천 코스를 준비했어요 ✦\n로그인하시면 내 취향에 딱 맞춘 AI 코스를 실시간으로 생성할 수 있습니다.',
          course: GUEST_SAMPLE_COURSE,
          errorMessage: null,
        });
        setState({ isSending: false });
      }, 1200);
      return;
    }

    try {
      const ticket = await assistantApi.requestCourse({
        message: text,
        regionName,
        conversationId,
      });

      // 브로커에 작업이 안 실렸다는 뜻이라 결과가 오지 않습니다.
      if (ticket.status === 'WAITING_BROKER') {
        setState({ isSending: false });
        applyFailure(replyMessage.id, FALLBACK_GUIDE_TEXT);
        return;
      }

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
      if (__DEV__) {
        console.warn('[saetbyeol] request failed:', error.message);
      }
      setState({ isSending: false });
      applyFailure(replyMessage.id, FALLBACK_GUIDE_TEXT);
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
