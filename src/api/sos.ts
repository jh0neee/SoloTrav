/**
 * SOS API — 비상벨 화면에서 쓰는 주변 안전 시설 조회.
 *
 * 응답 필드명이 서버 구현에 따라 조금씩 다를 수 있어(name/facilityName 등)
 * normalize 단계에서 흔한 이름들을 함께 받아 화면용 형태로 정리합니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toApiError } from './errors';

/** 시설 종류 — 목록 왼쪽 아이콘을 고르는 데 씁니다. */
export type SafetyFacilityType =
  | 'police'
  | 'fire'
  | 'store'
  | 'medical'
  | 'etc';

/** 화면이 그대로 쓰는 안전 시설 한 건 */
export type SafetyFacility = {
  id: string;
  name: string;
  type: SafetyFacilityType;
  /** 원본 거리(m). 반경 필터·정렬에 씁니다. 서버가 안 주면 null */
  distanceMeters: number | null;
  /** 예: '380m' */
  distanceText: string;
  /** 예: '도보 5분' */
  walkTimeText: string;
  /** 하이픈 포함 표시용 번호. 없으면 전화 버튼을 숨깁니다. */
  phone: string | null;
};

export type SafetyFacilityParams = {
  latitude: number;
  longitude: number;
  /** 기본 3 */
  limit?: number;
};

/** 서버 응답 한 건 — 필드가 없을 수 있어 전부 optional 로 둡니다. */
type RawFacility = Record<string, unknown>;

const DEFAULT_LIMIT = 3;

/**
 * 결과로 인정할 최대 거리(m).
 *
 * 비상 상황에 쓰는 화면이라 "가장 가까운" 이 걸어갈 수 없는 거리면 아무 도움이
 * 안 됩니다. 서버는 등록된 시설 중 가까운 순으로만 돌려줄 뿐 반경을 자르지
 * 않으므로(현재 등록 데이터가 단양군뿐이라 다른 지역에서는 90km 넘는 결과가
 * 옵니다) 여기서 잘라내고, 화면은 빈 목록의 안내 문구를 그대로 씁니다.
 */
const MAX_DISTANCE_M = 5000;

/** 도보 속도 4km/h ≒ 분당 67m. 서버가 소요시간을 안 줄 때만 씁니다. */
const WALK_METERS_PER_MIN = 67;

function pick(raw: RawFacility, keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  const num = typeof value === 'string' ? Number(value) : value;
  return typeof num === 'number' && Number.isFinite(num) ? num : null;
}

/** 카테고리 문자열에서 아이콘 종류를 추론합니다. */
function toType(value: unknown): SafetyFacilityType {
  const text = String(value ?? '').toLowerCase();
  if (/police|경찰|파출소|지구대|치안/.test(text)) {
    return 'police';
  }
  // 서버가 FIRE_STATION 으로 내려주는데 예전에는 걸리는 규칙이 없어
  // 소방서가 일반 핀(etc)으로 나왔습니다.
  if (/fire|소방|119/.test(text)) {
    return 'fire';
  }
  if (/store|convenience|편의점|마트|gs25|cu|세븐일레븐/.test(text)) {
    return 'store';
  }
  if (/medical|hospital|emergency|병원|의료|약국|응급/.test(text)) {
    return 'medical';
  }
  return 'etc';
}

/** 1200 → '1.2km', 380 → '380m' */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

function normalize(raw: RawFacility, index: number): SafetyFacility {
  const name = String(
    pick(raw, ['name', 'facilityName', 'placeName', 'title']) ?? '이름 없음',
  );
  const meters = toNumber(
    pick(raw, ['distance', 'distanceMeters', 'distanceM']),
  );
  const minutes =
    toNumber(
      pick(raw, ['walkingTime', 'walkTime', 'walkingMinutes', 'duration']),
    ) ??
    (meters !== null ? Math.max(1, Math.round(meters / WALK_METERS_PER_MIN)) : null);
  const phone = pick(raw, ['phone', 'phoneNumber', 'tel', 'telephone', 'contact']);

  return {
    id: String(pick(raw, ['id', 'facilityId', 'placeId']) ?? `facility-${index}`),
    name,
    type: toType(
      pick(raw, ['type', 'category', 'facilityType', 'categoryName']) ?? name,
    ),
    distanceMeters: meters,
    distanceText: meters !== null ? formatDistance(meters) : '거리 정보 없음',
    walkTimeText: minutes !== null ? `도보 ${minutes}분` : '',
    phone: phone ? String(phone) : null,
  };
}

/**
 * 응답에서 목록만 뽑아냅니다.
 *
 * 이 서버의 공통 봉투는 `{ payload: [...], code, message, ... }` 입니다
 * (src/api/dto.ts 의 Envelope 참고). 나머지 키들은 다른 형태로 내려올 때를
 * 대비한 fallback 이라, **payload 를 가장 먼저** 봐야 합니다.
 */
function extractList(payload: unknown): RawFacility[] {
  if (Array.isArray(payload)) {
    return payload as RawFacility[];
  }
  if (payload && typeof payload === 'object') {
    for (const key of [
      'payload',
      'data',
      'result',
      'items',
      'facilities',
      'content',
    ]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value as RawFacility[];
      }
      // { data: { content: [...] } } 처럼 한 겹 더 감싼 경우
      if (value && typeof value === 'object') {
        const nested = extractList(value);
        if (nested.length) {
          return nested;
        }
      }
    }
  }
  return [];
}

export const sosApi = {
  /**
   * GET /sos/safety-facilities — 현위치에서 가장 가까운 안전 시설 목록.
   * signal 을 넘기면 화면을 벗어날 때 요청을 취소할 수 있습니다.
   */
  safetyFacilities: async (
    { latitude, longitude, limit = DEFAULT_LIMIT }: SafetyFacilityParams,
    signal?: AbortSignal,
  ): Promise<SafetyFacility[]> => {
    try {
      const { data } = await apiClient.get(
        // 스펙상 좌표 query 는 문자열이라 그대로 문자열로 보냅니다.
        ENDPOINTS.safetyFacilities({
          latitude: String(latitude),
          longitude: String(longitude),
          limit,
        }),
        { signal },
      );
      return extractList(data)
        .map(normalize)
        // 거리를 모르는 건은 남깁니다 — 서버가 값을 안 준 것뿐일 수 있습니다.
        .filter(f => f.distanceMeters === null || f.distanceMeters <= MAX_DISTANCE_M)
        .slice(0, limit);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
