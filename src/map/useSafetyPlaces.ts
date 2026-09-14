import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  safetyPlaceApi,
  type SafetyPlace,
  type SafetyPlaceType,
} from '../api/safetyPlaceApi';
import { roughDistance, type Coords } from './useNearbyPlaces';
import type { City } from '../data/cities';

const RADIUS_M = 10_000;
export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};
const ALL_TYPES: SafetyPlaceType[] = [
  'hospital',
  'femaleHouse',
  'cctv',
  'emergencyBell',
  'streetlight',
];
const MAP_TYPES: SafetyPlaceType[] = ['cctv', 'emergencyBell'];
const AUTO_RETRY_DELAYS_MS = [500, 1_200];

type SafetyCacheEntry = {
  items: SafetyPlace[];
  hasMore: boolean;
};

function boundsKey(bounds: MapBounds | null) {
  if (!bounds) return 'no-bounds';
  return [bounds.south, bounds.west, bounds.north, bounds.east]
    .map(value => value.toFixed(6))
    .join(':');
}

function isValidBounds(bounds: MapBounds | null): bounds is MapBounds {
  return !!bounds && bounds.north > bounds.south && bounds.east > bounds.west;
}

export function useSafetyPlaces(
  center: Coords,
  /** 조회할 충북 시군 — 사용자 좌표 대신 시군명·코드로 서버를 좁힙니다. */
  city: City,
  active: SafetyPlaceType[],
  /** 조회를 확정한 지도 경계. 지도형 안전시설은 이 범위만 서버에서 가져옵니다. */
  queryBounds: MapBounds | null = null,
  visibleBounds: MapBounds | null = queryBounds,
) {
  /** 지도형 안전시설은 지도 경계, 나머지 시설은 지역을 캐시 키로 사용합니다. */
  const [cache, setCache] = useState<Record<string, SafetyCacheEntry>>({});
  const [loadingTypes, setLoadingTypes] = useState<SafetyPlaceType[]>([]);
  const [errors, setErrors] = useState<SafetyPlaceType[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const requestedTypes = active;
  const key = [...requestedTypes].sort().join(',');
  const mapBoundsKey = boundsKey(queryBounds);
  const cacheKey = useCallback(
    (type: SafetyPlaceType) =>
      MAP_TYPES.includes(type)
        ? `${type}|${mapBoundsKey}`
        : `${city.municipalityCode}|${type}`,
    [city.municipalityCode, mapBoundsKey],
  );

  useEffect(() => {
    const requested = [...requestedTypes];
    if (!requested.length) {
      setLoadingTypes([]);
      setErrors([]);
      return;
    }
    const typesToLoad = requested.filter(type => !cache[cacheKey(type)]);
    if (!typesToLoad.length) {
      setLoadingTypes([]);
      setErrors([]);
      return;
    }
    const controller = new AbortController();
    setLoadingTypes(typesToLoad);
    setErrors([]);
    Promise.allSettled(
      typesToLoad.map(async type => {
        for (
          let attempt = 0;
          attempt <= AUTO_RETRY_DELAYS_MS.length;
          attempt += 1
        ) {
          try {
            if (MAP_TYPES.includes(type) && isValidBounds(queryBounds)) {
              return await safetyPlaceApi.map(
                type as 'cctv' | 'emergencyBell',
                queryBounds,
                controller.signal,
              );
            }
            const items = await safetyPlaceApi.list(
              type,
              city,
              controller.signal,
            );
            return { items, hasMore: false };
          } catch (error) {
            if (
              controller.signal.aborted ||
              attempt === AUTO_RETRY_DELAYS_MS.length
            ) {
              throw error;
            }
            await new Promise<void>(resolve =>
              setTimeout(resolve, AUTO_RETRY_DELAYS_MS[attempt]),
            );
          }
        }
        throw new Error('안전시설을 불러오지 못했습니다.');
      }),
    ).then(results => {
      if (controller.signal.aborted) return;
      setCache(previous => {
        const next = { ...previous };
        results.forEach((result, index) => {
          const type = typesToLoad[index];
          if (result.status === 'fulfilled') {
            const nextKey = cacheKey(type);
            if (MAP_TYPES.includes(type)) {
              Object.keys(next).forEach(existingKey => {
                if (
                  existingKey.startsWith(`${type}|`) &&
                  existingKey !== nextKey
                ) {
                  delete next[existingKey];
                }
              });
            }
            next[nextKey] = result.value;
          }
        });
        return next;
      });
      setErrors(
        typesToLoad.filter((_, index) => results[index].status === 'rejected'),
      );
      setLoadingTypes([]);
    });
    return () => controller.abort();
  }, [key, city.municipalityCode, cacheKey, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const isVisible = useCallback(
    (place: SafetyPlace, fallbackCenter: Coords) => {
      if (!visibleBounds)
        return roughDistance(fallbackCenter, place) <= RADIUS_M;
      const insideLatitude =
        place.lat >= visibleBounds.south && place.lat <= visibleBounds.north;
      // 일반적인 경우 west <= east. 날짜변경선을 걸친 화면도 안전하게 처리합니다.
      const insideLongitude =
        visibleBounds.west <= visibleBounds.east
          ? place.lng >= visibleBounds.west && place.lng <= visibleBounds.east
          : place.lng >= visibleBounds.west || place.lng <= visibleBounds.east;
      return insideLatitude && insideLongitude;
    },
    [visibleBounds],
  );

  const places = useMemo(
    () =>
      active
        .flatMap(type => cache[cacheKey(type)]?.items ?? [])
        .filter(place => isVisible(place, center)),
    [active, cache, cacheKey, center, isVisible],
  );
  const hasMoreTypes = useMemo(
    () =>
      ALL_TYPES.filter(
        type => cache[cacheKey(type)]?.hasMore,
      ) as SafetyPlaceType[],
    [cache, cacheKey],
  );
  const retry = useCallback(() => setReloadKey(value => value + 1), []);
  return {
    places,
    loading: loadingTypes.length > 0,
    errors,
    hasMoreTypes,
    retry,
  };
}
