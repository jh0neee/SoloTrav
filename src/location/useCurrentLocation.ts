/**
 * 현위치 조회 훅.
 *
 * 지도의 파란 점, 비상벨의 "가장 가까운 안전 시설" 조회가 같은 좌표를 쓰도록
 * 위치 관련 처리를 여기 한 곳에 모읍니다.
 *
 * 설계상 coords 는 **항상 값이 있습니다.** 권한을 거절당했거나 측위에 실패해도
 * 단양읍 기본 좌표(FALLBACK_COORDS)로 떨어지므로, 화면은 좌표가 없는 상태를
 * 따로 다루지 않아도 됩니다. 실제 위치인지 여부는 isFallback 으로 구분합니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { MY_LOCATION } from '../data/mapDefaults';

export type Coords = { lat: number; lng: number };

export type LocationStatus =
  | 'locating' // 측위 중
  | 'granted' // 실제 현위치를 받아옴
  | 'denied' // 사용자가 권한을 거절
  | 'unavailable'; // 권한은 있으나 측위 실패(실내·GPS 꺼짐·타임아웃)

/** 측위 실패 시 쓰는 기본 좌표 — 지도 초기 중심과 같은 단양읍입니다. */
export const FALLBACK_COORDS: Coords = {
  lat: MY_LOCATION.lat,
  lng: MY_LOCATION.lng,
};

const OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  /** 10초 이내 캐시된 위치가 있으면 그대로 씁니다(비상 상황에서 대기 시간을 줄임). */
  maximumAge: 10000,
};

Geolocation.setRNConfiguration({
  // 권한 요청은 이 훅이 직접 하므로 라이브러리 자동 요청은 끕니다.
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

/** 플랫폼별 위치 권한 요청. 허용됐는지 여부만 돌려줍니다. */
async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: '위치 권한이 필요해요',
        message:
          '주변 안전 시설을 찾고 지도에 현위치를 표시하려면 위치 권한이 필요합니다.',
        buttonPositive: '허용',
        buttonNegative: '나중에',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  // iOS — 거절해도 예외를 던지지 않으므로 실제 측위 성공 여부로 판단합니다.
  await new Promise<void>(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(),
      () => resolve(),
    );
  });
  return true;
}

export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords>(FALLBACK_COORDS);
  const [status, setStatus] = useState<LocationStatus>('locating');
  /** 화면이 사라진 뒤 콜백이 늦게 도착해 setState 하는 일을 막습니다. */
  const aliveRef = useRef(true);

  const locate = useCallback(async () => {
    setStatus('locating');

    const allowed = await requestPermission();
    if (!aliveRef.current) {
      return;
    }
    if (!allowed) {
      setStatus('denied');
      return;
    }

    Geolocation.getCurrentPosition(
      position => {
        if (!aliveRef.current) {
          return;
        }
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus('granted');
      },
      () => {
        if (!aliveRef.current) {
          return;
        }
        // 좌표는 폴백을 그대로 두고 상태만 바꿔, 화면이 계속 동작하게 합니다.
        setStatus('unavailable');
      },
      OPTIONS,
    );
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    locate();
    return () => {
      aliveRef.current = false;
    };
  }, [locate]);

  return {
    coords,
    /** 실제 측위 좌표가 아니라 기본 좌표를 쓰고 있는지 */
    isFallback: status !== 'granted',
    status,
    /** 다시 측위 (권한 설정을 바꾸고 돌아왔을 때 등) */
    refresh: locate,
  };
}
