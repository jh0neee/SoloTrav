/**
 * 앱 전역 색상 팔레트
 * 화면·컴포넌트에서 하드코딩된 색상 대신 이 값을 사용합니다.
 */
export const colors = {
  primary: '#2563eb',
  primaryMuted: '#93c5fd',

  background: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  cream: '#f3efe7', // 홈 흐름 화면 배경 (따뜻한 크림)

  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textOnPrimary: '#ffffff',

  // 하단 탭바
  tabBarBackground: '#ffffff',
  tabActive: '#3b4557',
  tabInactive: '#9aa3b2',

  // 샛별이 마스코트
  mascot: '#f5c24b',
  mascotDeep: '#efb733',
  mascotGlow: '#fbe0a3',
  mascotFace: '#4a3b12',

  // 히어로 / 다크 영역
  heroBg: '#1c2233',
  darkCard: '#1f2433',
  ink: '#1b2233', // 다크 버튼·선택 칩
  inkText: '#ffffff',
  badgeBg: '#2b3348', // 카드 위 배지

  // 골드 액센트
  gold: '#e3b25c',
  goldDeep: '#d8a84e',
  goldSoft: '#f0d9a6',

  // 도시 선택 지도
  mapBlob: '#e9e3d7',

  // 배지/필
  safeBg: '#eaf4ec',
  safeText: '#2f7d43',
  bonusBg: '#f3ecdd',
  bonusText: '#b8873a',

  // 슬라이더
  track: '#e5e2da',
  trackFill: '#1b2233',
};

/** 도시 유형별 색상 (지도 칩·범례) */
export const cityTypeColors = {
  decline: { ring: '#e3b25c', bg: '#fbf4e6', text: '#9a7327' }, // 인구감소지역
  urban: { ring: '#3b4557', bg: '#e7eaf0', text: '#3b4557' }, // 도시형
  transit: { ring: '#c7c2b6', bg: '#efece5', text: '#7c766a' }, // 경유형
};
