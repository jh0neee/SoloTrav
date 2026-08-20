/**
 * 한국관광공사 관광정보(TourAPI) 도메인 모델.
 *
 * 서버가 TourAPI 를 그대로 프록시하기 때문에 응답 필드명이 전부 소문자입니다
 * (contentid / contenttypeid / mapx / mapy …). 화면에서는 이 파일의 모델만 씁니다.
 */

/** 지도 필터 칩과 1:1로 대응하는 카테고리 */
export type TourCategory =
  | 'attraction' // 관광지
  | 'culture' // 문화시설
  | 'festival' // 축제·공연·행사
  | 'course' // 여행코스
  | 'leports' // 레포츠
  | 'stay' // 숙박
  | 'shopping' // 쇼핑
  | 'food'; // 음식점

/**
 * TourAPI contentTypeId → 앱 카테고리.
 * 여기 없는 값은 카테고리를 정할 수 없어 마커에서 제외합니다.
 */
export const CONTENT_TYPE_TO_CATEGORY: Record<string, TourCategory> = {
  '12': 'attraction',
  '14': 'culture',
  '15': 'festival',
  '25': 'course',
  '28': 'leports',
  '32': 'stay',
  '38': 'shopping',
  '39': 'food',
};

/** 카테고리 → contentTypeId (조회할 때 서버로 되돌려 보냅니다) */
export const CATEGORY_TO_CONTENT_TYPE: Record<TourCategory, string> = {
  attraction: '12',
  culture: '14',
  festival: '15',
  course: '25',
  leports: '28',
  stay: '32',
  shopping: '38',
  food: '39',
};

export const TOUR_CATEGORY_LABEL: Record<TourCategory, string> = {
  attraction: '관광지',
  culture: '문화시설',
  festival: '축제',
  course: '여행코스',
  leports: '레포츠',
  stay: '숙박',
  shopping: '쇼핑',
  food: '음식점',
};

/** 마커 색 — 지도 핀과 필터 칩이 같은 색을 씁니다. */
export const TOUR_CATEGORY_COLOR: Record<TourCategory, string> = {
  attraction: '#3d8a5a',
  culture: '#5b6bbf',
  festival: '#d8a84e',
  course: '#2f8f8a',
  leports: '#c2683f',
  stay: '#7a5ba6',
  shopping: '#b4577e',
  food: '#d0603f',
};

/** 지도에 올리는 관광 콘텐츠 한 건 */
export type TourPlace = {
  /** TourAPI contentid — 상세 조회·후기 연결의 키가 됩니다. */
  id: string;
  title: string;
  category: TourCategory;
  contentTypeId: string;
  lat: number;
  lng: number;
  /** 지번 주소 */
  address: string;
  /** 대표 이미지 URL. 없으면 null */
  imageUrl: string | null;
  /** 조회 기준점에서의 거리(m). areaBased 조회에는 없어서 null 일 수 있습니다. */
  distance: number | null;
  /** 하이픈 포함 표시용 번호. 없으면 null */
  tel: string | null;
  /** 축제만 채워집니다. 'YYYYMMDD' */
  eventStartDate?: string | null;
  eventEndDate?: string | null;
};

/** '20260822' → '8.22' */
export function formatEventDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) {
    return yyyymmdd;
  }
  return `${Number(yyyymmdd.slice(4, 6))}.${Number(yyyymmdd.slice(6, 8))}`;
}

/** 축제 기간 표기 — 하루짜리면 날짜 하나만 보여 줍니다. */
export function formatEventPeriod(place: TourPlace): string {
  const start = place.eventStartDate;
  const end = place.eventEndDate;
  if (!start) {
    return '';
  }
  if (!end || end === start) {
    return formatEventDate(start);
  }
  return `${formatEventDate(start)} – ${formatEventDate(end)}`;
}

/**
 * 장소 상세 — detailCommon2 + detailIntro2 를 합친 결과.
 *
 * detailIntro2 는 콘텐츠 타입마다 필드명이 다릅니다(usetime / opentimefood /
 * usetimeculture …). 여기서는 타입과 무관한 공통 의미로만 추려 담습니다.
 */
export type TourPlaceDetail = {
  id: string;
  /** 소개 글. 없을 수 있습니다. */
  overview: string | null;
  /** 홈페이지 URL (원본은 <a> 태그라 주소만 뽑아 냅니다) */
  homepage: string | null;
  /** 이용 시간 / 영업 시간 */
  useTime: string | null;
  /** 휴무일 */
  restDate: string | null;
  /** 주차 안내 */
  parking: string | null;
  /** 문의 및 안내 전화 */
  infoCenter: string | null;
  /** 추가 이미지 URL */
  imageUrls: string[];
};

/** 목록 조회 결과 (페이지 정보 포함) */
export type TourPlacePage = {
  items: TourPlace[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
};

/** 210 → '210m', 1240 → '1.2km' */
export function formatTourDistance(meters: number | null): string {
  if (meters === null) {
    return '';
  }
  return meters < 1000
    ? `${Math.round(meters)}m`
    : `${(meters / 1000).toFixed(1)}km`;
}
