/**
 * @react-native-community/geolocation 대체 — 브라우저 navigator.geolocation.
 *
 * 앱은 이 모듈을 useCurrentLocation 훅 한 곳에서만 씁니다.
 * 권한은 브라우저가 첫 측위 시도 때 직접 물어보므로 requestAuthorization 은
 * "물어봤다" 고 답만 하고, 실제 허용 여부는 측위 성공/실패로 드러납니다.
 * (앱도 iOS 를 그렇게 다루고 있어서 흐름이 그대로 맞습니다)
 */
export type GeolocationOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
};

export type GeolocationResponse = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
    altitudeAccuracy: number | null;
  };
  timestamp: number;
};

export type GeolocationError = {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
};

type Success = (position: GeolocationResponse) => void;
type Failure = (error: GeolocationError) => void;

/** 브라우저가 위치 API 자체를 지원하지 않을 때 돌려줄 에러 */
const UNSUPPORTED: GeolocationError = {
  code: 2,
  message: '이 브라우저는 위치 기능을 지원하지 않습니다.',
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
};

function toResponse(position: GeolocationPosition): GeolocationResponse {
  const { coords, timestamp } = position;
  return {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      // 브라우저는 accuracy 를 항상 채워주지만 타입상 null 이 가능해 보정합니다.
      accuracy: coords.accuracy ?? 0,
      altitude: coords.altitude,
      heading: coords.heading,
      speed: coords.speed,
      altitudeAccuracy: coords.altitudeAccuracy,
    },
    timestamp,
  };
}

function toError(error: GeolocationPositionError): GeolocationError {
  return {
    code: error.code,
    message: error.message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

const Geolocation = {
  /** 네이티브 전용 설정 — 웹에서는 받아만 두고 아무 일도 하지 않습니다. */
  setRNConfiguration(): void {},

  /**
   * 브라우저에는 "권한만 미리 요청" 하는 방법이 없습니다(측위를 시도해야 묻습니다).
   * Permissions API 로 이미 거절된 상태인지 정도만 확인해 알려줍니다.
   */
  requestAuthorization(success?: () => void, failure?: Failure): void {
    if (!navigator.geolocation) {
      failure?.(UNSUPPORTED);
      return;
    }
    if (!navigator.permissions?.query) {
      success?.();
      return;
    }
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then(status => {
        if (status.state === 'denied') {
          failure?.({ ...UNSUPPORTED, code: 1, message: '위치 권한이 거부되었습니다.' });
        } else {
          success?.();
        }
      })
      .catch(() => success?.());
  },

  getCurrentPosition(
    success: Success,
    failure?: Failure,
    options?: GeolocationOptions,
  ): void {
    if (!navigator.geolocation) {
      failure?.(UNSUPPORTED);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => success(toResponse(position)),
      error => failure?.(toError(error)),
      options,
    );
  },

  watchPosition(
    success: Success,
    failure?: Failure,
    options?: GeolocationOptions,
  ): number {
    if (!navigator.geolocation) {
      failure?.(UNSUPPORTED);
      return -1;
    }
    return navigator.geolocation.watchPosition(
      position => success(toResponse(position)),
      error => failure?.(toError(error)),
      options,
    );
  },

  clearWatch(watchId: number): void {
    navigator.geolocation?.clearWatch(watchId);
  },

  stopObserving(): void {},
};

export default Geolocation;
