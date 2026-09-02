/**
 * 회원 탈퇴 API.
 *
 * 앱(저장소 루트)에는 아직 탈퇴 경로가 없어서 웹 쪽에 둡니다. 다만 요청은 앱과
 * 같은 apiClient 를 쓰므로 토큰 첨부·401 재발급·에러 정규화가 똑같이 적용됩니다.
 * 나중에 앱에도 탈퇴 화면이 생기면 이 파일을 SoloTrav/src/api 로 옮기면 됩니다.
 */
import { apiClient } from '@app/api/client';
import { toApiError } from '@app/api/errors';

/** DELETE /auth/me 응답 */
export type WithdrawalResult = {
  /** 탈퇴를 접수한 시각 */
  requestedAt: Date | null;
  /** 이 시각 이후 정기 작업에서 데이터가 영구 삭제됩니다 */
  purgeAfter: Date | null;
};

/** 서버가 준 ISO 문자열 → Date. 형식이 어긋나면 null 로 두고 화면에서 숨깁니다. */
function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const accountApi = {
  /**
   * DELETE /auth/me — 회원 탈퇴 예약.
   *
   * 즉시 삭제가 아니라 '예약' 입니다. 계정은 곧바로 사용 중지되고, 원본
   * 데이터는 일정 기간 뒤 정기 작업에서 지워집니다. 그 두 시각을 돌려줍니다.
   */
  withdraw: async (): Promise<WithdrawalResult> => {
    try {
      const { data } = await apiClient.delete('/auth/me');
      return {
        requestedAt: toDate(data?.requestedAt),
        purgeAfter: toDate(data?.purgeAfter),
      };
    } catch (error) {
      // 화면이 그대로 보여줄 수 있는 메시지로 바꿔 던집니다.
      throw toApiError(error);
    }
  },
};
