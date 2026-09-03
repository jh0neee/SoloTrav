/**
 * 축제 레이어용 훅.
 *
 * 축제 API 에 충북 법정동 시도 코드(43)를 보내 충북 목록만 받습니다.
 * 지도 중심이 바뀔 때마다 다시 부를 이유가 없으므로 응답을 모듈 수준에 캐시하고,
 * 화면에서는 지도 경계·기간 필터만 다시 적용합니다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FESTIVAL_RADIUS, travelApi } from '../api/travelApi';
import {
  isMappableTourContent,
  type MappableTourContent,
  type TourFestival,
} from '../types/travel';
import {
  isInsideBounds,
  roughDistance,
  type Coords,
  type ViewportBounds,
} from './useNearbyPlaces';

/** 상단 날짜 칩 */
export type FestivalRange = 'now' | 'weekend' | 'all';

export const FESTIVAL_RANGE_LABEL: Record<FestivalRange, string> = {
  now: '진행 중',
  weekend: '이번 주말',
  all: '예정 전체',
};

export const FESTIVAL_RANGES: FestivalRange[] = ['now', 'weekend', 'all'];

/** Date → 'YYYYMMDD' */
function toYmd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}${month}${day}`;
}

/** 이번 주 토요일과 일요일. 주말이 이미 시작됐다면 그 주말을 그대로 씁니다. */
function weekendRange(today: Date): { from: string; to: string } {
  const day = today.getDay(); // 0=일 … 6=토
  const saturday = new Date(today);
  // 일요일(0)이면 어제가 토요일, 그 외에는 다가오는 토요일까지의 일수를 더합니다.
  saturday.setDate(today.getDate() + (day === 0 ? -1 : 6 - day));
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return { from: toYmd(saturday), to: toYmd(sunday) };
}

/** 축제 기간 [start, end] 가 [from, to] 와 겹치는지 */
function overlaps(
  place: MappableTourContent,
  from: string,
  to: string,
): boolean {
  const start = place.eventStartDate ?? '';
  const end = place.eventEndDate || start;
  if (!start) {
    return false;
  }
  return start <= to && end >= from;
}

/**
 * 충북 축제 목록 캐시.
 * 키는 조회 기준일이라, 날짜가 바뀌면 자연스럽게 다시 받습니다.
 */
let cache: { key: string; items: MappableTourContent[] } | null = null;
let inFlight: {
  key: string;
  promise: Promise<MappableTourContent[]>;
} | null = null;

function loadFestivals(baseYmd: string): Promise<MappableTourContent[]> {
  if (cache?.key === baseYmd) {
    return Promise.resolve(cache.items);
  }
  if (inFlight?.key === baseYmd) {
    return inFlight.promise;
  }
  const promise = travelApi
    .listFestivals({ from: baseYmd, regionCode: '43', size: 300 })
    .then(results => {
      // 서버 응답이 같은 contentid 를 중복해서 주더라도 마커-상세 연결은 1:1로 유지합니다.
      const mappable = results.filter(
        (item): item is TourFestival & MappableTourContent =>
          isMappableTourContent(item),
      );
      const items: MappableTourContent[] = [
        ...new Map(mappable.map(item => [item.contentId, item])).values(),
      ];
      cache = { key: baseYmd, items };
      return items;
    })
    .finally(() => {
      inFlight = null;
    });
  inFlight = { key: baseYmd, promise };
  return promise;
}

export function useNearbyFestivals(
  center: Coords,
  range: FestivalRange,
  radius: number = FESTIVAL_RADIUS,
  bounds: ViewportBounds | null = null,
) {
  const [all, setAll] = useState<MappableTourContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 재시도 카운터 — 실패한 캐시를 버리고 다시 받게 합니다. */
  const [reloadKey, setReloadKey] = useState(0);

  // 조회 기준일은 오늘 — 진행 중 + 예정 축제가 함께 옵니다.
  const today = useMemo(() => new Date(), []);
  const baseYmd = toYmd(today);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    loadFestivals(baseYmd)
      .then(items => {
        if (!alive) return;
        setAll(items);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!alive) return;
        setAll([]);
        setError(err.message || '축제 정보를 불러오지 못했어요.');
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [baseYmd, reloadKey]);

  const retry = useCallback(() => {
    // 실패했다면 캐시에 아무것도 안 담겼으니 카운터만 올리면 다시 요청됩니다.
    setReloadKey(key => key + 1);
  }, []);

  const { lat, lng } = center;

  const places = useMemo(() => {
    const { from, to } =
      range === 'weekend'
        ? weekendRange(today)
        : range === 'now'
        ? { from: baseYmd, to: baseYmd }
        : { from: '00000000', to: '99999999' };

    return all
      .filter(place => overlaps(place, from, to))
      .map(place => ({
        ...place,
        // 목록 응답에 dist 가 없어 직접 계산해 시트·카드에서 쓰게 합니다.
        distance: roughDistance(
          { lat, lng },
          { lat: place.lat, lng: place.lng },
        ),
      }))
      .filter(place =>
        bounds
          ? isInsideBounds(place, bounds)
          : (place.distance ?? Infinity) <= radius,
      )
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [all, range, lat, lng, radius, bounds, baseYmd, today]);

  return { places, loading, error, retry };
}
