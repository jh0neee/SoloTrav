/**
 * 사용자 차단 도메인 모델.
 * 서버 응답(DTO)이 아니라 앱 내부에서 다루는 모델입니다.
 */

export type BlockedUser = {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  blockedAt: Date | null;
};

export type BlockedUserList = {
  items: BlockedUser[];
  total: number;
  page: number;
  limit: number;
};

export type BlockResult = {
  userId: string;
  blocked: boolean;
};

