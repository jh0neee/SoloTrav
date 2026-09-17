import AsyncStorage from '@react-native-async-storage/async-storage';

export type MapViewport = {
  center: { lat: number; lng: number };
  level: number;
};
export const CHUNGBUK_VIEWPORT: MapViewport = {
  center: { lat: 36.65, lng: 127.85 },
  level: 11,
};
/** 충북 전체를 여유 있게 담는 화면 영역이며 행정구역 판정에는 사용하지 않습니다. */
export const CHUNGBUK_OVERVIEW_BOUNDS = {
  south: 36.0,
  west: 127.2,
  north: 37.3,
  east: 128.7,
};
const KEY = '@solotrav/map/chungbuk-viewport-v1';
let cached: MapViewport | null | undefined;
let writes: Promise<void> = Promise.resolve();

export function parseMapViewport(value: unknown): MapViewport | null {
  if (!value || typeof value !== 'object') return null;
  const view = value as Partial<MapViewport>;
  if (
    !view.center ||
    !Number.isFinite(view.center.lat) ||
    !Number.isFinite(view.center.lng) ||
    Math.abs(view.center.lat) > 90 ||
    Math.abs(view.center.lng) > 180 ||
    !Number.isInteger(view.level) ||
    view.level! < 1 ||
    view.level! > 14
  )
    return null;
  return {
    center: { lat: view.center.lat, lng: view.center.lng },
    level: view.level!,
  };
}

export const mapViewportStorage = {
  async load(): Promise<MapViewport | null> {
    if (cached !== undefined) return cached;
    let restored: MapViewport | null = null;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const payload = raw ? JSON.parse(raw) : null;
      if (payload?.regionCode === '43')
        restored = parseMapViewport(payload.viewport);
    } catch {
      /* 저장값이 없으면 충북 전체로 시작합니다. */
    }
    // 저장소를 읽는 동안 새로운 위치가 저장됐다면 그것이 우선입니다.
    if (cached === undefined) cached = restored;
    return cached;
  },
  /** 충북 행정구역으로 확인된 화면 또는 사용자가 선택한 충북 도시만 저장합니다. */
  save(viewport: MapViewport) {
    const valid = parseMapViewport(viewport);
    if (!valid) return Promise.resolve();
    cached = valid;
    writes = writes
      .catch(() => {})
      .then(async () => {
        try {
          await AsyncStorage.setItem(
            KEY,
            JSON.stringify({ regionCode: '43', viewport: valid }),
          );
        } catch {
          /* 기기 저장에 실패해도 현재 세션에서는 복원합니다. */
        }
      });
    return writes;
  },
};
