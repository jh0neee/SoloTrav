/**
 * 샛별이: 서버 응답(DTO) → 앱 도메인 모델 변환.
 *
 * AI 가 만든 JSON 이 그대로 내려오는 구간이라 필드가 빠지거나 타입이 흔들릴 수
 * 있습니다. 화면이 그 흔들림을 떠안지 않도록 여기서 전부 정규화합니다.
 * (없으면 null, 배열이 아니면 빈 배열, 숫자 문자열은 숫자로)
 */
import { unwrap } from './mappers';
import type { Envelope } from './dto';
import type {
  CourseDayDto,
  CourseStopDto,
  SaetbyeolChatResultDto,
  SaetbyeolChatStatusDto,
  SaetbyeolChatTicketDto,
  TravelCourseDto,
} from './assistantDto';
import type {
  AssistantRequestStatus,
  ChatResult,
  ChatTicket,
  CourseDay,
  CourseStop,
  TravelCourse,
} from '../types/assistant';

const KNOWN_STATUSES: AssistantRequestStatus[] = [
  'PENDING',
  'PROCESSING',
  'WAITING_BROKER',
  'COMPLETED',
  'FAILED',
];

/**
 * 서버가 나중에 상태를 추가해도 앱이 멈추지 않도록,
 * 모르는 값은 "아직 처리 중" 으로 봅니다(스트림을 계속 듣습니다).
 */
export function toRequestStatus(value: unknown): AssistantRequestStatus {
  const text = String(value ?? '').toUpperCase();
  const matched = KNOWN_STATUSES.find(status => status === text);
  return matched ?? 'PROCESSING';
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown): number | null {
  const num = typeof value === 'string' ? Number(value) : value;
  return typeof num === 'number' && Number.isFinite(num) ? num : null;
}

/** 문자열 배열만 남깁니다. 배열이 아니면 빈 배열입니다. */
function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(item => item.length > 0);
}

function toStop(dto: CourseStopDto): CourseStop | null {
  // 제목 없는 일정은 화면에 그릴 수 없으니 버립니다.
  const title = toText(dto.title) ?? toText(dto.name);
  if (!title) {
    return null;
  }
  return {
    time: toText(dto.time),
    title,
    category: toText(dto.category),
    description: toText(dto.description),
    transport: toText(dto.transport),
    estimatedCostKrw: toNumber(dto.estimatedCostKrw),
    notes: toStringList(dto.notes),
  };
}

function toDay(dto: CourseDayDto, index: number): CourseDay {
  return {
    // day 가 없으면 배열 순서를 일차로 씁니다.
    day: toNumber(dto.day) ?? index + 1,
    title: toText(dto.title),
    stops: Array.isArray(dto.stops)
      ? dto.stops.map(toStop).filter((stop): stop is CourseStop => !!stop)
      : [],
  };
}

/**
 * metadata.course → TravelCourse.
 * 일정이 하나도 없으면 보여줄 게 없으므로 null 을 돌려줘서
 * 화면이 답변 텍스트만 표시하게 합니다.
 */
export function toTravelCourse(
  dto: TravelCourseDto | null | undefined,
): TravelCourse | null {
  if (!dto || typeof dto !== 'object') {
    return null;
  }
  const days = Array.isArray(dto.days) ? dto.days.map(toDay) : [];
  const hasStop = days.some(day => day.stops.length > 0);
  if (!hasStop) {
    return null;
  }
  return {
    title: toText(dto.title),
    summary: toText(dto.summary),
    days,
    estimatedTotalCostKrw: toNumber(dto.estimatedTotalCostKrw),
    safetyNotes: toStringList(dto.safetyNotes),
    assumptions: toStringList(dto.assumptions),
  };
}

/** POST /ai/saetbyeol/chat 응답 → 접수증 */
export function toChatTicket(payload: unknown): ChatTicket | null {
  const dto = unwrap(payload as Envelope<SaetbyeolChatTicketDto>);
  const requestId = toText(dto.requestId);
  if (!requestId) {
    return null;
  }
  return {
    requestId,
    conversationId: toText(dto.conversationId),
    status: toRequestStatus(dto.status),
    // 서버가 값을 안 주면 "실렸다" 로 봅니다. 안 왔으면 어차피 스트림이 알려줍니다.
    brokerPublished: dto.brokerPublished !== false,
  };
}

/**
 * SSE complete/error 의 data, GET 상태 조회 응답 → 결과.
 * @param fallbackRequestId SSE data 에 requestId 가 빠졌을 때 쓸 값
 */
export function toChatResult(
  payload: unknown,
  fallbackRequestId: string,
): ChatResult {
  const dto = unwrap(payload as Envelope<SaetbyeolChatResultDto>);
  return {
    requestId: toText(dto.requestId) ?? fallbackRequestId,
    status: toRequestStatus(dto.status),
    answer: toText(dto.answer),
    course: toTravelCourse(dto.metadata?.course),
    errorMessage: toText(dto.error) ?? toText(dto.reason) ?? toText(dto.message),
  };
}

/** SSE status 이벤트 → 진행 상태 + 안내 문구 */
export function toChatStatus(payload: unknown): {
  status: AssistantRequestStatus;
  message: string | null;
} {
  const dto = unwrap(payload as Envelope<SaetbyeolChatStatusDto>);
  return {
    status: toRequestStatus(dto.status),
    message: toText(dto.message),
  };
}
