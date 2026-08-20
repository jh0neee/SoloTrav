/**
 * 지도 마커용 주변 관광정보 조회 훅.
 *
 * 지도를 움직일 때마다 요청하면 API 를 남발하게 되므로, 조회는 화면이 넘겨주는
 * `center` 가 실제로 바뀔 때만 일어납니다. 지도를 끌고 다니는 동안의 중심 변화는
 * 화면이 따로 들고 있다가 "이 지역에서 재검색" 을 누를 때 center 로 넘겨 줍니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_RADIUS, tourApi } from '../api/tourApi';
import type { TourCategory, TourPlace } from '../types/tourPlace';

export type Coords = { lat: number; lng: number };

type State = {
  places: TourPlace[];
  loading: boolean;
  error: string | null;
  /** 서버가 알려 준 반경 안 전체 건수 (가져온 건수보다 클 수 있습니다) */
  totalCount: number;
};

const INITIAL: State = {
  places: [],
  loading: false,
  error: null,
  totalCount: 0,
};

export function useNearbyPlaces(
  center: Coords,
  category: TourCategory,
  /** false 면 조회하지 않습니다 (축제처럼 다른 API 를 쓰는 카테고리). */
  enabled: boolean = true,
  radius: number = DEFAULT_RADIUS,
) {
  const [state, setState] = useState<State>(INITIAL);
  /** 재시도 버튼이 같은 좌표로도 다시 요청하게 만드는 카운터 */
  const [reloadKey, setReloadKey] = useState(0);

  // 좌표 객체가 매 렌더 새로 만들어져도 값이 같으면 재조회하지 않도록 원시값으로 씁니다.
  const { lat, lng } = center;

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState(INITIAL);
      return;
    }

    const controller = new AbortController();
    setState(prev => ({ ...prev, loading: true, error: null }));

    tourApi
      .nearby({ lat, lng, radius, category }, controller.signal)
      .then(page => {
        if (controller.signal.aborted || !mounted.current) return;
        setState({
          places: page.items,
          loading: false,
          error: null,
          totalCount: page.totalCount,
        });
      })
      .catch((err: Error) => {
        if (controller.signal.aborted || !mounted.current) return;
        setState({
          places: [],
          loading: false,
          error: err.message || '주변 정보를 불러오지 못했어요.',
          totalCount: 0,
        });
      });

    return () => controller.abort();
  }, [enabled, lat, lng, radius, category, reloadKey]);

  const retry = useCallback(() => setReloadKey(key => key + 1), []);

  return { ...state, retry };
}

/**
 * 두 좌표 사이 거리(m) — 재검색 버튼을 띄울지 판단하는 데만 씁니다.
 * 정밀도가 중요하지 않아 위도 1도 ≒ 111km 로 근사합니다.
 */
export function roughDistance(a: Coords, b: Coords): number {
  const dLat = (a.lat - b.lat) * 111_000;
  // 경도 1도의 실제 거리는 위도가 높을수록 짧아집니다.
  const dLng = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
