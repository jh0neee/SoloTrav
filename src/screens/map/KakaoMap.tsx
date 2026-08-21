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
import type { SearchPoi, SearchStatus } from './searchTypes';

/**
 * react-native-webview 14.0.1의 TypeScript 타입 정의 오류를 우회하기 위한 코드
 */
type WebViewInstance = InstanceType<typeof RNWebView>;
const WebView = RNWebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebViewInstance> }
>;

export type SearchResponse = { items: SearchPoi[]; status: SearchStatus };

export type KakaoMapHandle = {
  /** 현위치로 지도 이동 */
  moveToMyLocation: () => void;
  /** 한 단계 확대 */
  zoomIn: () => void;
  /** 한 단계 축소 */
  zoomOut: () => void;
  /** 카카오 장소 키워드 검색. 지도가 아직 안 떴으면 빈 결과를 돌려줍니다. */
  search: (query: string) => Promise<SearchResponse>;
  /** 검색 결과 마커 표시 (fit=true 면 전체가 보이도록 화면을 맞춥니다) */
  showSearchMarkers: (items: SearchPoi[], fit?: boolean) => void;
  /** 검색 결과 마커 제거 */
  clearSearchMarkers: () => void;
  /** 검색 결과 마커 강조 + 해당 위치로 이동 */
  selectSearchMarker: (id: string | null) => void;
  /** 임의 좌표로 이동 */
  moveTo: (lat: number, lng: number, level?: number) => void;
};

type Props = {
  category: PlaceCategory;
  selectedId: string | null;
  /** 측위된 현위치. 바뀌면 지도의 파란 점도 따라 옮겨집니다. */
  myLocation: { lat: number; lng: number };
  onMarkerPress: (id: string) => void;
  onSearchMarkerPress: (id: string) => void;
  onMapPress: () => void;
};

/** 검색 요청은 비동기라 reqId 로 응답을 짝지어 줍니다. */
const SEARCH_TIMEOUT_MS = 8000;

const KakaoMap = forwardRef<KakaoMapHandle, Props>(function KakaoMapView(
  {
    category,
    selectedId,
    myLocation,
    onMarkerPress,
    onSearchMarkerPress,
    onMapPress,
  },
  ref,
) {
  const webRef = useRef<WebViewInstance>(null);
  const [ready, setReady] = useState(false);

  // 진행 중인 검색 요청: reqId -> resolve
  const pendingSearch = useRef(new Map<number, (r: SearchResponse) => void>());
  const reqSeq = useRef(0);
  const readyRef = useRef(false);

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

    zoomIn: () => run('window.__zoomIn && window.__zoomIn()'),
    zoomOut: () => run('window.__zoomOut && window.__zoomOut()'),

    search: (query: string) =>
      new Promise<SearchResponse>(resolve => {
        // 지도가 아직 안 떴으면 전역 함수도 없습니다.
        if (!readyRef.current) {
          resolve({ items: [], status: 'ERROR' });
          return;
        }
        const reqId = ++reqSeq.current;
        let settled = false;
        const finish = (response: SearchResponse) => {
          if (settled) return;
          settled = true;
          pendingSearch.current.delete(reqId);
          resolve(response);
        };
        pendingSearch.current.set(reqId, finish);
        // 응답이 영영 안 오는 경우(네트워크 끊김 등) 화면이 계속 로딩에 머물지 않도록
        setTimeout(() => finish({ items: [], status: 'ERROR' }), SEARCH_TIMEOUT_MS);
        run(`window.__search(${JSON.stringify(query)}, ${reqId})`);
      }),

    showSearchMarkers: (items: SearchPoi[], fit = true) =>
      run(`window.__showSearchMarkers(${JSON.stringify(items)}, ${fit})`),

    clearSearchMarkers: () => run('window.__clearSearchMarkers()'),

    selectSearchMarker: (id: string | null) =>
      run(`window.__selectSearchMarker(${JSON.stringify(id)})`),

    moveTo: (lat: number, lng: number, level?: number) =>
      run(`window.__moveTo(${lat}, ${lng}, ${level ?? 'undefined'})`),
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

  // 측위 결과가 늦게 도착해도 ready 이후 한 번 더 흘려보내 파란 점을 맞춥니다.
  useEffect(() => {
    if (!ready) return;
    run(`window.__setMyLocation(${myLocation.lat}, ${myLocation.lng})`);
  }, [ready, myLocation, run]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: {
        type?: string;
        id?: string;
        message?: string;
        reqId?: number;
        items?: SearchPoi[];
        status?: SearchStatus;
      };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        return; // 규약 외 메시지는 무시
      }

      switch (payload.type) {
        case 'ready':
          readyRef.current = true;
          setReady(true);
          break;
        case 'markerPress':
          if (payload.id) onMarkerPress(payload.id);
          break;
        case 'searchMarkerPress':
          if (payload.id) onSearchMarkerPress(payload.id);
          break;
        case 'mapPress':
          onMapPress();
          break;
        case 'searchResult': {
          const resolve =
            payload.reqId != null
              ? pendingSearch.current.get(payload.reqId)
              : undefined;
          // 타임아웃으로 이미 정리된 요청이면 조용히 버립니다.
          resolve?.({
            items: payload.items ?? [],
            status: payload.status ?? 'ERROR',
          });
          break;
        }
        case 'error':
          console.warn('[KakaoMap]', payload.message);
          break;
      }
    },
    [onMarkerPress, onSearchMarkerPress, onMapPress],
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
    fontWeight: '600',
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
