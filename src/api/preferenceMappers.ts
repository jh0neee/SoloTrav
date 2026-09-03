/**
 * 여행 취향: 화면이 쓰는 평평한 답변 ↔ 서버가 쓰는 카테고리 문서 변환.
 *
 * 화면(위저드)은 `{ pace: '느긋하게', activities: [...], ... }` 처럼 필드 id 를
 * 키로 하는 한 겹짜리 객체를 다룹니다. 반면 서버 바디는 카테고리 8개로 나뉘어
 * 있습니다. 다행히 위저드 8단계와 카테고리 8개가 1:1이라, 각 단계에 적어둔
 * `category` 를 보고 기계적으로 나누고 합칠 수 있습니다.
 *
 *   화면            서버
 *   basic     →     trip
 *   move      →     mobility
 *   tempo/avoid/activity/food/stay/budget → 이름 그대로
 *   freeText  →     (카테고리가 아니라 최상위 freeText)
 *
 * 카테고리 안쪽 필드는 스펙상 자유 형식(`{}`)이라 서버가 정해둔 게 없습니다.
 * 앱이 필드 id 를 그대로 키로 쓰고, 나중에 이 규칙이 바뀌면 구분할 수 있도록
 * schemaVersion 을 함께 올립니다.
 */
import {
  FREE_TEXT_FIELD_ID,
  PREFERENCE_STEPS,
  type PreferenceAnswers,
  type PreferenceCategory,
  type PreferenceValue,
} from '../data/preferences';
import { unwrap } from './mappers';
import type {
  Envelope,
  PreferenceCategoryDto,
  TravelPreferenceDto,
  TravelPreferenceRequest,
} from './dto';

/** 카테고리 안쪽 필드 구성이 바뀌면 이 값을 올립니다. */
export const PREFERENCE_SCHEMA_VERSION = '1.1';

function emptyCategories(): Record<PreferenceCategory, PreferenceCategoryDto> {
  return {
    trip: {},
    mobility: {},
    tempo: {},
    avoid: {},
    activity: {},
    food: {},
    stay: {},
    budget: {},
  };
}

/** 서버에서 온 값이 화면이 다룰 수 있는 형태인지 (문자열 / 숫자 / 문자열 배열) */
function isPreferenceValue(value: unknown): value is PreferenceValue {
  if (typeof value === 'string') {
    return value.length > 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return (
    Array.isArray(value) && value.every(item => typeof item === 'string')
  );
}

/** 평평한 답변 → POST 바디 */
export function toTravelPreferenceRequest(
  answers: PreferenceAnswers,
): TravelPreferenceRequest {
  const categories = emptyCategories();
  let freeText = '';

  PREFERENCE_STEPS.forEach(step => {
    step.fields.forEach(field => {
      const value = answers[field.id];
      if (value === undefined) {
        return;
      }
      // 자유 입력은 화면상 예산 단계 안에 있지만 서버에서는 최상위입니다.
      if (field.id === FREE_TEXT_FIELD_ID) {
        freeText = typeof value === 'string' ? value : '';
        return;
      }
      categories[step.category][field.id] = value;
    });
  });

  return {
    schemaVersion: PREFERENCE_SCHEMA_VERSION,
    ...categories,
    freeText,
    meta: {},
  };
}

/**
 * GET/POST 응답 → 평평한 답변.
 * 아직 등록한 적이 없으면 서버가 빈 문서나 null 을 주므로 그 경우 null 을
 * 돌려주고, 화면은 "미등록" 상태로 표시합니다.
 */
export function toPreferenceAnswers(payload: unknown): PreferenceAnswers | null {
  const dto = unwrap(payload as Envelope<TravelPreferenceDto>);
  const answers: PreferenceAnswers = {};

  PREFERENCE_STEPS.forEach(step => {
    const category = dto[step.category];
    if (!category || typeof category !== 'object') {
      return;
    }
    step.fields.forEach(field => {
      const value = category[field.id];
      if (isPreferenceValue(value)) {
        answers[field.id] = value;
      }
    });
  });

  if (typeof dto.freeText === 'string' && dto.freeText.length > 0) {
    answers[FREE_TEXT_FIELD_ID] = dto.freeText;
  }

  return Object.keys(answers).length > 0 ? answers : null;
}
