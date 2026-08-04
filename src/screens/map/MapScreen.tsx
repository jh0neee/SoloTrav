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
import PlaceBottomSheet from './PlaceBottomSheet';

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

  const selectedPlace = useMemo(
    () => PLACES.find(place => place.id === selectedId) ?? null,
    [selectedId],
  );

  const handleCategory = useCallback((next: PlaceCategory) => {
    setCategory(next);
    setSelectedId(null); // 필터가 바뀌면 열려 있던 시트를 닫습니다.
  }, []);

  const handleMarkerPress = useCallback((id: string) => setSelectedId(id), []);
  const handleMapPress = useCallback(() => setSelectedId(null), []);
  const closeSheet = useCallback(() => setSelectedId(null), []);

  return (
    <View style={styles.container}>
      <KakaoMap
        ref={mapRef}
        category={category}
        selectedId={selectedId}
        onMarkerPress={handleMarkerPress}
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

          <View style={styles.searchBar}>
            <SearchIcon color={colors.textSecondary} size={18} />
            <Text style={styles.searchText} numberOfLines={1}>
              단양 · 도담삼봉 일대
            </Text>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeBadgeText}>안전 A</Text>
            </View>
          </View>
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
      </View>

      {/* SOS — 시트가 열리면 가려지지 않게 숨깁니다 */}
      {!selectedPlace && (
        <Pressable
          style={[styles.sos, { bottom: insets.bottom + 96 }]}
          accessibilityRole="button"
          accessibilityLabel="긴급 SOS">
          <SirenIcon color={colors.textOnPrimary} size={20} />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      )}

      <PlaceBottomSheet place={selectedPlace} onClose={closeSheet} />
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
});

export default MapScreen;
