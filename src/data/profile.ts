/**
 * 마이 화면 프로필 데이터(임시).
 * 로그인·서버 연동 전까지 쓰는 목업이며, 연동 시 이 파일의 값만 교체하면 됩니다.
 */
/** 안전설정 아이콘 키 (화면에서 실제 아이콘 컴포넌트로 매핑) */
export type SafetyIcon = 'siren' | 'pin' | 'bell' | 'shield';
// 배지 아이콘 키(BadgeIcon)는 types/badge.ts 에 있습니다.

/**
 * 히어로 프로필 요약(활동 지표만).
 * 이름·프로필 사진처럼 계정에 딸린 값은 여기가 아니라 user/userStore 에서 옵니다.
 */
export const PROFILE = {
  title: '단양 마스터', // 활동 등급 호칭
  tripCount: 6,
  reviewCount: 18,
};

/** 히어로 하단 통계 3종 */
export const PROFILE_STATS = [
  { key: 'cities', label: '밟은 도시', value: 6 },
  { key: 'reviews', label: '안전 후기', value: 12 },
  { key: 'photos', label: '공유 사진', value: 34 },
];

// 여행 취향 목업(TRAVEL_PREFERENCE)은 제거했습니다.
// 이제 GET /users/me/travel-preferences 값을 preferences/preferenceStore 에서 읽습니다.

export type SavedCourse = {
  id: string;
  title: string;
  cityId: string; // data/cities.ts 의 City.id
  period: string;
  spotCount: number;
  safetyGrade: string;
  savedAt: string;
};

/** 찜한 코스 */
export const SAVED_COURSES: SavedCourse[] = [
  {
    id: 'danyang-night',
    title: '도담삼봉 야경 + 골목 카페',
    cityId: 'danyang',
    period: '1박 2일',
    spotCount: 7,
    safetyGrade: 'A',
    savedAt: '3일 전',
  },
  {
    id: 'jecheon-lake',
    title: '청풍호 둘레길 힐링 코스',
    cityId: 'jecheon',
    period: '당일',
    spotCount: 5,
    safetyGrade: 'A',
    savedAt: '1주 전',
  },
  {
    id: 'goesan-forest',
    title: '산막이옛길 숲길 산책',
    cityId: 'goesan',
    period: '당일',
    spotCount: 4,
    safetyGrade: 'A',
    savedAt: '2주 전',
  },
];

// 배지 타입은 types/badge.ts 로, 목록은 GET /users/me/travel-badges 로 옮겼습니다.
// 화면은 badges/badgeStore 에서 읽습니다.

export type SafetySetting = {
  key: string;
  title: string;
  description: string;
  icon: SafetyIcon;
  defaultOn: boolean;
};

/** 안전 설정 — 전부 토글(Switch) 형식이며 첫 항목이 SOS 단축 버튼입니다. */
export const SAFETY_SETTINGS: SafetySetting[] = [
  {
    key: 'sos',
    title: 'SOS 단축 버튼',
    description: '전원 버튼을 3번 누르면 긴급 연락처로 현재 위치를 보냅니다.',
    icon: 'siren',
    defaultOn: true,
  },
  {
    key: 'liveLocation',
    title: '실시간 위치 공유',
    description: '여행 중 지정한 보호자에게 이동 경로를 공유합니다.',
    icon: 'pin',
    defaultOn: false,
  },
  {
    key: 'nightAlert',
    title: '심야 이동 알림',
    description: '밤 10시 이후 이동하면 안전한 경로를 안내합니다.',
    icon: 'bell',
    defaultOn: true,
  },
  {
    key: 'safeCuration',
    title: '안전 우선 큐레이션',
    description: 'CCTV·가로등 밀집 지역과 안전등급 A 숙소를 먼저 추천합니다.',
    icon: 'shield',
    defaultOn: true,
  },
];

/** SOS 발송 대상 연락처 */
export const EMERGENCY_CONTACT = {
  name: '엄마',
  phone: '010-1234-5678',
};
