/**
 * 여행 배지 응답 → 화면 모델 변환.
 *
 * 응답을 아직 실측하지 못해 방어적으로 씁니다.
 * - 목록이 배열로 바로 오는지 `{ badges: [...] }` 로 감싸 오는지 둘 다 받습니다.
 * - 아이콘 키는 서버가 안 줄 가능성이 높아 앱이 정합니다(아래 pickIcon 참고).
 */
import { unwrap } from './mappers';
import { BADGE_ICON_KEYS, type Badge, type BadgeIcon } from '../types/badge';
import type { Envelope, TravelBadgeDto, TravelBadgeListDto } from './dto';

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function isBadgeIcon(value: unknown): value is BadgeIcon {
  return (
    typeof value === 'string' &&
    (BADGE_ICON_KEYS as readonly string[]).includes(value)
  );
}

/**
 * 아이콘 키 결정.
 * 서버가 우리 4종(pin/spark/shield/heart) 중 하나를 주면 그대로 쓰고,
 * 없거나 모르는 값이면 id 로 고르게 나눕니다. 무작위가 아니라 id 기반이라
 * 다시 불러와도 같은 배지는 항상 같은 아이콘으로 보입니다.
 */
function pickIcon(dto: TravelBadgeDto, id: string): BadgeIcon {
  if (isBadgeIcon(dto.icon)) {
    return dto.icon;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % BADGE_ICON_KEYS.length;
  }
  return BADGE_ICON_KEYS[hash];
}

/** 획득 여부: 불리언 필드 우선, 없으면 획득 일시 유무로 판단합니다. */
function isEarned(dto: TravelBadgeDto): boolean {
  const flag = dto.earned ?? dto.isEarned ?? dto.acquired;
  if (typeof flag === 'boolean') {
    return flag;
  }
  return !!firstString(dto.earnedAt, dto.acquiredAt);
}

function toBadge(dto: TravelBadgeDto): Badge | null {
  const rawId = dto.id ?? dto.badgeId ?? dto.code;
  if (rawId === undefined || rawId === null || String(rawId).length === 0) {
    return null;
  }
  const id = String(rawId);
  return {
    id,
    name: firstString(dto.name, dto.title, dto.badgeName) ?? '배지',
    description: firstString(dto.description, dto.desc) ?? '',
    icon: pickIcon(dto, id),
    earned: isEarned(dto),
  };
}

/** 응답 → 배지 목록. 해석할 수 없는 항목은 조용히 버립니다. */
export function toTravelBadges(payload: unknown): Badge[] {
  const inner = unwrap(payload as Envelope<TravelBadgeListDto>);

  const list: unknown = Array.isArray(inner)
    ? inner
    : inner.badges ?? inner.items ?? inner.list;

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map(item => toBadge(item as TravelBadgeDto))
    .filter((badge): badge is Badge => badge !== null);
}
