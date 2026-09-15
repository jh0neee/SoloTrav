import { apiClient } from './client';
import { ENDPOINTS, type ReferencePlaceResource } from './endpoints';
import { toApiError } from './errors';
import type { City } from '../data/cities';

type ReferencePlaceMapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type SafetyPlaceType =
  | 'hospital'
  | 'femaleHouse'
  | 'cctv'
  | 'emergencyBell'
  | 'clinic'
  | 'pharmacy'
  | 'affiliatedClinic'
  | 'toilet'
  | 'streetlight'
  | 'securityLight';

export type ReferencePlaceMapType = Extract<
  SafetyPlaceType,
  | 'cctv'
  | 'emergencyBell'
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'affiliatedClinic'
  | 'toilet'
>;

export type SafetyPlace = {
  id: string;
  type: SafetyPlaceType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  distance: number | null;
  roadAddress: string | null;
  parcelAddress: string | null;
  regionName: string | null;
  managementNumber: string | null;
  localGovernmentCode: string | null;
  installDetail: string | null;
};

export type SafetyPlacePage = {
  items: SafetyPlace[];
  total: number;
  hasMore: boolean;
};

type Raw = Record<string, unknown>;

/** 한 페이지 최대 건수 — 서버가 101 이상은 400 으로 거절합니다. */
const PAGE_SIZE = 100;
const MAP_PAGE_SIZE = 200;
const REFERENCE_MAP_RESOURCES: Record<
  ReferencePlaceMapType,
  ReferencePlaceResource
> = {
  cctv: 'cctvs',
  emergencyBell: 'emergency-bells',
  hospital: 'hospitals',
  clinic: 'clinics',
  pharmacy: 'pharmacies',
  affiliatedClinic: 'affiliated-clinics',
  toilet: 'toilets',
};
/**
 * 페이지 순회 상한. 청주 CCTV 가 약 2,900건(29페이지)으로 가장 많습니다.
 * 서버 total 이 잘못 와도 여기서 멈춥니다.
 */
const MAX_PAGES = 40;
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

function text(input: unknown): string | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const result = String(input).trim();
  return result || null;
}

function boolean(input: unknown): boolean | null {
  if (typeof input === 'boolean') return input;
  if (input === 'true' || input === 1 || input === '1') return true;
  if (input === 'false' || input === 0 || input === '0') return false;
  return null;
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
    'features',
    'securityLights',
    'securityLightList',
  ]) {
    const nested = raw[key];
    if (Array.isArray(nested)) return nested as Raw[];
    const found = rows(nested);
    if (found.length) return found;
  }
  return [];
}

function payloadOf(payload: unknown): Raw {
  if (!payload || typeof payload !== 'object') return {};
  const raw = payload as Raw;
  if (raw.payload && typeof raw.payload === 'object') {
    return raw.payload as Raw;
  }
  if (raw.data && typeof raw.data === 'object') {
    return raw.data as Raw;
  }
  return raw;
}

/**
 * 응답 봉투의 총 건수. 엔드포인트마다 이름이 달라 후보를 모두 봅니다.
 * (cctv·가로등: total / 병의원: totalCount / 음식업소: pagination.totalRows)
 */
function totalOf(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0;
  const raw = payload as Raw;
  const nested =
    raw.payload && typeof raw.payload === 'object' ? (raw.payload as Raw) : raw;
  const pagination = nested.pagination as Raw | undefined;
  return (
    number(value(nested, ['total', 'totalCount'])) ??
    number(pagination?.totalRows) ??
    0
  );
}

function normalize(
  raw: Raw,
  type: SafetyPlaceType,
  index: number,
): SafetyPlace | null {
  const properties =
    raw.properties && typeof raw.properties === 'object'
      ? (raw.properties as Raw)
      : {};
  const source = { ...raw, ...properties };
  const geometry =
    raw.geometry && typeof raw.geometry === 'object'
      ? (raw.geometry as Raw)
      : null;
  const coordinates = Array.isArray(geometry?.coordinates)
    ? geometry.coordinates
    : null;
  const lat = number(
    value(source, [
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
    ]) ?? coordinates?.[1],
  );
  const lng = number(
    value(source, [
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
    ]) ?? coordinates?.[0],
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
    emergencyBell: '공공 비상벨',
    clinic: '의원',
    pharmacy: '약국',
    affiliatedClinic: '부속의료기관',
    toilet: '공중화장실',
    streetlight: '스마트 가로등',
    securityLight: '보안등',
  }[type];
  const roadAddress = text(
    value(source, [
      'roadAddress',
      'road_address',
      '도로명주소',
      '소재지도로명주소',
    ]),
  );
  const parcelAddress = text(
    value(source, [
      'parcelAddress',
      'parcel_address',
      '지번주소',
      '소재지주소',
    ]),
  );
  return {
    id: `${type}-${String(
      value(source, [
        'id',
        'hpid',
        'facilityId',
        'securityLightId',
        'security_light_id',
        'managementNumber',
        'management_number',
        'managementNo',
        '관리번호',
      ]) ?? index,
    )}`,
    type,
    name: String(
      value(source, [
        'name',
        'title',
        'hospitalName',
        'dutyName',
        'facilityName',
        'securityLightName',
        'security_light_name',
        'companyName',
        'businessName',
        '상호명',
        '업소명',
        '기관명',
      ]) ?? fallback,
    ),
    address: String(
      value(source, [
        'address',
        'roadAddress',
        'road_address',
        'parcel_address',
        'dutyAddr',
        'location',
        'locationAddress',
        'location_address',
        '소재지도로명주소',
        '도로명주소',
        '소재지주소',
      ]) ?? '',
    ),
    phone:
      String(
        value(source, [
          'phone',
          'tel',
          'telephone',
          'management_phone_number',
          'dutyTel1',
          '전화번호',
        ]) ?? '',
      ) || null,
    distance: number(value(source, ['distance', 'distanceMeters', 'dist'])),
    roadAddress,
    parcelAddress,
    regionName: text(value(source, ['regionName', 'region_name'])),
    managementNumber: text(
      value(source, [
        'managementNumber',
        'management_number',
        'managementNo',
        '관리번호',
      ]),
    ),
    localGovernmentCode: text(
      value(source, ['localGovernmentCode', 'local_government_code']),
    ),
    installDetail: text(
      value(source, [
        'installDetail',
        'install_detail',
        'installationLocation',
        'installation_location',
        'installationPurpose',
        'installation_purpose',
        '설치장소',
      ]),
    ),
    lat,
    lng,
  };
}

function pageInfo(payload: unknown, itemCount: number) {
  const root = payloadOf(payload);
  const pagination =
    root.pagination && typeof root.pagination === 'object'
      ? (root.pagination as Raw)
      : root;
  const total =
    number(value(pagination, ['total', 'totalCount', 'totalElements'])) ??
    itemCount;
  const page = number(value(pagination, ['page', 'currentPage'])) ?? 1;
  const limit =
    number(value(pagination, ['limit', 'size', 'pageSize'])) ?? MAP_PAGE_SIZE;
  const explicitHasMore = boolean(
    value(pagination, ['hasMore', 'has_more', 'hasNext']),
  );
  return {
    total,
    hasMore: explicitHasMore ?? page * limit < total,
  };
}

/**
 * 페이지를 끝까지 순회해 행을 모읍니다.
 * 서버가 준 총 건수만큼만 돌고, 빈 페이지가 오면 그 전에 멈춥니다.
 */
async function fetchAllPages(
  pathOf: (page: number) => string,
  signal?: AbortSignal,
): Promise<Raw[]> {
  const collected: Raw[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await apiClient.get(pathOf(page), { signal });
    const pageRows = rows(data);
    collected.push(...pageRows);
    const total = totalOf(data);
    if (pageRows.length === 0 || collected.length >= total) break;
  }
  return collected;
}

function fetchReferencePlacePages(
  resource: ReferencePlaceResource,
  city: City,
  signal?: AbortSignal,
) {
  return fetchAllPages(
    page =>
      ENDPOINTS.referencePlaces(resource, {
        page,
        limit: PAGE_SIZE,
        regionName: `${city.sido} ${city.sigungu}`,
      }),
    signal,
  );
}

/**
 * 레이어별 조회. 사용자 좌표는 보내지 않고 시군명·코드로만 좁힙니다.
 * 엔드포인트마다 필터·페이징 규약이 달라 한 곳에 모아 둡니다(endpoints.ts 주석 참고).
 */
async function fetchRaw(
  type: SafetyPlaceType,
  city: City,
  signal?: AbortSignal,
): Promise<Raw[]> {
  switch (type) {
    case 'cctv':
      return fetchAllPages(
        page =>
          ENDPOINTS.cctvs({
            localGovernmentCode: city.cctvLocalGovernmentCode,
            page,
            limit: PAGE_SIZE,
          }),
        signal,
      );
    case 'emergencyBell':
      return fetchAllPages(
        page =>
          ENDPOINTS.emergencyBells({
            page,
            limit: PAGE_SIZE,
            regionName: `${city.sido} ${city.sigungu}`,
          }),
        signal,
      );
    case 'clinic':
      return fetchReferencePlacePages('clinics', city, signal);
    case 'pharmacy':
      return fetchReferencePlacePages('pharmacies', city, signal);
    case 'affiliatedClinic':
      return fetchReferencePlacePages('affiliated-clinics', city, signal);
    case 'toilet':
      return fetchReferencePlacePages('toilets', city, signal);
    case 'streetlight':
      return fetchAllPages(
        page =>
          ENDPOINTS.smartStreetlights({
            sido: city.sido,
            sigungu: city.sigungu,
            page,
            limit: PAGE_SIZE,
          }),
        signal,
      );
    case 'securityLight': {
      const { data } = await apiClient.get(ENDPOINTS.securityLightsNearby(), {
        signal,
      });
      return rows(data);
    }
    case 'hospital':
      return fetchAllPages(
        pageNo =>
          ENDPOINTS.hospitals({
            sido: city.sido,
            sigungu: city.sigungu,
            pageNo,
            numOfRows: PAGE_SIZE,
          }),
        signal,
      );
    case 'femaleHouse': {
      const { data } = await apiClient.get(ENDPOINTS.femaleSafetyHouses(), {
        signal,
      });
      return rows(data);
    }
  }
}

export const safetyPlaceApi = {
  map: async (
    type: ReferencePlaceMapType,
    bounds: ReferencePlaceMapBounds,
    signal?: AbortSignal,
  ): Promise<SafetyPlacePage> => {
    try {
      const path = ENDPOINTS.referencePlacesMap(REFERENCE_MAP_RESOURCES[type], {
        ...bounds,
        page: 1,
        limit: MAP_PAGE_SIZE,
      });
      const { data } = await apiClient.get(path, { signal });
      const items = rows(data)
        .map((item, index) => normalize(item, type, index))
        .filter((item): item is SafetyPlace => item !== null);
      return { items, ...pageInfo(data, items.length) };
    } catch (error) {
      throw toApiError(error);
    }
  },
  list: async (
    type: SafetyPlaceType,
    /** 조회할 충북 시군 */
    city: City,
    signal?: AbortSignal,
  ): Promise<SafetyPlace[]> => {
    try {
      return (await fetchRaw(type, city, signal))
        .map((item, index) => normalize(item, type, index))
        .filter((item): item is SafetyPlace => item !== null);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
