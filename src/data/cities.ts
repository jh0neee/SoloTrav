/**
 * 도시 데이터 (충북 시군 예시).
 * - type: 지도 칩 색상 및 범례 구분
 * - pos: 지도 컨테이너 내 위치(%) — 절대배치에 사용
 * - stats: 안전점수(/100), 트렌드(%), 추천 가산점(+)
 */
export type CityType = 'decline' | 'urban' | 'transit';

export type City = {
  id: string;
  name: string;
  type: CityType;
  region: string;
  tag: string; // 상세 카드용 짧은 배지 (예: '인구감소')
  safetyGrade: string; // 'A' | 'B' ...
  description: string;
  stats: { safety: number; trend: number; bonus: number };
  pos: { x: number; y: number };
};

export const CITY_TYPE_LABEL: Record<CityType, string> = {
  decline: '인구감소지역',
  urban: '도시형',
  transit: '경유형',
};

export const CITIES: City[] = [
  {
    id: 'danyang',
    name: '단양',
    type: 'decline',
    region: '충북',
    tag: '인구감소',
    safetyGrade: 'A',
    description:
      '도담삼봉·소백산이 있는 한국의 알프스. 혼행객 야경·자연 산책 코스가 풍부해요.',
    stats: { safety: 84, trend: 31, bonus: 12 },
    pos: { x: 80, y: 40 },
  },
  {
    id: 'jecheon',
    name: '제천',
    type: 'decline',
    region: '충북',
    tag: '인구감소',
    safetyGrade: 'A',
    description: '청풍호 둘레길과 한적한 카페가 있는 힐링 도시.',
    stats: { safety: 80, trend: 28, bonus: 10 },
    pos: { x: 70, y: 20 },
  },
  {
    id: 'chungju',
    name: '충주',
    type: 'urban',
    region: '충북',
    tag: '도시형',
    safetyGrade: 'B',
    description: '충주호와 탄금대, 도심 편의가 두루 갖춰진 도시.',
    stats: { safety: 77, trend: 22, bonus: 6 },
    pos: { x: 52, y: 26 },
  },
  {
    id: 'eumseong',
    name: '음성',
    type: 'transit',
    region: '충북',
    tag: '경유형',
    safetyGrade: 'B',
    description: '조용한 시골 정취가 남아있는 경유지.',
    stats: { safety: 72, trend: 15, bonus: 4 },
    pos: { x: 30, y: 22 },
  },
  {
    id: 'jincheon',
    name: '진천',
    type: 'transit',
    region: '충북',
    tag: '경유형',
    safetyGrade: 'B',
    description: '농다리와 초평호가 있는 한적한 고장.',
    stats: { safety: 73, trend: 16, bonus: 5 },
    pos: { x: 26, y: 42 },
  },
  {
    id: 'jeungpyeong',
    name: '증평',
    type: 'transit',
    region: '충북',
    tag: '경유형',
    safetyGrade: 'B',
    description: '작지만 알찬 경유형 소도시.',
    stats: { safety: 71, trend: 14, bonus: 4 },
    pos: { x: 47, y: 47 },
  },
  {
    id: 'goesan',
    name: '괴산',
    type: 'decline',
    region: '충북',
    tag: '인구감소',
    safetyGrade: 'A',
    description: '산막이옛길과 청정 자연이 있는 인구감소지역.',
    stats: { safety: 82, trend: 26, bonus: 11 },
    pos: { x: 64, y: 46 },
  },
  {
    id: 'cheongju',
    name: '청주',
    type: 'urban',
    region: '충북',
    tag: '도시형',
    safetyGrade: 'B',
    description: '충북의 중심 도시, 교통과 편의의 거점.',
    stats: { safety: 76, trend: 20, bonus: 6 },
    pos: { x: 40, y: 58 },
  },
  {
    id: 'boeun',
    name: '보은',
    type: 'transit',
    region: '충북',
    tag: '경유형',
    safetyGrade: 'B',
    description: '속리산 법주사가 있는 경유형 지역.',
    stats: { safety: 74, trend: 17, bonus: 5 },
    pos: { x: 54, y: 67 },
  },
  {
    id: 'okcheon',
    name: '옥천',
    type: 'decline',
    region: '충북',
    tag: '인구감소',
    safetyGrade: 'A',
    description: '정지용 문학과 대청호가 있는 인구감소지역.',
    stats: { safety: 79, trend: 24, bonus: 9 },
    pos: { x: 34, y: 76 },
  },
  {
    id: 'yeongdong',
    name: '영동',
    type: 'decline',
    region: '충북',
    tag: '인구감소',
    safetyGrade: 'A',
    description: '포도와 와인의 고장, 인구감소지역.',
    stats: { safety: 78, trend: 23, bonus: 8 },
    pos: { x: 52, y: 82 },
  },
];

/** 홈 스포트라이트에 노출할 추천 도시 */
export const SPOTLIGHT_CITY_IDS = ['danyang', 'jecheon'];

export const getCityById = (id: string) =>
  CITIES.find(city => city.id === id) ?? CITIES[0];
