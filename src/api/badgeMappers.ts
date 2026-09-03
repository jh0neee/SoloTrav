/**
 * 여행 배지 응답 → 화면 모델 변환.
 *
 * 응답을 아직 실측하지 못해 방어적으로 씁니다.
 * - 목록이 배열로 바로 오는지 `{ badges: [...] }` 로 감싸 오는지 둘 다 받습니다.
 * - 아이콘 키는 서버가 안 줄 가능성이 높아 앱이 정합니다(아래 pickIcon 참고).
 */
import { unwrap } from './mappers';
import {
  BADGE_ICON_KEYS,
  type Badge,
  type BadgeCategory,
  type BadgeIcon,
  type BadgeImageKey,
} from '../types/badge';
import type { Envelope, TravelBadgeDto, TravelBadgeListDto } from './dto';
import { mergeBadgeCatalog } from '../data/badgeCatalog';

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
 * 없거나 모르는 값이면 카테고리에 맞는 임시 아이콘을 사용합니다.
 * 실제 배지 이미지가 준비되면 이 매핑을 이미지 URL 처리로 바꿀 수 있습니다.
 */
function pickIcon(dto: TravelBadgeDto): BadgeIcon {
  if (isBadgeIcon(dto.icon)) {
    return dto.icon;
  }
  const categoryIcons: Record<BadgeCategory, BadgeIcon> = {
    region: 'pin',
    exploration: 'spark',
    safety: 'shield',
    record: 'heart',
    streak: 'spark',
  };
  return categoryIcons[pickCategory(dto)];
}

/** 획득 여부: 불리언 필드 우선, 없으면 획득 일시 유무로 판단합니다. */
function isEarned(dto: TravelBadgeDto): boolean {
  const flag = dto.earned ?? dto.isEarned ?? dto.acquired;
  if (typeof flag === 'boolean') {
    return flag;
  }
  return !!firstString(dto.earnedAt, dto.acquiredAt);
}

const BADGE_CATEGORIES: readonly BadgeCategory[] = [
  'region',
  'exploration',
  'safety',
  'record',
  'streak',
];

function pickCategory(dto: TravelBadgeDto): BadgeCategory {
  const value = dto.category ?? dto.type;
  return typeof value === 'string' &&
    (BADGE_CATEGORIES as readonly string[]).includes(value)
    ? (value as BadgeCategory)
    : 'region';
}

function nonNegativeNumber(...values: unknown[]): number | null {
  const value = values.find(
    item => typeof item === 'number' && Number.isFinite(item),
  );
  return typeof value === 'number' ? Math.max(0, value) : null;
}

const BADGE_IMAGE_KEYS: readonly BadgeImageKey[] = [
  '00',
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  'cb_1',
  'cb_2',
  'cb_3',
  'cb_4',
  'cb_5',
  'cb_6',
  'cb_7',
  'cb_8',
  'cb_9',
  'cb_10',
  'cb_11',
];

const BADGE_IMAGE_ALIASES: Record<string, BadgeImageKey> = {
  firsttrip: '00',
  firstsolotrip: '00',
  solostarter: '00',
  혼행스타터: '00',
  첫혼행의설렘: '00',
  coursedesigner: '02',
  tripplanner: '02',
  나만의여행설계자: '02',
  preferencecomplete: '03',
  tastefinder: '03',
  취향발견자: '03',
  alleyexplorer: '04',
  골목탐험가: '04',
  festivalhunter: '05',
  축제사냥꾼: '05',
  solodining: '06',
  solofoodie: '06',
  혼밥마스터: '06',
  safetyfirst: '07',
  안전한첫걸음: '07',
  safetyreporter: '08',
  안전제보자: '08',
  travelwriter: '09',
  travelrecorder: '09',
  여행기록가: '09',
  fourseasons: '10',
  fourseasonstraveler: '10',
  사계절여행자: '10',
  regioncheongju: 'cb_1',
  청주시여행자: 'cb_1',
  regionchungju: 'cb_2',
  충주시여행자: 'cb_2',
  regionjecheon: 'cb_3',
  제천시여행자: 'cb_3',
  regionboeun: 'cb_4',
  보은군여행자: 'cb_4',
  regionokcheon: 'cb_5',
  옥천군여행자: 'cb_5',
  regionyeongdong: 'cb_6',
  영동군여행자: 'cb_6',
  regionjeungpyeong: 'cb_7',
  증평군여행자: 'cb_7',
  regionjincheon: 'cb_8',
  진천군여행자: 'cb_8',
  regiongoesan: 'cb_9',
  괴산군여행자: 'cb_9',
  regioneumseong: 'cb_10',
  음성군여행자: 'cb_10',
  regiondanyang: 'cb_11',
  단양군여행자: 'cb_11',
};

function normalizeBadgeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

function pickImageKey(dto: TravelBadgeDto, id: string): BadgeImageKey | null {
  const raw = dto.imageKey ?? dto.imageNumber;
  if (raw !== undefined && raw !== null) {
    const formatted = String(raw).padStart(2, '0');
    if ((BADGE_IMAGE_KEYS as readonly string[]).includes(formatted)) {
      return formatted as BadgeImageKey;
    }
  }

  const candidates = [id, dto.code, dto.name, dto.title, dto.badgeName];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const matched = BADGE_IMAGE_ALIASES[normalizeBadgeKey(candidate)];
    if (matched) return matched;
  }
  return null;
}

export function toBadge(dto: TravelBadgeDto): Badge | null {
  const rawId = dto.id ?? dto.badgeId ?? dto.code;
  if (rawId === undefined || rawId === null || String(rawId).length === 0) {
    return null;
  }
  const id = String(rawId);
  const earned = isEarned(dto);
  const target = Math.max(1, nonNegativeNumber(dto.target, dto.goal) ?? 1);
  const progress = Math.min(
    target,
    nonNegativeNumber(dto.progress, dto.current) ?? (earned ? target : 0),
  );
  return {
    id,
    name: firstString(dto.name, dto.title, dto.badgeName) ?? '배지',
    description: firstString(dto.description, dto.desc) ?? '',
    icon: pickIcon(dto),
    imageKey: pickImageKey(dto, id),
    earned,
    category: pickCategory(dto),
    progress,
    target,
    earnedAt: firstString(dto.earnedAt, dto.acquiredAt),
  };
}

/** 응답 → 배지 목록. 해석할 수 없는 항목은 조용히 버립니다. */
export function toTravelBadges(payload: unknown): Badge[] {
  const inner = unwrap(payload as Envelope<TravelBadgeListDto>);

  const list: unknown = Array.isArray(inner)
    ? inner
    : inner.badges ?? inner.items ?? inner.list;

  if (!Array.isArray(list)) {
    return mergeBadgeCatalog([]);
  }

  return mergeBadgeCatalog(
    list
      .map(item => toBadge(item as TravelBadgeDto))
      .filter((badge): badge is Badge => badge !== null),
  );
}
