import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CopySimpleIcon } from 'phosphor-react-native';
import RecordImage from './RecordImage';
import { usePhotoViewer } from './PhotoViewer';
import { isCleanMediaUrl, mediaScanStore } from '../media/mediaScanStore';
import { mediaIdFromUrl } from '../api/mediaApi';

export function RecordPhotoCount({
  count,
  current,
}: {
  count: number;
  current?: number;
}) {
  if (count < 2) return null;
  return (
    <View
      style={[styles.count, current ? styles.pageCount : styles.totalCount]}
      pointerEvents="none"
    >
      {!current ? (
        <CopySimpleIcon size={15} color="#ffffff" weight="regular" />
      ) : null}
      <Text
        style={styles.countText}
        accessibilityLabel={
          current ? `사진 ${count}장 중 ${current}번째` : `사진 ${count}장`
        }
      >
        {current ? `${current}/${count}` : count}
      </Text>
    </View>
  );
}

export default function RecordPhotoGallery({
  urls,
  ownerId,
}: {
  urls: string[];
  ownerId?: string;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const pager = useRef<ScrollView>(null);
  const { open, close } = usePhotoViewer();
  useEffect(() => close, [close]);

  // 사진 ID들의 검사 상태를 구독합니다 (게시물 조회 시 1회 조회 후 반응).
  const subscribeAll = useCallback(
    (listener: () => void) => {
      const unsubscribes = urls
        .map(mediaIdFromUrl)
        .filter((id): id is string => id !== null)
        .map(id => mediaScanStore.subscribe(id, listener));
      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    },
    [urls],
  );

  const getCleanUrls = useCallback(() => {
    return urls.filter(isCleanMediaUrl);
  }, [urls]);

  const cleanUrls = useSyncExternalStore(subscribeAll, getCleanUrls);

  if (cleanUrls.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.container}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ScrollView
          ref={pager}
          key={`${width}:${cleanUrls.join(',')}`}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={cleanUrls.length > 1}
          contentOffset={{ x: Math.min(index, cleanUrls.length - 1) * width, y: 0 }}
          onMomentumScrollEnd={event => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            setIndex(Math.max(0, Math.min(cleanUrls.length - 1, next)));
          }}
          style={styles.container}
        >
          {cleanUrls.map((uri, position) => (
            <Pressable
              key={`${position}:${uri}`}
              style={[styles.page, { width }]}
              accessibilityRole="button"
              accessibilityLabel={`사진 ${position + 1} 전체화면으로 보기`}
              onPress={() =>
                open({
                  urls: cleanUrls,
                  index: position,
                  ownerId,
                  onIndexChange: next => {
                    setIndex(next);
                    pager.current?.scrollTo({
                      x: next * width,
                      animated: false,
                    });
                  },
                })
              }
            >
              <RecordImage uri={uri} ownerId={ownerId} style={styles.image} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <RecordPhotoCount count={cleanUrls.length} current={index + 1} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { height: '100%' },
  image: { width: '100%', height: '100%' },
  count: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pageCount: { top: 12 },
  totalCount: { bottom: 12 },
  countText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});
