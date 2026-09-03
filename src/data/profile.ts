/** 마이 화면에서 사용하는 안전 설정과 관심 코스 데이터입니다. */
/** 안전설정 아이콘 키 (화면에서 실제 아이콘 컴포넌트로 매핑) */
export type SafetyIcon = 'siren' | 'idCard';
// 배지 아이콘 키(BadgeIcon)는 types/badge.ts 에 있습니다.

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

/** 관심 코스 */
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
  key: 'deviceSos' | 'emergencyCard';
  title: string;
  description: string;
  icon: SafetyIcon;
};

/** 위치를 수집하지 않고 기기 안에서 사용할 수 있는 안전 기능입니다. */
export const SAFETY_SETTINGS: SafetySetting[] = [
  {
    key: 'deviceSos',
    title: '긴급 SOS 설정',
    description: '잠금 화면에서도 사용할 수 있는 휴대폰의 긴급 기능을 설정해보세요.',
    icon: 'siren',
  },
  {
    key: 'emergencyCard',
    title: '긴급 정보 카드',
    description: '혈액형과 알레르기 등 구조에 도움이 될 정보를 기록해두세요.',
    icon: 'idCard',
  },
];
