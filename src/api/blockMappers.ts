/**
 * 사용자 차단 API DTO → 도메인 모델 변환.
 */
import { unwrap } from './mappers';
import type { Envelope, BlockedUserDto, BlockedUserListResponseDto, BlockUserResponseDto } from './dto';
import type { BlockedUser, BlockedUserList, BlockResult } from '../types/block';

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

export function toBlockResult(payload: unknown, defaultUserId = ''): BlockResult {
  const dto = unwrap(payload as Envelope<BlockUserResponseDto>);
  const userId = toValidString(dto.userId) ?? defaultUserId;
  const blocked = typeof dto.blocked === 'boolean' ? dto.blocked : true;
  return { userId, blocked };
}

export function toBlockedUser(dto: BlockedUserDto): BlockedUser {
  const userId = toValidString(dto.userId) ?? '';
  const nickname =
    toValidString(dto.nickname) ??
    toValidString(dto.nickName) ??
    toValidString(dto.name) ??
    '차단된 사용자';

  const profileImageUrl =
    toValidString(dto.profileImageUrl) ??
    toValidString(dto.profile_image_url) ??
    toValidString(dto.profileImage);

  const blockedAt =
    toValidDate(dto.blockedAt) ??
    toValidDate(dto.createdAt);

  return {
    userId,
    nickname,
    profileImageUrl,
    blockedAt,
  };
}

export function toBlockedUserList(payload: unknown): BlockedUserList {
  const dto = unwrap(payload as Envelope<BlockedUserListResponseDto>);
  const rawItems = Array.isArray(dto.items) ? dto.items : [];
  const items = rawItems
    .map(toBlockedUser)
    .filter(user => !!user.userId);

  return {
    items,
    total: typeof dto.total === 'number' ? dto.total : items.length,
    page: typeof dto.page === 'number' ? dto.page : 1,
    limit: typeof dto.limit === 'number' ? dto.limit : 20,
  };
}

