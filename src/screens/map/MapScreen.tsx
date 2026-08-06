/**
 * 지도 화면 — 카카오맵 위에 검색바·필터칩·현위치·SOS·장소 바텀시트를 얹습니다.
 * 지도는 절대배치로 화면을 꽉 채우고, 나머지 UI 는 그 위에 떠 있습니다.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Chevron,
  CommentIcon,
  FilterIcon,
  PersonIcon,
  PinIcon,
  SearchIcon,
  ShieldIcon,
  SirenIcon,
} from '../../components/icons/UiIcons';
import { colors } from '../../theme/colors';
import {
  CATEGORY_LABEL,
  PLACES,
  countByCategory,
  type PlaceCategory,
} from '../../data/places';
import KakaoMap, { type KakaoMapHandle } from './KakaoMap';
import MapSearchOverlay from './MapSearchOverlay';
import PlaceBottomSheet from './PlaceBottomSheet';
import PoiCard from './PoiCard';
import type { SearchPoi } from './searchTypes';
import type { Place } from '../../data/places';

type IconComponent = React.ComponentType<{ color: string; size?: number }>;

const CATEGORY_ICON: Record<PlaceCategory, IconComponent> = {
  safe: ShieldIcon,
  solo: PersonIcon,
  review: CommentIcon,
};

const CATEGORIES: PlaceCategory[] = ['safe', 'solo', 'review'];

function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<KakaoMapHandle>(null);

  const [category, setCategory] = useState<PlaceCategory>('safe');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 검색 상태 — 오버레이 표시 / 지도에 찍힌 결과 / 그중 선택된 항목
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPoi[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const selectedPlace = useMemo(
    () => PLACES.find(place => place.id === selectedId) ?? null,
    [selectedId],
  );

  const selectedPoiIndex = useMemo(
    () => searchResults.findIndex(poi => poi.id === selectedPoiId),
    [searchResults, selectedPoiId],
  );
  const selectedPoi =
    selectedPoiIndex >= 0 ? searchResults[selectedPoiIndex] : null;

  const handleCategory = useCallback((next: PlaceCategory) => {
    setCategory(next);
    setSelectedId(null); // 필터가 바뀌면 열려 있던 시트를 닫습니다.
  }, []);

  const handleMarkerPress = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedPoiId(null); // 두 카드가 겹치지 않게 한쪽만 엽니다.
  }, []);

  const handleSearchMarkerPress = useCallback((id: string) => {
    setSelectedId(null);
    setSelectedPoiId(id);
    mapRef.current?.selectSearchMarker(id);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedId(null);
    setSelectedPoiId(null);
  }, []);

  const closeSheet = useCallback(() => setSelectedId(null), []);

  /* ── 검색 ── */

  const runSearch = useCallback(
    (query: string) =>
      mapRef.current?.search(query) ??
      Promise.resolve({ items: [], status: 'ERROR' as const }),
    [],
  );

  /** 검색 결과 마커를 지도에 올리고, 특정 항목이 있으면 강조합니다. */
  const applyResults = useCallback(
    (items: SearchPoi[], query: string, focusId: string | null) => {
      setSearchQuery(query);
      setSearchResults(items);
      setSelectedId(null);
      setSelectedPoiId(focusId);
      setSearchOpen(false);
      // fit 은 개별 선택이 아닐 때만 — 하나를 고른 경우엔 그 자리로 이동합니다.
      mapRef.current?.showSearchMarkers(items, focusId === null);
      if (focusId) mapRef.current?.selectSearchMarker(focusId);
    },
    [],
  );

  const handleSelectPoi = useCallback(
    (poi: SearchPoi, all: SearchPoi[], query: string) =>
      applyResults(all.length ? all : [poi], query || poi.name, poi.id),
    [applyResults],
  );

  const handleSubmitSearch = useCallback(
    (items: SearchPoi[], query: string) => applyResults(items, query, null),
    [applyResults],
  );

  /** 앱 등록 장소를 고르면 검색 마커는 걷어내고 기존 상세 시트를 엽니다. */
  const handleSelectPlace = useCallback((place: Place) => {
    setSearchQuery(place.name);
    setSearchResults([]);
    setSelectedPoiId(null);
    setSearchOpen(false);
    mapRef.current?.clearSearchMarkers();
    setCategory(place.category); // 다른 필터에 가려 마커가 안 보이는 일을 막습니다
    setSelectedId(place.id);
  }, []);

  /** 카드에서 이전/다음 결과로 넘기기 */
  const stepPoi = useCallback(
    (delta: number) => {
      if (!searchResults.length || selectedPoiIndex < 0) return;
      const next =
        (selectedPoiIndex + delta + searchResults.length) % searchResults.length;
      const id = searchResults[next].id;
      setSelectedPoiId(id);
      mapRef.current?.selectSearchMarker(id);
    },
    [searchResults, selectedPoiIndex],
  );

  /** 검색 결과 전체 해제 (검색바의 × 버튼) */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPoiId(null);
    mapRef.current?.clearSearchMarkers();
  }, []);

  const closePoiCard = useCallback(() => {
    setSelectedPoiId(null);
    mapRef.current?.selectSearchMarker(null);
  }, []);

  return (
    <View style={styles.container}>
      <KakaoMap
        ref={mapRef}
        category={category}
        selectedId={selectedId}
        onMarkerPress={handleMarkerPress}
        onSearchMarkerPress={handleSearchMarkerPress}
        onMapPress={handleMapPress}
      />

      {/* 상단 검색바 + 필터칩 — pointerEvents="box-none" 이라야 빈 곳으로 지도 조작이 통과합니다 */}
      <View
        style={[styles.topLayer, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none">
        <View style={styles.searchRow}>
          <Pressable
            style={styles.circleButton}
            accessibilityRole="button"
            accessibilityLabel="뒤로">
            <Chevron direction="left" color={colors.textPrimary} size={18} />
          </Pressable>

          <Pressable
            style={styles.searchBar}
            onPress={() => setSearchOpen(true)}
            accessibilityRole="search"
            accessibilityLabel="장소 검색">
            <SearchIcon color={colors.textSecondary} size={18} />
            <Text style={styles.searchText} numberOfLines={1}>
              {searchQuery || '단양 · 도담삼봉 일대'}
            </Text>
            {searchQuery ? (
              // 검색 중일 때는 안전 등급 자리에 검색 해제 버튼을 둡니다.
              <Pressable
                onPress={clearSearch}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="검색 결과 지우기">
                <View style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>×</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeBadgeText}>안전 A</Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map(key => (
            <FilterChip
              key={key}
              label={CATEGORY_LABEL[key]}
              count={countByCategory(key)}
              Icon={CATEGORY_ICON[key]}
              selected={key === category}
              onPress={() => handleCategory(key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* 우측 플로팅 버튼 */}
      <View
        style={[styles.sideLayer, { top: insets.top + 128 }]}
        pointerEvents="box-none">
        <Pressable
          style={styles.floatButton}
          accessibilityRole="button"
          accessibilityLabel="상세 필터">
          <FilterIcon color={colors.textPrimary} size={18} />
        </Pressable>
        <Pressable
          style={styles.floatButton}
          onPress={() => mapRef.current?.moveToMyLocation()}
          accessibilityRole="button"
          accessibilityLabel="현위치로 이동">
          <PinIcon color={colors.textPrimary} size={20} />
        </Pressable>

        {/* 확대/축소 — 핀치 제스처가 안 먹는 환경(에뮬레이터 등)에서도 쓸 수 있게 둡니다 */}
        <View style={styles.zoomGroup}>
          <Pressable
            style={styles.zoomButton}
            onPress={() => mapRef.current?.zoomIn()}
            accessibilityRole="button"
            accessibilityLabel="확대">
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            style={styles.zoomButton}
            onPress={() => mapRef.current?.zoomOut()}
            accessibilityRole="button"
            accessibilityLabel="축소">
            <Text style={styles.zoomText}>−</Text>
          </Pressable>
        </View>
      </View>

      {/* SOS — 시트나 검색 카드가 열리면 가려지지 않게 숨깁니다 */}
      {!selectedPlace && !selectedPoi && (
        <Pressable
          style={[styles.sos, { bottom: insets.bottom + 96 }]}
          accessibilityRole="button"
          accessibilityLabel="긴급 SOS">
          <SirenIcon color={colors.textOnPrimary} size={20} />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      )}

      {/* 검색 결과가 있는데 아무것도 안 골랐을 때의 요약 배너 */}
      {searchResults.length > 0 && !selectedPoi && !selectedPlace && (
        <View
          style={[styles.resultBanner, { bottom: insets.bottom + 24 }]}
          pointerEvents="none">
          <Text style={styles.resultBannerText}>
            "{searchQuery}" 검색 결과 {searchResults.length}곳
          </Text>
        </View>
      )}

      {selectedPoi && (
        <View style={[styles.poiLayer, { bottom: insets.bottom + 20 }]}>
          <PoiCard
            poi={selectedPoi}
            index={selectedPoiIndex}
            total={searchResults.length}
            onPrev={() => stepPoi(-1)}
            onNext={() => stepPoi(1)}
            onClose={closePoiCard}
          />
        </View>
      )}

      <PlaceBottomSheet place={selectedPlace} onClose={closeSheet} />

      <MapSearchOverlay
        visible={searchOpen}
        onSearch={runSearch}
        onSelectPlace={handleSelectPlace}
        onSelectPoi={handleSelectPoi}
        onSubmit={handleSubmitSearch}
        onClose={() => setSearchOpen(false)}
      />
    </View>
  );
}

type ChipProps = {
  label: string;
  count: number;
  Icon: IconComponent;
  selected: boolean;
  onPress: () => void;
};

/** 아이콘 + 라벨 + 개수 배지를 함께 쓰는 지도 전용 칩 */
function FilterChip({ label, count, Icon, selected, onPress }: ChipProps) {
  const tint = selected ? colors.inkText : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}>
      <Icon color={tint} size={16} />
      <Text style={[styles.chipText, { color: tint }]}>{label}</Text>
      <Text style={[styles.chipCount, selected && styles.chipCountOn]}>
        {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  topLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  gradeBadge: {
    backgroundColor: colors.bonusBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  gradeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bonusText,
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

  chipRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipOff: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipCountOn: {
    color: colors.goldSoft,
  },

  sideLayer: {
    position: 'absolute',
    right: 16,
    gap: 10,
  },
  floatButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },

  zoomGroup: {
    marginTop: 2,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  zoomButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    marginHorizontal: 10,
    backgroundColor: colors.border,
  },
  zoomText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  sos: {
    position: 'absolute',
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  sosText: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },

  poiLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  resultBanner: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(27,34,51,0.9)',
  },
  resultBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkText,
  },
});

export default MapScreen;
