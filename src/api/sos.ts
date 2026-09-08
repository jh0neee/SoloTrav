/**
 * SOS API — 비상벨 화면에서 쓰는 주변 안전 시설 조회.
 *
 * 서버는 사용자의 상세 위경도 좌표를 받지 않으며(개인정보 보호),
 * 시도/시군구 단위(regionName)로 여성안심지킴이집 목록을 내려줍니다.
 *
 * 클라이언트에서 현재 GPS 좌표와의 거리를 Haversine 공식으로 직접 계산하여
 * 가장 가까운 순으로 정렬 후 화면에 노출합니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toApiError } from './errors';
import { getDistanceMeters } from '../data/cities';

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
  /** 시설 위도 (거리 계산/지도 표시용) */
  latitude: number | null;
  /** 시설 경도 (거리 계산/지도 표시용) */
  longitude: number | null;
  /** 원본 거리(m). 반경 필터·정렬에 씁니다. */
  distanceMeters: number | null;
  /** 예: '380m' */
  distanceText: string;
  /** 예: '도보 5분' */
  walkTimeText: string;
  /** 하이픈 포함 표시용 번호. 없으면 전화 버튼을 숨깁니다. */
  phone: string | null;
  /** 주소 */
  address: string | null;
  /** 영업 여부 */
  openNow: boolean | null;
};

export type SafetyFacilityParams = {
  /** 정식 시도/시군구명 (예: '충청북도 단양군', '인천광역시 연수구') */
  regionName: string;
  /** 사용자 현재 좌표 — 거리 계산 및 정렬용 (서버로 전송하지 않음) */
  currentCoords?: {
    latitude: number;
    longitude: number;
  };
  /** 화면에 최종 표시할 개수 (기본 3) */
  limit?: number;
};

/** 서버 응답 한 건 */
type RawFacility = Record<string, unknown>;

const DEFAULT_LIMIT = 3;
/** 서버에서 시군구 단위로 가져올 시설 목록 개수 (최대 50) */
const SERVER_FETCH_LIMIT = 30;

/** 도보 속도 4km/h ≒ 분당 67m. */
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
  if (/fire|소방|119/.test(text)) {
    return 'fire';
  }
  // SAFE_RETURN(여성안심지킴이집), 편의점, 마트 등
  if (
    /safe_return|safety_house|지킴이|안심|store|convenience|편의점|마트|gs25|cu|세븐일레븐|이마트24|미니스톱/.test(
      text,
    )
  ) {
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

function normalize(
  raw: RawFacility,
  index: number,
  currentCoords?: { latitude: number; longitude: number },
): SafetyFacility {
  const name = String(
    pick(raw, ['name', 'facilityName', 'placeName', 'title']) ?? '이름 없음',
  );
  const lat = toNumber(
    pick(raw, [
      'latitude',
      'lat',
      'wgs84Lat',
      'refineWgs84Lat',
      'y',
      'mapY',
      'mapy',
    ]),
  );
  const lng = toNumber(
    pick(raw, [
      'longitude',
      'lng',
      'lon',
      'wgs84Lon',
      'refineWgs84Logt',
      'x',
      'mapX',
      'mapx',
    ]),
  );
  const phone = pick(raw, [
    'phone',
    'phoneNumber',
    'tel',
    'telephone',
    'contact',
  ]);
  const address = pick(raw, [
    'address',
    'roadAddress',
    'dutyAddr',
    'location',
  ]);
  const openNow =
    raw.openNow === true ? true : raw.openNow === false ? false : null;

  // 클라이언트에서 현재 위치와 시설 위치 간 거리 계산
  let meters: number | null = null;
  if (currentCoords && lat !== null && lng !== null) {
    meters = getDistanceMeters(
      currentCoords.latitude,
      currentCoords.longitude,
      lat,
      lng,
    );
  } else {
    meters = toNumber(pick(raw, ['distance', 'distanceMeters', 'distanceM']));
  }

  const minutes =
    toNumber(
      pick(raw, ['walkingTime', 'walkTime', 'walkingMinutes', 'duration']),
    ) ??
    (meters !== null
      ? Math.max(1, Math.round(meters / WALK_METERS_PER_MIN))
      : null);

  return {
    id: String(
      pick(raw, ['id', 'facilityId', 'placeId']) ?? `facility-${index}`,
    ),
    name,
    type: toType(
      pick(raw, ['type', 'category', 'facilityType', 'categoryName']) ?? name,
    ),
    latitude: lat,
    longitude: lng,
    distanceMeters: meters,
    distanceText: meters !== null ? formatDistance(meters) : '거리 정보 없음',
    walkTimeText: minutes !== null ? `도보 ${minutes}분` : '',
    phone: phone ? String(phone) : null,
    address: address ? String(address) : null,
    openNow,
  };
}

/**
 * 응답에서 목록만 뽑아냅니다.
 *
 * 공통 봉투 { payload: [...], code, message, ... } 기준
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
   * GET /sos/safety-facilities — 시도/시군구(regionName) 기준 안전 시설 목록 조회.
   * 사용자 좌표는 서버로 전송하지 않고, 클라이언트에서 로컬 거리 계산 및 정렬을 수행합니다.
   */
  safetyFacilities: async (
    {
      regionName,
      currentCoords,
      limit = DEFAULT_LIMIT,
    }: SafetyFacilityParams,
    signal?: AbortSignal,
  ): Promise<SafetyFacility[]> => {
    try {
      // 서버에는 regionName 과 limit 만 전송 (좌표는 절대 전송하지 않음)
      const { data } = await apiClient.get(
        ENDPOINTS.safetyFacilities({
          regionName,
          limit: SERVER_FETCH_LIMIT,
        }),
        { signal },
      );

      const list = extractList(data).map((item, index) =>
        normalize(item, index, currentCoords),
      );

      // 현재 좌표가 있으면 가장 가까운 순서로 정렬
      if (currentCoords) {
        list.sort((a, b) => {
          if (a.distanceMeters === null && b.distanceMeters === null) return 0;
          if (a.distanceMeters === null) return 1;
          if (b.distanceMeters === null) return -1;
          return a.distanceMeters - b.distanceMeters;
        });
      }

      return list.slice(0, limit);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
