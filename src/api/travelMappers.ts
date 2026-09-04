/**
 * 여행 정보 응답(TourAPI DTO) → 앱 도메인 모델 변환.
 *
 * TourAPI 는 "값 없음"을 undefined 가 아니라 빈 문자열로 내려주고, 숫자도 전부
 * 문자열입니다. 화면에서 매번 빈 값 검사를 반복하지 않도록 여기서 한 번에
 * 정리해 없으면 null 로 통일합니다.
 */
import { unwrap } from './mappers';
import { CONTENT_TYPE_LABEL } from '../types/travel';
import { CONTENT_TYPE_TO_CATEGORY } from '../types/tourPlace';
import type {
  AiCourseRequestDto,
  GalleryPhotoDto,
  MunicipalityAttractionDto,
  RegionalSafetyDto,
  TourDetailCommonDto,
  TourDetailIntroDto,
  TourFestivalDto,
  TourImageDto,
  TourListDto,
  TourContentDto,
  VisitorRegionDto,
} from './travelDto';
import type {
  AiCourse,
  AiCourseDay,
  AiCourseStop,
  GalleryPhoto,
  HubAttraction,
  RegionSafety,
  SafetyCategoryGrades,
  TourFestival,
  TourIntroFact,
  TourContent,
  TourContentDetail,
} from '../types/travel';
import type { PreferenceAnswers } from '../data/preferences';

/** 빈 문자열·공백만 있는 값은 없는 것으로 봅니다. */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** 문자열 숫자를 number 로. 못 바꾸면 null */
function num(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 개요·이용안내에 br, b 같은 태그가 섞여 옵니다.
 * RN Text 는 HTML 을 못 그리므로 줄바꿈만 살리고 나머지는 지웁니다.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * TourAPI 이미지 주소는 http 와 https 가 섞여 옵니다.
 * iOS ATS 가 평문 http 이미지를 막으므로 https 로 올려 보냅니다.
 * (tong.visitkorea.or.kr 는 https 를 지원합니다)
 */
function toHttps(url: string | null): string | null {
  return url ? url.replace(/^http:\/\//i, 'https://') : null;
}

/** 목록 응답에서 items 배열만 꺼냅니다. 형태가 어긋나면 빈 배열. */
function itemsOf<T>(payload: unknown): T[] {
  const dto = unwrap(payload as TourListDto<T>);
  return Array.isArray(dto?.items) ? dto.items : [];
}

/** payload 에 배열이 바로 오는 응답(지역안전지수·기초지자체 관광지)용 */
function arrayOf<T>(payload: unknown): T[] {
  const dto = unwrap(payload as object) as unknown;
  return Array.isArray(dto) ? (dto as T[]) : [];
}

/** 목록 응답의 총 건수 (다음 페이지가 있는지 판단할 때 씁니다) */
export function toTotalCount(payload: unknown): number {
  const dto = unwrap(payload as TourListDto<unknown>);
  return num(dto?.totalCount) ?? 0;
}

// ─────────────────────────────── 관광 콘텐츠

function toContent(dto: TourContentDto): TourContent | null {
  const contentId = text(dto.contentid);
  const title = text(dto.title);
  // id 나 제목이 없으면 화면에 띄울 수도, 상세로 넘어갈 수도 없습니다.
  if (!contentId || !title) {
    return null;
  }
  const contentTypeId = text(dto.contenttypeid) ?? '';
  const addr1 = text(dto.addr1);
  const addr2 = text(dto.addr2);

  return {
    contentId,
    contentTypeId,
    typeLabel: CONTENT_TYPE_LABEL[contentTypeId] ?? '관광정보',
    category: CONTENT_TYPE_TO_CATEGORY[contentTypeId] ?? null,
    title,
    address: [addr1, addr2].filter(Boolean).join(' '),
    tel: text(dto.tel),
    imageUrl: toHttps(text(dto.firstimage)),
    thumbnailUrl: toHttps(text(dto.firstimage2) ?? text(dto.firstimage)),
    lat: num(dto.mapy),
    lng: num(dto.mapx),
    regionCode: text(dto.lDongRegnCd),
    districtCode: text(dto.lDongSignguCd),
    // 소수점이 길게 붙어 오므로(262.796…) 정수 미터로 끊습니다.
    distance: dto.dist ? Math.round(num(dto.dist) ?? 0) : null,
    eventStartDate: text(dto.eventstartdate),
    eventEndDate: text(dto.eventenddate),
  };
}

export function toTourContents(payload: unknown): TourContent[] {
  return itemsOf<TourContentDto>(payload)
    .map(toContent)
    .filter((spot): spot is TourContent => spot !== null);
}

// ─────────────────────────────── 축제

/** 20260814 → 8.14. 형식이 아니면 원본 그대로 */
function formatYmd(ymd: string | null): string {
  if (!ymd || !/^\d{8}$/.test(ymd)) {
    return ymd ?? '';
  }
  return `${Number(ymd.slice(4, 6))}.${Number(ymd.slice(6, 8))}`;
}

/** YYYYMMDD 를 그 날 00:00 의 Date 로 — 남은 일수 계산에 씁니다 */
function parseYmd(ymd: string | null): Date | null {
  if (!ymd || !/^\d{8}$/.test(ymd)) {
    return null;
  }
  return new Date(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(4, 6)) - 1,
    Number(ymd.slice(6, 8)),
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 오늘 00:00 — 시분 오차 없이 날짜만 비교하기 위함 */
function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 오늘 날짜를 YYYYMMDD 로 (eventStartDate 파라미터용) */
export function todayYmd(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const date = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}${month}${date}`;
}

export function toTourFestivals(payload: unknown): TourFestival[] {
  const base = today();

  return itemsOf<TourFestivalDto>(payload)
    .map(dto => {
      const spot = toContent(dto);
      if (!spot) {
        return null;
      }
      const startDate = text(dto.eventstartdate);
      const endDate = text(dto.eventenddate);
      const start = parseYmd(startDate);
      const end = parseYmd(endDate);

      const festival: TourFestival = {
        ...spot,
        eventStartDate: startDate,
        eventEndDate: endDate,
        periodLabel: [formatYmd(startDate), formatYmd(endDate)]
          .filter(Boolean)
          .join(' ~ '),
        isOngoing: !!start && !!end && start <= base && base <= end,
        daysUntilStart: start
          ? Math.max(0, Math.round((start.getTime() - base.getTime()) / DAY_MS))
          : null,
      };
      return festival;
    })
    .filter((festival): festival is TourFestival => festival !== null);
}

// ─────────────────────────────── 상세

/**
 * detailIntro2 는 콘텐츠 타입마다 필드명이 다릅니다.
 * (문화시설 usetimeculture, 레포츠 usetimeleports, 음식점 opentimefood …)
 * 타입별 표를 8벌 만드는 대신 접두사로 훑어서 먼저 걸리는 값 하나를 씁니다.
 */
const INTRO_FACTS: { label: string; prefixes: string[] }[] = [
  { label: '이용 시간', prefixes: ['usetime', 'opentime', 'playtime'] },
  { label: '휴무일', prefixes: ['restdate'] },
  { label: '이용 요금', prefixes: ['usefee'] },
  { label: '문의', prefixes: ['infocenter'] },
  { label: '주차', prefixes: ['parking'] },
  { label: '대표 메뉴', prefixes: ['firstmenu', 'treatmenu'] },
  { label: '입실', prefixes: ['checkintime'] },
  { label: '퇴실', prefixes: ['checkouttime'] },
  { label: '행사 장소', prefixes: ['eventplace'] },
  { label: '주최', prefixes: ['sponsor1'] },
  { label: '신용카드', prefixes: ['chkcreditcard'] },
  { label: '반려동물', prefixes: ['chkpet'] },
];

function toIntroFacts(dto: TourDetailIntroDto | undefined): TourIntroFact[] {
  if (!dto) {
    return [];
  }
  const keys = Object.keys(dto);
  const facts: TourIntroFact[] = [];

  for (const { label, prefixes } of INTRO_FACTS) {
    const key = keys.find(
      k => prefixes.some(prefix => k.startsWith(prefix)) && text(dto[k]),
    );
    const value = key ? text(dto[key]) : null;
    if (value) {
      facts.push({ label, value: stripHtml(value) });
    }
  }
  return facts;
}

/** homepage 는 a 태그로 감싸 올 때가 많아 주소만 뽑습니다. */
function extractUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const href = /href=["']([^"']+)["']/i.exec(value);
  if (href) {
    return href[1];
  }
  const bare = /https?:\/\/[^\s"'<>]+/i.exec(value);
  return bare ? bare[0] : null;
}

/**
 * detail-common / detail-intro / detail-image 응답을 하나로 합칩니다.
 * intro·image 는 실패해도 상세 화면이 떠야 하므로 없으면 없는 대로 넘깁니다.
 */
export function toTourContentDetail(
  commonPayload: unknown,
  introPayload?: unknown,
  imagePayload?: unknown,
): TourContentDetail | null {
  const dto = itemsOf<TourDetailCommonDto>(commonPayload)[0];
  const spot = dto ? toContent(dto) : null;
  if (!dto || !spot) {
    return null;
  }

  const overview = text(dto.overview);
  const images = itemsOf<TourImageDto>(imagePayload)
    .map(image => toHttps(text(image.originimgurl)))
    .filter((url): url is string => url !== null);

  return {
    ...spot,
    overview: overview ? stripHtml(overview) : null,
    homepageUrl: extractUrl(text(dto.homepage)),
    facts: toIntroFacts(itemsOf<TourDetailIntroDto>(introPayload)[0]),
    // 대표 이미지와 같은 사진이 목록에도 들어 있으면 한 번만 보여줍니다.
    images: images.filter(url => url !== spot.imageUrl),
  };
}

// ─────────────────────────────── 관광사진 갤러리

export function toGalleryPhotos(payload: unknown): GalleryPhoto[] {
  return itemsOf<GalleryPhotoDto>(payload)
    .map(dto => {
      const id = text(dto.galContentId);
      const imageUrl = toHttps(text(dto.galWebImageUrl));
      // 사진이 없으면 갤러리에 쓸 데가 없습니다.
      if (!id || !imageUrl) {
        return null;
      }
      const month = text(dto.galPhotographyMonth);
      const photo: GalleryPhoto = {
        id,
        title: text(dto.galTitle) ?? '제목 없음',
        imageUrl,
        location: text(dto.galPhotographyLocation) ?? '',
        photographer: text(dto.galPhotographer) ?? '',
        monthLabel:
          month && /^\d{6}$/.test(month)
            ? `${month.slice(0, 4)}.${month.slice(4, 6)}`
            : '',
        keywords: (text(dto.galSearchKeyword) ?? '')
          .split(',')
          .map(keyword => keyword.trim())
          .filter(Boolean),
      };
      return photo;
    })
    .filter((photo): photo is GalleryPhoto => photo !== null);
}

// ─────────────────────────────── 지역안전지수

/**
 * 혼행 안전 점수의 가중치.
 *
 * 혼자 여행하는 사람에게 실제로 위험이 되는 건 밤길 치안, 생활 속 사고,
 * 그리고 낯선 길에서의 교통사고입니다. 자살·감염병·화재는 지역 통계로는
 * 중요하지만 하루 이틀 머무는 여행자의 체감 안전과는 거리가 있어 뺐습니다.
 *
 * 합이 1이어야 점수가 0~100 범위에 들어옵니다.
 */
const SOLO_SAFETY_WEIGHTS: {
  key: keyof SafetyCategoryGrades;
  weight: number;
}[] = [
  { key: 'crime', weight: 0.4 },
  { key: 'traffic', weight: 0.35 },
  { key: 'lifeSafety', weight: 0.25 },
];

/**
 * 평균 등급(1~5) → 화면 표기 등급.
 * 6개 부문 평균이 1에 가까울수록 안전합니다.
 */
function toSafetyGrade(average: number): string {
  if (average <= 1.8) {
    return 'A';
  }
  if (average <= 2.6) {
    return 'B';
  }
  if (average <= 3.4) {
    return 'C';
  }
  if (average <= 4.2) {
    return 'D';
  }
  return 'E';
}

/**
 * 상대등급을 혼행 안전점수로 환산합니다.
 * 행정안전부 5등급은 안전도가 0이라는 뜻이 아니므로 40점을 하한으로 둡니다.
 * 1~5등급은 각각 100·85·70·55·40점에 대응합니다.
 */
function toSoloSafetyScore(average: number): number {
  return Math.round(Math.max(40, Math.min(100, 115 - average * 15)));
}

export function toRegionSafetyList(payload: unknown): RegionSafety[] {
  return arrayOf<RegionalSafetyDto>(payload)
    .map(dto => {
      const grades = {
        traffic: num(dto.traffic_accident_grade),
        fire: num(dto.fire_grade),
        crime: num(dto.crime_grade),
        lifeSafety: num(dto.life_safety_grade),
        suicide: num(dto.suicide_grade),
        infectiousDisease: num(dto.infectious_disease_grade),
      };
      const values = Object.values(grades).filter(
        (value): value is number => value !== null,
      );
      const sido = text(dto.sido);
      // 등급이 하나도 없으면 안전 정보로 쓸 수 없습니다.
      if (!sido || values.length === 0) {
        return null;
      }
      const average =
        values.reduce((sum, value) => sum + value, 0) / values.length;

      // 혼행 가중 평균 — 세 부문 중 빠진 게 있으면 있는 것만으로 비율을 다시 맞춥니다.
      const usable = SOLO_SAFETY_WEIGHTS.filter(
        item => grades[item.key] !== null,
      );
      const weightSum = usable.reduce((sum, item) => sum + item.weight, 0);
      const soloAverage = weightSum
        ? usable.reduce(
            (sum, item) => sum + (grades[item.key] as number) * item.weight,
            0,
          ) / weightSum
        : average;

      const safety: RegionSafety = {
        sido,
        sigungu: text(dto.sigungu),
        regionType: text(dto.region_type) ?? 'SIDO',
        baseYear: num(dto.base_year) ?? 0,
        grades: {
          traffic: grades.traffic ?? 0,
          fire: grades.fire ?? 0,
          crime: grades.crime ?? 0,
          lifeSafety: grades.lifeSafety ?? 0,
          suicide: grades.suicide ?? 0,
          infectiousDisease: grades.infectiousDisease ?? 0,
        },
        average: Math.round(average * 10) / 10,
        grade: toSafetyGrade(average),
        // 1등급=100점, 5등급=0점으로 선형 환산
        score: Math.round(((5 - average) / 4) * 100),
        soloScore: toSoloSafetyScore(soloAverage),
        soloGrade: toSafetyGrade(soloAverage),
      };
      return safety;
    })
    .filter((safety): safety is RegionSafety => safety !== null);
}

// ─────────────────────────────── 지역별 방문자수

/**
 * 방문자수 응답을 시군구 단위로 합칩니다.
 *
 * 한 지역·하루가 현지인/외지인/외국인 3행으로 쪼개져 오므로 코드별로 모아
 * 한 덩어리로 만듭니다. 전국이 통째로 오기 때문에 필요한 시군구 코드만
 * 넘겨 받아 그 자리에서 걸러냅니다(800행을 다 들고 있을 이유가 없습니다).
 */
export function toVisitorTotals(
  payload: unknown,
  keepCodes?: string[],
): Map<string, VisitorTotals> {
  const keep = keepCodes ? new Set(keepCodes) : null;
  const totals = new Map<string, VisitorTotals>();

  for (const dto of itemsOf<VisitorRegionDto>(payload)) {
    const code = text(dto.signguCode);
    if (!code || (keep && !keep.has(code))) {
      continue;
    }
    const current = totals.get(code) ?? {
      districtCode: code,
      districtName: text(dto.signguNm) ?? '',
      local: 0,
      visitor: 0,
      foreign: 0,
      baseYmd: text(dto.baseYmd) ?? '',
      dayLabel: text(dto.daywkDivNm) ?? '',
    };
    const count = num(dto.touNum) ?? 0;

    // touDivCd: 1 현지인 / 2 외지인 / 3 외국인
    switch (text(dto.touDivCd)) {
      case '1':
        current.local += count;
        break;
      case '2':
        current.visitor += count;
        break;
      case '3':
        current.foreign += count;
        break;
      default:
        break;
    }
    totals.set(code, current);
  }
  return totals;
}

/** 구분별로 합산만 끝난 중간 형태 — 비율·증감은 두 날짜를 비교해야 나옵니다 */
export type VisitorTotals = {
  districtCode: string;
  districtName: string;
  local: number;
  visitor: number;
  foreign: number;
  baseYmd: string;
  dayLabel: string;
};

// ─────────────────────────────── 기초지자체 중심 관광지

export function toHubAttractions(payload: unknown): HubAttraction[] {
  return arrayOf<MunicipalityAttractionDto>(payload)
    .map(dto => {
      const code = text(dto.hubTatsCd);
      const name = text(dto.hubTatsNm);
      if (!code || !name) {
        return null;
      }
      const attraction: HubAttraction = {
        code,
        name,
        category: text(dto.hubCtgryMclsNm) ?? text(dto.hubCtgryLclsNm) ?? '',
        rank: num(dto.hubRank) ?? 0,
        lat: num(dto.mapY),
        lng: num(dto.mapX),
        districtName: text(dto.signguNm) ?? '',
      };
      return attraction;
    })
    .filter((item): item is HubAttraction => item !== null)
    .sort((a, b) => a.rank - b.rank);
}

// ─────────────────────────────── AI 맞춤 코스 매퍼

function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveStartDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const now = new Date();
  if (value === '내일') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatIsoDate(tomorrow);
  }
  if (value === '이번 주말') {
    const saturday = new Date(now);
    const dayOfWeek = saturday.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    saturday.setDate(saturday.getDate() + daysUntilSaturday);
    return formatIsoDate(saturday);
  }
  if (value === '다음 주') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatIsoDate(nextWeek);
  }
  return formatIsoDate(now);
}

export const AI_COURSE_DURATION_MAP: Record<
  string,
  { code: string; label: string }
> = {
  '당일': { code: 'DAY_TRIP', label: '당일치기' },
  '1박 2일': { code: 'ONE_NIGHT', label: '1박 2일' },
  '2박 3일': { code: 'TWO_NIGHTS', label: '2박 3일' },
  '3박 이상': { code: 'THREE_NIGHTS', label: '3박 이상' },
};

/** 취향 프롬프트 답변 → POST /travel/ai-courses 요청 바디 변환 */
export function toAiCourseRequest(
  regionName: string,
  answers: PreferenceAnswers,
): AiCourseRequestDto {
  const durationOption =
    typeof answers.duration === 'string' ? answers.duration : '';
  const duration =
    AI_COURSE_DURATION_MAP[durationOption]?.code ?? 'ONE_NIGHT';
  const startDate = resolveStartDate(answers.startDate);

  // 최상위 필드로 승격된 duration, startDate, region은 preference 객체에서 제외
  const preference: Record<string, unknown> = {};
  Object.entries(answers).forEach(([key, val]) => {
    if (
      key !== 'duration' &&
      key !== 'startDate' &&
      key !== 'region' &&
      val !== undefined &&
      val !== ''
    ) {
      preference[key] = val;
    }
  });

  return {
    regionName,
    startDate,
    duration,
    preference,
  };
}

/** POST /travel/ai-courses 응답 원형 또는 metadata.course → 앱 도메인 모델(AiCourse) 변환 */
export function toAiCourse(
  payload: unknown,
  fallbackRegionName?: string,
  fallbackDuration?: string,
): AiCourse {
  const unwrapped = (unwrap(payload as { payload?: any }) ?? {}) as any;
  // metadata.course 또는 course 객체가 있으면 우선 사용
  const dto = unwrapped?.metadata?.course ?? unwrapped?.course ?? unwrapped;

  const regionName =
    text(dto.regionName) ??
    text(dto.region) ??
    fallbackRegionName ??
    '';
  const title =
    text(dto.title) ??
    text(dto.courseTitle) ??
    text(dto.name) ??
    (regionName ? `${regionName} 혼행 안전 코스` : '혼행 안전 코스');
  const duration =
    text(dto.duration) ??
    text(dto.tripDuration) ??
    fallbackDuration ??
    'ONE_NIGHT';
  const durationEntry = Object.values(AI_COURSE_DURATION_MAP).find(
    entry => entry.code === duration,
  );
  const durationLabel =
    durationEntry?.label ??
    (duration === 'DAY_TRIP' ? '당일치기' : '1박 2일');
  const summary =
    text(dto.summary) ??
    text(dto.description) ??
    `${regionName} 추천 여행 동선입니다.`;

  let days: AiCourseDay[] = [];
  let stops: AiCourseStop[] = [];

  // 1. metadata.course.days 일자별 중첩 구조인 경우
  if (Array.isArray(dto.days) && dto.days.length > 0) {
    days = dto.days.map((dayDto: any, dayIdx: number) => {
      const dayNum =
        typeof dayDto.day === 'number' ? dayDto.day : dayIdx + 1;
      const dayTitle = text(dayDto.title) ?? `${dayNum}일차`;
      const dayStopsRaw = Array.isArray(dayDto.stops) ? dayDto.stops : [];
      const dayStops: AiCourseStop[] = dayStopsRaw.map(
        (stopDto: any, stopIdx: number) => ({
          day: dayNum,
          order:
            typeof stopDto.order === 'number'
              ? stopDto.order
              : Number(stopDto.step || stopDto.sequence || stopIdx + 1) ||
                stopIdx + 1,
          time:
            text(stopDto.time) ??
            text(stopDto.visitTime) ??
            text(stopDto.scheduleTime),
          title:
            text(stopDto.title) ??
            text(stopDto.name) ??
            text(stopDto.placeName) ??
            text(stopDto.spotName) ??
            `장소 ${stopIdx + 1}`,
          category:
            text(stopDto.category) ??
            text(stopDto.categoryName) ??
            text(stopDto.type),
          description:
            text(stopDto.description) ??
            text(stopDto.desc) ??
            text(stopDto.content) ??
            text(stopDto.summary),
          safetyTip:
            text(stopDto.safetyTip) ??
            (Array.isArray(stopDto.notes)
              ? stopDto.notes.join('. ')
              : text(stopDto.notes)) ??
            text(stopDto.tip) ??
            text(stopDto.caution),
        }),
      );
      return {
        day: dayNum,
        title: dayTitle,
        stops: dayStops,
      };
    });
    stops = days.flatMap(d => d.stops);
  } else {
    // 2. 평평한 stops 배열 구조인 경우
    const rawStops = Array.isArray(dto.stops)
      ? dto.stops
      : Array.isArray(dto.courses)
      ? dto.courses
      : Array.isArray(dto.places)
      ? dto.places
      : Array.isArray(dto.schedule)
      ? dto.schedule
      : Array.isArray(dto.itinerary)
      ? dto.itinerary
      : Array.isArray(dto.items)
      ? dto.items
      : Array.isArray(dto)
      ? dto
      : [];

    stops = rawStops.map((stopDto: any, index: number) => ({
      day:
        typeof stopDto.day === 'number'
          ? stopDto.day
          : Number(stopDto.dayNumber || stopDto.dayIndex || 1) || 1,
      order:
        typeof stopDto.order === 'number'
          ? stopDto.order
          : Number(stopDto.step || stopDto.sequence || index + 1) || index + 1,
      time:
        text(stopDto.time) ??
        text(stopDto.visitTime) ??
        text(stopDto.scheduleTime),
      title:
        text(stopDto.title) ??
        text(stopDto.placeName) ??
        text(stopDto.spotName) ??
        text(stopDto.name) ??
        `장소 ${index + 1}`,
      category:
        text(stopDto.category) ??
        text(stopDto.categoryName) ??
        text(stopDto.type),
      description:
        text(stopDto.description) ??
        text(stopDto.desc) ??
        text(stopDto.content) ??
        text(stopDto.summary),
      safetyTip:
        text(stopDto.safetyTip) ??
        (Array.isArray(stopDto.notes)
          ? stopDto.notes.join('. ')
          : text(stopDto.notes)) ??
        text(stopDto.tip) ??
        text(stopDto.caution),
    }));

    const daysMap = new Map<number, AiCourseStop[]>();
    stops.forEach(stop => {
      const list = daysMap.get(stop.day) ?? [];
      list.push(stop);
      daysMap.set(stop.day, list);
    });

    days = Array.from(daysMap.entries())
      .sort(([dayA], [dayB]) => dayA - dayB)
      .map(([day, dayStops]) => ({
        day,
        title: `${day}일차`,
        stops: dayStops.sort((a, b) => a.order - b.order),
      }));
  }

  if (days.length === 0) {
    days.push({ day: 1, title: '1일차', stops: [] });
  }

  // safetyNotes 수집
  const safetyNotes: string[] = [];
  if (Array.isArray(dto.safetyNotes)) {
    dto.safetyNotes.forEach((note: any) => {
      if (typeof note === 'string' && note.trim()) {
        safetyNotes.push(note.trim());
      }
    });
  }
  stops.forEach(s => {
    if (s.safetyTip && !safetyNotes.includes(s.safetyTip)) {
      safetyNotes.push(s.safetyTip);
    }
  });

  return {
    regionName,
    title,
    duration,
    durationLabel,
    summary,
    stops,
    days,
    safetyNotes,
  };
}

export type AiCourseTicket = {
  requestId: string;
  status: string;
  isCompleted: boolean;
  isFailed: boolean;
  errorMessage: string | null;
  course: AiCourse | null;
};

/** POST/GET 접수 응답에서 requestId, 처리 상태, 완성된 코스 추출 */
export function toAiCourseTicket(
  payload: unknown,
  fallbackRegionName?: string,
  fallbackDuration?: string,
): AiCourseTicket {
  const unwrapped = (unwrap(payload as { payload?: any }) ?? {}) as any;
  const requestId =
    text(unwrapped?.requestId) ??
    text(unwrapped?.data?.requestId) ??
    text(unwrapped?.metadata?.requestId) ??
    '';
  const status = text(unwrapped?.status)?.toUpperCase() ?? (requestId ? 'ACCEPTED' : 'UNKNOWN');
  const isFailed = status === 'FAILED' || status === 'ERROR';

  const courseRaw = unwrapped?.metadata?.course ?? unwrapped?.course ?? (unwrapped?.days || unwrapped?.stops ? unwrapped : null);

  const course = courseRaw
    ? toAiCourse(courseRaw, fallbackRegionName, fallbackDuration)
    : null;

  if (course && requestId && !course.requestId) {
    course.requestId = requestId;
  }

  const isCompleted =
    status === 'COMPLETED' ||
    status === 'SUCCESS' ||
    (course !== null && (course.stops.length > 0 || course.days.length > 0));

  const errorMessage =
    text(unwrapped?.error) ??
    text(unwrapped?.message) ??
    text(unwrapped?.reason) ??
    null;

  return {
    requestId,
    status,
    isCompleted,
    isFailed,
    errorMessage,
    course,
  };
}


