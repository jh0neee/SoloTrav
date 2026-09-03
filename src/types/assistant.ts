/**
 * 샛별이(AI 여행 도우미) 도메인 모델.
 *
 * 서버는 "요청 접수 → SSE 로 결과 전달" 인 비동기 구조라 한 번의 대화가
 * 세 조각으로 나뉩니다.
 *
 *   ChatTicket  : POST 로 받은 접수증 (requestId + 초기 상태)
 *   ChatResult  : SSE complete / GET 조회로 받은 최종 결과
 *   ChatMessage : 화면 말풍선 한 개 (사용자 / 샛별이)
 */

/** 여행 코스의 한 일정(정류장) */
export type CourseStop = {
  /** 'HH:mm'. 서버가 안 주면 null */
  time: string | null;
  title: string;
  /** 'CAFE' 같은 분류 키. 배지로 표시합니다 */
  category: string | null;
  description: string | null;
  /** '도보', '버스 402' 처럼 이 장소로 가는 이동 수단 */
  transport: string | null;
  estimatedCostKrw: number | null;
  notes: string[];
};

/** 여행 코스의 하루 */
export type CourseDay = {
  /** 1일차, 2일차 … */
  day: number;
  title: string | null;
  stops: CourseStop[];
};

/** metadata.course — 일정 화면에 그대로 그리는 구조화된 코스 */
export type TravelCourse = {
  title: string | null;
  summary: string | null;
  days: CourseDay[];
  estimatedTotalCostKrw: number | null;
  /** 안전 안내 영역 */
  safetyNotes: string[];
  /** 영업시간·막차처럼 사용자가 직접 확인해야 하는 가정 */
  assumptions: string[];
};

/**
 * 요청 처리 상태.
 * PENDING / PROCESSING / WAITING_BROKER 는 진행 중, COMPLETED / FAILED 는 종료입니다.
 * 서버가 새로운 상태를 추가해도 앱이 죽지 않도록 매퍼에서 모르는 값은
 * PROCESSING 으로 취급합니다.
 */
export type AssistantRequestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'WAITING_BROKER'
  | 'COMPLETED'
  | 'FAILED';

/** POST /ai/saetbyeol/chat 응답 — 결과가 아니라 "접수증" 입니다 */
export type ChatTicket = {
  requestId: string;
  conversationId: string | null;
  status: AssistantRequestStatus;
  /** false 면 브로커에 아직 못 실렸다는 뜻이라 결과가 오지 않습니다 */
  brokerPublished: boolean;
};

/** SSE complete / GET 상태 조회로 받은 결과 */
export type ChatResult = {
  requestId: string;
  status: AssistantRequestStatus;
  /** 말풍선에 표시할 짧은 요약 */
  answer: string | null;
  course: TravelCourse | null;
  /** status 가 FAILED 일 때 서버가 준 실패 사유 */
  errorMessage: string | null;
};

export type ChatRole = 'user' | 'assistant';

/**
 * 말풍선 하나의 상태.
 * pending 동안에는 타이핑 인디케이터를 보여주고, failed 면 다시 시도 버튼을 답니다.
 */
export type ChatMessageState = 'pending' | 'done' | 'failed';



export type SuggestedPrompt = {
  /** 칩에 보이는 짧은 문구 */
  label: string;
  /** 실제로 전송되는 문장 */
  prompt: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  /** pending 일 때는 진행 문구가 들어가며, thinking UI 단계별로 전환될 수 있습니다 */
  text: string;
  /** 코스가 딸려 온 답변이면 말풍선 아래에 타임라인 카드를 붙입니다 */
  course: TravelCourse | null;
  requestId: string | null;
  state: ChatMessageState;
  /** 답변 불가 시 바로 질문을 바꿀 수 있는 추천 칩 목록 */
  suggestedPrompts?: SuggestedPrompt[];
  /** 답변 불가/폴백 안내 메시지 여부 */
  isFallback?: boolean;
  /** 표시용 시각 (epoch ms) */
  createdAt: number;
};
