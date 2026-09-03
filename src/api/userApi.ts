/**
 * 마이페이지 API 요청 모음.
 * 전부 인증이 필요한 요청이라 apiClient(Authorization 자동 첨부)를 씁니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toMeUser } from './mappers';
import {
  toPreferenceAnswers,
  toTravelPreferenceRequest,
} from './preferenceMappers';
import { toBadge, toTravelBadges } from './badgeMappers';
import { unwrap } from './mappers';
import type { Envelope, VisitCheckInResponseDto } from './dto';
import type { PreferenceAnswers } from '../data/preferences';
import type { AuthUser } from '../types/auth';
import type {
  Badge,
  VisitCheckInInput,
  VisitCheckInResult,
} from '../types/badge';

export const userApi = {
  /** GET /users/me — 내 정보 조회 */
  getMe: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get(ENDPOINTS.me());
    return toMeUser(data);
  },

  /** DELETE /auth/me — 현재 로그인한 회원의 탈퇴 예약 */
  requestWithdrawal: async (): Promise<void> => {
    await apiClient.delete(ENDPOINTS.withdrawal());
  },

  /**
   * GET /users/me/travel-preferences — 내 여행 취향 조회.
   * 한 번도 등록하지 않았으면 null 입니다.
   */
  getTravelPreferences: async (): Promise<PreferenceAnswers | null> => {
    const { data } = await apiClient.get(ENDPOINTS.travelPreferences());
    return toPreferenceAnswers(data);
  },

  /**
   * GET /users/me/travel-badges — 내 여행 배지 조회.
   * 아직 아무 배지도 없으면 빈 배열입니다.
   */
  getTravelBadges: async (): Promise<Badge[]> => {
    const { data } = await apiClient.get(ENDPOINTS.travelBadges());
    return toTravelBadges(data);
  },

  /**
   * 현장 방문 인증. 사용자/장소 좌표는 요청에도 넣지 않습니다.
   * distanceMeters 는 기기 메모리에서 계산한 뒤 정수값만 보냅니다.
   */
  checkInPlace: async (
    input: VisitCheckInInput,
  ): Promise<VisitCheckInResult> => {
    const { data } = await apiClient.post(ENDPOINTS.placeCheckIns(), input);
    const body = unwrap(data as Envelope<VisitCheckInResponseDto>);
    const rawBadges = body.newlyEarnedBadges ?? body.earnedBadges ?? [];
    return {
      checkedIn: body.checkedIn ?? body.verified ?? true,
      alreadyCheckedIn: body.alreadyCheckedIn ?? body.duplicate ?? false,
      newlyEarnedBadges: rawBadges
        .map(toBadge)
        .filter((badge): badge is Badge => badge !== null),
    };
  },

  /**
   * POST /users/me/travel-preferences — 등록/편집.
   *
   * 서버가 저장 결과를 그대로 돌려주면 그 값을 쓰고(서버가 정규화했을 수 있으니),
   * 응답 본문이 비어 있으면 방금 보낸 답변을 그대로 씁니다.
   */
  saveTravelPreferences: async (
    answers: PreferenceAnswers,
  ): Promise<PreferenceAnswers> => {
    const body = toTravelPreferenceRequest(answers);
    const { data } = await apiClient.post(ENDPOINTS.travelPreferences(), body);
    return toPreferenceAnswers(data) ?? answers;
  },
};
