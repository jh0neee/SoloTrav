/**
 * 여행 정보 API 요청 모음 (한국관광공사 TourAPI 프록시).
 *
 * 로그인 없이도 호출되는 공개 데이터지만, 토큰이 있으면 자동으로 실리도록
 * 다른 요청과 같은 apiClient 를 씁니다(토큰이 없으면 헤더가 안 붙을 뿐입니다).
 *
 * 화면은 여기 있는 함수만 부르고 TourAPI 파라미터 이름은 몰라도 됩니다.
 */
import { Platform } from 'react-native';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { APP_NAME } from '../config/userAgent';
import {
  toGalleryPhotos,
  toHubAttractions,
  toRegionSafetyList,
  toTotalCount,
  toTourFestivals,
  toTourSpotDetail,
  toTourSpots,
  toVisitorTotals,
  todayYmd,
  type VisitorTotals,
} from './travelMappers';
import type { TourArrange, TourInfoQuery, TourMobileOs } from './travelDto';
import type {
  GalleryPhoto,
  HubAttraction,
  RegionSafety,
  TourFestival,
  TourSpot,
  TourSpotDetail,
} from '../types/travel';

/** TourAPI 가 요구하는 호출 주체 정보 — 모든 요청에 공통으로 실립니다. */
const MOBILE_OS: TourMobileOs =
  Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'AND' : 'ETC';

function withDefaults(query: TourInfoQuery): TourInfoQuery {
  return { MobileOS: MOBILE_OS, MobileApp: APP_NAME, ...query };
}

/** 목록 조회 결과 — 더 불러올 게 남았는지 화면이 판단할 수 있게 총 건수를 함께 줍니다. */
export type TourPage<T> = {
  items: T[];
  totalCount: number;
  /** 다음 페이지가 있으면 그 번호, 없으면 null */
  nextPage: number | null;
};

function toPage<T>(
  items: T[],
  payload: unknown,
  pageNo: number,
  size: number,
): TourPage<T> {
  const totalCount = toTotalCount(payload);
  return {
    items,
    totalCount,
    nextPage: pageNo * size < totalCount ? pageNo + 1 : null,
  };
}

/** 지역 필터. areaCode 대신 **법정동 코드**를 씁니다(travelDto 주석 참고). */
export type RegionFilter = {
  /** 법정동 시도 코드 (충북 = '43') */
  regionCode?: string;
  /** 법정동 시군구 코드 (단양군 = '800') */
  districtCode?: string;
};

export const travelApi = {
  /**
   * 키워드 검색 — 홈 검색창에서 씁니다.
   *
   * 사진이 없는 항목이 섞이면 카드 목록이 들쭉날쭉해지지만, 검색은 "찾는 게
   * 나오는 것"이 우선이라 대표이미지 필수 정렬(O/Q/R)을 쓰지 않습니다.
   */
  searchSpots: async (params: {
    keyword: string;
    contentTypeId?: string;
    page?: number;
    size?: number;
    arrange?: TourArrange;
  } & RegionFilter): Promise<TourPage<TourSpot>> => {
    const pageNo = params.page ?? 1;
    const size = params.size ?? 20;
    const { data } = await apiClient.get(
      ENDPOINTS.tourSearchKeyword(
        withDefaults({
          keyword: params.keyword,
          contentTypeId: params.contentTypeId,
          lDongRegnCd: params.regionCode,
          lDongSignguCd: params.districtCode,
          arrange: params.arrange ?? 'C',
          pageNo,
          numOfRows: size,
        }),
      ),
    );
    return toPage(toTourSpots(data), data, pageNo, size);
  },

  /**
   * 지역 기반 관광정보 — '이 동네에 뭐가 있는지' 카드로 보여줄 때.
   * 기본 정렬은 대표이미지가 있는 것만(Q) 입니다.
   */
  listSpotsByRegion: async (params: {
    contentTypeId?: string;
    page?: number;
    size?: number;
    arrange?: TourArrange;
  } & RegionFilter): Promise<TourPage<TourSpot>> => {
    const pageNo = params.page ?? 1;
    const size = params.size ?? 20;
    const { data } = await apiClient.get(
      ENDPOINTS.tourAreaBasedList(
        withDefaults({
          contentTypeId: params.contentTypeId,
          lDongRegnCd: params.regionCode,
          lDongSignguCd: params.districtCode,
          arrange: params.arrange ?? 'Q',
          pageNo,
          numOfRows: size,
        }),
      ),
    );
    return toPage(toTourSpots(data), data, pageNo, size);
  },

  /**
   * 좌표 반경 안의 관광정보 — 거리순(E)으로 옵니다.
   * radius 는 미터이고 TourAPI 상한이 20km 라 그 위로는 잘라 보냅니다.
   */
  listNearbySpots: async (params: {
    lat: number;
    lng: number;
    radius?: number;
    contentTypeId?: string;
    size?: number;
  }): Promise<TourSpot[]> => {
    const { data } = await apiClient.get(
      ENDPOINTS.tourLocationBasedList(
        withDefaults({
          mapY: params.lat,
          mapX: params.lng,
          radius: Math.min(params.radius ?? 5000, 20000),
          contentTypeId: params.contentTypeId,
          arrange: 'E',
          pageNo: 1,
          numOfRows: params.size ?? 20,
        }),
      ),
    );
    return toTourSpots(data);
  },

  /**
   * 축제·행사 조회.
   * from(YYYYMMDD) 이후 시작하는 행사가 오므로 기본값은 오늘입니다.
   * 오늘 이전에 시작해 지금도 하는 축제까지 담고 싶으면 from 을 앞당겨 주세요.
   */
  listFestivals: async (params: {
    from?: string;
    to?: string;
    size?: number;
  } & RegionFilter = {}): Promise<TourFestival[]> => {
    const { data } = await apiClient.get(
      ENDPOINTS.tourSearchFestival(
        withDefaults({
          eventStartDate: params.from ?? todayYmd(),
          eventEndDate: params.to,
          lDongRegnCd: params.regionCode,
          lDongSignguCd: params.districtCode,
          arrange: 'A',
          pageNo: 1,
          numOfRows: params.size ?? 20,
        }),
      ),
    );
    return toTourFestivals(data);
  },

  /** 숙박 정보 조회 */
  listStays: async (params: {
    page?: number;
    size?: number;
  } & RegionFilter = {}): Promise<TourPage<TourSpot>> => {
    const pageNo = params.page ?? 1;
    const size = params.size ?? 20;
    const { data } = await apiClient.get(
      ENDPOINTS.tourSearchStay(
        withDefaults({
          lDongRegnCd: params.regionCode,
          lDongSignguCd: params.districtCode,
          arrange: 'Q',
          pageNo,
          numOfRows: size,
        }),
      ),
    );
    return toPage(toTourSpots(data), data, pageNo, size);
  },

  /**
   * 관광 콘텐츠 상세.
   *
   * 공통정보(제목·개요)는 반드시 있어야 하지만 소개정보·이미지는 없는 콘텐츠도
   * 많습니다. 그래서 세 요청을 나란히 보내되 뒤 둘은 실패해도 무시합니다.
   * contentTypeId 를 알면 함께 넘겨주세요 — 소개정보 조회에 필요합니다.
   */
  getSpotDetail: async (
    contentId: string,
    contentTypeId?: string,
  ): Promise<TourSpotDetail | null> => {
    const [common, intro, images] = await Promise.all([
      apiClient.get(
        ENDPOINTS.tourDetailCommon(withDefaults({ contentId, numOfRows: 1 })),
      ),
      apiClient
        .get(
          ENDPOINTS.tourDetailIntro(
            withDefaults({ contentId, contentTypeId, numOfRows: 1 }),
          ),
        )
        .catch(() => null),
      apiClient
        .get(
          ENDPOINTS.tourDetailImage(withDefaults({ contentId, numOfRows: 10 })),
        )
        .catch(() => null),
    ]);
    return toTourSpotDetail(common.data, intro?.data, images?.data);
  },

  /**
   * 관광사진 갤러리.
   * keyword 를 주면 검색 엔드포인트로, 없으면 최신 목록으로 갑니다.
   */
  listGalleryPhotos: async (params: {
    keyword?: string;
    page?: number;
    size?: number;
  } = {}): Promise<TourPage<GalleryPhoto>> => {
    const pageNo = params.page ?? 1;
    const size = params.size ?? 20;
    const query = {
      MobileOS: MOBILE_OS,
      MobileApp: APP_NAME,
      keyword: params.keyword,
      arrange: 'A' as const,
      pageNo,
      numOfRows: size,
    };
    const { data } = await apiClient.get(
      params.keyword
        ? ENDPOINTS.tourGallerySearchList(query)
        : ENDPOINTS.tourGalleryList(query),
    );
    return toPage(toGalleryPhotos(data), data, pageNo, size);
  },

  /**
   * 조건에 맞는 관광정보가 몇 건인지만 셉니다.
   * 목록은 필요 없고 숫자만 쓰는 자리(동네 인프라 통계)를 위해 1건만 받아
   * totalCount 를 꺼냅니다.
   */
  countSpots: async (
    params: { contentTypeId?: string } & RegionFilter,
  ): Promise<number> => {
    const { data } = await apiClient.get(
      ENDPOINTS.tourAreaBasedList(
        withDefaults({
          contentTypeId: params.contentTypeId,
          lDongRegnCd: params.regionCode,
          lDongSignguCd: params.districtCode,
          arrange: 'C',
          pageNo: 1,
          numOfRows: 1,
        }),
      ),
    );
    return toTotalCount(data);
  },

  /**
   * 하루치 기초 지자체 방문자수를 시군구별로 합쳐서 돌려줍니다.
   *
   * 이 API 는 지역을 좁힐 수 없어 전국 800행이 통째로 옵니다. 그래서 관심 있는
   * 시군구 코드를 함께 넘기면 파싱 단계에서 걸러 메모리에 남기지 않습니다.
   */
  getVisitorTotals: async (
    ymd: string,
    keepCodes?: string[],
  ): Promise<Map<string, VisitorTotals>> => {
    const { data } = await apiClient.get(
      ENDPOINTS.visitorLocalGovernment({
        startYmd: ymd,
        endYmd: ymd,
        pageNo: 1,
        numOfRows: 1000,
        MobileOS: MOBILE_OS,
        MobileApp: APP_NAME,
      }),
    );
    return toVisitorTotals(data, keepCodes);
  },

  /**
   * 방문자수 데이터가 실제로 있는 가장 최근 날짜를 찾습니다.
   *
   * 집계가 한 달 넘게 밀려서(2026-08 기준 07-11 까지) 오늘 날짜로 조회하면
   * 빈 배열이 옵니다. 주말 나들이 수요를 보려는 것이니 **토요일**만 훑습니다.
   *
   * 한 주씩 순서대로 두드리면 최악의 경우 왕복이 10번이라 홈 첫 로딩이 눈에
   * 띄게 느려집니다. 건수만 확인하면 되는 가벼운 요청이라 전부 동시에 보내고
   * 그중 가장 최근 날짜를 고릅니다(사실상 왕복 1번).
   */
  findLatestVisitorDate: async (maxWeeks = 10): Promise<string | null> => {
    const candidates = recentSaturdays(maxWeeks);
    const results = await Promise.all(
      candidates.map(ymd =>
        apiClient
          .get(
            ENDPOINTS.visitorLocalGovernment({
              startYmd: ymd,
              endYmd: ymd,
              pageNo: 1,
              numOfRows: 1,
              MobileOS: MOBILE_OS,
              MobileApp: APP_NAME,
            }),
          )
          // 한 주가 실패해도 다른 주로 계속 갑니다.
          .then(response => (toTotalCount(response.data) > 0 ? ymd : null))
          .catch(() => null),
      ),
    );
    // candidates 가 최신순이라 먼저 걸리는 값이 가장 최근 날짜입니다.
    return results.find((ymd): ymd is string => ymd !== null) ?? null;
  },

  /**
   * 시도 하나의 지역안전지수 — 시도 행 1건 + 그 아래 시군구 행들이 함께 옵니다.
   * 도시 목록 전체의 안전등급을 요청 한 번으로 채울 수 있습니다.
   */
  getRegionSafetyBySido: async (
    sido: string,
    baseYear?: string,
  ): Promise<RegionSafety[]> => {
    const { data } = await apiClient.get(
      ENDPOINTS.regionalSafetyBySido({ sido, baseYear }),
    );
    return toRegionSafetyList(data);
  },

  /**
   * 기초지자체 중심 관광지(방문 상위 랭킹).
   *
   * baseYm 은 집계가 끝난 달만 데이터가 있습니다. 이번 달·지난달은 아직 빈
   * 배열이 오는 일이 흔해서, 값을 안 주면 최근 달부터 최대 4개월을 거슬러
   * 올라가며 처음 데이터가 잡히는 달을 씁니다.
   */
  listHubAttractions: async (params: {
    /** 광역 법정동 코드 (충북 = '43') */
    areaCd: string;
    /** 시군구 법정동 코드 (단양군 = '43800') */
    signguCd: string;
    baseYm?: string;
    size?: number;
  }): Promise<HubAttraction[]> => {
    const months = params.baseYm ? [params.baseYm] : recentMonths(4);

    for (const baseYm of months) {
      const { data } = await apiClient.get(
        ENDPOINTS.municipalityAttractions({
          baseYm,
          areaCd: params.areaCd,
          signguCd: params.signguCd,
          pageNo: 1,
          numOfRows: params.size ?? 10,
          mobileOs: MOBILE_OS,
          mobileApp: APP_NAME,
        }),
      );
      const attractions = toHubAttractions(data);
      if (attractions.length > 0) {
        return attractions;
      }
    }
    return [];
  },
};

/**
 * 가장 가까운 지난 토요일부터 주 단위로 거슬러 올라가며 YYYYMMDD 를 만듭니다.
 * 오늘이 토요일이면 오늘은 아직 집계 전이므로 지난주부터 셉니다.
 */
function recentSaturdays(count: number): string[] {
  const base = new Date();
  // 0=일 … 6=토. 이번 주 토요일이 미래면 지난주 토요일로 내립니다.
  const back = (base.getDay() + 1) % 7 || 7;
  base.setDate(base.getDate() - back);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setDate(date.getDate() - index * 7);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}${month}${day}`;
  });
}

/** 지난달부터 count 개월치 YYYYMM 을 최신순으로 만듭니다. */
function recentMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (index + 1), 1);
    return `${date.getFullYear()}${`${date.getMonth() + 1}`.padStart(2, '0')}`;
  });
}
