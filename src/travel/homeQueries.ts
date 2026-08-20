/**
 * 홈·도시 화면이 쓰는 조회 훅 모음.
 *
 * 화면 컴포넌트가 travelApi 를 직접 부르지 않도록 "무엇을 보여줄지" 단위로
 * 한 겹 감쌌습니다. 캐시 키를 여기서 정하기 때문에 같은 데이터를 두 화면이
 * 함께 써도 요청은 한 번만 나갑니다.
 */
import { useCallback, useMemo } from 'react';
import { travelApi } from '../api/travelApi';
import { useTravelQuery, type QueryResult } from './useTravelQuery';
import { CITIES, SPOTLIGHT_CITY_IDS, type City } from '../data/cities';
import type {
  GalleryPhoto,
  HubAttraction,
  RankingKind,
  RegionSafety,
  TourFestival,
  TourSpot,
  VisitorStat,
} from '../types/travel';

/** 우리가 다루는 지역 — 지금은 충북 한 곳입니다 */
const SIDO = '충청북도';
const REGION_CODE = '43';

/** 시군구명 → 지역안전지수 */
export type SafetyMap = Record<string, RegionSafety>;

/**
 * 충북 전체 시군의 지역안전지수를 한 번에 받아옵니다.
 * 응답에 시도 행("충청북도")도 섞여 오는데 그건 시군 키가 없어 자연히 빠집니다.
 */
export function useRegionSafety(): QueryResult<SafetyMap> {
  const loader = useCallback(async () => {
    const list = await travelApi.getRegionSafetyBySido(SIDO);
    return list.reduce<SafetyMap>((map, safety) => {
      if (safety.sigungu) {
        map[safety.sigungu] = safety;
      }
      return map;
    }, {});
  }, []);

  return useTravelQuery(`safety:${SIDO}`, loader);
}

/**
 * 도시 하나의 안전 정보 — 응답 전이거나 없는 지역이면 정적 기본값을 씁니다.
 *
 * 화면에 쓰는 등급·점수는 **혼행 안전**(치안·생활안전·교통 가중) 값입니다.
 * 행정안전부 6개 부문 단순 평균은 overallGrade/overallScore 로 따로 둡니다 —
 * 두 값이 다를 수 있어서 어느 쪽을 보여주는지 헷갈리지 않게 이름을 나눴습니다.
 */
export function safetyOf(city: City, map: SafetyMap | null) {
  const safety = map?.[city.sigungu] ?? null;
  return {
    grade: safety?.soloGrade ?? city.safetyGrade,
    score: safety?.soloScore ?? city.stats.safety,
    /** 행정안전부 6개 부문 단순 평균 기준 */
    overallGrade: safety?.grade ?? city.safetyGrade,
    overallScore: safety?.score ?? city.stats.safety,
    /** 치안(범죄) 등급 1~5 — 혼행객이 가장 먼저 보는 값 */
    crimeGrade: safety?.grades.crime ?? null,
    /** API 로 확인된 값인지 — 화면에서 '기준 연도' 표기 여부를 정합니다 */
    isLive: safety !== null,
    baseYear: safety?.baseYear ?? null,
    detail: safety,
  };
}

/** 시군구 법정동 5자리 코드 → 방문자 집계 */
export type VisitorMap = Record<string, VisitorStat>;

export type VisitorSnapshot = {
  stats: VisitorMap;
  /** 집계 기준일 YYYYMMDD */
  baseYmd: string;
  /** 예: '토요일' */
  dayLabel: string;
};

/**
 * 충북 시군의 주말 방문자 집계.
 *
 * 이 API 는 지역을 좁힐 수 없고 집계도 한 달 넘게 밀려 있어서 순서가 좀 깁니다.
 *   1) 데이터가 실제로 있는 최근 토요일을 찾고
 *   2) 그 날과 4주 전 같은 요일을 각각 받아
 *   3) 충북 11개 시군만 남겨 증감률까지 계산합니다.
 * 캐시가 있으니 앱을 켜 두는 동안 한 번만 나갑니다.
 */
export function useVisitorStats(): QueryResult<VisitorSnapshot> {
  const loader = useCallback(async (): Promise<VisitorSnapshot> => {
    const codes = CITIES.map(city => city.municipalityCode);
    const latest = await travelApi.findLatestVisitorDate();
    if (!latest) {
      return { stats: {}, baseYmd: '', dayLabel: '' };
    }

    const [current, previous] = await Promise.all([
      travelApi.getVisitorTotals(latest, codes),
      // 4주 전 같은 요일 — 요일이 다르면 방문자 수가 통째로 달라 비교가 무의미합니다.
      travelApi.getVisitorTotals(shiftYmd(latest, -28), codes).catch(() => null),
    ]);

    const stats: VisitorMap = {};
    let dayLabel = '';

    for (const city of CITIES) {
      const totals = current.get(city.municipalityCode);
      if (!totals) {
        continue;
      }
      const before = previous?.get(city.municipalityCode)?.visitor ?? null;
      const denominator = totals.local + totals.visitor;
      dayLabel = dayLabel || totals.dayLabel;

      stats[city.municipalityCode] = {
        districtCode: city.municipalityCode,
        districtName: totals.districtName || city.sigungu,
        local: Math.round(totals.local),
        visitor: Math.round(totals.visitor),
        foreign: Math.round(totals.foreign),
        visitorRatio: denominator
          ? Math.round((totals.visitor / denominator) * 100)
          : 0,
        changeRate:
          before && before > 0
            ? Math.round(((totals.visitor - before) / before) * 1000) / 10
            : null,
        baseYmd: latest,
        dayLabel: totals.dayLabel,
      };
    }

    return { stats, baseYmd: latest, dayLabel };
  }, []);

  return useTravelQuery('visitors:chungbuk', loader);
}

/** 랭킹 한 줄 — 화면은 이 값을 그대로 그리기만 하면 됩니다 */
export type RankedCity = {
  city: City;
  rank: number;
  /** 큰 글씨로 보여줄 대표 수치 (예: '안전 71점', '3.8만 명') */
  value: string;
  /** 그 아래 작은 설명 (예: '치안 2등급', '4주 전 -17%') */
  caption: string;
  safetyGrade: string;
  crimeGrade: number | null;
};

/**
 * 홈 랭킹 3종을 한 번에 계산합니다.
 *
 * 안전·방문자 두 조회는 각자 캐시를 타므로 여기서 다시 요청하지 않고
 * 이미 받은 값을 조합만 합니다. 아직 안 온 데이터가 있으면 그 랭킹은 빈 배열입니다.
 */
export function useCityRankings(): {
  rankings: Record<RankingKind, RankedCity[]>;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  /** 방문자 데이터 기준일 안내 문구 */
  visitorBaseLabel: string | null;
} {
  const safety = useRegionSafety();
  const visitors = useVisitorStats();

  const rankings = useMemo<Record<RankingKind, RankedCity[]>>(() => {
    const withSafety = CITIES.map(city => ({
      city,
      safety: safetyOf(city, safety.data),
      visitor: visitors.data?.stats[city.municipalityCode] ?? null,
    }));

    const safe = [...withSafety]
      .sort((a, b) => b.safety.score - a.safety.score)
      .map((item, index) => ({
        city: item.city,
        rank: index + 1,
        value: `${item.safety.score}점`,
        caption: item.safety.crimeGrade
          ? `치안 ${item.safety.crimeGrade}등급 · 종합 ${item.safety.overallGrade}`
          : '지역안전지수 기준',
        safetyGrade: item.safety.grade,
        crimeGrade: item.safety.crimeGrade,
      }));

    // 방문자 데이터가 없으면 핫·한적 랭킹은 만들 수 없습니다(임의로 꾸미지 않습니다).
    const visited = withSafety.filter(item => item.visitor !== null);

    const hot = [...visited]
      .sort((a, b) => (b.visitor?.visitor ?? 0) - (a.visitor?.visitor ?? 0))
      .map((item, index) => ({
        city: item.city,
        rank: index + 1,
        value: formatCount(item.visitor?.visitor ?? 0),
        caption:
          item.visitor?.changeRate !== null && item.visitor
            ? `4주 전 대비 ${formatSigned(item.visitor.changeRate ?? 0)}`
            : `외지인 비율 ${item.visitor?.visitorRatio ?? 0}%`,
        safetyGrade: item.safety.grade,
        crimeGrade: item.safety.crimeGrade,
      }));

    const quiet = [...visited]
      .sort((a, b) => (a.visitor?.visitor ?? 0) - (b.visitor?.visitor ?? 0))
      .map((item, index) => ({
        city: item.city,
        rank: index + 1,
        value: formatCount(item.visitor?.visitor ?? 0),
        caption: `주민 대비 외지인 ${item.visitor?.visitorRatio ?? 0}%`,
        safetyGrade: item.safety.grade,
        crimeGrade: item.safety.crimeGrade,
      }));

    return { safe, hot, quiet };
  }, [safety.data, visitors.data]);

  const snapshot = visitors.data;

  return {
    rankings,
    isLoading: safety.status === 'loading' || visitors.status === 'loading',
    error: safety.error ?? visitors.error,
    reload: () => {
      safety.reload();
      visitors.reload();
    },
    visitorBaseLabel:
      snapshot && snapshot.baseYmd
        ? `${formatYmdLabel(snapshot.baseYmd)} ${snapshot.dayLabel} 기준`
        : null,
  };
}

export type SpotlightCity = {
  city: City;
  /** 그 동네 대표 사진 (관광정보 최신 항목의 대표 이미지) */
  imageUrl: string | null;
  /** 사진에 딸린 장소 이름 — 출처를 알 수 있게 함께 보여줍니다 */
  imageCaption: string | null;
};

/**
 * 스포트라이트 카드용 데이터.
 * 도시별로 대표이미지가 있는 관광정보 1건씩만 가져옵니다(카드당 요청 1회).
 */
export function useSpotlightCities(): QueryResult<SpotlightCity[]> {
  const cities = useMemo(
    () =>
      SPOTLIGHT_CITY_IDS.map(id => CITIES.find(city => city.id === id)).filter(
        (city): city is City => !!city,
      ),
    [],
  );

  const loader = useCallback(
    () =>
      Promise.all(
        cities.map(async city => {
          const page = await travelApi.listSpotsByRegion({
            regionCode: city.regionCode,
            districtCode: city.districtCode,
            size: 1,
            arrange: 'Q',
          });
          const spot = page.items[0] ?? null;
          return {
            city,
            imageUrl: spot?.imageUrl ?? null,
            imageCaption: spot?.title ?? null,
          };
        }),
      ),
    [cities],
  );

  return useTravelQuery(`spotlight:${SPOTLIGHT_CITY_IDS.join(',')}`, loader);
}

/**
 * 충북에서 곧 열리거나 진행 중인 축제.
 *
 * 오늘 이후 시작하는 행사만 오면 "지금 하는 축제"가 빠지므로 60일 전부터
 * 조회한 뒤, 이미 끝난 것만 걸러내고 시작일 순으로 정렬합니다.
 */
export function useUpcomingFestivals(size = 12): QueryResult<TourFestival[]> {
  const loader = useCallback(async () => {
    const festivals = await travelApi.listFestivals({
      regionCode: REGION_CODE,
      from: daysAgoYmd(60),
      size: 100,
    });
    const todayValue = Number(daysAgoYmd(0));

    return festivals
      .filter(festival => Number(festival.endDate ?? '0') >= todayValue)
      .sort((a, b) => Number(a.startDate ?? 0) - Number(b.startDate ?? 0))
      .slice(0, size);
  }, [size]);

  return useTravelQuery(`festival:${REGION_CODE}:${size}`, loader);
}

/** 도시 한 곳의 축제 — 도시 상세에서 씁니다 */
export function useCityFestivals(city: City | null): QueryResult<TourFestival[]> {
  const loader = useCallback(async () => {
    if (!city) {
      return [];
    }
    const festivals = await travelApi.listFestivals({
      regionCode: city.regionCode,
      districtCode: city.districtCode,
      from: daysAgoYmd(60),
      size: 30,
    });
    const todayValue = Number(daysAgoYmd(0));
    return festivals
      .filter(festival => Number(festival.endDate ?? '0') >= todayValue)
      .sort((a, b) => Number(a.startDate ?? 0) - Number(b.startDate ?? 0));
  }, [city]);

  return useTravelQuery(city ? `cityFestival:${city.id}` : null, loader);
}

/** 관광사진 갤러리 — 키워드를 주면 그 지역 사진만 */
export function useGalleryPhotos(
  keyword = SIDO,
  size = 12,
  page = 1,
): QueryResult<GalleryPhoto[]> {
  const loader = useCallback(
    async () => (await travelApi.listGalleryPhotos({ keyword, size, page })).items,
    [keyword, size, page],
  );

  return useTravelQuery(`gallery:${keyword}:${size}:${page}`, loader);
}

/** 동네에 무엇이 얼마나 있는지 — 콘텐츠 타입별 건수 */
export type SpotCounts = {
  total: number;
  attraction: number;
  culture: number;
  food: number;
  stay: number;
};

/**
 * 도시 한 곳의 관광 인프라 건수.
 * 목록은 필요 없고 숫자만 쓰므로 1건씩만 받아 totalCount 를 읽습니다(요청 5회, 각 수 KB).
 * 도시 상세를 열었을 때만 부르세요 — 홈에서 총합만 필요하면 useSpotTotal 을 씁니다.
 */
export function useSpotCounts(city: City): QueryResult<SpotCounts> {
  const loader = useCallback(async (): Promise<SpotCounts> => {
    const filter = {
      regionCode: city.regionCode,
      districtCode: city.districtCode,
    };

    const [total, attraction, culture, food, stay] = await Promise.all([
      travelApi.countSpots(filter),
      travelApi.countSpots({ ...filter, contentTypeId: '12' }),
      travelApi.countSpots({ ...filter, contentTypeId: '14' }),
      travelApi.countSpots({ ...filter, contentTypeId: '39' }),
      travelApi.countSpots({ ...filter, contentTypeId: '32' }),
    ]);
    return { total, attraction, culture, food, stay };
  }, [city]);

  return useTravelQuery(`counts:${city.id}`, loader);
}

/** 충북 전체 관광정보 건수 — 히어로 통계 한 칸을 위해 요청 1회만 씁니다 */
export function useSpotTotal(): QueryResult<number> {
  const loader = useCallback(
    () => travelApi.countSpots({ regionCode: REGION_CODE }),
    [],
  );
  return useTravelQuery(`counts:total:${REGION_CODE}`, loader);
}

export type CityIntro = {
  /** 방문 상위 관광지 랭킹 (기초지자체 중심 관광지) */
  attractions: HubAttraction[];
  /** 사진이 있는 관광정보 — 카드 목록용 */
  spots: TourSpot[];
};

/**
 * 도시 한 곳의 소개 데이터.
 * 랭킹은 이름만 있고 사진이 없어서, 사진이 필요한 카드 목록은 관광정보 조회로
 * 따로 채웁니다. (두 API 를 이름으로 이어 붙이면 표기 차이 때문에 자주 어긋납니다)
 */
export function useCityIntro(city: City | null): QueryResult<CityIntro> {
  const loader = useCallback(async () => {
    if (!city) {
      return { attractions: [], spots: [] };
    }
    const [attractions, page] = await Promise.all([
      // 랭킹은 없는 달이 있어도 화면이 비지 않도록 실패를 삼킵니다.
      travelApi
        .listHubAttractions({
          areaCd: city.regionCode,
          signguCd: city.municipalityCode,
          size: 5,
        })
        .catch(() => []),
      travelApi.listSpotsByRegion({
        regionCode: city.regionCode,
        districtCode: city.districtCode,
        size: 10,
        arrange: 'Q',
      }),
    ]);
    return { attractions, spots: page.items };
  }, [city]);

  return useTravelQuery(city ? `cityIntro:${city.id}` : null, loader);
}

// ─────────────────────────────── 날짜·숫자 헬퍼

/** 오늘로부터 n일 전 날짜를 YYYYMMDD 로 (n=0 이면 오늘) */
function daysAgoYmd(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toYmd(date);
}

/** YYYYMMDD 를 days 만큼 이동 */
function shiftYmd(ymd: string, days: number): string {
  const date = new Date(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(4, 6)) - 1,
    Number(ymd.slice(6, 8)),
  );
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

function toYmd(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
}

/** '20260711' → '7월 11일' */
function formatYmdLabel(ymd: string): string {
  if (!/^\d{8}$/.test(ymd)) {
    return ymd;
  }
  return `${Number(ymd.slice(4, 6))}월 ${Number(ymd.slice(6, 8))}일`;
}

/** 37594 → '3.8만 명' — 카드에 들어갈 짧은 표기 */
export function formatCount(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}만 명`;
  }
  return `${value.toLocaleString()}명`;
}

/** -17.3 → '-17.3%' / 0.9 → '+0.9%' */
export function formatSigned(value: number): string {
  return `${value > 0 ? '+' : ''}${value}%`;
}
