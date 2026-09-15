import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  safetyPlaceApi,
  type ReferencePlaceMapType,
  type SafetyPlace,
  type SafetyPlaceType,
} from '../api/safetyPlaceApi';
import { roughDistance, type Coords } from './useNearbyPlaces';
import type { City } from '../data/cities';
import { mapApiSample, startMapApiLog } from './mapApiLogger';

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
  'clinic',
  'pharmacy',
  'affiliatedClinic',
  'toilet',
  'streetlight',
  'securityLight',
];
const MAP_TYPES: ReferencePlaceMapType[] = [
  'cctv',
  'emergencyBell',
  'hospital',
  'clinic',
  'pharmacy',
  'affiliatedClinic',
  'toilet',
];

function isMapType(type: SafetyPlaceType): type is ReferencePlaceMapType {
  return MAP_TYPES.includes(type as ReferencePlaceMapType);
}
const AUTO_RETRY_DELAYS_MS = [700];
const REQUEST_CONCURRENCY = 2;

type SafetyCacheEntry = {
  items: SafetyPlace[];
  hasMore: boolean;
  /** map 조회로 받은 경우 이 결과가 완전히 포함하는 지도 범위 */
  bounds?: MapBounds;
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

function containsBounds(outer: MapBounds, inner: MapBounds) {
  return (
    outer.south <= inner.south &&
    outer.north >= inner.north &&
    outer.west <= inner.west &&
    outer.east >= inner.east
  );
}

function reusableCache(
  cache: Record<string, SafetyCacheEntry>,
  type: SafetyPlaceType,
  exactKey: string,
  queryBounds: MapBounds | null,
) {
  const exact = cache[exactKey];
  if (exact) return exact;
  if (!isMapType(type) || !isValidBounds(queryBounds)) return undefined;

  const previous = cache[`last|${type}`];
  // 이전 결과가 잘린 페이지면 하위 범위도 완전하다고 볼 수 없습니다.
  if (
    previous?.bounds &&
    !previous.hasMore &&
    containsBounds(previous.bounds, queryBounds)
  ) {
    return previous;
  }
  return undefined;
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
      isMapType(type)
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
    const typesToLoad = requested.filter(
      type => !reusableCache(cache, type, cacheKey(type), queryBounds),
    );
    if (!typesToLoad.length) {
      setLoadingTypes([]);
      setErrors([]);
      return;
    }
    const controller = new AbortController();
    setLoadingTypes(typesToLoad);
    setErrors([]);
    const loadType = async (type: SafetyPlaceType) => {
      for (
        let attempt = 0;
        attempt <= AUTO_RETRY_DELAYS_MS.length;
        attempt += 1
      ) {
        const request = startMapApiLog(`safety/${type}`, {
          mode: isMapType(type) && isValidBounds(queryBounds) ? 'map' : 'list',
          city: city.sigungu,
          bounds:
            isMapType(type) && isValidBounds(queryBounds)
              ? queryBounds
              : undefined,
          attempt: attempt + 1,
        });
        try {
          if (isMapType(type) && isValidBounds(queryBounds)) {
            const result = await safetyPlaceApi.map(
              type,
              queryBounds,
              controller.signal,
            );
            request.success({
              count: result.items.length,
              hasMore: result.hasMore,
              sample: mapApiSample(result.items),
            });
            return result;
          }
          const items = await safetyPlaceApi.list(
            type,
            city,
            controller.signal,
          );
          request.success({ count: items.length, sample: mapApiSample(items) });
          return { items, hasMore: false };
        } catch (error) {
          if (controller.signal.aborted) request.cancelled();
          else request.failure(error);
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
    };
    const storeResult = (type: SafetyPlaceType, result: SafetyCacheEntry) => {
      setCache(previous => {
        const next = { ...previous };
        const nextKey = cacheKey(type);
        const stored =
          isMapType(type) && isValidBounds(queryBounds)
            ? { ...result, bounds: queryBounds }
            : result;
        if (isMapType(type)) {
          Object.keys(next).forEach(existingKey => {
            if (existingKey.startsWith(`${type}|`) && existingKey !== nextKey) {
              delete next[existingKey];
            }
          });
          if (stored.items.length) {
            next[`last|${type}`] = stored;
          }
        }
        next[nextKey] = stored;
        return next;
      });
    };
    let nextIndex = 0;
    const runWorker = async () => {
      while (!controller.signal.aborted) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= typesToLoad.length) return;
        const type = typesToLoad[index];
        try {
          const result = await loadType(type);
          if (controller.signal.aborted) return;
          storeResult(type, result);
        } catch {
          if (controller.signal.aborted) return;
          setErrors(current =>
            current.includes(type) ? current : [...current, type],
          );
        } finally {
          if (!controller.signal.aborted) {
            setLoadingTypes(current => current.filter(item => item !== type));
          }
        }
      }
    };
    Promise.all(
      Array.from(
        { length: Math.min(REQUEST_CONCURRENCY, typesToLoad.length) },
        runWorker,
      ),
    ).catch(() => {
      // 시설별 오류는 각 worker에서 errors 상태에 반영합니다.
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
        .flatMap(type => {
          const exact = reusableCache(cache, type, cacheKey(type), queryBounds);
          if (exact?.items.length || !isMapType(type)) {
            return exact?.items ?? [];
          }
          return cache[`last|${type}`]?.items ?? exact?.items ?? [];
        })
        .filter(place => isVisible(place, center)),
    [active, cache, cacheKey, center, isVisible, queryBounds],
  );
  const hasMoreTypes = useMemo(
    () =>
      ALL_TYPES.filter(
        type =>
          reusableCache(cache, type, cacheKey(type), queryBounds)?.hasMore,
      ) as SafetyPlaceType[],
    [cache, cacheKey, queryBounds],
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
