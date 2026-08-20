/**
 * 관광정보 API — 한국관광공사 TourAPI 를 서버가 그대로 프록시합니다.
 *
 * TourAPI 원본 응답이라 필드가 전부 소문자에 문자열입니다(mapx/mapy/dist…).
 * 좌표가 문자열이라 Number 변환이 필요하고, 값이 빠지거나 빈 문자열로 오는
 * 경우가 흔해서 normalize 단계에서 전부 흡수한 뒤 화면용 모델로 넘깁니다.
 *
 * 응답 봉투는 다른 API 와 같은 `{ payload: ... }` 형태이고,
 * payload 안에 `{ pageNo, numOfRows, totalCount, items: [...] }` 가 들어옵니다.
 */
import { Platform } from 'react-native';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toApiError } from './errors';
import { APP_NAME } from '../config/userAgent';
import {
  CATEGORY_TO_CONTENT_TYPE,
  CONTENT_TYPE_TO_CATEGORY,
  type TourCategory,
  type TourPlace,
  type TourPlaceDetail,
  type TourPlacePage,
} from '../types/tourPlace';

/** TourAPI 가 요구하는 공통 파라미터 — 빠지면 서비스키 오류가 납니다. */
const COMMON_PARAMS = {
  MobileOS: Platform.OS === 'ios' ? 'IOS' : 'AND',
  MobileApp: APP_NAME,
} as const;

/** 한 번에 가져올 기본 개수 — 지도 마커가 너무 빽빽해지지 않는 선 */
const DEFAULT_ROWS = 50;

/**
 * 축제는 지역·좌표로 좁힐 수 없어 전국 목록을 통째로 받습니다.
 * 진행 중 + 예정 행사가 보통 200~300건이라 한 번에 담을 수 있는 크기입니다.
 */
const FESTIVAL_ROWS = 300;

/** 기본 검색 반경(m) */
export const DEFAULT_RADIUS = 5000;

/**
 * 축제 반경(m) — 관광지보다 훨씬 넓게 잡습니다.
 * 축제는 "지나가다 들르는 곳"이 아니라 "날 잡고 가는 곳"이라, 5km 로 자르면
 * 대부분의 지역에서 결과가 0건이 됩니다.
 */
export const FESTIVAL_RADIUS = 50000;

/** TourAPI 가 허용하는 최대 반경(m). 넘기면 결과가 비어 옵니다. */
const MAX_RADIUS = 20000;

type Raw = Record<string, unknown>;

function str(raw: Raw, key: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** '128.3682510740' → 128.368251. 숫자로 못 읽으면 null */
function num(raw: Raw, key: string): number | null {
  const value = raw[key];
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

/**
 * TourAPI 항목 → 화면 모델.
 * 좌표나 카테고리를 못 읽는 항목은 지도에 올릴 수 없으므로 null 로 버립니다.
 */
function normalize(raw: Raw): TourPlace | null {
  const id = str(raw, 'contentid');
  const lat = num(raw, 'mapy');
  const lng = num(raw, 'mapx');
  const contentTypeId = str(raw, 'contenttypeid');
  const category = CONTENT_TYPE_TO_CATEGORY[contentTypeId];

  if (!id || lat === null || lng === null || !category) {
    return null;
  }

  const title = str(raw, 'title');
  const tel = str(raw, 'tel');
  // firstimage 가 원본, firstimage2 가 썸네일입니다. 원본을 우선합니다.
  const image = str(raw, 'firstimage') || str(raw, 'firstimage2');

  return {
    id,
    title: title || '이름 없음',
    category,
    contentTypeId,
    lat,
    lng,
    address: [str(raw, 'addr1'), str(raw, 'addr2')]
      .filter(Boolean)
      .join(' ')
      .trim(),
    imageUrl: image ? toHttps(image) : null,
    distance: num(raw, 'dist'),
    tel: tel || null,
    eventStartDate: str(raw, 'eventstartdate') || null,
    eventEndDate: str(raw, 'eventenddate') || null,
  };
}

/**
 * TourAPI 이미지 주소는 http:// 로 옵니다.
 *
 * iOS 는 ATS(NSAllowsArbitraryLoads=false)가 공개 http 호스트를 막아 이미지가
 * 조용히 빈 칸으로 뜨고, 안드로이드도 릴리스 빌드에서는 cleartext 가 차단됩니다.
 * visitkorea 이미지 서버가 https 를 그대로 지원하므로 스킴만 올려 씁니다.
 */
function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * TourAPI 텍스트에는 <br>, <a href>, &amp; 같은 HTML 이 섞여 옵니다.
 * RN Text 는 태그를 해석하지 못해 그대로 노출되므로 여기서 정리합니다.
 */
function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // 태그를 걷어내면 빈 줄이 남기 쉬워서 3줄 이상 연속 줄바꿈을 줄입니다.
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 후보 키 중 값이 있는 첫 번째를 HTML 정리해서 돌려줍니다. 전부 비면 null */
function pickText(raw: Raw, keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) {
      const text = stripHtml(value);
      if (text) {
        return text;
      }
    }
  }
  return null;
}

/** `<a href="https://...">` 에서 주소만 뽑아 냅니다. */
function pickHomepage(raw: Raw): string | null {
  const value = raw.homepage;
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const href = /href=["']([^"']+)["']/i.exec(value);
  if (href) {
    return href[1];
  }
  const text = stripHtml(value);
  return text || null;
}

/** 공통 응답 봉투(`{ payload: ... }`)를 한 겹 벗깁니다. */
function unwrapPayload(data: unknown): Raw {
  const envelope = (data ?? {}) as Raw;
  return (envelope.payload ?? envelope.data ?? envelope) as Raw;
}

/** payload.items 배열을 가공 없이 꺼냅니다. */
function rawItems(data: unknown): Raw[] {
  const items = unwrapPayload(data).items;
  return Array.isArray(items) ? (items as Raw[]) : [];
}

/** `{ payload: { items: [...] } }` 에서 목록과 페이지 정보를 꺼냅니다. */
function toPage(data: unknown): TourPlacePage {
  const payload = unwrapPayload(data);

  const items = rawItems(data)
    .map(normalize)
    .filter((place): place is TourPlace => place !== null);

  return {
    items,
    pageNo: num(payload, 'pageNo') ?? 1,
    numOfRows: num(payload, 'numOfRows') ?? items.length,
    totalCount: num(payload, 'totalCount') ?? items.length,
  };
}

export type NearbyParams = {
  lat: number;
  lng: number;
  /** 검색 반경(m). 기본 5000, 최대 20000 */
  radius?: number;
  /** 지정하면 해당 카테고리만 서버에서 걸러 옵니다. */
  category?: TourCategory;
  rows?: number;
  pageNo?: number;
};

export const tourApi = {
  /**
   * 위치기반 관광정보 — 지도 마커의 기본 공급원.
   *
   * arrange='E' 는 거리순 정렬입니다(이미지 유무와 무관). 대표 이미지가 필요해
   * firstImageYN 을 켜고, 좌표·주소도 함께 받습니다.
   */
  nearby: async (
    { lat, lng, radius = DEFAULT_RADIUS, category, rows = DEFAULT_ROWS, pageNo = 1 }: NearbyParams,
    signal?: AbortSignal,
  ): Promise<TourPlacePage> => {
    try {
      const { data } = await apiClient.get(
        ENDPOINTS.tourLocationBased({
          ...COMMON_PARAMS,
          mapX: String(lng),
          mapY: String(lat),
          radius: String(Math.min(radius, MAX_RADIUS)),
          numOfRows: String(rows),
          pageNo: String(pageNo),
          arrange: 'E', // 거리순
          contentTypeId: category
            ? CATEGORY_TO_CONTENT_TYPE[category]
            : undefined,
        }),
        { signal },
      );
      return toPage(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  /**
   * 장소 상세 — 공통정보(개요·홈페이지) + 소개정보(이용시간·휴무·주차) + 추가 이미지.
   *
   * 세 요청을 병렬로 보내고, 하나가 실패해도 나머지로 화면을 채웁니다.
   * (특히 detailIntro2 는 콘텐츠 타입에 따라 아예 빈 응답이 오기도 합니다.)
   */
  detail: async (
    contentId: string,
    contentTypeId: string,
    signal?: AbortSignal,
  ): Promise<TourPlaceDetail> => {
    const params = { ...COMMON_PARAMS, contentId };

    const [common, intro, images] = await Promise.all([
      apiClient
        .get(ENDPOINTS.tourDetailCommon(params), { signal })
        .then(res => rawItems(res.data)[0] ?? {})
        .catch(() => ({} as Raw)),
      apiClient
        .get(ENDPOINTS.tourDetailIntro({ ...params, contentTypeId }), { signal })
        .then(res => rawItems(res.data)[0] ?? {})
        .catch(() => ({} as Raw)),
      apiClient
        .get(
          ENDPOINTS.tourDetailImage({ ...params, imageYN: 'Y', numOfRows: 10 }),
          { signal },
        )
        .then(res => rawItems(res.data))
        .catch(() => [] as Raw[]),
    ]);

    return {
      id: contentId,
      overview: pickText(common, ['overview']),
      homepage: pickHomepage(common),
      // 콘텐츠 타입마다 필드명이 달라 후보를 순서대로 훑습니다.
      useTime: pickText(intro, [
        'usetime',
        'usetimeculture',
        'usetimeleports',
        'usetimefestival',
        'opentimefood',
        'opentime',
        'playtime',
        'checkintime',
      ]),
      restDate: pickText(intro, [
        'restdate',
        'restdateculture',
        'restdateleports',
        'restdatefood',
        'restdateshopping',
      ]),
      parking: pickText(intro, [
        'parking',
        'parkingculture',
        'parkingleports',
        'parkingfood',
        'parkingshopping',
        'parkinglodging',
      ]),
      infoCenter: pickText(intro, [
        'infocenter',
        'infocenterculture',
        'infocenterleports',
        'infocenterfood',
        'infocentershopping',
        'infocenterlodging',
        'sponsor1tel',
      ]),
      imageUrls: images
        .map(item => str(item, 'originimgurl') || str(item, 'smallimageurl'))
        .filter(url => url.length > 0)
        .map(toHttps),
    };
  },

  /** 키워드 검색 — 카카오 장소검색과 달리 관광 콘텐츠만 나옵니다. */
  searchKeyword: async (
    keyword: string,
    { rows = DEFAULT_ROWS, pageNo = 1 }: { rows?: number; pageNo?: number } = {},
    signal?: AbortSignal,
  ): Promise<TourPlacePage> => {
    try {
      const { data } = await apiClient.get(
        ENDPOINTS.tourSearchKeyword({
          ...COMMON_PARAMS,
          keyword,
          numOfRows: rows,
          pageNo,
          arrange: 'O', // 제목순
        }),
        { signal },
      );
      return toPage(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  /**
   * 행사·축제 조회 — 전국 목록을 한 번에 받아옵니다.
   *
   * ⚠️ 이 엔드포인트는 지역·좌표로 좁힐 수 없습니다.
   *  - areaCode 를 넣으면 결과가 0건으로 오고, 응답의 areacode 필드도 비어 있습니다.
   *  - mapX/mapY/radius 를 넣으면 502(BAD_GATEWAY)가 납니다.
   * 대신 항목마다 좌표(mapx/mapy)가 모두 들어 있어, 거리 필터는 화면 쪽에서
   * 직접 겁니다(useNearbyFestivals 참고).
   *
   * eventStartDate 는 'YYYYMMDD' 이며 "그 날짜에 이미 진행 중이거나 이후에 시작하는
   * 행사"가 함께 옵니다. 오늘 날짜를 넣으면 진행 중 + 예정 축제를 모두 얻습니다.
   */
  festivals: async (
    {
      eventStartDate,
      eventEndDate,
      rows = FESTIVAL_ROWS,
    }: {
      eventStartDate: string;
      eventEndDate?: string;
      rows?: number;
    },
    signal?: AbortSignal,
  ): Promise<TourPlacePage> => {
    try {
      const { data } = await apiClient.get(
        ENDPOINTS.tourSearchFestival({
          ...COMMON_PARAMS,
          eventStartDate,
          eventEndDate,
          numOfRows: rows,
          pageNo: 1,
          arrange: 'A', // 제목순 — 어차피 화면에서 거리순으로 다시 정렬합니다.
        }),
        { signal },
      );
      return toPage(data);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
