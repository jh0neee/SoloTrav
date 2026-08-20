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
  sosIdleBg: '#0f1729', // 비상벨 화면 대기 상태 배경 (짙은 남색)
  sosActiveBg: '#e0524d', // 사이렌 작동 중 배경 (레드)
  sosIdleCard: 'rgba(255,255,255,0.06)', // 대기 상태 안전시설 카드
  sosActiveCard: 'rgba(90,16,16,0.28)', // 작동 중 안전시설 카드
  sosRing: 'rgba(255,255,255,0.16)', // 버튼 주변 파장 링
  sosTextMuted: 'rgba(255,255,255,0.62)',

  // 카카오 로그인 (카카오 브랜드 가이드 고정 색 — 임의로 바꾸면 안 됩니다)
  kakaoYellow: '#fee500',
  kakaoYellowPressed: '#e9d200',
  kakaoLabel: 'rgba(0,0,0,0.85)',

  // 샛별이 채팅 (밤하늘)
  chatBg: '#101a2e', // 화면 배경 — 위쪽 밤하늘
  chatBgDeep: '#0a1120', // 아래로 갈수록 짙어지는 톤
  chatStar: '#ffffff', // 별 (투명도는 컴포넌트에서 조절)
  chatBotBubble: '#f8f9fc', // 샛별이 말풍선
  chatBotText: '#1b2233',
  chatUserBubble: '#e3b25c', // 내 말풍선 (골드)
  chatUserText: '#2a2110',
  chatBubbleMuted: '#6b7280', // 말풍선 안 보조 문구
  chatStarterBorder: 'rgba(227,178,92,0.55)', // 첫 인사 아래 골드 칩
  chatStarterBg: 'rgba(227,178,92,0.14)',
  chatStarterText: '#f0d9a6',
  chatQuickBg: 'rgba(255,255,255,0.06)', // 입력창 위 빠른 질문 칩
  chatQuickBorder: 'rgba(255,255,255,0.18)',
  chatQuickText: '#dfe5f0',
  chatInputBg: '#f8f9fc',
  chatInputPlaceholder: '#9aa3b2',
  chatIconButton: 'rgba(255,255,255,0.08)', // 헤더 원형 버튼
  chatHeaderSub: '#9aa6bd',
  chatCardBg: 'rgba(255,255,255,0.05)', // 코스 카드 (유리 느낌)
  chatCardBorder: 'rgba(255,255,255,0.12)',
  chatCardText: '#e8ecf5',
  chatCardMuted: '#a7b1c6',
  chatSafetyBg: 'rgba(227,178,92,0.10)', // 안전 안내 박스
  chatNoticeBg: 'rgba(255,255,255,0.05)', // 확인해주세요 박스
  chatOnline: '#5cd6a0', // 헤더 '응답 중' 점

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
