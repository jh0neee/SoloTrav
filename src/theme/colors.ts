/**
 * 앱 전역 색상 팔레트
 * 화면·컴포넌트에서 하드코딩된 색상 대신 이 값을 사용합니다.
 *
 * 톤 기준 (2026-08 개편):
 *  - 배경은 흰색과 아주 옅은 회색만 씁니다. 채도가 있는 면은 최소한으로.
 *  - 포인트는 밝은 블루 하나로 통일합니다(버튼·활성 상태·강조 텍스트).
 *  - 선은 1px, 아주 옅게. 면을 나누는 건 선보다 여백이 먼저입니다.
 *  - 골드는 브랜드 캐릭터(샛별이)에만 남겨 한 곳에서만 튀게 합니다.
 *
 * 비상벨(sos*)과 샛별이 대화(chat*)는 몰입형 다크 화면이라 이 규칙에서 뺐습니다.
 */
export const colors = {
  // 포인트 — 밝은 블루 한 가지로 통일
  primary: '#2e90fa',
  primaryStrong: '#1570ef', // 눌린 상태·진한 텍스트
  primarySoft: '#eaf4ff', // 아주 옅은 블루 채움 (활성 칩·배너)
  primaryBorder: '#cfe4ff', // 옅은 블루 테두리
  primaryMuted: '#93c7fd',

  background: '#ffffff',
  surface: '#f6f7f9', // 옅은 회색 채움 (칩·썸네일 자리)
  border: '#eef0f4', // 1px 구분선
  borderStrong: '#e3e6eb', // 입력창처럼 형태를 잡아야 할 때만
  cream: '#f4f6f9', // 화면 배경 — 흰 카드가 떠 보이도록 살짝 낮춘 회색

  textPrimary: '#16181d',
  textSecondary: '#8b95a1',
  textTertiary: '#b4bcc6', // 캡션·비활성
  textOnPrimary: '#ffffff',

  // 하단 탭바
  tabBarBackground: '#ffffff',
  tabActive: '#2e90fa',
  tabInactive: '#b4bcc6',

  // 샛별이 마스코트 — 유일하게 남기는 골드
  mascot: '#f5c24b',
  mascotDeep: '#efb733',
  mascotGlow: '#fbe0a3',
  mascotFace: '#4a3b12',

  // 히어로 / 강조 영역 (다크 → 화이트로 전환)
  heroBg: '#ffffff',
  darkCard: '#eef0f4', // 사진이 없을 때의 자리 채움
  ink: '#2e90fa', // 주요 버튼·선택 칩
  inkText: '#ffffff',
  badgeBg: 'rgba(22,24,29,0.55)', // 사진 위 배지는 여전히 어둡게 깔아야 읽힙니다
  heroCard: '#f3f9ff', // 히어로 아래 통계 카드
  heroCardBorder: '#e1eeff',
  heroTextMuted: '#8b95a1',

  // 기존 골드 키 — 전부 블루 계열로 대체했습니다.
  // (키 이름은 화면 여러 곳에서 쓰고 있어 그대로 두고 값만 바꿉니다)
  gold: '#2e90fa',
  goldDeep: '#1570ef',
  goldSoft: '#eaf4ff',

  // 도시 선택 지도
  mapBlob: '#f2f4f8',

  // 배지/필
  safeBg: '#e9f7f0',
  safeText: '#0f9d6e',
  bonusBg: '#eaf4ff',
  bonusText: '#1570ef',

  // 긴급/SOS
  danger: '#f04452',
  dangerSoft: '#fff1f2',
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

  // 샛별이 대화 — 밤하늘 컨셉의 몰입형 화면이라 다크를 유지합니다
  chatBg: '#101a2e',
  chatBgDeep: '#0a1120',
  chatStar: '#ffffff',
  chatBotBubble: '#f8f9fc',
  chatBotText: '#1b2233',
  chatUserBubble: '#2e90fa', // 내 말풍선 — 포인트 블루
  chatUserText: '#ffffff',
  chatBubbleMuted: '#8b95a1',
  chatStarterBorder: 'rgba(110,175,255,0.5)',
  chatStarterBg: '#1b3050',
  chatStarterText: '#c7e0ff',
  chatQuickBg: '#1a2540',
  chatQuickBorder: 'rgba(255,255,255,0.16)',
  chatQuickText: '#dfe5f0',
  chatInputBg: '#f8f9fc',
  chatInputPlaceholder: '#9aa3b2',
  chatIconButton: '#1e2a45',
  chatHeaderSub: '#9aa6bd',
  /**
   * 코스 카드·안내 박스는 **불투명**이어야 합니다.
   * 예전에는 흰색 5% 반투명이라 뒤의 별이 글자 사이로 그대로 비쳐서
   * 긴 일정 텍스트가 읽히지 않았습니다.
   */
  chatCardBg: '#1a2742',
  chatCardBorder: 'rgba(255,255,255,0.10)',
  chatCardText: '#e8ecf5',
  chatCardMuted: '#a7b1c6',
  chatSafetyBg: '#1d3560',
  chatNoticeBg: '#243553',
  /** 코스 카드 안의 작은 배지 — 카드보다 한 단계 밝아야 눈에 띕니다 */
  chatBadgeBg: '#27395c',
  chatOnline: '#5cd6a0',

  // 슬라이더
  track: '#eef0f4',
  trackFill: '#2e90fa',

  // 취향 프롬프트 (위저드 · 홈 배너)
  promptBanner: '#eef6ff',
  promptBannerBorder: '#d9e9ff',
  progressTrack: '#eef0f4',
  radioBorder: '#dde1e7',
  ctaDisabled: '#eef0f4',
  ctaDisabledText: '#b4bcc6',
};

/**
 * 피드 사진 플레이스홀더 톤 (실제 사진 연동 전 사용).
 * bg=하늘, ridge=능선, accent=달
 * 화이트 톤 화면에 맞춰 옅은 블루그레이로 낮췄습니다. 달을 채도 있는 색으로 두면
 * 사진 위에 파란 점을 찍어 놓은 것처럼 보여서 흰빛으로 둡니다.
 */
export const photoTones = {
  night: { bg: '#dde8f5', ridge: '#bfd2e8', accent: '#ffffff' },
  dusk: { bg: '#ece5f0', ridge: '#d6c9df', accent: '#ffffff' },
  dawn: { bg: '#deecf7', ridge: '#c0daee', accent: '#ffffff' },
};

export type PhotoTone = keyof typeof photoTones;

/** 도시 유형별 색상 (지도 칩·범례) */
export const cityTypeColors = {
  decline: { ring: '#2e90fa', bg: '#eaf4ff', text: '#1570ef' }, // 인구감소지역
  urban: { ring: '#8b95a1', bg: '#f1f3f6', text: '#5a6472' }, // 도시형
  transit: { ring: '#d3d8df', bg: '#f6f7f9', text: '#8b95a1' }, // 경유형
};
