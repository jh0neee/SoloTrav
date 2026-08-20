/**
 * 지도 검색 오버레이 — 상단 검색바를 누르면 지도 위를 덮으며 열립니다.
 *
 * 결과는 두 갈래를 합쳐 보여 줍니다.
 *  1) 관광정보(TourAPI) 검색 결과 — 상세 정보가 붙는 관광 콘텐츠
 *  2) 카카오 장소 검색 결과 — 편의점·약국 등 그 외 모든 POI
 *
 * 두 검색은 같은 디바운스 타이밍에 나란히 나갑니다. 한쪽이 실패해도 다른 쪽
 * 결과는 그대로 보여 줍니다.
 *
 * 입력은 350ms 디바운스하고, 응답이 늦게 도착해 이전 결과가 덮어쓰는 일이 없도록
 * 마지막 질의어를 ref 로 붙들어 비교합니다.
 *
 * ⚠️ TextInput 은 일부러 **비제어(uncontrolled)** 로 둡니다.
 * value 를 매 타이핑마다 되돌려 주면 한글 조합 중(예: ㅎ→하→한) 네이티브 입력기의
 * 조합 상태가 초기화되어 글자가 깨지거나 자음/모음이 분리됩니다.
 * 그래서 입력값은 typedRef 로만 들고 있고, 화면 상태(query)는 디바운스 뒤에만 갱신합니다.
 * 코드에서 입력칸을 채워야 할 때(최근 검색어 탭)는 key 를 바꿔 리마운트하고,
 * 비울 때는 명령형 API 인 clear() 를 씁니다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Chevron,
  PinIcon,
  SearchIcon,
  ShieldIcon,
} from '../../components/icons/UiIcons';
import { colors } from '../../theme/colors';
import { tourApi } from '../../api/tourApi';
import {
  TOUR_CATEGORY_LABEL,
  type TourPlace,
} from '../../types/tourPlace';
import type { SearchPoi, SearchStatus } from './searchTypes';
import { formatDistance } from './searchTypes';

const DEBOUNCE_MS = 350;
const MAX_RECENT = 8;

/**
 * 최근 검색어. AsyncStorage 를 아직 안 쓰므로 앱을 완전히 종료하면 사라집니다.
 * (저장소를 붙일 때 이 배열만 교체하면 됩니다.)
 */
let recentKeywords: string[] = [];

function pushRecent(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return;
  recentKeywords = [
    trimmed,
    ...recentKeywords.filter(k => k !== trimmed),
  ].slice(0, MAX_RECENT);
}

/** 관광정보 검색은 목록에 너무 길게 늘어지지 않게 위에서 몇 건만 보여 줍니다. */
const TOUR_HIT_LIMIT = 8;

type Props = {
  visible: boolean;
  /** 카카오 장소 검색 실행 — KakaoMap 핸들의 search 를 그대로 받습니다. */
  onSearch: (query: string) => Promise<{ items: SearchPoi[]; status: SearchStatus }>;
  /** 관광 콘텐츠 선택 */
  onSelectPlace: (place: TourPlace) => void;
  /** 카카오 POI 선택 — 현재 결과 목록 전체를 함께 넘겨 지도에 마커를 찍습니다. */
  onSelectPoi: (poi: SearchPoi, all: SearchPoi[], query: string) => void;
  /** 키보드 검색 버튼(제출) — 결과 전체를 지도에 표시 */
  onSubmit: (items: SearchPoi[], query: string) => void;
  onClose: () => void;
};

function MapSearchOverlay({
  visible,
  onSearch,
  onSelectPlace,
  onSelectPoi,
  onSubmit,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  /** 디바운스를 거쳐 확정된 검색어. 목록 렌더링과 검색에만 씁니다. */
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pois, setPois] = useState<SearchPoi[]>([]);
  const [status, setStatus] = useState<SearchStatus>('OK');

  /** 사용자가 방금 친 원문 (조합 중인 글자 포함) — 리렌더를 일으키지 않습니다. */
  const typedRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 응답 도착 시점에 아직 유효한 질의어인지 확인하는 용도
  const latestQuery = useRef('');

  /** 코드로 입력칸을 채울 때만 올립니다 — 값이 바뀌면 TextInput 이 리마운트됩니다. */
  const [inputSeed, setInputSeed] = useState(0);
  const seedTextRef = useRef('');

  /** 관광정보(TourAPI) 검색 결과 */
  const [tourHits, setTourHits] = useState<TourPlace[]>([]);

  const trimmed = query.trim();

  // 열릴 때마다 입력 상태를 비웁니다. (오버레이가 통째로 언마운트되므로 입력칸은 자동으로 빕니다)
  useEffect(() => {
    if (!visible) return;
    typedRef.current = '';
    seedTextRef.current = '';
    latestQuery.current = '';
    setQuery('');
    setPois([]);
    setTourHits([]);
    setStatus('OK');
    setLoading(false);
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [visible]);

  // 디바운스 타이머 정리
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  /**
   * 타이핑 처리 — 여기서는 state 를 건드리지 않습니다.
   * 조합 중에 리렌더가 일어나면 한글 입력이 깨지기 때문입니다.
   */
  const handleChangeText = useCallback((text: string) => {
    typedRef.current = text;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(text), DEBOUNCE_MS);
  }, []);

  // 확정된 검색어로 카카오 검색
  useEffect(() => {
    if (!visible) return;
    latestQuery.current = trimmed;

    if (trimmed.length < 2) {
      setPois([]);
      setTourHits([]);
      setStatus('OK');
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    onSearch(trimmed).then(result => {
      // 이미 다음 글자를 친 뒤라면 늦게 온 응답은 버립니다.
      if (!alive || latestQuery.current !== trimmed) return;
      setPois(result.items);
      setStatus(result.status);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [visible, trimmed, onSearch]);

  // 관광정보 검색 — 카카오 검색과 나란히 나가고, 실패하면 조용히 비웁니다.
  useEffect(() => {
    if (!visible || trimmed.length < 2) return;

    const controller = new AbortController();
    tourApi
      .searchKeyword(trimmed, { rows: TOUR_HIT_LIMIT }, controller.signal)
      .then(page => {
        if (controller.signal.aborted || latestQuery.current !== trimmed) return;
        setTourHits(page.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTourHits([]);
      });

    return () => controller.abort();
  }, [visible, trimmed]);

  /** 최근 검색어를 눌렀을 때 — 입력칸을 리마운트해 값을 채웁니다. */
  const fillInput = useCallback((text: string) => {
    typedRef.current = text;
    seedTextRef.current = text;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputSeed(seed => seed + 1);
    setQuery(text);
  }, []);

  const clearInput = useCallback(() => {
    typedRef.current = '';
    seedTextRef.current = '';
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.clear();
    inputRef.current?.focus();
    setQuery('');
  }, []);

  const handleSubmit = useCallback(() => {
    const text = typedRef.current.trim();
    if (!text) return;
    pushRecent(text);
    // 디바운스가 아직 안 끝났으면 먼저 검색부터 확정하고, 결과는 사용자가 고르게 둡니다.
    if (text !== trimmed) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setQuery(text);
      return;
    }
    Keyboard.dismiss();
    if (pois.length) onSubmit(pois, text);
  }, [trimmed, pois, onSubmit]);

  const handlePlace = useCallback(
    (place: TourPlace) => {
      pushRecent(place.title);
      onSelectPlace(place);
    },
    [onSelectPlace],
  );

  const handlePoi = useCallback(
    (poi: SearchPoi) => {
      pushRecent(trimmed || poi.name);
      onSelectPoi(poi, pois, trimmed);
    },
    [onSelectPoi, pois, trimmed],
  );

  if (!visible) return null;

  const showEmpty =
    trimmed.length >= 2 &&
    !loading &&
    tourHits.length === 0 &&
    pois.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* 검색 입력 */}
      <View style={styles.searchRow}>
        <Pressable
          style={styles.backButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="검색 닫기">
          <Chevron direction="left" color={colors.textPrimary} size={18} />
        </Pressable>

        <View style={styles.searchBar}>
          <SearchIcon color={colors.textSecondary} size={18} />
          {/* value 를 주지 않는 비제어 입력 — 파일 상단 주석 참고 (한글 조합 보호) */}
          <TextInput
            key={inputSeed}
            ref={inputRef}
            defaultValue={seedTextRef.current}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmit}
            placeholder="장소, 주소, 숙소를 검색해 보세요"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
          />
          {query.length > 0 && (
            <Pressable
              onPress={clearInput}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="입력 지우기">
              <View style={styles.clearButton}>
                <Text style={styles.clearButtonText}>×</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}>
        {/* 입력 전 — 최근 검색어 + 앱 등록 장소 */}
        {trimmed.length === 0 && (
          <>
            {recentKeywords.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>최근 검색어</Text>
                <View style={styles.recentRow}>
                  {recentKeywords.map(keyword => (
                    <Pressable
                      key={keyword}
                      style={styles.recentChip}
                      onPress={() => fillInput(keyword)}
                      accessibilityRole="button">
                      <Text style={styles.recentChipText}>{keyword}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.hint}>
              가고 싶은 곳이나 지역 이름을 입력해 보세요.
            </Text>
          </>
        )}

        {/* 입력 중 — 관광정보 우선, 그 아래 카카오 결과 */}
        {trimmed.length > 0 && (
          <>
            {tourHits.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>관광정보</Text>
                {tourHits.map(place => (
                  <PlaceRow
                    key={place.id}
                    place={place}
                    onPress={() => handlePlace(place)}
                  />
                ))}
              </>
            )}

            {trimmed.length < 2 && tourHits.length === 0 && (
              <Text style={styles.hint}>두 글자 이상 입력해 주세요.</Text>
            )}

            {loading && (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.textSecondary} />
              </View>
            )}

            {!loading && pois.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>장소 검색 결과</Text>
                {pois.map((poi, index) => (
                  <PoiRow
                    key={poi.id}
                    poi={poi}
                    index={index}
                    onPress={() => handlePoi(poi)}
                  />
                ))}
              </>
            )}

            {showEmpty && (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {status === 'ERROR'
                    ? '검색을 하지 못했습니다'
                    : '검색 결과가 없어요'}
                </Text>
                <Text style={styles.emptyText}>
                  {status === 'ERROR'
                    ? '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
                    : '다른 키워드로 검색해 보세요.'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** 관광 콘텐츠 한 줄 — 방패 아이콘 + 카테고리 배지 */
function PlaceRow({ place, onPress }: { place: TourPlace; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={[styles.rowIcon, styles.rowIconSafe]}>
        <ShieldIcon color={colors.safeText} size={18} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {place.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {place.address}
        </Text>
      </View>
      <View style={styles.rowBadge}>
        <Text style={styles.rowBadgeText}>
          {TOUR_CATEGORY_LABEL[place.category]}
        </Text>
      </View>
    </Pressable>
  );
}

/** 카카오 POI 한 줄 — 지도 마커 번호와 같은 숫자를 붙입니다 */
function PoiRow({
  poi,
  index,
  onPress,
}: {
  poi: SearchPoi;
  index: number;
  onPress: () => void;
}) {
  const distance = formatDistance(poi.distance);
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowIndex}>
        <Text style={styles.rowIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {poi.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {poi.roadAddress || poi.address}
        </Text>
      </View>
      <View style={styles.rowMeta}>
        {poi.category ? (
          <Text style={styles.rowCategory} numberOfLines={1}>
            {poi.category}
          </Text>
        ) : null}
        {distance ? (
          <View style={styles.rowDistance}>
            <PinIcon color={colors.textSecondary} size={12} />
            <Text style={styles.rowDistanceText}>{distance}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    // RN 0.86 에서 StyleSheet.absoluteFillObject 가 제거되어 absoluteFill 을 씁니다.
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  hint: {
    paddingHorizontal: 20,
    paddingTop: 18,
    fontSize: 13,
    color: colors.textSecondary,
  },

  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  recentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconSafe: {
    backgroundColor: colors.safeBg,
  },
  rowIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bonusBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIndexText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.bonusText,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowBadge: {
    backgroundColor: colors.safeBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },
  rowBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.safeText,
  },
  rowMeta: {
    alignItems: 'flex-end',
    maxWidth: 92,
  },
  rowCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rowDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  rowDistanceText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  loading: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default MapSearchOverlay;
