/**
 * 지도 화면 — 카카오맵 위에 검색바·필터칩·현위치·SOS·장소 바텀시트를 얹습니다.
 * 지도는 절대배치로 화면을 꽉 채우고, 나머지 UI 는 그 위에 떠 있습니다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
} from '../../components/icons/UiIcons';
import { SirenIcon } from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import KakaoMap, { type KakaoMapHandle } from './KakaoMap';
import MapSearchOverlay from './MapSearchOverlay';
import TourPlaceSheet from './TourPlaceSheet';
import PoiCard from './PoiCard';
import SosScreen from '../sos/SosScreen';
import { useCurrentLocation } from '../../location/useCurrentLocation';
import {
  roughDistance,
  useNearbyPlaces,
  type Coords,
} from '../../map/useNearbyPlaces';
import { useRegionSafety } from '../../map/useRegionSafety';
import {
  FESTIVAL_RANGES,
  FESTIVAL_RANGE_LABEL,
  useNearbyFestivals,
  type FestivalRange,
} from '../../map/useNearbyFestivals';
import {
  TOUR_CATEGORY_LABEL,
  type TourCategory,
  type TourPlace,
} from '../../types/tourPlace';
import type { SearchPoi } from './searchTypes';

type IconComponent = React.ComponentType<{ color: string; size?: number }>;

/**
 * 지도 상단 필터 칩.
 * 관광정보 API 의 contentTypeId 와 1:1로 대응하므로, 칩을 늘리려면
 * types/tourPlace.ts 의 CATEGORY_TO_CONTENT_TYPE 에 있는 것 중에서 고르면 됩니다.
 */
const CATEGORIES: TourCategory[] = [
  'attraction',
  'food',
  'culture',
  'stay',
  'festival',
];

const CATEGORY_ICON: Record<TourCategory, IconComponent> = {
  attraction: ShieldIcon,
  food: CommentIcon,
  culture: PersonIcon,
  stay: PersonIcon,
  festival: CommentIcon,
  course: PinIcon,
  leports: PersonIcon,
  shopping: CommentIcon,
};

/**
 * 지도를 이 거리(m) 이상 끌고 가면 "이 지역에서 재검색" 을 띄웁니다.
 * 기본 검색 반경(5km)의 절반 — 반경이 겹치는 동안은 굳이 다시 부르지 않습니다.
 */
const RESEARCH_THRESHOLD_M = 2500;

function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<KakaoMapHandle>(null);

  // 현위치 — 지도 파란 점과 비상벨의 안전시설 조회가 같은 좌표를 씁니다.
  const { coords: myLocation, status: locationStatus } = useCurrentLocation();

  const [category, setCategory] = useState<TourCategory>('attraction');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * 마커를 조회한 기준점. 지도를 끌고 다녀도 여기는 그대로 두었다가
   * "이 지역에서 재검색" 을 눌렀을 때만 옮깁니다.
   */
  const [queryCenter, setQueryCenter] = useState<Coords>(myLocation);
  /** 지도가 지금 보고 있는 중심 (idle 마다 갱신) */
  const [mapCenter, setMapCenter] = useState<Coords>(myLocation);

  // 측위가 끝나면 조회 기준점을 실제 현위치로 한 번 옮깁니다.
  useEffect(() => {
    if (locationStatus !== 'granted') return;
    setQueryCenter(myLocation);
    setMapCenter(myLocation);
  }, [locationStatus, myLocation]);

  /** 축제 레이어의 기간 필터 (축제 칩을 골랐을 때만 보입니다) */
  const [festivalRange, setFestivalRange] = useState<FestivalRange>('now');
  const isFestival = category === 'festival';

  /*
   * 축제는 다른 API 를 씁니다.
   * 관광정보 조회(locationBasedList)로는 contentTypeId=15 결과가 거의 0건이고,
   * 축제 API 는 지역으로 좁힐 수 없어 전국을 받아 거리로 거릅니다.
   */
  const {
    places: tourPlaces,
    loading: tourLoading,
    error: tourError,
    retry: retryTour,
  } = useNearbyPlaces(queryCenter, category, !isFestival);

  const {
    places: festivalPlaces,
    loading: festivalLoading,
    error: festivalError,
    retry: retryFestivals,
  } = useNearbyFestivals(queryCenter, festivalRange);

  const places = isFestival ? festivalPlaces : tourPlaces;
  const placesLoading = isFestival ? festivalLoading : tourLoading;
  const placesError = isFestival ? festivalError : tourError;
  const retryPlaces = isFestival ? retryFestivals : retryTour;

  /**
   * 상단 안전 배지 — 가장 가까운 마커의 주소에서 지역을 읽습니다.
   * 축제 레이어는 반경이 50km 라 가장 가까운 축제가 옆 시군구일 수 있는데,
   * 목록이 거리순이라 어차피 "지금 보고 있는 곳에서 가장 가까운 지역"이 나옵니다.
   */
  const safetyBadge = useRegionSafety(places);

  // 비상벨 화면 — 하단 탭바까지 덮는 전체 화면으로 열립니다.
  const [sosOpen, setSosOpen] = useState(false);

  // 검색 상태 — 오버레이 표시 / 지도에 찍힌 결과 / 그중 선택된 항목
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPoi[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const selectedPlace = useMemo(
    () => places.find(place => place.id === selectedId) ?? null,
    [places, selectedId],
  );

  /** 지도를 충분히 멀리 옮겼을 때만 재검색 버튼을 띄웁니다. */
  const canResearch =
    roughDistance(mapCenter, queryCenter) > RESEARCH_THRESHOLD_M;

  /**
   * 상단 UI 아래에서 시작하는 요소들(우측 버튼·재검색)의 y 좌표.
   * 축제 기간 칩이 한 줄 더 생기면 그만큼 밀어 내립니다.
   */
  const topLayerBottom = insets.top + 128 + (isFestival ? 42 : 0);

  const selectedPoiIndex = useMemo(
    () => searchResults.findIndex(poi => poi.id === selectedPoiId),
    [searchResults, selectedPoiId],
  );
  const selectedPoi =
    selectedPoiIndex >= 0 ? searchResults[selectedPoiIndex] : null;

  const handleCategory = useCallback((next: TourCategory) => {
    setCategory(next);
    setSelectedId(null); // 필터가 바뀌면 열려 있던 시트를 닫습니다.
  }, []);

  /** 지금 보고 있는 지역으로 마커를 다시 조회합니다. */
  const handleResearch = useCallback(() => {
    setSelectedId(null);
    setQueryCenter(mapCenter);
  }, [mapCenter]);

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

  /**
   * 관광정보 검색 결과를 고르면 그 좌표를 새 조회 기준점으로 삼습니다.
   * (전국 어디든 검색될 수 있어서, 지도만 옮기면 마커가 하나도 없는 화면이 됩니다.)
   */
  const handleSelectPlace = useCallback((place: TourPlace) => {
    const center = { lat: place.lat, lng: place.lng };
    setSearchQuery(place.title);
    setSearchResults([]);
    setSelectedPoiId(null);
    setSearchOpen(false);
    mapRef.current?.clearSearchMarkers();
    setCategory(place.category); // 다른 필터에 가려 마커가 안 보이는 일을 막습니다
    setQueryCenter(center);
    setMapCenter(center);
    setSelectedId(place.id);
    mapRef.current?.moveTo(place.lat, place.lng);
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
        places={places}
        category={category}
        selectedId={selectedId}
        myLocation={myLocation}
        onMarkerPress={handleMarkerPress}
        onSearchMarkerPress={handleSearchMarkerPress}
        onMapPress={handleMapPress}
        onCenterChanged={setMapCenter}
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
              {searchQuery ||
                (safetyBadge
                  ? `${safetyBadge.regionName} 주변`
                  : '장소를 검색해 보세요')}
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
            ) : safetyBadge ? (
              // 지역안전지수(범죄·생활안전 평균). 값을 못 받으면 배지를 숨깁니다.
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeBadgeText}>
                  안전 {safetyBadge.letter}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map(key => (
            <FilterChip
              key={key}
              label={TOUR_CATEGORY_LABEL[key]}
              // 선택된 칩만 실제 조회 결과가 있으므로 그때만 개수를 보여 줍니다.
              count={key === category ? places.length : null}
              Icon={CATEGORY_ICON[key]}
              selected={key === category}
              onPress={() => handleCategory(key)}
            />
          ))}
        </ScrollView>

        {/* 축제를 골랐을 때만 뜨는 기간 칩 */}
        {isFestival && (
          <View style={styles.rangeRow}>
            {FESTIVAL_RANGES.map(key => {
              const on = key === festivalRange;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setFestivalRange(key);
                    setSelectedId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.rangeChip, on && styles.rangeChipOn]}>
                  <Text style={[styles.rangeText, on && styles.rangeTextOn]}>
                    {FESTIVAL_RANGE_LABEL[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* 우측 플로팅 버튼 */}
      <View
        style={[styles.sideLayer, { top: topLayerBottom }]}
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
          onPress={() => setSosOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="긴급 SOS">
          <SirenIcon color={colors.textOnPrimary} size={22} weight="fill" />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      )}

      {/* 지도를 옮겼을 때의 재검색 버튼 — 상세시트·검색카드에 가리지 않게 숨깁니다 */}
      {canResearch && !selectedPlace && !selectedPoi && (
        <Pressable
          style={[styles.researchButton, { top: topLayerBottom }]}
          onPress={handleResearch}
          accessibilityRole="button"
          accessibilityLabel="이 지역에서 재검색">
          {placesLoading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.researchText}>이 지역에서 재검색</Text>
          )}
        </Pressable>
      )}

      {/* 조회 실패 안내 — 지도는 그대로 두고 다시 시도만 권합니다 */}
      {placesError && !placesLoading && (
        <Pressable
          style={[styles.researchButton, { top: topLayerBottom }]}
          onPress={retryPlaces}
          accessibilityRole="button"
          accessibilityLabel="주변 정보 다시 불러오기">
          <Text style={styles.researchText}>불러오지 못했어요 · 다시 시도</Text>
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

      <TourPlaceSheet place={selectedPlace} onClose={closeSheet} />

      <SosScreen visible={sosOpen} onClose={() => setSosOpen(false)} />

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
  /** null 이면 개수 배지를 그리지 않습니다(아직 조회하지 않은 카테고리). */
  count: number | null;
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
      {count !== null && (
        <Text style={[styles.chipCount, selected && styles.chipCountOn]}>
          {count}
        </Text>
      )}
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

  // 축제 기간 칩 — 카테고리 칩 바로 아래 줄
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeChipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rangeTextOn: {
    color: colors.inkText,
  },

  // 이 지역에서 재검색 — 필터/현위치 버튼과 같은 높이의 중앙 알약 버튼
  researchButton: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 38,
    minWidth: 150,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    // 지도 위에 떠 보이도록 그림자를 줍니다.
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  researchText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default MapScreen;
