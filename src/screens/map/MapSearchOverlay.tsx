/**
 * 지도 검색 오버레이 — 상단 검색바를 누르면 지도 위를 덮으며 열립니다.
 *
 * 지역은 내부 목록에서 즉시 찾아 최상단에 표시합니다. 장소는 두 검색을 함께 씁니다.
 *  1) 관광정보(TourAPI) 검색 결과 — 상세 정보가 붙는 관광 콘텐츠
 *  2) 카카오 장소 검색 결과 — 편의점·약국 등 그 외 모든 POI
 *
 * 두 검색은 같은 디바운스 타이밍에 나란히 나갑니다. 한쪽이 실패해도 다른 쪽
 * 결과는 그대로 보여 줍니다.
 *
 * 입력은 350ms 디바운스하고, 응답이 늦게 도착해 이전 결과가 덮어쓰는 일이 없도록
 * 입력 버전을 비교합니다. 제출 시에는 해당 입력의 응답만 기다려 적용합니다.
 *
 * ⚠️ TextInput 은 일부러 **비제어(uncontrolled)** 로 둡니다.
 * value 를 매 타이핑마다 되돌려 주면 한글 조합 중(예: ㅎ→하→한) 네이티브 입력기의
 * 조합 상태가 초기화되어 글자가 깨지거나 자음/모음이 분리됩니다.
 * 입력의 value를 다시 전달하지 않고 목록 상태만 갱신합니다.
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
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';
import { Chevron, SearchIcon } from '../../components/icons/UiIcons';
import PlaceResultRow from '../../components/travel/PlaceResultRow';
import { colors } from '../../theme/colors';
import { useMapSearch } from './useMapSearch';
import { TOUR_CATEGORY_LABEL, formatTourDistance } from '../../types/tourPlace';
import { type MappableTourContent } from '../../types/travel';
import type { SearchPoi, SearchStatus } from './searchTypes';
import { formatDistance } from './searchTypes';

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

type Props = {
  visible: boolean;
  /** 카카오 장소 검색 실행 — KakaoMap 핸들의 search 를 그대로 받습니다. */
  onSearch: (
    query: string,
  ) => Promise<{ items: SearchPoi[]; status: SearchStatus }>;
  /** 관광 콘텐츠 선택 */
  onSelectPlace: (place: MappableTourContent) => void;
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

  const [inputSeed, setInputSeed] = useState(0);
  const seedTextRef = useRef('');
  const {
    query,
    regionResult,
    pois,
    tourHits,
    loading,
    tourLoading,
    status,
    changeText,
    submit,
    invalidate,
  } = useMapSearch({
    visible,
    onSearch,
    onSubmit,
    onRegion: (region, text) => onSelectPoi(region, [region], text),
  });
  const trimmed = query.trim();

  useEffect(() => {
    if (!visible) {
      Keyboard.dismiss();
      inputRef.current?.blur();
      return;
    }
    seedTextRef.current = '';
    inputRef.current?.clear();
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [visible]);

  const fillInput = useCallback(
    (text: string) => {
      seedTextRef.current = text;
      setInputSeed(seed => seed + 1);
      changeText(text);
    },
    [changeText],
  );
  const clearInput = useCallback(() => {
    seedTextRef.current = '';
    inputRef.current?.clear();
    inputRef.current?.focus();
    changeText('');
  }, [changeText]);
  const handleClose = useCallback(() => {
    invalidate();
    Keyboard.dismiss();
    inputRef.current?.blur();
    onClose();
  }, [invalidate, onClose]);
  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    pushRecent(trimmed);
    submit();
  }, [trimmed, submit]);
  const handlePlace = useCallback(
    (place: MappableTourContent) => {
      invalidate();
      Keyboard.dismiss();
      inputRef.current?.blur();
      pushRecent(place.title);
      onSelectPlace(place);
    },
    [invalidate, onSelectPlace],
  );
  const handlePoi = useCallback(
    (poi: SearchPoi) => {
      invalidate();
      Keyboard.dismiss();
      inputRef.current?.blur();
      pushRecent(trimmed || poi.name);
      onSelectPoi(poi, poi.id.startsWith('region:') ? [poi] : pois, trimmed);
    },
    [invalidate, onSelectPoi, pois, trimmed],
  );

  if (!visible) return null;

  const showEmpty =
    trimmed.length >= 2 &&
    !loading &&
    !tourLoading &&
    !regionResult &&
    tourHits.length === 0 &&
    pois.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* 검색 입력 */}
      <View style={styles.searchRow}>
        <Pressable
          style={styles.backButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="검색 닫기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={18} />
        </Pressable>

        <View style={styles.searchBar}>
          <SearchIcon color={colors.textSecondary} size={18} />
          {/* value 를 주지 않는 비제어 입력 — 파일 상단 주석 참고 (한글 조합 보호) */}
          <TextInput
            key={inputSeed}
            ref={inputRef}
            defaultValue={seedTextRef.current}
            onChangeText={changeText}
            onSubmitEditing={handleSubmit}
            placeholder="혼자 갈 장소, 주소, 숙소를 검색해 보세요"
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
              accessibilityLabel="입력 지우기"
            >
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
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (insets.bottom || 16) + 48 },
        ]}
      >
        {regionResult && (
          <>
            <Text style={styles.sectionTitle}>지역</Text>
            <View style={styles.resultRow}>
              <PlaceResultRow
                title={regionResult.name}
                address={regionResult.address}
                categoryLabel="지역 둘러보기"
                imageUrl={null}
                distanceLabel=""
                onPress={() => handlePoi(regionResult)}
              />
            </View>
          </>
        )}
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
                      accessibilityRole="button"
                    >
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

        {/* 지역 아래에 관광정보와 카카오 장소 결과를 표시합니다. */}
        {trimmed.length > 0 && (
          <>
            {tourHits.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>관광정보</Text>
                {tourHits.map(place => (
                  <PlaceRow
                    key={place.contentId}
                    place={place}
                    onPress={() => handlePlace(place)}
                  />
                ))}
              </>
            )}

            {trimmed.length < 2 && tourHits.length === 0 && (
              <Text style={styles.hint}>두 글자 이상 입력해 주세요.</Text>
            )}

            {(loading || tourLoading) && (
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

/** 관광 콘텐츠 한 줄 — 홈 검색과 같은 사진·배지·주소 순서 */
function PlaceRow({
  place,
  onPress,
}: {
  place: MappableTourContent;
  onPress: () => void;
}) {
  return (
    <View style={styles.resultRow}>
      <PlaceResultRow
        title={place.title}
        address={place.address}
        categoryLabel={TOUR_CATEGORY_LABEL[place.category]}
        imageUrl={place.imageUrl}
        distanceLabel={formatTourDistance(place.distance)}
        onPress={onPress}
      />
    </View>
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
    <View style={styles.resultRow}>
      <PlaceResultRow
        title={poi.name}
        address={poi.roadAddress || poi.address}
        categoryLabel={poi.category || '일반 장소'}
        imageUrl={null}
        distanceLabel={distance}
        index={index + 1}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // RN 0.86 에서 StyleSheet.absoluteFillObject 가 제거되어 absoluteFill 을 씁니다.
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 100,
    elevation: 10,
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
    fontWeight: '600',
    color: colors.textSecondary,
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '600',
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

  resultRow: {
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default MapSearchOverlay;
