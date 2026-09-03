/**
 * 샛별이 화면의 추천 질문과 지역 추출.
 *
 * 칩에 보이는 짧은 라벨과 실제로 서버에 보내는 문장을 분리했습니다.
 * 화면은 짧아야 읽히고, AI 에게는 조건이 담긴 문장을 줘야 결과가 좋기 때문입니다.
 */
import { CITIES } from '../data/cities';
import type { PreferenceAnswers } from '../data/preferences';

export type SuggestedPrompt = {
  /** 칩에 보이는 짧은 문구 */
  label: string;
  /** 실제로 전송되는 문장 */
  prompt: string;
};

/** 클로드 스타일 사고 단계별 안내 문구 (경과 시간 기준) */
export const THINKING_PHASES: { afterMs: number; text: string }[] = [
  { afterMs: 0, text: '샛별이가 질문을 살펴보고 있어요 ✦' },
  { afterMs: 2200, text: '취향에 어울리는 혼행 명소를 찾는 중이에요...' },
  { afterMs: 5500, text: '이동 동선과 주변 안전 정보를 확인하고 있어요...' },
  {
    afterMs: 9500,
    text: '맞춤 코스를 꼼꼼하게 정리하고 있어요. 조금만 기다려주세요 ✦',
  },
];

/** 답변 불가 시 표시할 혼행등대 브랜드 정체성 가이드 문구 */
export const FALLBACK_GUIDE_TEXT =
  '이 질문은 혼행등대가 답하기 어려워요.\n저는 여행지 추천, 혼행 코스, 주변 장소, 지역 안전 정보에 대해 도와드릴 수 있어요.';

/** 취향에서 '아직 미정' 은 지역을 안 고른 것과 같습니다. */
const REGION_UNSET = '아직 미정';

/**
 * 답변 불가/실패 시 바로 다른 질문으로 전환할 수 있는 추천 칩 목록을 생성합니다.
 * 지역이 있으면 지역 맞춤(맛집, 숙박, 행사, 명소), 없으면 기본 혼행 추천(여행지, 카페, 명소)을 제공합니다.
 */
export function getFallbackPrompts(regionName?: string): SuggestedPrompt[] {
  if (regionName && regionName.trim() && regionName !== REGION_UNSET) {
    const region = regionName.trim();
    return [
      {
        label: `${region} 맛집 추천`,
        prompt: `${region}에서 혼자 가기 좋은 맛집을 추천해줘.`,
      },
      {
        label: `${region} 숙박 추천`,
        prompt: `${region}에서 혼자 묵기 안전하고 편한 숙소를 추천해줘.`,
      },
      {
        label: `${region} 근처 행사`,
        prompt: `${region}이나 근처에서 열리는 축제나 문화 행사를 알려줘.`,
      },
      {
        label: `${region} 가볼 만한 곳`,
        prompt: `${region}에서 혼자 조용히 힐링하기 좋은 명소를 추천해줘.`,
      },
    ];
  }

  return [
    {
      label: '인기 여행지 추천',
      prompt: '혼자 여행하기 좋은 인기 코스를 추천해줘.',
    },
    {
      label: '근처 카페 추천',
      prompt: '혼자 머물기 편하고 안전한 카페를 추천해줘.',
    },
    {
      label: '혼자 가기 좋은 곳',
      prompt: '혼자 조용히 힐링하기 좋은 안전한 명소를 추천해줘.',
    },
  ];
}

/** 대화가 비어 있을 때 첫 인사 아래에 붙는 칩 */
export const STARTER_PROMPTS: SuggestedPrompt[] = [
  {
    label: '혼자 처음이에요',
    prompt:
      '혼자 여행은 처음이에요. 부담 없이 다녀올 수 있는 코스를 추천해줘.',
  },
  {
    label: '오늘 갈만한 곳',
    prompt: '오늘 하루 혼자 다녀오기 좋은 곳으로 코스를 짜줘.',
  },
  {
    label: '단양 1박 2일',
    prompt: '단양에서 1박 2일 동안 다닐 코스를 짜줘.',
  },
];

/** 입력창 위에 항상 떠 있는 빠른 질문 */
export const QUICK_PROMPTS: SuggestedPrompt[] = [
  {
    label: '1박 2일 단양 코스',
    prompt:
      '단양에서 1박 2일, 대중교통으로 무리 없이 야경까지 볼 수 있는 코스를 짜줘.',
  },
  {
    label: '근처 안전한 카페',
    prompt: '지금 있는 곳 근처에서 혼자 있기 편하고 안전한 카페를 알려줘.',
  },
  {
    label: '지금 위치 안전한가요?',
    prompt: '지금 있는 곳이 밤에 혼자 다니기 안전한지 알려줘.',
  },
];

/**
 * 서버에 함께 보낼 `regionName` 을 정합니다.
 *
 * 1) 사용자가 문장에 도시 이름을 적었으면 그 도시 (지금 하려는 이야기가 우선)
 * 2) 없으면 저장된 취향의 여행 지역
 * 3) 둘 다 없으면 undefined — 서버가 취향만 보고 판단합니다.
 */
export function detectRegionName(
  message: string,
  answers: PreferenceAnswers | null,
): string | undefined {
  const matched = CITIES.find(city => message.includes(city.name));
  if (matched) {
    return matched.name;
  }

  const region = answers?.region;
  if (typeof region === 'string' && region && region !== REGION_UNSET) {
    return region;
  }

  return undefined;
}
