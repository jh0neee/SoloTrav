/**
 * 개발용 현위치 오버라이드.
 *
 * 안전 시설·주변 관광지처럼 "지금 어디에 있느냐" 에 따라 결과가 달라지는 화면은
 * 책상에 앉아서는 테스트하기가 어렵습니다. 이 파일의 OVERRIDE 한 줄만 바꾸면
 * 실제 GPS 대신 지정한 좌표를 쓰게 됩니다.
 *
 * 안전장치는 `__DEV__` 하나뿐입니다 — 릴리즈 빌드에서는 항상 null 이라 실제
 * GPS 를 씁니다. 다만 이 파일은 커밋되면 팀원 개발 빌드에도 그대로 적용되므로,
 * **테스트가 끝나면 반드시 OVERRIDE 를 null 로 되돌린 뒤 커밋하세요.**
 */
import type { Coords } from './useCurrentLocation';

/** 자주 쓰는 좌표 모음. 필요하면 여기에 추가하세요. */
export const DEV_LOCATIONS = {
  /** 서버에 안전 시설 데이터가 등록된 유일한 지역 */
  danyang: { lat: 36.9846, lng: 128.3655 },
  cheongju: { lat: 36.6407, lng: 127.4391 },
  seoul: { lat: 37.5665, lng: 126.978 },
  busan: { lat: 35.1796, lng: 129.0756 },
  jeju: { lat: 33.4996, lng: 126.5312 },
} as const;

export type DevLocationName = keyof typeof DEV_LOCATIONS;

/**
 * ⚠️ 테스트할 때만 이름을 넣고, 끝나면 다시 null 로 되돌리세요.
 * 예: const OVERRIDE: DevLocationName | null = 'danyang';
 */
const OVERRIDE: DevLocationName | null = null;

/** 오버라이드가 켜져 있으면 좌표를, 아니면 null 을 돌려줍니다. */
export function getDevLocation(): { name: DevLocationName; coords: Coords } | null {
  if (!__DEV__ || OVERRIDE === null) {
    return null;
  }
  return { name: OVERRIDE, coords: DEV_LOCATIONS[OVERRIDE] };
}
