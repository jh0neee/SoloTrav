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
import Geolocation, {
  type GeolocationError,
  type GeolocationOptions,
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import { MY_LOCATION } from '../data/mapDefaults';
import { getDevLocation } from './devLocation';

export type Coords = { lat: number; lng: number };

export type LocationStatus =
  | 'locating' // 측위 중
  | 'granted' // 실제 현위치를 받아옴
  | 'denied' // 사용자가 권한을 거절 (다시 물어볼 수 있음)
  | 'blocked' // '다시 묻지 않음' — 재요청해도 다이얼로그가 뜨지 않습니다
  | 'unavailable'; // 권한은 있으나 측위 실패(실내·GPS 꺼짐·타임아웃)

/** 측위 실패 시 쓰는 기본 좌표 — 지도 초기 중심과 같은 단양읍입니다. */
export const FALLBACK_COORDS: Coords = {
  lat: MY_LOCATION.lat,
  lng: MY_LOCATION.lng,
};

/**
 * 1차 시도 — GPS 우선.
 * maximumAge 를 1분으로 둬서 최근 측위 결과가 있으면 즉시 돌려받습니다.
 * (0 에 가깝게 두면 매번 새로 위성을 잡느라 실내에서 거의 타임아웃납니다)
 */
const PRECISE_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60000,
};

/**
 * 2차 시도 — GPS 를 포기하고 WiFi·기지국 기반으로 대략적인 위치를 받습니다.
 * 실내에서는 이쪽이 거의 항상 성공합니다. 오차가 수백 m 라도 "내가 있는 시" 는
 * 맞으므로, 기본 좌표(단양)로 떨어지는 것보다 훨씬 낫습니다.
 */
const COARSE_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
};

Geolocation.setRNConfiguration({
  // 권한 요청은 이 훅이 직접 하므로 라이브러리 자동 요청은 끕니다.
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  // 'auto' 는 기기에 따라 구형 android.location provider 로 잡혀 실내에서
  // 자주 타임아웃납니다. Play Services 의 Fused provider 를 명시합니다.
  // (라이브러리가 play-services-location 을 이미 포함합니다)
  locationProvider: 'playServices',
});

type PermissionResult = 'granted' | 'denied' | 'blocked';

/**
 * 플랫폼별 위치 권한 요청.
 * 'blocked' 는 사용자가 '다시 묻지 않음' 을 고른 경우로, 재요청해도 다이얼로그가
 * 뜨지 않습니다. 화면은 이때 설정 앱으로 보내야 합니다.
 */
async function requestPermission(): Promise<PermissionResult> {
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
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }
    return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      ? 'blocked'
      : 'denied';
  }

  // iOS — 거절해도 예외를 던지지 않으므로 실제 측위 성공 여부로 판단합니다.
  await new Promise<void>(resolve => {
    Geolocation.requestAuthorization(
      () => resolve(),
      () => resolve(),
    );
  });
  return 'granted';
}

/** getCurrentPosition 을 promise 로 감쌉니다. 실패하면 에러를 그대로 넘깁니다. */
function getPosition(
  options: GeolocationOptions,
): Promise<GeolocationResponse> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords>(FALLBACK_COORDS);
  const [status, setStatus] = useState<LocationStatus>('locating');
  /** 화면이 사라진 뒤 콜백이 늦게 도착해 setState 하는 일을 막습니다. */
  const aliveRef = useRef(true);

  const locate = useCallback(async () => {
    setStatus('locating');

    // 개발용 좌표 오버라이드가 켜져 있으면 권한 요청도 측위도 건너뜁니다.
    // (릴리즈 빌드에서는 getDevLocation 이 항상 null 입니다)
    const dev = getDevLocation();
    if (dev) {
      setCoords(dev.coords);
      setStatus('granted');
      console.log(
        `[location] ⚠️ 개발용 오버라이드 '${dev.name}' 사용 — ` +
          `${dev.coords.lat}, ${dev.coords.lng}`,
      );
      return;
    }

    const permission = await requestPermission();
    if (!aliveRef.current) {
      return;
    }
    if (permission !== 'granted') {
      setStatus(permission);
      return;
    }

    // GPS 로 먼저 시도하고, 실패하면 대략적인 위치라도 받아옵니다.
    // 좌표는 성공한 쪽에서 한 번만 갱신되므로 화면이 두 번 튀지 않습니다.
    let position: GeolocationResponse;
    try {
      position = await getPosition(PRECISE_OPTIONS);
    } catch (preciseError) {
      if (!aliveRef.current) {
        return;
      }
      if (__DEV__) {
        const { code, message } = preciseError as GeolocationError;
        console.log(`[location] 정밀 측위 실패 (code ${code}): ${message}`);
      }
      try {
        position = await getPosition(COARSE_OPTIONS);
      } catch (coarseError) {
        if (!aliveRef.current) {
          return;
        }
        if (__DEV__) {
          const { code, message } = coarseError as GeolocationError;
          console.log(`[location] 대략 측위도 실패 (code ${code}): ${message}`);
        }
        // 좌표는 폴백을 그대로 두고 상태만 바꿔, 화면이 계속 동작하게 합니다.
        setStatus('unavailable');
        return;
      }
    }

    if (!aliveRef.current) {
      return;
    }
    setCoords({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
    setStatus('granted');
    if (__DEV__) {
      console.log(
        `[location] 측위 성공 ${position.coords.latitude.toFixed(4)}, ` +
          `${position.coords.longitude.toFixed(4)} (오차 ${Math.round(
            position.coords.accuracy,
          )}m)`,
      );
    }
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
