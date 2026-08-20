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

/** 취향에서 '아직 미정' 은 지역을 안 고른 것과 같습니다. */
const REGION_UNSET = '아직 미정';

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
