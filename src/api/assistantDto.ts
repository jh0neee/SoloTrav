/**
 * 샛별이 API 의 서버 응답 원형(DTO).
 *
 * SSE 로 오는 `data` 는 공통 봉투 없이 알맹이만 내려오지만, POST/GET 응답은
 * 다른 엔드포인트처럼 `payload` 로 감싸일 수 있어 매퍼에서 unwrap 을 태웁니다.
 * 필드는 전부 optional 로 두고 매퍼가 기본값을 채웁니다.
 */

/** POST /ai/saetbyeol/chat 요청 바디 */
export type SaetbyeolChatRequest = {
  message: string;
  /** 지역이 분명할 때만 보냅니다. 서버가 저장된 취향과 함께 씁니다 */
  regionName?: string;
  /** 같은 대화를 묶는 클라이언트 생성 id */
  conversationId?: string;
};

/** POST /ai/saetbyeol/chat 응답 */
export type SaetbyeolChatTicketDto = {
  requestId?: string;
  conversationId?: string | null;
  status?: string;
  brokerPublished?: boolean;
  createdAt?: string;
};

export type CourseStopDto = {
  time?: string | null;
  title?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  transport?: string | null;
  estimatedCostKrw?: number | string | null;
  notes?: string[] | null;
};

export type CourseDayDto = {
  day?: number | string | null;
  title?: string | null;
  stops?: CourseStopDto[] | null;
};

export type TravelCourseDto = {
  title?: string | null;
  summary?: string | null;
  days?: CourseDayDto[] | null;
  estimatedTotalCostKrw?: number | string | null;
  safetyNotes?: string[] | null;
  assumptions?: string[] | null;
};

/**
 * SSE complete / error 이벤트의 data, 그리고
 * GET /ai/saetbyeol/chat/{requestId} 응답이 같은 모양입니다.
 */
export type SaetbyeolChatResultDto = {
  requestId?: string;
  status?: string;
  answer?: string | null;
  /** 실패 사유. 서버 구현에 따라 error / message / reason 중 하나로 옵니다 */
  error?: string | null;
  message?: string | null;
  reason?: string | null;
  metadata?: { course?: TravelCourseDto | null } | null;
};

/** SSE status 이벤트의 data */
export type SaetbyeolChatStatusDto = {
  requestId?: string;
  status?: string;
  message?: string | null;
};
