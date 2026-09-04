/**
 * 의존성 없는 커스텀 슬라이더 (PanResponder 기반).
 * @react-native-community/slider 같은 네이티브 모듈이 필요 없습니다.
 *
 * - pointerEvents="none"을 자식 뷰(트랙, 썸)에 부여하여 터치 좌표 왜곡 원천 차단
 * - PanResponder moveX / x0 델타 기반 계산으로 튐 및 버벅임 방지
 * - 값이 실제로 스텝 단위로 변할 때만 onChange 발화하여 불필요한 리렌더링 제거
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

const THUMB = 24;

function Slider({ min, max, step, value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // 최신 props를 PanResponder 클로저에서 항상 참조할 수 있도록 ref 유지
  const propsRef = useRef({ min, max, step, value, onChange });
  useEffect(() => {
    propsRef.current = { min, max, step, value, onChange };
  });

  const startValRef = useRef(value);
  const lastEmittedRef = useRef(value);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          setIsDragging(true);
          const w = widthRef.current || 1;
          const { min: cMin, max: cMax, step: cStep, onChange: cOnChange } =
            propsRef.current;

          // e.nativeEvent.locationX는 자식들의 pointerEvents="none" 덕분에 wrap 기준 (0 ~ w)
          const localX = Math.min(w, Math.max(0, e.nativeEvent.locationX));
          const frac = localX / w;
          const raw = cMin + frac * (cMax - cMin);
          const snapped = Math.round(raw / cStep) * cStep;
          const clamped = Math.min(cMax, Math.max(cMin, snapped));

          startValRef.current = clamped;
          if (clamped !== lastEmittedRef.current) {
            lastEmittedRef.current = clamped;
            cOnChange(clamped);
          }
        },
        onPanResponderMove: (_e, gestureState) => {
          const w = widthRef.current || 1;
          const { min: cMin, max: cMax, step: cStep, onChange: cOnChange } =
            propsRef.current;

          // gestureState.dx는 터치 시작점(x0)으로부터의 상대 이동 거리 (화면 절대좌표 기반이라 튀지 않음)
          const deltaFrac = gestureState.dx / w;
          const raw = startValRef.current + deltaFrac * (cMax - cMin);
          const snapped = Math.round(raw / cStep) * cStep;
          const clamped = Math.min(cMax, Math.max(cMin, snapped));

          if (clamped !== lastEmittedRef.current) {
            lastEmittedRef.current = clamped;
            cOnChange(clamped);
          }
        },
        onPanResponderRelease: () => {
          setIsDragging(false);
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
        },
      }),
    [],
  );

  const frac = useMemo(() => {
    if (max === min) {
      return 0;
    }
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
  }, [value, min, max]);

  const fillWidth = frac * width;
  const thumbLeft = frac * width - THUMB / 2;

  return (
    <View
      style={styles.wrap}
      onLayout={onLayout}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      {...responder.panHandlers}>
      <View style={styles.track} pointerEvents="none" />
      <View style={[styles.fill, { width: fillWidth }]} pointerEvents="none" />
      <View
        style={[
          styles.thumb,
          { left: thumbLeft },
          isDragging && styles.thumbActive,
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
  },
  fill: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.trackFill,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbActive: {
    transform: [{ scale: 1.18 }],
    backgroundColor: colors.primary,
    elevation: 6,
  },
});

export default Slider;
