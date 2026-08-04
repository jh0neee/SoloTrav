/**
 * 마이 화면 프로필 데이터(임시).
 * 로그인·서버 연동 전까지 쓰는 목업이며, 연동 시 이 파일의 값만 교체하면 됩니다.
 */
import { currentUser } from '../config/user';

/** 배지·안전설정 아이콘 키 (화면에서 실제 아이콘 컴포넌트로 매핑) */
export type BadgeIcon = 'pin' | 'spark' | 'shield' | 'heart';
export type SafetyIcon = 'siren' | 'pin' | 'bell' | 'shield';

/** 히어로 프로필 요약 */
export const PROFILE = {
  name: currentUser.name,
  initial: currentUser.name.slice(0, 1),
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

/**
 * 저장된 여행 취향.
 * 취향 프롬프트 화면(PreferencePromptScreen)에서 설정한 값과 같은 형식입니다.
 */
export const TRAVEL_PREFERENCE = {
  period: '1박 2일',
  pace: '느긋하게',
  budget: 15, // 만원 단위
  moods: ['#감성사진', '#조용한_카페', '#야경_명소', '#로컬_맛집'],
};

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

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: BadgeIcon;
  earned: boolean;
};

/** 나의 배지 (earned=false 는 잠금 표시) */
export const BADGES: Badge[] = [
  {
    id: 'first-solo',
    name: '첫 혼행',
    description: '첫 혼자 여행 완료',
    icon: 'pin',
    earned: true,
  },
  {
    id: 'night-hunter',
    name: '야경 헌터',
    description: '야경 명소 3곳 방문',
    icon: 'spark',
    earned: true,
  },
  {
    id: 'safety-reporter',
    name: '안전 리포터',
    description: '안전 후기 10개 작성',
    icon: 'shield',
    earned: true,
  },
  {
    id: 'local-foodie',
    name: '로컬 미식가',
    description: '로컬 맛집 5곳 기록',
    icon: 'heart',
    earned: true,
  },
  {
    id: 'hidden-town',
    name: '숨은 동네',
    description: '인구감소지역 5곳 방문',
    icon: 'pin',
    earned: false,
  },
  {
    id: 'photo-master',
    name: '사진 장인',
    description: '여행 사진 50장 공유',
    icon: 'spark',
    earned: false,
  },
];

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
