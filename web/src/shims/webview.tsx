/**
 * react-native-webview 대체 — <iframe> 으로 같은 일을 합니다.
 *
 * 카카오맵 화면(screens/map/KakaoMap.tsx)이 유일한 사용처입니다.
 * 그 화면은 지도 HTML 을 통째로 만들어 WebView 에 넣고, 그 뒤로는 두 가지
 * 통로로만 대화합니다. 그래서 이 둘만 그대로 재현하면 화면 코드를 한 줄도
 * 고치지 않아도 됩니다.
 *
 *   RN → Web : ref.injectJavaScript('window.__zoomIn()')
 *   Web → RN : window.ReactNativeWebView.postMessage(JSON) → onMessage
 *
 * srcDoc 으로 띄운 iframe 은 부모와 같은 출처(origin)를 물려받아서
 * contentDocument 에 스크립트를 꽂아 넣을 수 있습니다. 그래서 injectJavaScript 가
 * 네이티브와 똑같이 동작합니다.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native-web';

export type WebViewMessageEvent = {
  nativeEvent: { data: string; url?: string };
};

export type WebViewProps = {
  source: { html?: string; uri?: string; baseUrl?: string };
  onMessage?: (event: WebViewMessageEvent) => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  style?: StyleProp<ViewStyle>;
  /* 아래는 네이티브 전용 옵션이라 웹에서는 받기만 하고 씁니다/버립니다. */
  originWhitelist?: string[];
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  scrollEnabled?: boolean;
  overScrollMode?: string;
  bounces?: boolean;
  androidLayerType?: string;
  mixedContentMode?: string;
  setSupportMultipleWindows?: boolean;
};

export type WebViewHandle = {
  injectJavaScript: (code: string) => void;
  reload: () => void;
  postMessage: (message: string) => void;
};

/** 이 페이지에서 띄운 iframe 만 구분하기 위한 표식 */
const BRIDGE_CHANNEL = '__solotrav_webview__';

/**
 * iframe 안쪽에 심을 다리.
 * 네이티브 WebView 가 넣어주는 window.ReactNativeWebView 를 흉내 냅니다.
 */
const BRIDGE_SCRIPT = `<script>
(function () {
  window.ReactNativeWebView = {
    postMessage: function (data) {
      parent.postMessage({ channel: ${JSON.stringify(
        BRIDGE_CHANNEL,
      )}, data: String(data) }, '*');
    }
  };
})();
</script>`;

/** HTML 의 <head> 바로 뒤에 다리를 끼워 넣습니다. */
function withBridge(html: string): string {
  const headIndex = html.search(/<head[^>]*>/i);
  if (headIndex === -1) {
    return BRIDGE_SCRIPT + html;
  }
  const insertAt = html.indexOf('>', headIndex) + 1;
  return html.slice(0, insertAt) + BRIDGE_SCRIPT + html.slice(insertAt);
}

const iframeStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  border: 'none',
  backgroundColor: 'transparent',
};

const WebView = forwardRef<WebViewHandle, WebViewProps>(function WebView(
  { source, onMessage, onLoadEnd, style },
  ref,
) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  /** iframe 이 아직 안 떴을 때 들어온 코드를 모아뒀다가 로드 후 흘려보냅니다. */
  const pending = useRef<string[]>([]);
  const loaded = useRef(false);

  const srcDoc = useMemo(
    () => (source?.html ? withBridge(source.html) : undefined),
    [source?.html],
  );

  /** iframe 문서 안에서 코드 한 덩어리를 실행합니다. */
  const run = useCallback((code: string) => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc || !loaded.current) {
      pending.current.push(code);
      return;
    }
    try {
      const script = doc.createElement('script');
      script.text = code;
      (doc.body ?? doc.documentElement).appendChild(script);
      script.remove();
    } catch (error) {
      // 문서가 교체되는 중이면 조용히 흘려보냅니다(다음 호출에서 다시 옵니다).
      if (__DEV__) {
        console.warn('[WebView] injectJavaScript 실패', error);
      }
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      injectJavaScript: run,
      reload: () => {
        const frame = frameRef.current;
        if (frame) {
          loaded.current = false;
          // srcDoc 을 다시 넣으면 문서가 새로 그려집니다.
          const doc = frame.srcdoc;
          frame.srcdoc = '';
          frame.srcdoc = doc;
        }
      },
      postMessage: (message: string) => {
        run(
          `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(
            message,
          )} }))`,
        );
      },
    }),
    [run],
  );

  // Web → RN 메시지 수신
  useEffect(() => {
    if (!onMessage) {
      return;
    }
    const handle = (event: MessageEvent) => {
      // 다른 iframe·확장 프로그램이 보낸 메시지를 걸러냅니다.
      if (
        event.source !== frameRef.current?.contentWindow ||
        typeof event.data !== 'object' ||
        event.data === null ||
        (event.data as { channel?: string }).channel !== BRIDGE_CHANNEL
      ) {
        return;
      }
      onMessage({
        nativeEvent: { data: String((event.data as { data: unknown }).data) },
      });
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [onMessage]);

  const handleLoad = useCallback(() => {
    loaded.current = true;
    // 로드 전에 쌓인 코드를 순서대로 실행합니다.
    const queued = pending.current;
    pending.current = [];
    queued.forEach(run);
    onLoadEnd?.();
  }, [onLoadEnd, run]);

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={frameRef}
        title="webview"
        srcDoc={srcDoc}
        src={srcDoc ? undefined : source?.uri}
        onLoad={handleLoad}
        style={iframeStyle}
        // 지도 SDK 가 스크립트를 돌리고 위치 정보를 쓰려면 필요합니다.
        // allow-same-origin 이 있어야 injectJavaScript 가 동작합니다.
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="geolocation"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default WebView;
