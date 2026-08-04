/**
 * 카카오맵 WebView 래퍼.
 * HTML 은 최초 1회만 만들어 두고(useMemo), 이후 변경은 injectJavaScript 로 전달합니다.
 * — HTML source 를 바꾸면 WebView 가 통째로 리로드되어 지도 위치가 초기화되기 때문입니다.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import RNWebView, {
  type WebViewMessageEvent,
  type WebViewProps,
} from 'react-native-webview';
import { KAKAO_WEBVIEW_ORIGIN, isKakaoKeyConfigured } from '../../config/kakao';
import {
  MAP_CENTER,
  MY_LOCATION,
  PLACES,
  type PlaceCategory,
} from '../../data/places';
import { colors } from '../../theme/colors';
import { buildKakaoMapHtml } from './kakaoMapHtml';

/**
 * react-native-webview 14.0.1의 TypeScript 타입 정의 오류를 우회하기 위한 코드
 */
type WebViewInstance = InstanceType<typeof RNWebView>;
const WebView = RNWebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebViewInstance> }
>;

export type KakaoMapHandle = {
  /** 현위치로 지도 이동 */
  moveToMyLocation: () => void;
};

type Props = {
  category: PlaceCategory;
  selectedId: string | null;
  onMarkerPress: (id: string) => void;
  onMapPress: () => void;
};

const KakaoMap = forwardRef<KakaoMapHandle, Props>(function KakaoMapView(
  { category, selectedId, onMarkerPress, onMapPress },
  ref,
) {
  const webRef = useRef<WebViewInstance>(null);
  const [ready, setReady] = useState(false);

  // HTML 은 최초 1회만 만듭니다. 최초 카테고리만 ref 로 붙잡아 둡니다.
  const initialCategoryRef = useRef(category);
  const html = useMemo(
    () =>
      buildKakaoMapHtml({
        places: PLACES,
        center: MAP_CENTER,
        myLocation: MY_LOCATION,
        initialCategory: initialCategoryRef.current,
      }),
    [],
  );

  /** WebView 안에서 JS 실행. iOS 경고 방지를 위해 끝에 true; 를 붙입니다. */
  const run = useCallback((code: string) => {
    webRef.current?.injectJavaScript(`${code}; true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    moveToMyLocation: () =>
      run('window.__moveToMyLocation && window.__moveToMyLocation()'),
  }));

  // 지도 로드가 끝난 뒤에만 주입해야 합니다 (그 전엔 전역 함수가 아직 없음).
  useEffect(() => {
    if (!ready) return;
    run(`window.__setCategory(${JSON.stringify(category)})`);
  }, [ready, category, run]);

  useEffect(() => {
    if (!ready) return;
    run(`window.__selectPlace(${JSON.stringify(selectedId)})`);
  }, [ready, selectedId, run]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: { type?: string; id?: string; message?: string };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        return; // 규약 외 메시지는 무시
      }

      switch (payload.type) {
        case 'ready':
          setReady(true);
          break;
        case 'markerPress':
          if (payload.id) onMarkerPress(payload.id);
          break;
        case 'mapPress':
          onMapPress();
          break;
        case 'error':
          console.warn('[KakaoMap]', payload.message);
          break;
      }
    },
    [onMarkerPress, onMapPress],
  );

  // 키를 아직 안 넣었으면 빈 회색 지도 대신 무엇을 해야 하는지 알려줍니다.
  if (!isKakaoKeyConfigured) {
    return (
      <View style={styles.guide}>
        <Text style={styles.guideTitle}>카카오맵 키가 필요합니다</Text>
        <Text style={styles.guideText}>
          {'1. developers.kakao.com 에서 JavaScript 키를 발급받으세요.\n' +
            '2. src/config/kakao.ts 의 KAKAO_JS_KEY 에 붙여넣으세요.\n' +
            `3. 플랫폼 > Web 사이트 도메인에 ${KAKAO_WEBVIEW_ORIGIN} 을 등록하세요.`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: KAKAO_WEBVIEW_ORIGIN }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        // 지도 자체가 제스처를 처리하므로 WebView 스크롤은 끕니다.
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        // 안드로이드에서 지도 렌더링이 끊기지 않도록
        androidLayerType="hardware"
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        style={styles.web}
      />
      {!ready && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    // RN 0.86 에서 StyleSheet.absoluteFillObject 가 제거되어 absoluteFill 을 씁니다.
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  guide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.cream,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  guideText: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});

export default KakaoMap;
