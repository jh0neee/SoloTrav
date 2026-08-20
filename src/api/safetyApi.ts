/**
 * 지역안전지수 API (행정안전부).
 *
 * 6개 분야(교통사고·화재·범죄·생활안전·자살·감염병)를 각각 1~5 등급으로 주고,
 * **1등급이 가장 안전**합니다. 시군구 단위이며 연 1회 발표라 실시간 값이 아닙니다.
 * 그래서 "이 골목이 지금 안전한가"가 아니라 "이 지역의 평소 수준"으로만 씁니다.
 *
 * 혼자 여행하는 사람에게 직접 와닿는 건 범죄·생활안전 두 가지라, 화면 배지는
 * 이 둘의 평균으로 만듭니다(교통사고·감염병 등은 여행 안전과 연관이 옅습니다).
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toApiError } from './errors';

/** 지역안전지수 한 건 (서버가 snake_case 로 내려줍니다) */
export type RegionalSafety = {
  baseYear: number;
  sido: string;
  /** 시도 단위 행에는 없습니다. */
  sigungu: string | null;
  regionType: string;
  trafficAccidentGrade: number | null;
  fireGrade: number | null;
  crimeGrade: number | null;
  lifeSafetyGrade: number | null;
  suicideGrade: number | null;
  infectiousDiseaseGrade: number | null;
};

/** 화면 배지용으로 추린 결과 */
export type SafetyBadge = {
  /** 예: '단양군' — 배지 옆에 함께 보여 줄 지역 이름 */
  regionName: string;
  /** 'A' ~ 'E'. 범죄·생활안전 등급의 평균을 글자로 바꾼 값입니다. */
  letter: string;
  crimeGrade: number | null;
  lifeSafetyGrade: number | null;
  baseYear: number;
};

type Raw = Record<string, unknown>;

function num(raw: Raw, key: string): number | null {
  const value = raw[key];
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function str(raw: Raw, key: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalize(raw: Raw): RegionalSafety {
  return {
    baseYear: num(raw, 'base_year') ?? 0,
    sido: str(raw, 'sido'),
    sigungu: str(raw, 'sigungu') || null,
    regionType: str(raw, 'region_type'),
    trafficAccidentGrade: num(raw, 'traffic_accident_grade'),
    fireGrade: num(raw, 'fire_grade'),
    crimeGrade: num(raw, 'crime_grade'),
    lifeSafetyGrade: num(raw, 'life_safety_grade'),
    suicideGrade: num(raw, 'suicide_grade'),
    infectiousDiseaseGrade: num(raw, 'infectious_disease_grade'),
  };
}

/** 1등급(가장 안전) → 'A' … 5등급 → 'E' */
const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function toLetter(grade: number): string {
  const index = Math.round(grade) - 1;
  return GRADE_LETTERS[Math.max(0, Math.min(GRADE_LETTERS.length - 1, index))];
}

/**
 * 주소 문자열에서 시도·시군구를 뽑습니다.
 * TourAPI 의 addr1 은 항상 '충청북도 단양군 단양읍 …' 처럼 시도부터 시작합니다.
 *
 * 세종특별자치시처럼 시군구가 없는 곳은 sigungu 가 null 이 됩니다.
 */
export function parseRegion(
  address: string,
): { sido: string; sigungu: string | null } | null {
  const tokens = address.trim().split(/\s+/);
  if (tokens.length === 0 || !tokens[0]) {
    return null;
  }
  const sido = tokens[0];
  // 두 번째 토큰이 시/군/구 로 끝날 때만 시군구로 인정합니다(읍·면·동은 제외).
  const second = tokens[1] ?? '';
  const sigungu = /(시|군|구)$/.test(second) ? second : null;
  return { sido, sigungu };
}

export const safetyApi = {
  /**
   * 시도로 지역안전지수를 조회합니다.
   * 시군구 단위 행까지 한 번에 오므로, 원하는 시군구는 호출한 쪽에서 고릅니다.
   */
  bySido: async (
    sido: string,
    signal?: AbortSignal,
  ): Promise<RegionalSafety[]> => {
    try {
      const { data } = await apiClient.get(
        ENDPOINTS.regionalSafetyBySido({ sido }),
        { signal },
      );
      const envelope = (data ?? {}) as Raw;
      const payload = envelope.payload ?? envelope.data ?? envelope;
      return Array.isArray(payload) ? (payload as Raw[]).map(normalize) : [];
    } catch (error) {
      throw toApiError(error);
    }
  },

  /**
   * 배지 하나로 줄여서 돌려줍니다.
   * 시군구를 알면 그 행을, 못 찾으면 시도 행으로 물러섭니다.
   */
  badge: async (
    { sido, sigungu }: { sido: string; sigungu?: string | null },
    signal?: AbortSignal,
  ): Promise<SafetyBadge | null> => {
    const rows = await safetyApi.bySido(sido, signal);
    if (rows.length === 0) {
      return null;
    }

    const matched =
      (sigungu ? rows.find(row => row.sigungu === sigungu) : null) ??
      rows.find(row => row.regionType === 'SIDO' && !row.sigungu) ??
      rows[0];

    const grades = [matched.crimeGrade, matched.lifeSafetyGrade].filter(
      (grade): grade is number => grade !== null,
    );
    if (grades.length === 0) {
      return null;
    }

    const average = grades.reduce((sum, g) => sum + g, 0) / grades.length;

    return {
      regionName: matched.sigungu ?? matched.sido,
      letter: toLetter(average),
      crimeGrade: matched.crimeGrade,
      lifeSafetyGrade: matched.lifeSafetyGrade,
      baseYear: matched.baseYear,
    };
  },
};
