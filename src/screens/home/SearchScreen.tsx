/**
 * 키워드 검색 화면 — 홈 히어로의 검색창을 누르면 열립니다.
 *
 * 한국관광공사 키워드 검색(searchKeyword2)을 그대로 씁니다.
 * 상단에서 지역(충북/전국)과 종류(관광지·축제·음식점 …)를 좁힐 수 있습니다.
 *
 * ⚠️ TextInput 은 지도 검색과 같은 이유로 **비제어(uncontrolled)** 입니다.
 * 타이핑마다 value 를 되돌려 주면 한글 조합이 깨져서, 입력값은 ref 로만 들고
 * 있고 화면 상태는 디바운스 뒤에만 갱신합니다. 코드로 입력칸을 채울 때는
 * key 를 바꿔 리마운트하고, 비울 때는 clear() 를 씁니다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron, SearchIcon } from '../../components/icons/UiIcons';
import { SectionState, SpotRow } from '../../components/travel/TravelCards';
import { useSpotSearch } from '../../travel/useSpotSearch';
import { SEARCH_FILTERS, type TourSpot } from '../../types/travel';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;
const MAX_RECENT = 8;

/** 충북 법정동 시도 코드 — 지역 토글의 '충북' 쪽 */
const CHUNGBUK = '43';

/** 검색어 제안 — 아직 서버에 인기 검색어가 없어 기획 고정값입니다 */
const SUGGESTIONS = ['도담삼봉', '단양', '소백산', '청풍호', '속리산', '수옥정'];

/**
 * 최근 검색어. 지도 검색과 마찬가지로 AsyncStorage 를 아직 안 붙여서
 * 앱을 완전히 종료하면 사라집니다. (저장소를 붙일 때 이 배열만 교체하면 됩니다)
 */
let recentKeywords: string[] = [];

function pushRecent(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return;
  }
  recentKeywords = [
    trimmed,
    ...recentKeywords.filter(item => item !== trimmed),
  ].slice(0, MAX_RECENT);
}

type Props = {
  onBack: () => void;
  onSelectSpot: (spot: TourSpot) => void;
};

function SearchScreen({ onBack, onSelectSpot }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  /** 디바운스를 거쳐 확정된 검색어 — 실제 요청은 이 값으로만 나갑니다 */
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState<string>('all');
  const [chungbukOnly, setChungbukOnly] = useState(true);

  /** 조합 중인 글자까지 담긴 원문 — 리렌더를 일으키지 않습니다 */
  const typedRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 최근 검색어를 눌러 입력칸을 채울 때만 올립니다(리마운트 트리거) */
  const [inputSeed, setInputSeed] = useState(0);

  const trimmed = query.trim();
  const isSearching = trimmed.length >= MIN_QUERY_LENGTH;

  const contentTypeId = useMemo(
    () => SEARCH_FILTERS.find(filter => filter.id === filterId)?.contentTypeId,
    [filterId],
  );

  const search = useSpotSearch({
    keyword: isSearching ? trimmed : '',
    contentTypeId,
    regionCode: chungbukOnly ? CHUNGBUK : undefined,
  });

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const handleChangeText = useCallback((text: string) => {
    typedRef.current = text;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => setQuery(text), DEBOUNCE_MS);
  }, []);

  /** 최근 검색어·추천어 탭 — 입력칸을 리마운트해 값을 채웁니다 */
  const fillInput = useCallback((text: string) => {
    typedRef.current = text;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setInputSeed(seed => seed + 1);
    setQuery(text);
    pushRecent(text);
  }, []);

  const clearInput = useCallback(() => {
    typedRef.current = '';
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    inputRef.current?.clear();
    inputRef.current?.focus();
    setQuery('');
  }, []);

  const handleSubmit = useCallback(() => {
    const text = typedRef.current.trim();
    if (!text) {
      return;
    }
    pushRecent(text);
    // 디바운스가 아직 안 끝났으면 검색부터 확정합니다.
    if (text !== trimmed) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setQuery(text);
      return;
    }
    Keyboard.dismiss();
  }, [trimmed]);

  const showEmptyResult =
    isSearching && search.status === 'ready' && search.items.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 검색바 */}
      <View style={styles.searchBar}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>

        <View style={styles.inputBox}>
          <SearchIcon color={colors.textSecondary} size={18} />
          <TextInput
            key={inputSeed}
            ref={inputRef}
            defaultValue={typedRef.current}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmit}
            style={styles.input}
            placeholder="가고 싶은 도시 또는 키워드"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
          />
          {trimmed ? (
            <Pressable
              onPress={clearInput}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="검색어 지우기">
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 지역 · 종류 필터 */}
      <View style={styles.filterArea}>
        <View style={styles.regionToggle}>
          {[
            { label: '충북', value: true },
            { label: '전국', value: false },
          ].map(option => {
            const active = chungbukOnly === option.value;
            return (
              <Pressable
                key={option.label}
                style={[styles.regionItem, active && styles.regionItemActive]}
                onPress={() => setChungbukOnly(option.value)}>
                <Text
                  style={[
                    styles.regionText,
                    active && styles.regionTextActive,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          horizontal
          data={SEARCH_FILTERS}
          keyExtractor={filter => filter.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => {
            const active = filterId === item.id;
            return (
              <Pressable
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilterId(item.id)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* 결과 / 추천어 */}
      {!isSearching ? (
        <IdleView
          onSelectKeyword={fillInput}
          hint={
            trimmed.length > 0
              ? `${MIN_QUERY_LENGTH}글자 이상 입력해주세요`
              : null
          }
        />
      ) : (
        <FlatList
          data={search.items}
          keyExtractor={spot => spot.contentId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.resultContent}
          onEndReachedThreshold={0.4}
          onEndReached={search.loadMore}
          ItemSeparatorComponent={Divider}
          ListHeaderComponent={
            search.status === 'ready' && search.items.length > 0 ? (
              <Text style={styles.resultCount}>
                {search.totalCount.toLocaleString()}건
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <SectionState
              status={search.status}
              error={search.error}
              isEmpty={showEmptyResult}
              emptyText={`'${trimmed}' 검색 결과가 없어요.\n다른 키워드로 찾아보세요.`}
              onRetry={search.retry}
              height={220}
            />
          }
          ListFooterComponent={
            search.isLoadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={colors.goldDeep} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SpotRow spot={item} onPress={() => onSelectSpot(item)} />
          )}
        />
      )}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

/** 검색 전 화면 — 최근 검색어와 추천 키워드 */
function IdleView({
  onSelectKeyword,
  hint,
}: {
  onSelectKeyword: (keyword: string) => void;
  hint: string | null;
}) {
  return (
    <View style={styles.idle}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {recentKeywords.length > 0 ? (
        <View style={styles.idleSection}>
          <Text style={styles.idleTitle}>최근 검색어</Text>
          <View style={styles.keywordWrap}>
            {recentKeywords.map(keyword => (
              <Pressable
                key={keyword}
                style={styles.keywordChip}
                onPress={() => onSelectKeyword(keyword)}>
                <Text style={styles.keywordText}>{keyword}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.idleSection}>
        <Text style={styles.idleTitle}>이런 키워드는 어때요?</Text>
        <View style={styles.keywordWrap}>
          {SUGGESTIONS.map(keyword => (
            <Pressable
              key={keyword}
              style={[styles.keywordChip, styles.keywordChipSoft]}
              onPress={() => onSelectKeyword(keyword)}>
              <Text style={styles.keywordText}>{keyword}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },
  clearText: {
    fontSize: 15,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },

  filterArea: {
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  regionToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  regionItem: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 10,
  },
  regionItemActive: {
    backgroundColor: colors.ink,
  },
  regionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: true,
  },
  regionTextActive: {
    color: '#ffffff',
  },
  chipRow: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.goldDeep,
    backgroundColor: colors.bonusBg,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: true,
  },
  chipTextActive: {
    color: colors.bonusText,
    fontWeight: '700',
  },

  resultContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footerLoading: {
    paddingVertical: 18,
  },

  idle: {
    padding: 20,
    gap: 22,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  idleSection: {
    gap: 10,
  },
  idleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keywordChipSoft: {
    backgroundColor: colors.bonusBg,
    borderColor: 'transparent',
  },
  keywordText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
    includeFontPadding: true,
  },
});

export default SearchScreen;
