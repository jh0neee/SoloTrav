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
  RegionSafety,
  TourFestival,
  TourSpot,
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

/** 도시 하나의 안전등급 — 응답 전이거나 없는 지역이면 정적 기본값을 씁니다 */
export function safetyOf(city: City, map: SafetyMap | null) {
  const safety = map?.[city.sigungu] ?? null;
  return {
    grade: safety?.grade ?? city.safetyGrade,
    score: safety?.score ?? city.stats.safety,
    /** API 로 확인된 값인지 — 화면에서 '기준 연도' 표기 여부를 정합니다 */
    isLive: safety !== null,
    baseYear: safety?.baseYear ?? null,
    detail: safety,
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

/** 관광사진 갤러리 — 키워드를 주면 그 지역 사진만 */
export function useGalleryPhotos(
  keyword = '충청북도',
  size = 12,
): QueryResult<GalleryPhoto[]> {
  const loader = useCallback(
    () => travelApi.listGalleryPhotos({ keyword, size }),
    [keyword, size],
  );

  return useTravelQuery(`gallery:${keyword}:${size}`, loader);
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

/** 오늘로부터 n일 전 날짜를 YYYYMMDD 로 (n=0 이면 오늘) */
function daysAgoYmd(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
}
