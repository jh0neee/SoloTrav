/**
 * 신고 API 클라이언트.
 * 인증이 필요한 엔드포인트이므로 apiClient 를 사용합니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toUserReport, toUserReportList } from './reportMappers';
import type { CreateReportRequestDto } from './dto';
import type { CreateReportInput, UserReport, UserReportList } from '../types/report';

export const reportApi = {
  /**
   * POST /reports — 게시물·댓글·사용자·AI 응답 신고
   * 409: 같은 사용자가 동일 대상을 이미 신고함
   * 429: 최근 24시간 신고 제한 초과
   */
  create: async (input: CreateReportInput): Promise<UserReport> => {
    const body: CreateReportRequestDto = {
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description?.trim() || undefined,
    };
    const { data } = await apiClient.post(ENDPOINTS.reports(), body);
    return toUserReport(data);
  },

  /**
   * GET /reports/me — 내 신고 목록 및 처리 결과 조회
   */
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<UserReportList> => {
    const { data } = await apiClient.get(ENDPOINTS.myReports(params));
    return toUserReportList(data);
  },

  /**
   * GET /reports/me/{reportId} — 내 신고 상세 조회
   */
  detail: async (reportId: string): Promise<UserReport> => {
    const { data } = await apiClient.get(ENDPOINTS.myReport(reportId));
    return toUserReport(data);
  },
};

