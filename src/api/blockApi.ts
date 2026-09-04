/**
 * 사용자 차단 API 클라이언트 모음.
 * 인증이 필요한 요청이므로 apiClient 를 사용합니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toBlockResult, toBlockedUserList } from './blockMappers';
import type { BlockResult, BlockedUserList } from '../types/block';

export const blockApi = {
  /**
   * PUT /users/me/blocks/{userId} — 사용자 차단
   * 중복 호출되어도 안전하며, 내 피드·댓글에서 숨기고 상호 인터랙션을 차단합니다.
   */
  block: async (userId: string): Promise<BlockResult> => {
    const { data } = await apiClient.put(ENDPOINTS.userBlock(userId));
    return toBlockResult(data, userId);
  },

  /**
   * DELETE /users/me/blocks/{userId} — 사용자 차단 해제
   */
  unblock: async (userId: string): Promise<BlockResult> => {
    const { data } = await apiClient.delete(ENDPOINTS.userBlock(userId));
    return toBlockResult(data, userId);
  },

  /**
   * GET /users/me/blocks — 내 차단 목록 조회
   */
  list: async (params?: { page?: number; limit?: number }): Promise<BlockedUserList> => {
    const { data } = await apiClient.get(ENDPOINTS.userBlocks(params));
    return toBlockedUserList(data);
  },
};

