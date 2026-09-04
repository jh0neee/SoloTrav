/**
 * 여행 정보 도메인 모델.
 * 화면은 TourAPI 원본 필드명(`contenttypeid`, `firstimage` …)을 몰라도 되도록
 * 이 타입만 봅니다. 변환은 api/travelMappers.ts 에서 한 번만 일어납니다.
 */

import type { TourCategory } from './tourPlace';

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
export type TourContent = {
  contentId: string;
  contentTypeId: string;
  /** CONTENT_TYPE_LABEL 로 변환한 값. 모르는 코드면 '관광정보' */
  typeLabel: string;
  /** 지도 필터에서 쓰는 공통 카테고리. 알 수 없는 콘텐츠 타입이면 null */
  category: TourCategory | null;
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
  /** 축제 콘텐츠에서만 채워지는 YYYYMMDD */
  eventStartDate: string | null;
  eventEndDate: string | null;
};

/** 축제·행사 */
export type TourFestival = TourContent & {
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
export type TourContentDetail = TourContent & {
  overview: string | null;
  homepageUrl: string | null;
  /** 콘텐츠 타입마다 항목이 달라 있는 것만 담깁니다 */
  facts: TourIntroFact[];
  /** 추가 이미지 (대표 이미지 제외) */
  images: string[];
};

/** 지도에 표시할 수 있음이 확인된 공통 관광 콘텐츠 */
export type MappableTourContent = TourContent & {
  category: TourCategory;
  lat: number;
  lng: number;
};

export function isMappableTourContent(
  content: TourContent,
): content is MappableTourContent {
  return (
    content.category !== null && content.lat !== null && content.lng !== null
  );
}

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
  /** 6개 부문 단순 평균 (낮을수록 안전) — 행정안전부 원자료에 가장 가까운 값 */
  average: number;
  /** 6개 부문 평균을 A~E 로 환산한 등급 */
  grade: string;
  /** 6개 부문 평균을 0~100 으로 환산한 점수 (높을수록 안전) */
  score: number;

  /**
   * 혼행 안전 점수 (40~100, 높을수록 안전).
   *
   * 6개 부문을 그냥 평균 내면 자살·감염병처럼 여행자와 관계가 옅은 지표가
   * 절반을 차지해, 치안이 나쁜 지역이 '안전한 곳' 1위가 되는 일이 생깁니다.
   * 그래서 혼자 다닐 때 실제로 위험을 만드는 세 부문에만 가중치를 둡니다.
   * 공식 등급은 상대평가이므로 5등급도 0점이 아닌 40점으로 환산합니다.
   * (가중치는 travelMappers 의 SOLO_SAFETY_WEIGHTS 참고)
   */
  soloScore: number;
  /** 혼행 안전 점수를 A~E 로 환산한 등급 */
  soloGrade: string;
};

/**
 * 혼행 안전지수에 사용하는 부문의 표시 정보.
 *
 * 혼자 여행하는 사람이 실제로 신경 쓰는 순서로 배열해둡니다 — 치안(범죄)이
 * 맨 앞이고, 낯선 길의 교통과 일상 사고를 다루는 생활안전이 뒤따릅니다. 화면은 이 순서
 * 그대로 그리면 됩니다.
 */
export const SAFETY_CATEGORIES: {
  key: keyof SafetyCategoryGrades;
  label: string;
  /** 혼행 관점에서 왜 중요한지 — 상세 화면 설명용 */
  note: string;
}[] = [
  { key: 'crime', label: '치안', note: '범죄 발생·검거 지표' },
  { key: 'traffic', label: '교통', note: '보행자 사고 포함' },
  { key: 'lifeSafety', label: '생활안전', note: '추락·중독 등 일상 사고' },
];

/** 등급(1~5) → 사람이 읽는 말. 1이 가장 안전합니다. */
export const SAFETY_GRADE_LABEL: Record<number, string> = {
  1: '매우 안전',
  2: '안전',
  3: '보통',
  4: '주의',
  5: '각별 주의',
};

/** 기초 지자체 하루치 방문자 집계 (현지인/외지인/외국인 합산 후) */
export type VisitorStat = {
  /** 법정동 5자리 시군구 코드 (단양군 = '43800') */
  districtCode: string;
  districtName: string;
  local: number;
  visitor: number;
  foreign: number;
  /** 외지인 ÷ (현지인 + 외지인) × 100 — 여행지 집중도 */
  visitorRatio: number;
  /** 4주 전 같은 요일 대비 외지인 증감률(%). 비교 데이터가 없으면 null */
  changeRate: number | null;
  /** 집계 기준일 YYYYMMDD */
  baseYmd: string;
  /** 예: '토요일' */
  dayLabel: string;
};

/** 홈 랭킹 탭 — 무엇을 기준으로 줄 세울지 */
export const RANKING_KINDS = [
  {
    id: 'safe',
    label: '안전한 곳',
    /** 카드 아래 붙는 설명 */
    caption: '혼행 안전 점수 순 (치안 40 · 교통 35 · 생활안전 25)',
  },
  { id: 'hot', label: '많이 찾는 곳', caption: '주말 여행객 방문이 많은 순' },
  {
    id: 'quiet',
    label: '여유로운 곳',
    caption: '사람이 적어 혼자 걷기 좋은 순',
  },
] as const;

export type RankingKind = (typeof RANKING_KINDS)[number]['id'];

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

/** AI 코스 정류장 도메인 모델 */
export type AiCourseStop = {
  day: number;
  order: number;
  time: string | null;
  title: string;
  category: string | null;
  description: string | null;
  safetyTip: string | null;
};

/** AI 코스 하루 일정 */
export type AiCourseDay = {
  day: number;
  title: string;
  stops: AiCourseStop[];
};

/** AI 맞춤 코스 전체 도메인 모델 */
export type AiCourse = {
  requestId?: string;
  regionName: string;
  title: string;
  duration: string;
  durationLabel: string;
  summary: string;
  stops: AiCourseStop[];
  days: AiCourseDay[];
  safetyNotes: string[];
};

