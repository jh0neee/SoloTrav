/**
 * react-native-safe-area-context 대체.
 *
 * 안드로이드에서는 상태바·제스처바에 가려지지 않도록 여백을 받아오는 라이브러리인데,
 * 브라우저 창 안에는 가릴 것이 없습니다. 그래서 여백을 0 으로 주고,
 * 앱의 20개 화면이 쓰는 `useSafeAreaInsets()` 만 그대로 흉내 냅니다.
 *
 * iOS 사파리처럼 노치가 있는 기기에서 웹앱을 홈 화면에 추가해 쓰는 경우를 위해
 * CSS 의 env(safe-area-inset-*) 값을 읽어 반영합니다. (아니면 전부 0 입니다)
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native-web';

export type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type Rect = { x: number; y: number; width: number; height: number };

export type Metrics = { insets: EdgeInsets; frame: Rect };

const ZERO: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** CSS env(safe-area-inset-*) 을 실제 픽셀로 읽습니다. 못 읽으면 0 입니다. */
function readCssInsets(): EdgeInsets {
  if (typeof document === 'undefined') {
    return ZERO;
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);' +
    'bottom:env(safe-area-inset-bottom,0px);left:env(safe-area-inset-left,0px);';
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const toNumber = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const insets: EdgeInsets = {
    top: toNumber(computed.top),
    right: toNumber(computed.right),
    bottom: toNumber(computed.bottom),
    left: toNumber(computed.left),
  };
  probe.remove();
  return insets;
}

export const SafeAreaInsetsContext = createContext<EdgeInsets>(ZERO);
export const SafeAreaFrameContext = createContext<Rect>({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

export const initialWindowMetrics: Metrics = {
  insets: ZERO,
  frame: { x: 0, y: 0, width: 0, height: 0 },
};

export function SafeAreaProvider({ children }: { children?: ReactNode }) {
  const [insets, setInsets] = useState<EdgeInsets>(ZERO);

  useEffect(() => {
    const measure = () => setInsets(readCssInsets());
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return (
    <SafeAreaInsetsContext.Provider value={insets}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}

/** 화면들이 상단·하단 여백을 잡을 때 쓰는 훅. */
export function useSafeAreaInsets(): EdgeInsets {
  return useContext(SafeAreaInsetsContext);
}

export function useSafeAreaFrame(): Rect {
  const [frame, setFrame] = useState<Rect>(() => ({
    x: 0,
    y: 0,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));
  useEffect(() => {
    const measure = () =>
      setFrame({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return frame;
}

export function useSafeAreaMetrics(): Metrics {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  return useMemo(() => ({ insets, frame }), [insets, frame]);
}

type SafeAreaViewProps = ViewProps & {
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
};

/** 여백을 padding 으로 넣어주는 View. */
export function SafeAreaView({ style, edges, ...rest }: SafeAreaViewProps) {
  const insets = useSafeAreaInsets();
  const wanted = edges ?? (['top', 'right', 'bottom', 'left'] as const);
  const padding = {
    paddingTop: wanted.includes('top') ? insets.top : 0,
    paddingRight: wanted.includes('right') ? insets.right : 0,
    paddingBottom: wanted.includes('bottom') ? insets.bottom : 0,
    paddingLeft: wanted.includes('left') ? insets.left : 0,
  };
  return <View {...rest} style={[padding, style]} />;
}

/** 앱에서 쓰지 않지만 라이브러리 API 형태를 맞춰둡니다. */
export const SafeAreaConsumer = SafeAreaInsetsContext.Consumer;
export const SafeAreaInsetsProvider = SafeAreaInsetsContext.Provider;
