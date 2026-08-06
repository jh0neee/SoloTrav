/**
 * 지도 검색 관련 타입.
 * WebView(카카오 SDK) ↔ RN 사이에서 오가는 값이라 별도 파일로 분리했습니다.
 */
import type { Place } from '../../data/places';

/** 카카오 장소 검색(keywordSearch) 결과 1건 */
export type SearchPoi = {
  id: string;
  name: string;
  address: string;
  roadAddress: string;
  category: string;
  phone: string;
  url: string;
  /** 지도 중심 기준 거리(m). 전국 재검색 결과에는 없습니다. */
  distance: number | null;
  lat: number;
  lng: number;
};

/** 검색 목록의 한 줄 — 앱이 아는 장소(local) 와 카카오 POI(poi) 를 함께 보여 줍니다. */
export type SearchHit =
  | { kind: 'local'; place: Place }
  | { kind: 'poi'; poi: SearchPoi };

export type SearchStatus = 'OK' | 'ZERO_RESULT' | 'ERROR';

/** 거리(m) 를 '210m' / '1.1km' 처럼 사람이 읽는 문자열로 */
export function formatDistance(meters: number | null) {
  if (meters === null) return '';
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}
