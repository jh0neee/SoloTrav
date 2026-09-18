import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CaretLeftIcon,
  CaretRightIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from 'phosphor-react-native';
import RecordImage from './RecordImage';
import { clamp, constrainPhoto, photoSwipe } from '../media/photoGestures';

type PhotoSelection = {
  urls: string[];
  index: number;
  ownerId?: string;
  onIndexChange?: (index: number) => void;
};
const ViewerContext = createContext<{
  open: (photos: PhotoSelection) => void;
  close: () => void;
}>({ open: () => {}, close: () => {} });
export const usePhotoViewer = () => useContext(ViewerContext);

/** Root overlay avoids dependence on the Android native dialog Activity. */
export function PhotoViewerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [photos, setPhotos] = useState<PhotoSelection | null>(null);
  const open = useCallback((selection: PhotoSelection) => {
    if (selection.urls.length)
      setPhotos({
        ...selection,
        urls: [...selection.urls],
        index: clamp(selection.index, 0, selection.urls.length - 1),
      });
  }, []);
  const close = useCallback(() => setPhotos(null), []);
  const value = useMemo(() => ({ open, close }), [open, close]);
  return (
    <ViewerContext.Provider value={value}>
      <View style={styles.root}>
        <View
          style={styles.root}
          accessibilityElementsHidden={!!photos}
          importantForAccessibility={photos ? 'no-hide-descendants' : 'auto'}
        >
          {children}
        </View>
        {photos ? <PhotoViewer photos={photos} onClose={close} /> : null}
      </View>
    </ViewerContext.Provider>
  );
}

function PhotoViewer({
  photos,
  onClose,
}: {
  photos: PhotoSelection;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(photos.index);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const move = useCallback(
    (direction: number) => {
      setIndex(previous =>
        clamp(previous + direction, 0, photos.urls.length - 1),
      );
    },
    [photos.urls.length],
  );
  useEffect(() => {
    photos.onIndexChange?.(index);
  }, [index, photos]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose]);
  useEffect(() => {
    const webDocument = (
      globalThis as unknown as {
        document?: {
          addEventListener: (
            type: string,
            listener: (event: { key: string }) => void,
          ) => void;
          removeEventListener: (
            type: string,
            listener: (event: { key: string }) => void,
          ) => void;
        };
      }
    ).document;
    if (!webDocument) return;
    const onKey = (event: { key: string }) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    };
    webDocument.addEventListener('keydown', onKey);
    return () => webDocument.removeEventListener('keydown', onKey);
  }, [onClose, move]);
  return (
    <View
      style={[
        styles.overlay,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      accessibilityViewIsModal
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable
          style={styles.button}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="사진 전체화면 닫기"
        >
          <XIcon size={26} color="#ffffff" />
        </Pressable>
        <Text style={styles.counter} accessibilityLiveRegion="polite">
          {index + 1}/{photos.urls.length}
        </Text>
        <View style={styles.button} />
      </View>
      <View
        style={styles.root}
        onLayout={event =>
          setSize({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
      >
        {size.width > 0 && size.height > 0 ? (
          <ZoomablePhoto
            key={`${index}:${size.width}:${size.height}`}
            uri={photos.urls[index]}
            ownerId={photos.ownerId}
            width={size.width}
            height={size.height}
            onSwipe={move}
          />
        ) : null}
      </View>
      <View style={styles.footer}>
        <Pressable
          style={styles.button}
          disabled={index === 0}
          onPress={() => move(-1)}
          accessibilityRole="button"
          accessibilityLabel="이전 사진"
        >
          <CaretLeftIcon
            color={index === 0 ? '#555555' : '#ffffff'}
            size={24}
          />
        </Pressable>
        <Text style={styles.hint}>두 손가락 또는 두 번 탭하여 확대</Text>
        <Pressable
          style={styles.button}
          disabled={index === photos.urls.length - 1}
          onPress={() => move(1)}
          accessibilityRole="button"
          accessibilityLabel="다음 사진"
        >
          <CaretRightIcon
            color={index === photos.urls.length - 1 ? '#555555' : '#ffffff'}
            size={24}
          />
        </Pressable>
      </View>
    </View>
  );
}

function touchDistance(event: GestureResponderEvent) {
  const [a, b] = event.nativeEvent.touches;
  return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
}

function ZoomablePhoto({
  uri,
  ownerId,
  width,
  height,
  onSwipe,
}: {
  uri: string;
  ownerId?: string;
  width: number;
  height: number;
  onSwipe: (direction: number) => void;
}) {
  const zoom = useRef({ scale: 1, x: 0, y: 0 });
  const start = useRef({ scale: 1, x: 0, y: 0, distance: 0 });
  const pinched = useRef(false);
  const lastTap = useRef(0);
  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY()).current;
  const [label, setLabel] = useState(1);
  const update = useCallback(
    (nextScale: number, x: number, y: number) => {
      zoom.current = constrainPhoto(nextScale, x, y, width, height);
      scale.setValue(zoom.current.scale);
      translate.setValue({ x: zoom.current.x, y: zoom.current.y });
    },
    [width, height, scale, translate],
  );
  const finish = useCallback(() => {
    setLabel(zoom.current.scale);
  }, []);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (event, gesture) =>
          event.nativeEvent.touches.length > 1 ||
          Math.abs(gesture.dx) > 5 ||
          Math.abs(gesture.dy) > 5,
        onPanResponderGrant: event => {
          start.current = { ...zoom.current, distance: touchDistance(event) };
          pinched.current = start.current.distance > 0;
        },
        onPanResponderMove: (event, gesture) => {
          const distance = touchDistance(event);
          if (distance > 0) {
            pinched.current = true;
            if (!start.current.distance)
              start.current = { ...zoom.current, distance };
            update(
              (start.current.scale * distance) / start.current.distance,
              zoom.current.x,
              zoom.current.y,
            );
          } else if (!pinched.current && zoom.current.scale > 1) {
            update(
              zoom.current.scale,
              start.current.x + gesture.dx,
              start.current.y + gesture.dy,
            );
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (!pinched.current) {
            const direction = photoSwipe(
              gesture.dx,
              gesture.dy,
              zoom.current.scale,
            );
            if (direction) onSwipe(direction);
          }
          lastTap.current = 0;
          finish();
        },
        onPanResponderTerminate: finish,
        onPanResponderTerminationRequest: () => false,
      }),
    [update, onSwipe, finish],
  );
  const toggleZoom = () => {
    update(zoom.current.scale > 1 ? 1 : 2, 0, 0);
    finish();
  };
  return (
    <View style={styles.photoArea} {...responder.panHandlers}>
      <Pressable
        style={styles.root}
        accessibilityRole="imagebutton"
        accessibilityLabel="사진. 두 번 탭하여 확대 또는 원래 크기로 보기"
        onPress={() => {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            toggleZoom();
            lastTap.current = 0;
          } else lastTap.current = now;
        }}
      >
        <Animated.View
          style={[
            styles.root,
            {
              transform: [
                { translateX: translate.x },
                { translateY: translate.y },
                { scale },
              ],
            },
          ]}
        >
          <RecordImage
            uri={uri}
            ownerId={ownerId}
            resizeMode="contain"
            style={styles.image}
          />
        </Animated.View>
      </Pressable>
      <View style={styles.zoomControls}>
        <Pressable
          style={styles.button}
          onPress={() => {
            update(zoom.current.scale - 1, zoom.current.x, zoom.current.y);
            finish();
          }}
          accessibilityRole="button"
          accessibilityLabel="사진 축소"
        >
          <MinusIcon color="#ffffff" size={20} />
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            update(1, 0, 0);
            finish();
          }}
          accessibilityRole="button"
          accessibilityLabel="사진 원래 크기"
        >
          <Text style={styles.zoomLabel}>{Math.round(label * 100)}%</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            update(zoom.current.scale + 1, zoom.current.x, zoom.current.y);
            finish();
          }}
          accessibilityRole="button"
          accessibilityLabel="사진 확대"
        >
          <PlusIcon color="#ffffff" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#101014',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  counter: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  button: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoArea: { flex: 1, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  hint: { color: '#bbbbbb', fontSize: 12, flexShrink: 1, textAlign: 'center' },
  zoomControls: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    borderRadius: 24,
    backgroundColor: 'rgba(40,40,45,0.85)',
  },
  zoomLabel: { color: '#ffffff', fontSize: 12 },
});
