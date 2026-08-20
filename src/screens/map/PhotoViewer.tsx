/**
 * 전체화면 사진 뷰어 — 상세시트의 사진을 탭하면 열립니다.
 *
 * 좌우로 넘겨 볼 수 있고, 위쪽에 현재 위치(3 / 12)와 설명을 보여 줍니다.
 * 바텀시트가 지도 위에 떠 있는 구조라, 뷰어는 그보다 더 위에 와야 해서
 * Modal 로 띄웁니다(하단 탭바까지 덮습니다).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 뷰어에 넘길 사진 한 장 */
export type ViewerPhoto = {
  uri: string;
  /** 사진 아래 설명. 없으면 표시하지 않습니다. */
  caption?: string;
};

type Props = {
  photos: ViewerPhoto[];
  /** 처음 보여 줄 사진. 목록을 벗어난 값이면 0으로 맞춥니다. */
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

function PhotoViewer({ photos, initialIndex, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const safeInitial =
    initialIndex >= 0 && initialIndex < photos.length ? initialIndex : 0;
  const [index, setIndex] = useState(safeInitial);

  /**
   * 열릴 때 시작 위치로 보냅니다.
   * contentOffset 은 안드로이드에서 동작하지 않아 명령형으로 옮깁니다.
   * 레이아웃이 잡히기 전에 부르면 무시되므로 onLayout 뒤에 한 번 더 맞춥니다.
   */
  useEffect(() => {
    if (!visible) return;
    setIndex(safeInitial);
    scrollRef.current?.scrollTo({ x: safeInitial * width, animated: false });
  }, [visible, safeInitial, width]);

  const handleLayout = useCallback(() => {
    scrollRef.current?.scrollTo({ x: index * width, animated: false });
    // index 를 의존성에 넣으면 넘길 때마다 되돌아가므로 최초 배치에만 씁니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const handleScrollEnd = useCallback(
    (offsetX: number) => {
      const next = Math.round(offsetX / width);
      if (next !== index && next >= 0 && next < photos.length) {
        setIndex(next);
      }
    },
    [width, index, photos.length],
  );

  if (photos.length === 0) {
    return null;
  }

  const current = photos[index];

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      // 안드로이드 하드웨어 back 은 onRequestClose 로 들어옵니다.
      statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={handleLayout}
          onMomentumScrollEnd={event =>
            handleScrollEnd(event.nativeEvent.contentOffset.x)
          }>
          {photos.map(photo => (
            <View key={photo.uri} style={{ width, height }}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.image}
                // contain — 사진이 잘리지 않게 전체를 보여 줍니다.
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* 상단 — 닫기 + 현재 위치 */}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.counter}>
            {index + 1} / {photos.length}
          </Text>
          <Pressable
            style={styles.close}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="사진 닫기">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {/* 하단 — 사진 설명 */}
        {current.caption ? (
          <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.caption} numberOfLines={2}>
              {current.caption}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    flex: 1,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  counter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    // 밝은 사진 위에서도 읽히도록 그림자를 깝니다.
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: '#fff',
  },
});

export default PhotoViewer;
