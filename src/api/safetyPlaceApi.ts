import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toApiError } from './errors';

export type SafetyPlaceType =
  | 'hospital'
  | 'femaleHouse'
  | 'cctv'
  | 'streetlight'
  | 'food';

export type SafetyPlace = {
  id: string;
  type: SafetyPlaceType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  distance: number | null;
};

type Raw = Record<string, unknown>;

const PATH: Record<SafetyPlaceType, string> = {
  hospital: ENDPOINTS.hospitals(),
  femaleHouse: ENDPOINTS.femaleSafetyHouses(),
  cctv: ENDPOINTS.cctvs(),
  streetlight: ENDPOINTS.smartStreetlights(),
  food: ENDPOINTS.chungbukFoods({ currentPage: 1, perPage: 100 }),
};

function value(raw: Raw, keys: string[]): unknown {
  for (const key of keys) {
    const found = raw[key];
    if (found !== undefined && found !== null && found !== '') return found;
  }
}

function number(input: unknown): number | null {
  const parsed = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function rows(payload: unknown): Raw[] {
  if (Array.isArray(payload)) return payload as Raw[];
  if (!payload || typeof payload !== 'object') return [];
  const raw = payload as Raw;
  for (const key of [
    'payload',
    'data',
    'items',
    'content',
    'results',
    'rows',
  ]) {
    const nested = raw[key];
    if (Array.isArray(nested)) return nested as Raw[];
    const found = rows(nested);
    if (found.length) return found;
  }
  return [];
}

function normalize(
  raw: Raw,
  type: SafetyPlaceType,
  index: number,
): SafetyPlace | null {
  const lat = number(
    value(raw, [
      'lat',
      'latitude',
      'wgs84Lat',
      'refineWgs84Lat',
      'y',
      'mapY',
      'mapy',
      '위도',
      'LATITUDE',
      'REFINE_WGS84_LAT',
    ]),
  );
  const lng = number(
    value(raw, [
      'lng',
      'lon',
      'longitude',
      'wgs84Lon',
      'refineWgs84Logt',
      'x',
      'mapX',
      'mapx',
      '경도',
      'LONGITUDE',
      'REFINE_WGS84_LOGT',
    ]),
  );
  if (
    lat === null ||
    lng === null ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }
  const fallback = {
    hospital: '병·의원',
    femaleHouse: '여성안심지킴이집',
    cctv: 'CCTV',
    streetlight: '스마트 가로등',
    food: '음식업소',
  }[type];
  return {
    id: `${type}-${String(
      value(raw, ['id', 'hpid', 'facilityId', 'managementNo', '관리번호']) ??
        index,
    )}`,
    type,
    name: String(
      value(raw, [
        'name',
        'title',
        'hospitalName',
        'dutyName',
        'facilityName',
        'companyName',
        'businessName',
        '상호명',
        '업소명',
        '기관명',
      ]) ?? fallback,
    ),
    address: String(
      value(raw, [
        'address',
        'roadAddress',
        'dutyAddr',
        'location',
        '소재지도로명주소',
        '도로명주소',
        '소재지주소',
      ]) ?? '',
    ),
    phone:
      String(
        value(raw, ['phone', 'tel', 'telephone', 'dutyTel1', '전화번호']) ?? '',
      ) || null,
    distance: number(value(raw, ['distance', 'distanceMeters', 'dist'])),
    lat,
    lng,
  };
}

export const safetyPlaceApi = {
  list: async (
    type: SafetyPlaceType,
    signal?: AbortSignal,
  ): Promise<SafetyPlace[]> => {
    try {
      const { data } = await apiClient.get(PATH[type], { signal });
      return rows(data)
        .map((item, index) => normalize(item, type, index))
        .filter((item): item is SafetyPlace => item !== null);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
