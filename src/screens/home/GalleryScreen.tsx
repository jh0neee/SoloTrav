/**
 * 관광사진 갤러리 — 홈의 '사진으로 먼저 만나는 충북' 에서 더 보기로 들어옵니다.
 *
 * 한국관광공사 관광사진갤러리(galleryList1 / gallerySearchList1)를 씁니다.
 * 상단 칩으로 시군을 좁히고, 사진을 누르면 촬영지·촬영자·태그를 큰 사진과 함께
 * 봅니다. 이 API 는 관광지 콘텐츠와 이어지는 id 가 없어서 상세 화면으로는
 * 넘어가지 않고, 태그를 눌러 그 키워드로 다시 찾는 흐름으로 대신합니다.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron } from '../../components/icons/UiIcons';
import { SectionState } from '../../components/travel/TravelCards';
import { useGallerySearch } from '../../travel/useGallerySearch';
import { CITIES } from '../../data/cities';
import type { GalleryPhoto } from '../../types/travel';

/** 2열 그리드 — 좌우 여백 16 × 2, 카드 사이 간격 10 */
const GAP = 10;
const SIDE = 16;
const CARD_WIDTH = (Dimensions.get('window').width - SIDE * 2 - GAP) / 2;

/** 전체 + 시군 11개. 갤러리 keyword 는 촬영지 문자열을 훑기 때문에 지역명이 그대로 먹습니다 */
const FILTERS = [
  { id: 'all', label: '충북 전체', keyword: '충청북도' },
  ...CITIES.map(city => ({
    id: city.id,
    label: city.name,
    keyword: `충청북도 ${city.sigungu}`,
  })),
];

type Props = {
  onBack: () => void;
};

function GalleryScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [filterId, setFilterId] = useState('all');
  const [preview, setPreview] = useState<GalleryPhoto | null>(null);

  const keyword =
    FILTERS.find(filter => filter.id === filterId)?.keyword ?? '충청북도';
  const gallery = useGallerySearch(keyword);

  /** 태그를 누르면 그 키워드에 해당하는 시군 칩으로 옮겨갑니다(없으면 무시) */
  const jumpToRegion = useCallback((tag: string) => {
    const match = FILTERS.find(filter => tag.includes(filter.label));
    if (match) {
      setFilterId(match.id);
      setPreview(null);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <View style={styles.headerTexts}>
          <Text style={styles.headerTitle}>충북 사진첩</Text>
          <Text style={styles.headerSub}>
            {gallery.status === 'ready'
              ? `${gallery.totalCount.toLocaleString()}장`
              : '한국관광공사 관광사진갤러리'}
          </Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={filter => filter.id}
        showsHorizontalScrollIndicator={false}
        style={styles.chipStrip}
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

      <FlatList
        data={gallery.items}
        keyExtractor={photo => photo.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        onEndReachedThreshold={0.5}
        onEndReached={gallery.loadMore}
        ListEmptyComponent={
          <SectionState
            status={gallery.status}
            error={gallery.error}
            isEmpty={gallery.status === 'ready' && gallery.items.length === 0}
            emptyText="이 지역 사진이 아직 없어요"
            onRetry={gallery.retry}
            height={260}
          />
        }
        ListFooterComponent={
          gallery.isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={colors.goldDeep} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.cell} onPress={() => setPreview(item)}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cellImage}
              resizeMode="cover"
            />
            <Text style={styles.cellTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cellLocation} numberOfLines={1}>
              {item.location}
            </Text>
          </Pressable>
        )}
      />

      {/* 큰 사진 보기 */}
      <Modal
        visible={preview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setPreview(null)}
            accessibilityRole="button"
            accessibilityLabel="사진 닫기"
          />
          {preview ? (
            <View style={[styles.modalCard, { marginTop: insets.top + 40 }]}>
              <Image
                source={{ uri: preview.imageUrl }}
                style={styles.modalImage}
                resizeMode="cover"
              />
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalTitle}>{preview.title}</Text>
                <Text style={styles.modalMeta}>
                  {[preview.location, preview.monthLabel]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {preview.photographer ? (
                  <Text style={styles.modalPhotographer}>
                    ⓒ {preview.photographer}
                  </Text>
                ) : null}

                <View style={styles.tagWrap}>
                  {preview.keywords.slice(0, 12).map(tag => (
                    <Pressable
                      key={tag}
                      style={styles.tag}
                      onPress={() => jumpToRegion(tag)}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Pressable
                style={styles.modalClose}
                onPress={() => setPreview(null)}>
                <Text style={styles.modalCloseText}>닫기</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  chipStrip: {
    flexGrow: 0,
  },
  chipRow: {
    gap: 8,
    paddingHorizontal: SIDE,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    // 한글 받침이 잘리지 않도록 줄 높이를 넉넉히 잡습니다.
    // (안드로이드는 includeFontPadding 을 끄면 '충'이 '초'처럼 보입니다)
    lineHeight: 18,
    includeFontPadding: true,
  },
  chipTextActive: {
    color: '#ffffff',
  },

  grid: {
    paddingHorizontal: SIDE,
    paddingBottom: 32,
    flexGrow: 1,
  },
  column: {
    gap: GAP,
    marginBottom: 16,
  },
  cell: {
    width: CARD_WIDTH,
    gap: 5,
  },
  cellImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.75,
    borderRadius: 14,
    backgroundColor: colors.darkCard,
  },
  cellTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cellLocation: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footerLoading: {
    paddingVertical: 18,
  },

  // 큰 사진 보기
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,18,26,0.7)',
  },
  modalDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  modalImage: {
    width: '100%',
    height: 260,
    backgroundColor: colors.darkCard,
  },
  modalBody: {
    padding: 18,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalPhotographer: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  tagText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  modalClose: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});

export default GalleryScreen;
