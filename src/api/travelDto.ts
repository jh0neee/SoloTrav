/**
 * 여행 정보 API(한국관광공사 TourAPI 프록시) 의 요청 파라미터·응답 원형 타입.
 *
 * 우리 서비스 도메인(로그인·기록·취향)은 dto.ts 에 있고, 이 파일은 서버가 그대로
 * 중계해주는 **외부 기관 스펙**만 모읍니다. 필드명이 소문자 붙여쓰기(`contenttypeid`)
 * 인 것도 TourAPI 원본 그대로라서 그렇습니다. 앱 도메인 모델로 바꾸는 일은
 * travelMappers.ts 가 담당합니다.
 *
 * 응답 봉투는 우리 서버 공통 형식(`{ payload: ... }`)을 그대로 씁니다.
 * TourAPI 원본의 `response.header/body` 중첩은 서버가 이미 벗겨서 내려줍니다.
 */

/**
 * 정렬 구분.
 * O·Q·R 은 **대표 이미지가 있는 항목만** 내려줍니다. 카드형 UI 처럼 사진이
 * 비면 보기 싫은 화면에서는 A/C/D 대신 이쪽을 쓰세요.
 */
export type TourArrange =
  | 'A' // 제목순
  | 'C' // 수정일순
  | 'D' // 생성일순
  | 'E' // 거리순 (위치기반 조회 전용)
  | 'O' // 대표이미지 필수 + 제목순
  | 'Q' // 대표이미지 필수 + 수정일순
  | 'R'; // 대표이미지 필수 + 생성일순

export type TourMobileOs = 'IOS' | 'AND' | 'WEB' | 'ETC';

/**
 * /travel/information/* 가 공유하는 쿼리 파라미터.
 * 스펙에는 40여 개가 있지만 앱이 실제로 쓰는 것만 추렸습니다.
 *
 * ⚠️ 지역 필터는 `areaCode`/`sigunguCode` 가 아니라 **법정동 코드**
 * (`lDongRegnCd`/`lDongSignguCd`) 를 쓰세요. 실측 결과 축제·검색 응답의
 * areacode 가 빈 문자열로 내려와 areaCode 필터가 0건을 반환합니다.
 */
export type TourInfoQuery = {
  pageNo?: number;
  numOfRows?: number;
  MobileOS?: TourMobileOs;
  MobileApp?: string;
  arrange?: TourArrange;

  contentId?: string;
  contentTypeId?: string;

  keyword?: string;

  areaCode?: string;
  sigunguCode?: string;
  /** 법정동 시도 코드 (충북 = '43') */
  lDongRegnCd?: string;
  /** 법정동 시군구 코드 (단양군 = '800') */
  lDongSignguCd?: string;

  cat1?: string;
  cat2?: string;
  cat3?: string;

  /** 위치기반 조회 — 경도 */
  mapX?: number;
  /** 위치기반 조회 — 위도 */
  mapY?: number;
  /** 위치기반 조회 — 반경(m). 최대 20000 */
  radius?: number;

  /** 행사 시작일 YYYYMMDD — 이 날짜 이후 행사만 */
  eventStartDate?: string;
  eventEndDate?: string;
};

/** 관광사진 갤러리(/travel/photozone/*) 쿼리 */
export type GalleryQuery = {
  pageNo?: number;
  numOfRows?: number;
  MobileOS?: TourMobileOs;
  MobileApp?: string;
  /** A=촬영일, B=제목, C=수정일 */
  arrange?: 'A' | 'B' | 'C';
  keyword?: string;
  galContentId?: string;
  title?: string;
};

/**
 * 지역별 방문자수(/travel/visitor-region/*) 쿼리.
 *
 * ⚠️ 지역을 좁히는 파라미터가 **없습니다.** 하루치를 조회하면 전국 시군구
 * 264곳 × 3구분 = 약 800행이 통째로 옵니다. 충북만 쓰려면 받아서 걸러야 합니다.
 * 그래서 numOfRows 를 1000 으로 넉넉히 주고 한 번에 받습니다.
 */
export type VisitorRegionQuery = {
  /** 조회 시작일 YYYYMMDD */
  startYmd: string;
  /** 조회 종료일 YYYYMMDD */
  endYmd: string;
  pageNo?: number;
  numOfRows?: number;
  MobileOS?: TourMobileOs;
  MobileApp?: string;
};

/** 지역안전지수(/travel/regional-safety) 쿼리 */
export type RegionalSafetyQuery = {
  baseYear?: string;
  sido?: string;
  sigungu?: string;
  regionType?: 'SIDO' | 'CITY' | 'COUNTY' | 'DISTRICT';
};

/** 기초지자체 중심 관광지(/travel/municipality/*) 쿼리 — 파라미터 대소문자가 다릅니다 */
export type MunicipalityQuery = {
  /** 조회 기준 연월 YYYYMM */
  baseYm: string;
  /** 광역지자체 **법정동** 코드 (충북 = '43') */
  areaCd: string;
  /** 시군구 **법정동** 코드 (단양군 = '43800') */
  signguCd: string;
  pageNo?: number;
  numOfRows?: number;
  mobileOs?: TourMobileOs;
  mobileApp?: string;
};

/** 목록형 응답 공통 형태 */
export type TourListDto<T> = {
  pageNo?: number;
  numOfRows?: number;
  totalCount?: number;
  items?: T[];
};

/**
 * 목록 항목 1건 (searchKeyword2 / areaBasedList2 / locationBasedList2 공통).
 * 값이 비어 있으면 `''` 로 내려오지 undefined 가 아닙니다.
 */
export type TourSpotDto = {
  contentid?: string;
  contenttypeid?: string;
  title?: string;

  addr1?: string;
  addr2?: string;
  zipcode?: string;
  tel?: string;

  firstimage?: string;
  firstimage2?: string;

  mapx?: string;
  mapy?: string;
  mlevel?: string;

  areacode?: string;
  sigungucode?: string;
  lDongRegnCd?: string;
  lDongSignguCd?: string;

  cat1?: string;
  cat2?: string;
  cat3?: string;

  createdtime?: string;
  modifiedtime?: string;

  /** 위치기반 조회에서만 내려오는 중심점 기준 거리(m). 문자열 실수입니다. */
  dist?: string;
};

/** 축제 1건 — 목록 항목에 행사 기간이 붙습니다 */
export type TourFestivalDto = TourSpotDto & {
  eventstartdate?: string;
  eventenddate?: string;
  progresstype?: string;
  festivaltype?: string;
};

/** detailCommon2 1건 — 목록 항목 + 개요/홈페이지 */
export type TourDetailCommonDto = TourSpotDto & {
  overview?: string;
  homepage?: string;
  telname?: string;
};

/**
 * detailIntro2 1건.
 * 필드명이 콘텐츠 타입마다 다릅니다(`usetimeculture`, `usetimefestival`, `opentimefood` …).
 * 그래서 고정 키로 선언하지 않고 접두사로 훑어 씁니다. (travelMappers 참고)
 */
export type TourDetailIntroDto = Record<string, string | undefined>;

/** detailImage2 1건 */
export type TourImageDto = {
  contentid?: string;
  originimgurl?: string;
  smallimageurl?: string;
  imgname?: string;
  serialnum?: string;
};

/** 지역코드·시군구코드·법정동코드 공통 항목 */
export type TourCodeDto = {
  rnum?: number;
  code?: string;
  name?: string;
};

/** 관광사진 갤러리 1건 */
export type GalleryPhotoDto = {
  galContentId?: string;
  galContentTypeId?: string;
  galTitle?: string;
  galWebImageUrl?: string;
  galCreatedtime?: string;
  galModifiedtime?: string;
  /** 촬영 연월 YYYYMM */
  galPhotographyMonth?: string;
  /** 촬영지 (예: '충청북도 단양군') */
  galPhotographyLocation?: string;
  galPhotographer?: string;
  /** 쉼표로 이어붙인 키워드 문자열 */
  galSearchKeyword?: string;
};

/**
 * 지역안전지수 1건. 이 엔드포인트만 우리 DB 테이블이라 snake_case 이고,
 * 목록을 `{ items: [] }` 로 감싸지 않고 payload 에 배열이 바로 옵니다.
 *
 * 등급은 **1이 가장 안전, 5가 가장 위험**입니다.
 */
export type RegionalSafetyDto = {
  id?: string;
  base_year?: number;
  region_type?: string;
  sido?: string;
  sigungu?: string | null;
  traffic_accident_grade?: number;
  fire_grade?: number;
  crime_grade?: number;
  life_safety_grade?: number;
  suicide_grade?: number;
  infectious_disease_grade?: number;
};

/**
 * 기초 지자체 방문자수 1건.
 * 한 지역·하루가 현지인(a)/외지인(b)/외국인(c) 3행으로 나뉘어 옵니다.
 * touNum 은 '107257.5' 처럼 소수점이 붙은 문자열입니다(추정 집계값).
 */
export type VisitorRegionDto = {
  /** 시군구 코드 — 법정동 5자리 (단양군 = '43800') */
  signguCode?: string;
  signguNm?: string;
  /** 광역 조회일 때만 옵니다 */
  areaCode?: string;
  areaNm?: string;
  daywkDivCd?: string;
  /** 예: '토요일' */
  daywkDivNm?: string;
  /** '1' 현지인 / '2' 외지인 / '3' 외국인 */
  touDivCd?: string;
  touDivNm?: string;
  touNum?: string;
  baseYmd?: string;
};

/**
 * 기초지자체 중심 관광지 1건 (payload 에 배열이 바로 옵니다).
 * 지자체별 방문 상위 관광지를 hubRank 순으로 내려줍니다. 이미지가 없어서
 * 사진이 필요하면 areaBasedList 결과와 이름으로 이어 붙여야 합니다.
 */
export type MunicipalityAttractionDto = {
  baseYm?: string;
  areaCd?: string;
  areaNm?: string;
  signguCd?: string;
  signguNm?: string;
  hubTatsCd?: string;
  hubTatsNm?: string;
  /** 대분류 (예: '관광지') */
  hubCtgryLclsNm?: string;
  /** 중분류 (예: '자연관광', '쇼핑') */
  hubCtgryMclsNm?: string;
  hubRank?: number;
  mapX?: number;
  mapY?: number;
};
