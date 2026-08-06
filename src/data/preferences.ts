/**
 * 취향 프롬프트 스키마 (8단계 위저드).
 * 화면은 이 데이터만 보고 렌더링하므로, 질문/옵션 추가는 이 파일만 수정하면 됩니다.
 *
 *   1 여행 기본  2 이동  3 여행 온도  4 회피 조건
 *   5 활동      6 맛집  7 숙소       8 예산
 */
import { CITIES } from './cities';

/** 답변 값: 단일선택(string) · 다중선택(string[]) · 슬라이더(number) · 자유입력(string) */
export type PreferenceValue = string | string[] | number;
export type PreferenceAnswers = Record<string, PreferenceValue>;

export type CardOption = { value: string; desc?: string };

type FieldBase = {
  id: string;
  label: string;
  hint?: string;
  /** true 면 답변해야 '다음' 버튼이 활성화됩니다. */
  required?: boolean;
};

export type PreferenceField = FieldBase &
  (
    | { type: 'chips-single'; options: string[] }
    | { type: 'chips-multi'; options: string[] }
    | { type: 'cards-single'; options: CardOption[] }
    | {
        type: 'slider';
        min: number;
        max: number;
        step: number;
        defaultValue: number;
        unit: string;
        /** 슬라이더 아래 눈금 라벨 */
        scale: string[];
      }
    | { type: 'text'; placeholder: string; maxLength: number }
  );

/**
 * POST /users/me/travel-preferences 바디에서 각 단계의 답변이 들어갈 키.
 * 서버 스펙의 카테고리 8개와 위저드 8단계가 1:1로 대응합니다.
 */
export type PreferenceCategory =
  | 'trip'
  | 'mobility'
  | 'tempo'
  | 'avoid'
  | 'activity'
  | 'food'
  | 'stay'
  | 'budget';

export type PreferenceStep = {
  id: string;
  /** 이 단계의 답변이 서버 바디의 어느 카테고리로 들어가는지 */
  category: PreferenceCategory;
  title: string;
  subtitle?: string;
  fields: PreferenceField[];
};

/**
 * 자유 입력 필드 id.
 * 화면에서는 마지막(예산) 단계 안에 있지만 서버 바디에서는 카테고리가 아니라
 * 최상위 `freeText` 로 올라갑니다. 변환할 때 이 id 만 따로 빼냅니다.
 */
export const FREE_TEXT_FIELD_ID = 'freeText';

/** 지역 칩: 아직 미정 + 도시 목록 */
const REGION_OPTIONS = ['아직 미정', ...CITIES.map(c => c.name)];

export const PREFERENCE_STEPS: PreferenceStep[] = [
  {
    id: 'basic',
    category: 'trip',
    title: '어떤 여행을 준비 중이세요?',
    subtitle: '기본 정보부터 알려주세요. 나중에 언제든 바꿀 수 있어요.',
    fields: [
      {
        id: 'region',
        label: '여행 지역',
        type: 'chips-single',
        required: true,
        options: REGION_OPTIONS,
      },
      {
        id: 'duration',
        label: '여행 기간',
        type: 'chips-single',
        required: true,
        options: ['당일', '1박 2일', '2박 3일', '3박 이상'],
      },
    ],
  },
  {
    id: 'move',
    category: 'mobility',
    title: '이동은 어떻게 하실 건가요?',
    subtitle: '동선을 짜는 데 가장 큰 기준이 돼요.',
    fields: [
      {
        id: 'transport',
        label: '주요 이동수단',
        hint: '복수 선택',
        type: 'chips-multi',
        required: true,
        options: ['대중교통', '자가용'],
      },
      {
        id: 'moveLoad',
        label: '이동 피로도',
        type: 'cards-single',
        required: true,
        options: [
          { value: '이동 최소', desc: '숙소 근처에서 알차게' },
          { value: '대중교통 위주', desc: '버스·기차로 여유있게' },
          { value: '이동 많아도 OK', desc: '멀어도 가고 싶은 곳 위주' },
        ],
      },
      {
        id: 'restNeed',
        label: '중간중간 쉬는 시간이 필요한가요?',
        type: 'chips-single',
        required: true,
        options: ['꼭 필요해요', '가끔이면 충분', '없어도 괜찮아요'],
      },
    ],
  },
  {
    id: 'tempo',
    category: 'tempo',
    title: '여행의 온도를 알려주세요',
    subtitle: '하루를 얼마나 촘촘하게 채울지 정해볼게요.',
    fields: [
      {
        id: 'pace',
        label: '여행 페이스',
        type: 'cards-single',
        required: true,
        options: [
          { value: '느긋하게', desc: '하루 2~3곳, 한 곳에 오래 머물기' },
          { value: '균형있게', desc: '하루 4~5곳, 적당한 리듬으로' },
          { value: '알차게', desc: '하루 6곳 이상, 부지런히' },
        ],
      },
      {
        id: 'dayNight',
        label: '낮과 밤, 언제 집중하세요?',
        type: 'chips-single',
        required: true,
        options: ['아침 일찍부터', '낮 중심', '해질녘·야경', '늦은 밤까지'],
      },
      {
        id: 'planStyle',
        label: '계획 스타일',
        type: 'chips-single',
        options: ['촘촘한 계획형', '반반이 좋아요', '즉흥적으로'],
      },
    ],
  },
  {
    id: 'avoid',
    category: 'avoid',
    title: '이것만은 정말 피하고 싶은 게 있나요?',
    subtitle: '고른 조건은 코스에서 빼드릴게요.',
    fields: [
      {
        id: 'avoid',
        label: '피하고 싶은 것',
        hint: '복수 선택',
        type: 'chips-multi',
        options: [
          '시끄러운 곳',
          '관광객 많은 곳',
          '웨이팅 긴 맛집',
          '계단·오르막',
          '늦은 밤 이동',
          '등산 코스',
          '물놀이·수상활동',
          '벌레 많은 야외',
          '술자리 중심',
          '단체·패키지 분위기',
          '비싼 입장료',
          '좁고 붐비는 실내',
        ],
      },
      {
        id: 'nightSafety',
        label: '밤 시간대는 어떻게 할까요?',
        type: 'cards-single',
        required: true,
        options: [
          { value: '해 지면 숙소 근처만', desc: '도보 10분 이내로 안전하게' },
          { value: '사람 많은 중심가만', desc: '유동인구·조도 높은 곳 위주' },
          { value: '상관없어요', desc: '야경 스팟도 자유롭게' },
        ],
      },
    ],
  },
  {
    id: 'activity',
    category: 'activity',
    title: '어떤 활동이 끌리세요?',
    subtitle: '끌리는 걸 모두 골라주세요. 많이 고를수록 정확해져요.',
    fields: [
      {
        id: 'activities',
        label: '액티비티 유형',
        hint: '복수 선택',
        type: 'chips-multi',
        required: true,
        options: [
          '자연·산책',
          '전망·야경',
          '감성 카페',
          '사진 스팟',
          '미술관·박물관',
          '독립서점',
          '전통시장',
          '온천·스파',
          '공방·체험',
          '레저·액티비티',
          '공연·페스티벌',
          '역사·유적',
          '캠핑·차박',
          '로컬 골목 탐방',
        ],
      },
      {
        id: 'walkLoad',
        label: '몸 쓰는 강도는 어느 정도가 좋아요?',
        type: 'chips-single',
        required: true,
        options: ['거의 안 걷기', '가볍게 걷기', '많이 걸어도 OK'],
      },
    ],
  },
  {
    id: 'food',
    category: 'food',
    title: '맛집은 어떤 스타일이세요?',
    subtitle: '혼자서도 편하게 먹을 수 있는 곳으로 골라드려요.',
    fields: [
      {
        id: 'foodStyle',
        label: '끌리는 맛집 스타일',
        hint: '복수 선택',
        type: 'chips-multi',
        required: true,
        options: [
          '현지 찐맛집',
          '노포·백반',
          '유명 맛집',
          '감성 카페',
          '디저트·베이커리',
          '채식·건강식',
          '혼밥 편한 곳',
          '시장 먹거리',
          '야식·포차',
          '술 한잔 곁들이기',
        ],
      },
      {
        id: 'soloDining',
        label: '혼밥 난이도는 어때요?',
        type: 'cards-single',
        required: true,
        options: [
          { value: '혼밥 완전 편해요', desc: '어디든 상관없어요' },
          { value: '조용한 1인석 위주', desc: '눈치 안 보이는 곳으로' },
          { value: '포장·테이크아웃 선호', desc: '숙소에서 편하게 먹을래요' },
        ],
      },
      {
        id: 'foodAvoid',
        label: '못 먹는 음식이 있나요?',
        hint: '복수 선택',
        type: 'chips-multi',
        options: [
          '없어요',
          '매운 음식',
          '해산물',
          '날것(회·육회)',
          '고수·향신료',
          '유제품',
          '견과류',
          '돼지고기',
        ],
      },
    ],
  },
  {
    id: 'stay',
    category: 'stay',
    title: '숙소는 무엇이 중요하세요?',
    subtitle: '안전등급과 함께 조건에 맞는 곳을 찾아드려요.',
    fields: [
      {
        id: 'stayType',
        label: '선호하는 숙소 타입',
        hint: '복수 선택',
        type: 'chips-multi',
        required: true,
        options: [
          '아직 미정',
          '게스트하우스',
          '호텔',
          '모텔',
          '펜션·독채',
          '한옥',
          '캠핑·차박',
        ],
      },
      {
        id: 'stayMust',
        label: '이건 꼭 필요해요',
        hint: '복수 선택',
        type: 'chips-multi',
        options: [
          '역·터미널 근처',
          '24시 프런트',
          'CCTV·보안',
          '여성 전용',
          '조용한 방',
          '깨끗한 청결도',
          '조식 제공',
          '주차 가능',
          '야경 뷰',
          '세탁 가능',
          '가성비',
        ],
      },
      {
        id: 'stayBudget',
        label: '1박 숙소 예산',
        type: 'chips-single',
        required: true,
        options: ['5만원 이하', '5~10만원', '10~20만원', '20만원 이상'],
      },
    ],
  },
  {
    id: 'budget',
    category: 'budget',
    title: '하루 예산은 얼마쯤?',
    subtitle: '숙소를 뺀 하루 경비 기준으로 알려주세요.',
    fields: [
      {
        id: 'dailyBudget',
        label: '하루 예산',
        type: 'slider',
        min: 3,
        max: 30,
        step: 1,
        defaultValue: 15,
        unit: '만원',
        scale: ['3만', '10만', '20만', '30만+'],
      },
      {
        id: 'spendFocus',
        label: '어디에 더 쓰고 싶으세요?',
        hint: '복수 선택',
        type: 'chips-multi',
        options: [
          '맛집',
          '숙소',
          '체험·액티비티',
          '기념품·쇼핑',
          '카페·디저트',
          '편한 교통',
        ],
      },
      {
        id: 'freeText',
        label: '더 알려주고 싶은 게 있나요?',
        hint: '자연어로 자세히 적을수록 좋아요',
        type: 'text',
        placeholder: '가고 싶은 분위기나 하고 싶은 것을 적어주세요',
        maxLength: 300,
      },
    ],
  },
];

/**
 * 슬라이더처럼 초기값이 필요한 항목만 채운 빈 답변.
 * 저장된 답변·진입 도시는 호출하는 쪽에서 이 위에 덮어씁니다.
 */
export function createInitialAnswers(): PreferenceAnswers {
  const answers: PreferenceAnswers = {};
  PREFERENCE_STEPS.forEach(step =>
    step.fields.forEach(field => {
      if (field.type === 'slider') {
        answers[field.id] = field.defaultValue;
      }
    }),
  );
  return answers;
}

const hasValue = (value: PreferenceValue | undefined) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== '';
};

/** 필수 항목이 모두 채워졌는지 (다음 버튼 활성화 조건) */
export function isStepComplete(
  step: PreferenceStep,
  answers: PreferenceAnswers,
) {
  return step.fields.every(
    field => !field.required || hasValue(answers[field.id]),
  );
}

/** 마이페이지 '나의 여행 취향' 카드에 보여줄 값 */
export type PreferenceHighlights = {
  duration: string | null;
  pace: string | null;
  /** 만원 단위 */
  dailyBudget: number | null;
  moods: string[];
};

const asText = (value: PreferenceValue | undefined) =>
  typeof value === 'string' && value.length > 0 ? value : null;

export function highlightPreferences(
  answers: PreferenceAnswers,
): PreferenceHighlights {
  const budget = answers.dailyBudget;
  const activities = answers.activities;
  return {
    duration: asText(answers.duration),
    pace: asText(answers.pace),
    dailyBudget: typeof budget === 'number' ? budget : null,
    moods: Array.isArray(activities) ? activities : [],
  };
}

/** 홈 배너에 보여줄 한 줄 요약 */
export function summarizePreferences(answers: PreferenceAnswers): string {
  const activities = answers.activities;
  const firstActivity = Array.isArray(activities) ? activities[0] : undefined;
  const activityText =
    firstActivity && Array.isArray(activities) && activities.length > 1
      ? `${firstActivity} 외 ${activities.length - 1}`
      : firstActivity;

  const parts = [
    answers.region !== '아직 미정' ? answers.region : undefined,
    answers.duration,
    answers.pace,
    activityText,
  ].filter(part => typeof part === 'string' && part.length > 0);

  return parts.length ? parts.join(' · ') : '기본 설정으로 추천 중';
}
