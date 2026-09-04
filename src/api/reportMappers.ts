/**
 * 신고 API DTO → 도메인 모델 변환 매퍼.
 */
import { unwrap } from './mappers';
import type { Envelope, ReportDto, ReportListResponseDto } from './dto';
import type {
  ReportReason,
  ReportTargetType,
  UserReport,
  UserReportList,
} from '../types/report';

function toValidString(val: unknown): string | null {
  if (typeof val === 'string' && val.trim()) {
    return val.trim();
  }
  return null;
}

function toValidDate(val: unknown): Date | null {
  if (typeof val !== 'string' || !val) {
    return null;
  }
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeTargetType(raw?: string): ReportTargetType {
  const upper = raw?.toUpperCase();
  if (upper === 'COMMENT') return 'COMMENT';
  if (upper === 'USER') return 'USER';
  if (upper === 'AI_RESPONSE' || upper === 'AI') return 'AI_RESPONSE';
  return 'POST';
}

function normalizeReason(raw?: string): ReportReason {
  const upper = raw?.toUpperCase();
  const validReasons: ReportReason[] = [
    'HARASSMENT',
    'SEXUAL',
    'HATE',
    'VIOLENCE',
    'PRIVACY',
    'SPAM',
    'OTHER',
  ];
  if (upper && validReasons.includes(upper as ReportReason)) {
    return upper as ReportReason;
  }
  return 'OTHER';
}

export function toUserReport(payload: unknown): UserReport {
  const dto = unwrap(payload as Envelope<ReportDto>);
  return {
    id: toValidString(dto.id) ?? '',
    targetType: normalizeTargetType(dto.targetType),
    targetId: toValidString(dto.targetId) ?? '',
    reason: normalizeReason(dto.reason),
    description: toValidString(dto.description),
    status: toValidString(dto.status) ?? 'OPEN',
    resolution: toValidString(dto.resolution),
    resolvedAt: toValidDate(dto.resolvedAt),
    createdAt: toValidDate(dto.createdAt),
    updatedAt: toValidDate(dto.updatedAt),
  };
}

export function toUserReportList(payload: unknown): UserReportList {
  const dto = unwrap(payload as Envelope<ReportListResponseDto>);
  const rawItems = Array.isArray(dto.items) ? dto.items : [];
  const items = rawItems.map(toUserReport).filter(item => !!item.id);

  return {
    items,
    total: typeof dto.total === 'number' ? dto.total : items.length,
    page: typeof dto.page === 'number' ? dto.page : 1,
    limit: typeof dto.limit === 'number' ? dto.limit : 20,
  };
}

