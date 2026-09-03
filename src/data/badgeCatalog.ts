import type { Badge, BadgeImageKey } from '../types/badge';

function createRegionBadge(
  id: string,
  city: string,
  imageKey: BadgeImageKey,
): Badge {
  return {
    id: `region-${id}`,
    name: `${city} 여행자`,
    description: `${city}의 여행지를 직접 방문해 지역 배지를 완성해보세요.`,
    icon: 'pin',
    imageKey,
    earned: false,
    category: 'region',
    progress: 0,
    target: 1,
    earnedAt: null,
  };
}

const CHUNGBUK_REGION_BADGES: Badge[] = [
  createRegionBadge('cheongju', '청주시', 'cb_1'),
  createRegionBadge('chungju', '충주시', 'cb_2'),
  createRegionBadge('jecheon', '제천시', 'cb_3'),
  createRegionBadge('boeun', '보은군', 'cb_4'),
  createRegionBadge('okcheon', '옥천군', 'cb_5'),
  createRegionBadge('yeongdong', '영동군', 'cb_6'),
  createRegionBadge('jeungpyeong', '증평군', 'cb_7'),
  createRegionBadge('jincheon', '진천군', 'cb_8'),
  createRegionBadge('goesan', '괴산군', 'cb_9'),
  createRegionBadge('eumseong', '음성군', 'cb_10'),
  createRegionBadge('danyang', '단양군', 'cb_11'),
];

/**
 * 서버가 아직 새 행동 배지 정의를 내려주지 않아도 목록에서 잠금 상태로 보여줄
 * 기본 카탈로그입니다. 서버 응답이 오면 id 또는 imageKey 기준으로 진행도를 덮습니다.
 */
export const BADGE_CATALOG: Badge[] = [
  {
    id: 'solo-starter',
    name: '혼행 스타터',
    description: '혼행등대와 함께 나만의 여행을 시작한 여행자에게 드리는 배지예요.',
    icon: 'spark',
    imageKey: '00',
    earned: false,
    category: 'exploration',
    progress: 0,
    target: 1,
    earnedAt: null,
  },
  {
    id: 'course-designer',
    name: '나만의 여행 설계자',
    description: 'AI와 함께 나만을 위한 여행 코스를 처음으로 만들어보세요.',
    icon: 'spark',
    imageKey: '02',
    earned: false,
    category: 'exploration',
    progress: 0,
    target: 1,
    earnedAt: null,
  },
  {
    id: 'preference-complete',
    name: '취향 발견자',
    description: '나에게 꼭 맞는 여행을 찾을 수 있도록 여행 취향을 등록해보세요.',
    icon: 'heart',
    imageKey: '03',
    earned: false,
    category: 'exploration',
    progress: 0,
    target: 1,
    earnedAt: null,
  },
  {
    id: 'alley-explorer',
    name: '골목 탐험가',
    description: '서로 다른 여행지 10곳을 방문하고 골목골목의 매력을 발견해보세요.',
    icon: 'pin',
    imageKey: '04',
    earned: false,
    category: 'exploration',
    progress: 0,
    target: 10,
    earnedAt: null,
  },
  {
    id: 'festival-hunter',
    name: '축제 사냥꾼',
    description: '서로 다른 축제 3곳을 방문해 지역마다 다른 즐거움을 만나보세요.',
    icon: 'spark',
    imageKey: '05',
    earned: false,
    category: 'exploration',
    progress: 0,
    target: 3,
    earnedAt: null,
  },
  {
    id: 'solo-dining',
    name: '혼밥 마스터',
    description: '여행지의 음식점 5곳을 방문해 혼자서도 맛있는 순간을 즐겨보세요.',
    icon: 'heart',
    imageKey: '06',
    earned: false,
    category: 'exploration',
    progress: 0,
    target: 5,
    earnedAt: null,
  },
  ...CHUNGBUK_REGION_BADGES,
  {
    id: 'safety-first',
    name: '안전한 첫걸음',
    description: '다른 여행자에게 도움이 되는 첫 번째 안전 후기를 남겨보세요.',
    icon: 'shield',
    imageKey: '07',
    earned: false,
    category: 'safety',
    progress: 0,
    target: 1,
    earnedAt: null,
  },
  {
    id: 'safety-reporter',
    name: '안전 제보자',
    description: '여행지에서 경험한 안전 정보를 후기 5개로 나누어주세요.',
    icon: 'shield',
    imageKey: '08',
    earned: false,
    category: 'safety',
    progress: 0,
    target: 5,
    earnedAt: null,
  },
  {
    id: 'travel-writer',
    name: '여행 기록가',
    description: '소중한 여행의 순간을 10개의 기록으로 차곡차곡 남겨보세요.',
    icon: 'heart',
    imageKey: '09',
    earned: false,
    category: 'record',
    progress: 0,
    target: 10,
    earnedAt: null,
  },
  {
    id: 'four-seasons',
    name: '사계절 여행자',
    description: '봄, 여름, 가을, 겨울의 여행을 기록해 사계절을 모두 채워보세요.',
    icon: 'spark',
    imageKey: '10',
    earned: false,
    category: 'streak',
    progress: 0,
    target: 4,
    earnedAt: null,
  },
];

export function mergeBadgeCatalog(serverBadges: Badge[]): Badge[] {
  const used = new Set<string>();
  const catalog = BADGE_CATALOG.map(base => {
    const remote = serverBadges.find(
      badge => badge.id === base.id || badge.imageKey === base.imageKey,
    );
    if (!remote) return base;
    used.add(remote.id);
    return { ...base, ...remote, imageKey: base.imageKey };
  });

  return [
    ...catalog,
    // 충북 11개 지역 배지로 교체했으므로 예전 서버 지역 배지는 덧붙이지 않습니다.
    ...serverBadges.filter(
      badge => !used.has(badge.id) && badge.category !== 'region',
    ),
  ];
}
