/**
 * 'react-native' 를 통째로 대신하는 모듈.
 *
 * 앱 소스의 `import { View, Text } from 'react-native'` 이 전부 여기로 옵니다.
 * 대부분은 react-native-web 이 그대로 처리하고, 웹에 없거나 **빈 껍데기로만
 * 들어있는 것**들만 여기서 채웁니다.
 *
 * react-native-web 0.21.2 기준으로 손봐야 하는 것:
 *   - Alert              : 함수 본문이 비어 있습니다(아무 일도 안 일어남) → 새로 구현
 *   - PermissionsAndroid : 아예 없습니다 → 스텁 (웹에선 Platform.OS 가 'web' 이라
 *                          안드로이드 분기를 타지 않지만, import 는 되어야 합니다)
 *   - Linking.openSettings : 없습니다 → 안내로 대체
 */
import {
  Linking as RNWLinking,
  Alert as RNWAlert,
} from 'react-native-web';
import { NAVIGATE_EVENT } from '../shell/router';

export * from 'react-native-web';

/* ────────────────────────── Alert ────────────────────────── */

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

type AlertButton = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: AlertButtonStyle;
};

/** '제목'과 '내용'을 한 덩어리로 — 브라우저 기본 창은 줄바꿈만 지원합니다. */
function joinText(title?: string, message?: string): string {
  return [title, message].filter(Boolean).join('\n\n');
}

/**
 * 브라우저 기본 대화상자로 옮긴 Alert.
 *
 * 앱에서 쓰는 형태는 두 가지뿐입니다.
 *   1) 버튼 없음/한 개  → 알림만 띄우고 확인 (window.alert)
 *   2) [취소, 실행]     → 예/아니오 (window.confirm)
 *
 * confirm 은 결과가 true 일 때 '취소가 아닌 마지막 버튼', false 일 때
 * '취소 버튼' 의 onPress 를 부릅니다. 앱의 [취소, 삭제] 배치와 그대로 맞습니다.
 */
const WebAlert = {
  alert(title?: string, message?: string, buttons?: AlertButton[]): void {
    const list = buttons ?? [];
    const text = joinText(title, message);

    if (list.length < 2) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }

    const cancel =
      list.find(button => button.style === 'cancel') ?? list[0];
    const confirmButton =
      [...list].reverse().find(button => button !== cancel) ??
      list[list.length - 1];

    // 어느 버튼이 '실행' 인지 문구로 알려줍니다(확인/취소 라고만 뜨면 헷갈립니다).
    const label = confirmButton.text ? `\n\n[확인] = ${confirmButton.text}` : '';

    if (window.confirm(text + label)) {
      confirmButton.onPress?.();
    } else {
      cancel.onPress?.();
    }
  },
  /** RN 의 prompt 는 iOS 전용입니다. 앱에서 쓰지 않지만 형태만 맞춰둡니다. */
  prompt(
    title?: string,
    message?: string,
    callback?: (value: string) => void,
  ): void {
    const value = window.prompt(joinText(title, message)) ?? '';
    callback?.(value);
  },
};

// react-native-web 의 빈 Alert 대신 위 구현을 내보냅니다.
void RNWAlert;
export const Alert = WebAlert;

/* ──────────────────── PermissionsAndroid ──────────────────── */

/**
 * 웹에는 안드로이드 권한 체계가 없습니다.
 * Platform.OS 가 'web' 이라 앱 코드는 이 스텁을 실제로 호출하지 않지만
 * (useCurrentLocation 이 `Platform.OS === 'android'` 로 감싸고 있습니다),
 * import 자체는 성공해야 하므로 모양만 갖춰 둡니다.
 *
 * 웹에서 위치 권한은 브라우저가 navigator.geolocation 호출 시점에 직접 묻습니다.
 */
export const PermissionsAndroid = {
  PERMISSIONS: {
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    CAMERA: 'android.permission.CAMERA',
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  async request(): Promise<string> {
    return 'granted';
  },
  async check(): Promise<boolean> {
    return true;
  },
  async requestMultiple(): Promise<Record<string, string>> {
    return {};
  },
};

/* ────────────────────────── Linking ────────────────────────── */

/**
 * react-native-web 의 Linking 에는 openSettings 가 없습니다.
 * 위치 권한을 거절당했을 때 앱이 "설정으로 보내기" 로 부르는데, 브라우저는
 * 스크립트가 설정 화면을 여는 걸 허용하지 않으므로 방법을 알려주기만 합니다.
 */
const LinkingWithSettings = RNWLinking as typeof RNWLinking & {
  openSettings: () => Promise<void>;
};

if (typeof LinkingWithSettings.openSettings !== 'function') {
  LinkingWithSettings.openSettings = async () => {
    window.alert(
      '브라우저에서는 앱이 설정 화면을 열 수 없습니다.\n\n' +
        '주소창 왼쪽의 자물쇠(또는 ⓘ) 아이콘 → 사이트 설정 → 위치 에서\n' +
        '권한을 "허용" 으로 바꾼 뒤 새로고침해주세요.',
    );
  };
}

export const Linking = LinkingWithSettings;

/* ──────────────────────── BackHandler ──────────────────────── */

/**
 * 안드로이드 하드웨어 뒤로가기를 **브라우저 뒤로가기 버튼**에 연결합니다.
 *
 * react-native-web 의 BackHandler 는 부르기만 해도 콘솔에 에러를 찍고 아무 일도
 * 하지 않습니다. 그런데 앱의 오버레이(바텀시트·SOS·취향 위저드)가 이 이벤트로
 * 닫히고 있어서, 그대로 두면 웹에서는 뒤로가기가 통째로 사라집니다.
 *
 * 화면 **전환**은 이제 주소가 담당합니다(shell/router.ts). 그래서 여기서는
 * 히스토리를 막지 않고, 누군가 뒤로가기를 '써버린' 경우에만 되돌립니다.
 *
 *   - 뒤로가기 → 등록된 핸들러를 나중에 등록된 것부터 부릅니다(RN 과 같은 순서)
 *   - 하나가 true 를 돌려주면(시트를 닫았다면) 주소를 원래 자리로 되돌립니다
 *   - 아무도 쓰지 않으면 그대로 둡니다 — /record 에서 /my 로 정상 이동합니다
 *
 * 예전에는 더미 히스토리 항목을 계속 쌓아 사이트를 못 떠나게 막았는데, 그 방식은
 * 주소 기반 이동과 정면으로 부딪칩니다(탭을 옮길 때마다 시트가 닫히고, 뒤로가기가
 * 더미 항목에 갇힙니다). 지금은 웹답게 첫 화면에서 뒤로 가면 그냥 나갑니다.
 */
type BackHandlerCallback = () => boolean | null | undefined;

const backHandlers: BackHandlerCallback[] = [];

/** 뒤로가기가 소비됐을 때 되돌아갈 주소 — 직전에 머물던 곳입니다. */
let lastUrl = window.location.href;

function onPopState() {
  let consumed = false;
  for (let i = backHandlers.length - 1; i >= 0; i -= 1) {
    if (backHandlers[i]() === true) {
      consumed = true;
      break;
    }
  }

  if (consumed) {
    // 화면 안에서 처리했으니 주소는 움직이지 않은 것으로 합니다.
    window.history.pushState(window.history.state, '', lastUrl);
    // useLocation 이 이미 바뀐 주소를 읽었을 수 있어 다시 알립니다.
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
  }

  lastUrl = window.location.href;
}

window.addEventListener('popstate', onPopState);
// navigate()/replace() 로 주소가 바뀐 경우도 따라갑니다.
window.addEventListener(NAVIGATE_EVENT, () => {
  lastUrl = window.location.href;
});

export const BackHandler = {
  addEventListener(
    _type: 'hardwareBackPress',
    handler: BackHandlerCallback,
  ): { remove: () => void } {
    backHandlers.push(handler);
    return {
      remove() {
        const index = backHandlers.indexOf(handler);
        if (index !== -1) {
          backHandlers.splice(index, 1);
        }
      },
    };
  },

  removeEventListener(
    _type: 'hardwareBackPress',
    handler: BackHandlerCallback,
  ): void {
    const index = backHandlers.indexOf(handler);
    if (index !== -1) {
      backHandlers.splice(index, 1);
    }
  },

  /** 웹에는 '앱 종료' 가 없습니다. */
  exitApp(): void {},
};
