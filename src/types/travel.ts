/**
 * 여행 정보 도메인 모델.
 * 화면은 TourAPI 원본 필드명(`contenttypeid`, `firstimage` …)을 몰라도 되도록
 * 이 타입만 봅니다. 변환은 api/travelMappers.ts 에서 한 번만 일어납니다.
 */

/** 콘텐츠 타입 코드 → 사람이 읽는 이름 */
export const CONTENT_TYPE_LABEL: Record<string, string> = {
  '12': '관광지',
  '14': '문화시설',
  '15': '축제·행사',
  '25': '여행코스',
  '28': '레포츠',
  '32': '숙박',
  '38': '쇼핑',
  '39': '음식점',
};

/** 검색 화면 상단 필터 칩 — 라벨과 코드를 같이 들고 다닙니다 */
export const SEARCH_FILTERS = [
  { id: 'all', label: '전체', contentTypeId: undefined },
  { id: 'spot', label: '관광지', contentTypeId: '12' },
  { id: 'culture', label: '문화시설', contentTypeId: '14' },
  { id: 'festival', label: '축제', contentTypeId: '15' },
  { id: 'food', label: '음식점', contentTypeId: '39' },
  { id: 'stay', label: '숙박', contentTypeId: '32' },
] as const;

export type SearchFilterId = (typeof SEARCH_FILTERS)[number]['id'];

/** 관광 콘텐츠 1건 (검색·주변·지역 목록 공통) */
export type TourSpot = {
  contentId: string;
  contentTypeId: string;
  /** CONTENT_TYPE_LABEL 로 변환한 값. 모르는 코드면 '관광정보' */
  typeLabel: string;
  title: string;
  /** addr1 + addr2 를 합친 전체 주소. 없으면 빈 문자열 */
  address: string;
  tel: string | null;
  /** 대표 이미지(큰 사이즈). arrange 가 O/Q/R 이 아니면 없을 수 있습니다 */
  imageUrl: string | null;
  /** 대표 이미지 썸네일 */
  thumbnailUrl: string | null;
  lat: number | null;
  lng: number | null;
  /** 법정동 시도 코드 (충북 = '43') */
  regionCode: string | null;
  /** 법정동 시군구 코드 (단양군 = '800') */
  districtCode: string | null;
  /** 위치기반 조회 결과에만 있는 중심점 기준 거리(m) */
  distance: number | null;
};

/** 축제·행사 */
export type TourFestival = TourSpot & {
  /** YYYYMMDD */
  startDate: string | null;
  endDate: string | null;
  /** '8.14 ~ 8.23' 처럼 화면에 바로 쓰는 문자열 */
  periodLabel: string;
  /** 오늘 기준 진행 중 */
  isOngoing: boolean;
  /** 시작까지 남은 일수. 진행 중이거나 날짜를 모르면 null */
  daysUntilStart: number | null;
};

/** 상세 정보의 '이용 안내' 한 줄 (이용시간·휴무일·주차 …) */
export type TourIntroFact = {
  label: string;
  value: string;
};

/** 관광 콘텐츠 상세 */
export type TourSpotDetail = TourSpot & {
  overview: string | null;
  homepageUrl: string | null;
  /** 콘텐츠 타입마다 항목이 달라 있는 것만 담깁니다 */
  facts: TourIntroFact[];
  /** 추가 이미지 (대표 이미지 제외) */
  images: string[];
};

/** 관광사진 갤러리 1장 */
export type GalleryPhoto = {
  id: string;
  title: string;
  imageUrl: string;
  /** 촬영지 (예: '충청북도 단양군') */
  location: string;
  photographer: string;
  /** '2025.10' 형태로 다듬은 촬영 시기 */
  monthLabel: string;
  keywords: string[];
};

/** 지역안전지수 6개 부문 (1이 가장 안전, 5가 가장 위험) */
export type SafetyCategoryGrades = {
  traffic: number;
  fire: number;
  crime: number;
  lifeSafety: number;
  suicide: number;
  infectiousDisease: number;
};

/** 지역안전지수 1건 */
export type RegionSafety = {
  /** 예: '충청북도' */
  sido: string;
  /** 시도 단위 행이면 null */
  sigungu: string | null;
  regionType: string;
  baseYear: number;
  grades: SafetyCategoryGrades;
  /** 6개 부문 평균 (낮을수록 안전) */
  average: number;
  /** 평균을 A~E 로 환산한 등급 */
  grade: string;
  /** 평균을 0~100 으로 환산한 점수 (높을수록 안전) */
  score: number;
};

/** 기초지자체 중심 관광지 (방문 상위 랭킹) */
export type HubAttraction = {
  code: string;
  name: string;
  /** 예: '자연관광', '쇼핑' */
  category: string;
  rank: number;
  lat: number | null;
  lng: number | null;
  /** 예: '단양군' */
  districtName: string;
};
