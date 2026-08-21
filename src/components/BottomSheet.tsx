/**
 * 외부 의존성 없는 커스텀 바텀시트.
 * RN 내장 Animated + PanResponder 만 사용합니다 (reanimated·gesture-handler 불필요).
 *
 * - snapPoints: 화면 높이 대비 비율. **오름차순**으로 넣으세요. 예) [0.5, 0.92]
 * - 드래그는 핸들·header 영역에서만 받습니다. 본문은 ScrollView 라 제스처가 겹치지 않습니다.
 * - 지도 위에 띄우는 용도라 어두운 배경막(backdrop)은 두지 않습니다. 지도는 계속 보이고 조작됩니다.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 화면 높이 대비 비율, 오름차순. 마지막 값이 시트의 최대 높이가 됩니다. */
  snapPoints?: number[];
  /** 핸들 아래 고정 영역. 여기서도 드래그가 됩니다. */
  header?: React.ReactNode;
  children: React.ReactNode;
};

function BottomSheet({
  visible,
  onClose,
  snapPoints = [0.52, 0.92],
  header,
  children,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const maxRatio = snapPoints[snapPoints.length - 1];
  const sheetHeight = height * maxRatio;
  const closedY = sheetHeight;

  /**
   * 각 스냅의 translateY 값.
   * 시트는 '최대 높이'로 그려 두고 아래로 밀어 낮은 스냅을 표현합니다.
   * 비율이 클수록(=많이 열릴수록) offset 은 0에 가까워집니다.
   */
  const offsets = useMemo(
    () => snapPoints.map(ratio => (maxRatio - ratio) * height),
    [snapPoints, maxRatio, height],
  );
  const minOffset = offsets[offsets.length - 1]; // 가장 많이 열린 상태 (보통 0)
  const defaultOffset = offsets[0]; // 열릴 때 기본 스냅

  const translateY = useRef(new Animated.Value(closedY)).current;
  const posRef = useRef(closedY); // JS 쪽에서 추적하는 현재 위치
  const startRef = useRef(closedY); // 드래그 시작 시점 위치
  const [mounted, setMounted] = useState(false);

  /**
   * 실제 화면상의 위치를 posRef 로 추적합니다.
   * useNativeDriver 를 쓰면 값이 네이티브에 있어서 JS 가 바로 읽을 수 없는데,
   * 리스너를 붙여 두면 네이티브가 값 변화를 JS 로 보내 줍니다.
   * 이게 없으면 애니메이션 도중에 시트를 잡았을 때 기준점이 어긋나 툭 튑니다.
   */
  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      posRef.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  const animateTo = useCallback(
    (target: number, onDone?: () => void) => {
      Animated.spring(translateY, {
        toValue: target,
        useNativeDriver: true,
        stiffness: 260,
        damping: 26,
        mass: 0.8,
      }).start(({ finished }) => {
        if (finished) onDone?.();
      });
    },
    [translateY],
  );

  // visible 변화에 따라 열기/닫기. 드래그 중이던 위치에서 이어서 애니메이션됩니다.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      animateTo(defaultOffset);
    } else if (mounted) {
      animateTo(closedY, () => setMounted(false));
    }
    // mounted 는 의도적으로 의존성에서 제외 — 열림/닫힘 트리거는 visible 뿐입니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultOffset, closedY, animateTo]);

  // 안드로이드 뒤로가기로 닫기
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          // 진행 중인 스프링을 멈추고, 지금 보이는 위치를 드래그 기준점으로 삼습니다.
          translateY.stopAnimation();
          startRef.current = posRef.current;
        },
        onPanResponderMove: (_, g) => {
          // 최대 열림보다 위로는 못 올라가게 막습니다.
          const next = Math.max(minOffset, startRef.current + g.dy);
          posRef.current = next;
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          // 아래로 빠르게 튕기면 바로 닫기
          if (g.vy > 1.1) {
            onClose();
            return;
          }
          // 속도를 반영한 예상 도착점에서 가장 가까운 스냅으로
          const projected = posRef.current + g.vy * 120;
          const candidates = [...offsets, closedY];
          const target = candidates.reduce((best, candidate) =>
            Math.abs(candidate - projected) < Math.abs(best - projected)
              ? candidate
              : best,
          );
          if (target === closedY) onClose();
          else animateTo(target);
        },
      }),
    [offsets, minOffset, closedY, translateY, animateTo, onClose],
  );

  if (!mounted) return null;

  return (
    <Animated.View
      style={[
        styles.sheet,
        { height: sheetHeight, transform: [{ translateY }] },
      ]}>
      {/* 드래그 가능 영역: 핸들 + header */}
      <View {...panResponder.panHandlers}>
        <View style={styles.handleZone}>
          <View style={styles.handle} />
        </View>
        {header}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: insets.bottom + 96 }, // 떠 있는 탭바에 가리지 않게
        ]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      <Pressable
        style={styles.close}
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="닫기">
        <CloseMark />
      </Pressable>
    </Animated.View>
  );
}

/** 닫기 X — 선 2개를 교차시켜 그립니다. */
function CloseMark() {
  return (
    <View style={styles.closeMark}>
      <View style={[styles.closeBar, styles.closeBarA]} />
      <View style={[styles.closeBar, styles.closeBarB]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 10,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
  },
  close: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMark: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBar: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
  },
  closeBarA: {
    transform: [{ rotate: '45deg' }],
  },
  closeBarB: {
    transform: [{ rotate: '-45deg' }],
  },
});

export default BottomSheet;
