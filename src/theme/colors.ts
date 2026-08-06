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
  heroCard: '#252c40', // 히어로 위 통계 카드
  heroCardBorder: 'rgba(255,255,255,0.08)',
  heroTextMuted: '#aeb6c6',

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

  // 긴급/SOS
  danger: '#d24b4b',
  dangerSoft: '#fbeaea',

  // 카카오 로그인 (카카오 브랜드 가이드 고정 색 — 임의로 바꾸면 안 됩니다)
  kakaoYellow: '#fee500',
  kakaoYellowPressed: '#e9d200',
  kakaoLabel: 'rgba(0,0,0,0.85)',

  // 슬라이더
  track: '#e5e2da',
  trackFill: '#1b2233',

  // 취향 프롬프트 (위저드 · 홈 배너)
  promptBanner: '#fbedc8', // 홈 '취향 설정하기' 카드
  promptBannerBorder: '#f2ddab',
  progressTrack: '#e7e1d4',
  radioBorder: '#d6d1c4',
  ctaDisabled: '#e3ded2',
  ctaDisabledText: '#a79f8e',
};

/**
 * 피드 사진 플레이스홀더 톤 (실제 사진 연동 전 사용).
 * bg=하늘, ridge=능선, accent=달·불빛
 */
export const photoTones = {
  night: { bg: '#1c2233', ridge: '#2a3247', accent: '#f0d9a6' },
  dusk: { bg: '#33283a', ridge: '#453651', accent: '#f5c9a0' },
  dawn: { bg: '#23364a', ridge: '#2f4a63', accent: '#cfe3f5' },
};

export type PhotoTone = keyof typeof photoTones;

/** 도시 유형별 색상 (지도 칩·범례) */
export const cityTypeColors = {
  decline: { ring: '#e3b25c', bg: '#fbf4e6', text: '#9a7327' }, // 인구감소지역
  urban: { ring: '#3b4557', bg: '#e7eaf0', text: '#3b4557' }, // 도시형
  transit: { ring: '#c7c2b6', bg: '#efece5', text: '#7c766a' }, // 경유형
};
