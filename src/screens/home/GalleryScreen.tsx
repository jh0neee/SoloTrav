/** 관광사진을 제목별 앨범으로 묶고, 앨범 안 사진을 스와이프로 보는 화면입니다. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';
import { colors } from '../../theme/colors';
import { Chevron } from '../../components/icons/UiIcons';
import { SectionState } from '../../components/travel/TravelCards';
import { useGallerySearch } from '../../travel/useGallerySearch';
import { CITIES } from '../../data/cities';
import type { GalleryPhoto } from '../../types/travel';

const GAP = 10;
const SIDE = 16;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - SIDE * 2 - GAP) / 2;
const VIEWER_WIDTH = SCREEN_WIDTH - SIDE * 2;

const FILTERS = [
  { id: 'all', label: '충북 전체', keyword: '충청북도' },
  ...CITIES.map(city => ({
    id: city.id,
    label: city.name,
    keyword: `충청북도 ${city.sigungu}`,
  })),
];

type PhotoAlbum = {
  title: string;
  cover: GalleryPhoto;
  photos: GalleryPhoto[];
};

type Preview = {
  title: string;
  index: number;
};

type Props = {
  onBack: () => void;
  /** 홈 앨범을 눌러 들어오면 같은 제목의 앨범을 바로 엽니다. */
  initialAlbumTitle?: string;
};

function groupPhotosByTitle(photos: GalleryPhoto[]): PhotoAlbum[] {
  const grouped = new Map<string, GalleryPhoto[]>();
  photos.forEach(photo => {
    const title = photo.title.trim() || '이름 없는 여행 사진';
    grouped.set(title, [...(grouped.get(title) ?? []), photo]);
  });
  return Array.from(grouped, ([title, albumPhotos]) => ({
    title,
    cover: albumPhotos[0],
    photos: albumPhotos,
  }));
}

function GalleryScreen({ onBack, initialAlbumTitle }: Props) {
  const insets = useSafeAreaInsets();
  const [filterId, setFilterId] = useState('all');
  const [preview, setPreview] = useState<Preview | null>(null);
  const initialAlbumHandled = useRef(false);

  const keyword =
    FILTERS.find(filter => filter.id === filterId)?.keyword ?? '충청북도';
  const gallery = useGallerySearch(keyword);
  const albums = useMemo(() => groupPhotosByTitle(gallery.items), [gallery.items]);
  const selectedAlbum = preview
    ? albums.find(album => album.title === preview.title) ?? null
    : null;
  const selectedPhoto = selectedAlbum?.photos[preview?.index ?? 0] ?? null;

  useEffect(() => {
    if (
      initialAlbumHandled.current ||
      !initialAlbumTitle ||
      !albums.some(album => album.title === initialAlbumTitle)
    ) {
      return;
    }
    initialAlbumHandled.current = true;
    setPreview({ title: initialAlbumTitle, index: 0 });
  }, [albums, initialAlbumTitle]);

  const selectFilter = (id: string) => {
    setPreview(null);
    setFilterId(id);
  };

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
              ? `${albums.length}개 이야기 · ${gallery.totalCount.toLocaleString()}장`
              : '제목별로 만나는 충북 여행'}
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
              onPress={() => selectFilter(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={albums}
        keyExtractor={album => album.title}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        onEndReachedThreshold={0.5}
        onEndReached={gallery.loadMore}
        ListEmptyComponent={
          <SectionState
            status={gallery.status}
            error={gallery.error}
            isEmpty={gallery.status === 'ready' && albums.length === 0}
            emptyText="이 지역의 사진 이야기가 아직 없어요"
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
          <Pressable
            style={styles.cell}
            onPress={() => setPreview({ title: item.title, index: 0 })}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} 사진 ${item.photos.length}장 보기`}>
            <Image
              source={{ uri: item.cover.imageUrl }}
              style={styles.cellImage}
              resizeMode="cover"
            />
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{item.photos.length}장</Text>
            </View>
            <Text style={styles.cellTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cellLocation} numberOfLines={1}>
              {item.cover.location}
            </Text>
          </Pressable>
        )}
      />

      <Modal
        visible={selectedAlbum !== null}
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
          {selectedAlbum && selectedPhoto ? (
            <View style={[styles.modalCard, { marginTop: insets.top + 28 }]}>
              <View style={styles.viewerHeader}>
                <Pressable
                  style={styles.viewerClose}
                  onPress={() => setPreview(null)}
                  accessibilityRole="button"
                  accessibilityLabel="사진 닫기">
                  <Chevron direction="left" color={colors.textPrimary} size={22} />
                </Pressable>
                <Text style={styles.viewerCount}>
                  {(preview?.index ?? 0) + 1} / {selectedAlbum.photos.length}
                </Text>
              </View>

              <FlatList
                key={selectedAlbum.title}
                horizontal
                pagingEnabled
                data={selectedAlbum.photos}
                keyExtractor={photo => photo.id}
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={preview?.index ?? 0}
                getItemLayout={(_, index) => ({
                  length: VIEWER_WIDTH,
                  offset: VIEWER_WIDTH * index,
                  index,
                })}
                onMomentumScrollEnd={event => {
                  const nextIndex = Math.round(
                    event.nativeEvent.contentOffset.x / VIEWER_WIDTH,
                  );
                  setPreview(current =>
                    current ? { ...current, index: nextIndex } : null,
                  );
                }}
                renderItem={({ item }) => (
                  <View style={styles.viewerPage}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalTitle}>{selectedAlbum.title}</Text>
                <Text style={styles.modalMeta}>
                  {[selectedPhoto.location, selectedPhoto.monthLabel]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {selectedPhoto.photographer ? (
                  <Text style={styles.modalPhotographer}>
                    ⓒ {selectedPhoto.photographer}
                  </Text>
                ) : null}
                <View style={styles.tagWrap}>
                  {selectedPhoto.keywords.slice(0, 8).map(tag => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              {selectedAlbum.photos.length > 1 ? (
                <Text style={styles.swipeHint}>좌우로 넘겨 사진을 둘러보세요</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
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
  headerTexts: { gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textSecondary },
  chipStrip: { flexGrow: 0 },
  chipRow: { gap: 8, paddingHorizontal: SIDE, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: true,
  },
  chipTextActive: { color: '#ffffff' },
  grid: {
    paddingHorizontal: SIDE,
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
    flexGrow: 1,
  },
  column: { gap: GAP, marginBottom: 18 },
  cell: { width: CARD_WIDTH, gap: 5 },
  cellImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.75,
    borderRadius: 14,
    backgroundColor: colors.darkCard,
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: 'rgba(20,24,35,0.72)',
  },
  countBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  cellTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    color: colors.textPrimary,
  },
  cellLocation: { fontSize: 11, color: colors.textSecondary },
  footerLoading: { paddingVertical: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,18,26,0.76)' },
  modalDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    flex: 1,
    marginHorizontal: SIDE,
    marginBottom: 24,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  viewerHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  viewerClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCount: {
    paddingRight: 8,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  viewerPage: { width: VIEWER_WIDTH },
  modalImage: {
    width: VIEWER_WIDTH,
    height: 300,
    backgroundColor: colors.darkCard,
  },
  modalBody: { padding: 18 },
  modalTitle: { fontSize: 19, fontWeight: '700', color: colors.textPrimary },
  modalMeta: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
  modalPhotographer: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  tagText: { fontSize: 12, color: colors.textPrimary },
  swipeHint: {
    paddingVertical: 14,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    color: colors.textSecondary,
    fontSize: 12,
  },
});

export default GalleryScreen;
