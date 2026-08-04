/**
 * 지도 마커·상세 목업 데이터 (단양 도담삼봉 일대).
 * 실제 API 연동 전까지 이 파일만 교체하면 지도 화면이 그대로 동작합니다.
 */

/** 마커 카테고리 — 상단 필터 칩과 1:1로 대응됩니다. */
export type PlaceCategory = 'safe' | 'solo' | 'review';

export type PlaceStat = { label: string; value: string; highlight?: boolean };

export type PlaceReview = {
  id: string;
  author: string;
  timeAgo: string;
  badge?: string; // 예: '안심후기'
  text: string;
  likes: number;
  comments: number;
  tag?: string; // 예: '야간 안전 ↑'
  hasPhoto?: boolean;
};

export type Place = {
  id: string;
  name: string;
  area: string; // 부제 (예: '단양천 일대')
  category: PlaceCategory;
  badge: string; // 시트 상단 초록 배지 (예: '안심 골목길')
  distance: string; // 예: '210m'
  lat: number;
  lng: number;
  stats: PlaceStat[]; // 3칸 통계 박스
  reviews: PlaceReview[];
};

/** 지도 최초 중심 좌표 — 단양읍 */
export const MAP_CENTER = { lat: 36.9846, lng: 128.3655 };

/** 현위치 파란 점 (geolocation 연동 전 임시 고정값) */
export const MY_LOCATION = { lat: 36.9846, lng: 128.3655 };

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  safe: '안전',
  solo: '혼행 인프라',
  review: '실시간 후기',
};

export const PLACES: Place[] = [
  {
    id: 'danyangcheon-trail',
    name: '단양천 산책로',
    area: '단양천 일대',
    category: 'safe',
    badge: '안심 골목길',
    distance: '210m',
    lat: 36.9862,
    lng: 128.3648,
    stats: [
      { label: '가로등', value: '밝음' },
      { label: 'CCTV', value: '8대' },
      { label: '야간 안전', value: 'A', highlight: true },
    ],
    reviews: [
      {
        id: 'r1',
        author: '미연',
        timeAgo: '2시간 전',
        badge: '안심후기',
        text: '평일 낮인데도 사람이 적당히 있어서 안 무서웠어요. 가로등 잘 켜져 있음!',
        likes: 24,
        comments: 3,
        tag: '야간 안전 ↑',
      },
      {
        id: 'r2',
        author: '소영',
        timeAgo: '어제',
        text: '주차장 입구 CCTV 한 대 작동 안 함. 다른 분들 참고하세요.',
        likes: 11,
        comments: 1,
        hasPhoto: true,
      },
    ],
  },
  {
    id: 'sambongro-alley',
    name: '삼봉로 골목',
    area: '도담삼봉 진입로',
    category: 'safe',
    badge: '안심 골목길',
    distance: '540m',
    lat: 36.9891,
    lng: 128.3672,
    stats: [
      { label: '가로등', value: '보통' },
      { label: 'CCTV', value: '5대' },
      { label: '야간 안전', value: 'B', highlight: true },
    ],
    reviews: [
      {
        id: 'r3',
        author: '지우',
        timeAgo: '3일 전',
        badge: '안심후기',
        text: '상점가라 밤 9시까지는 사람 많아요. 그 이후엔 좀 어두워집니다.',
        likes: 18,
        comments: 2,
        tag: '야간 안전 ↑',
      },
    ],
  },
  {
    id: 'riverside-park',
    name: '강변공원 쉼터',
    area: '단양강 잔도 입구',
    category: 'safe',
    badge: '안심 쉼터',
    distance: '820m',
    lat: 36.9825,
    lng: 128.3701,
    stats: [
      { label: '가로등', value: '밝음' },
      { label: 'CCTV', value: '12대' },
      { label: '야간 안전', value: 'A', highlight: true },
    ],
    reviews: [
      {
        id: 'r4',
        author: '한별',
        timeAgo: '1주 전',
        text: '벤치랑 화장실 깨끗하고 관리인 상주. 혼자 쉬기 좋았어요.',
        likes: 32,
        comments: 5,
        tag: '혼행 추천 ↑',
      },
    ],
  },
  {
    id: 'solo-guesthouse',
    name: '단양 혼행 게스트하우스',
    area: '단양역 도보 6분',
    category: 'solo',
    badge: '혼행 숙소',
    distance: '1.1km',
    lat: 36.9808,
    lng: 128.3612,
    stats: [
      { label: '1인실', value: '있음' },
      { label: '여성 전용', value: '층 분리' },
      { label: '체크인', value: '24h', highlight: true },
    ],
    reviews: [
      {
        id: 'r5',
        author: '예린',
        timeAgo: '5일 전',
        text: '리셉션이 24시간이라 늦게 도착해도 괜찮았어요. 1인실 조용합니다.',
        likes: 41,
        comments: 7,
        tag: '혼행 추천 ↑',
      },
    ],
  },
  {
    id: 'solo-table-cafe',
    name: '도담 1인 테이블 카페',
    area: '도담삼봉 전망',
    category: 'review',
    badge: '실시간 후기',
    distance: '350m',
    lat: 36.9874,
    lng: 128.3619,
    stats: [
      { label: '1인석', value: '6석' },
      { label: '콘센트', value: '있음' },
      { label: '평점', value: '4.6', highlight: true },
    ],
    reviews: [
      {
        id: 'r6',
        author: '하늘',
        timeAgo: '40분 전',
        badge: '실시간',
        text: '지금 창가 1인석 두 자리 비어 있어요. 뷰 좋습니다.',
        likes: 9,
        comments: 0,
      },
    ],
  },
];

/** 카테고리별 마커 개수 — 상단 필터 칩 옆 숫자에 씁니다. */
export function countByCategory(category: PlaceCategory) {
  return PLACES.filter(place => place.category === category).length;
}
