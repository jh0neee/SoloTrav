/**
 * 신고 도메인 모델.
 * 서버 응답(DTO)이 아니라 앱 내부에서 다루는 모델입니다.
 */

export type ReportTargetType = 'POST' | 'COMMENT' | 'USER' | 'AI_RESPONSE';

export type ReportReason =
  | 'HARASSMENT'
  | 'SEXUAL'
  | 'HATE'
  | 'VIOLENCE'
  | 'PRIVACY'
  | 'SPAM'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'RESOLVED' | 'REJECTED' | string;

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
};

export type UserReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolution: string | null;
  resolvedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type UserReportList = {
  items: UserReport[];
  total: number;
  page: number;
  limit: number;
};

