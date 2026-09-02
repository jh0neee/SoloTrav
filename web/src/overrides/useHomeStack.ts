/**
 * 홈 탭 스택 — 웹 구현. 앱의 src/navigation/useHomeStack.ts 를 대신합니다.
 * (교체 지점: vite.config.ts 의 moduleOverrides)
 *
 *   /            홈
 *   /search      검색
 *   /gallery     사진첩
 *   /spot/12/126508   장소 상세
 *   /city[/danyang]   도시 선택
 *   /preference[/danyang]  취향 프롬프트
 *
 * 스택을 따로 들고 있지 않습니다. 브라우저 히스토리가 곧 스택이라, 뒤로가기·
 * 앞으로가기·새로고침이 전부 공짜로 따라옵니다.
 */
import { useCallback } from 'react';
import type {
  HomeRoute,
  HomeStackState,
} from '@solotrav/src/navigation/useHomeStack';
import { getCityById } from '@solotrav/src/data/cities';
import { CONTENT_TYPE_LABEL, type TourSpot } from '@solotrav/src/types/travel';
import {
  goBack,
  locationState,
  navigate,
  toPath,
  useLocation,
} from '../shell/router';

const HOME = toPath('home');

/** 장소 상세는 요약 정보를 통째로 넘겨받습니다 — 주소에 담을 수 없어 state 로. */
type SpotState = { spot: TourSpot };

/**
 * 링크로 장소 상세에 바로 들어온 경우 — 거쳐 온 목록이 없어 요약이 없습니다.
 * 주소에 있는 두 id 만으로 껍데기를 만들어 넘기면, 화면이 상세를 받아
 * 제목·사진을 채웁니다(SpotDetailScreen 의 `view` 참고).
 */
function stubSpot(contentTypeId: string, contentId: string): TourSpot {
  return {
    contentId,
    contentTypeId,
    typeLabel: CONTENT_TYPE_LABEL[contentTypeId] ?? '관광정보',
    title: '',
    address: '',
    tel: null,
    imageUrl: null,
    thumbnailUrl: null,
    lat: null,
    lng: null,
    regionCode: null,
    districtCode: null,
    distance: null,
  };
}

function toRoute(segments: string[]): HomeRoute {
  switch (segments[0]) {
    case 'search':
      return { name: 'search' };
    case 'gallery':
      return { name: 'gallery' };
    case 'spot': {
      const [, contentTypeId, contentId] = segments;
      if (!contentTypeId || !contentId) {
        return { name: 'home' };
      }
      const saved = locationState<SpotState>().spot;
      return {
        name: 'spot',
        spot:
          saved?.contentId === contentId
            ? saved
            : stubSpot(contentTypeId, contentId),
      };
    }
    case 'city':
      return { name: 'citySelect', cityId: segments[1] };
    case 'preference':
      // 도시는 정적 목록에 있어서 id 만으로 온전히 되살아납니다.
      return {
        name: 'preference',
        city: segments[1] ? getCityById(segments[1]) : undefined,
      };
    default:
      return { name: 'home' };
  }
}

function pathFor(route: HomeRoute): string {
  switch (route.name) {
    case 'search':
      return toPath('home', ['search']);
    case 'gallery':
      return toPath('home', ['gallery']);
    case 'spot':
      return toPath('home', [
        'spot',
        route.spot.contentTypeId,
        route.spot.contentId,
      ]);
    case 'citySelect':
      return toPath('home', route.cityId ? ['city', route.cityId] : ['city']);
    case 'preference':
      return toPath(
        'home',
        route.city ? ['preference', route.city.id] : ['preference'],
      );
    default:
      return HOME;
  }
}

export function useHomeStack(): HomeStackState {
  const location = useLocation();
  const segments = location.kind === 'tab' ? location.segments : [];

  const push = useCallback((route: HomeRoute) => {
    navigate(
      pathFor(route),
      route.name === 'spot' ? ({ spot: route.spot } satisfies SpotState) : null,
    );
  }, []);

  const pop = useCallback(() => goBack(HOME), []);

  return { current: toRoute(segments), push, pop };
}
