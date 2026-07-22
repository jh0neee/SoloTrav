/**
 * 의존성 없는 커스텀 슬라이더 (PanResponder 기반).
 * @react-native-community/slider 같은 네이티브 모듈이 필요 없습니다.
 */
import React, { useMemo, useRef, useState } from 'react';
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

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const valueFromX = (x: number) => {
    const w = widthRef.current || 1;
    const frac = Math.min(1, Math.max(0, x / w));
    const raw = min + frac * (max - min);
    const snapped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, snapped));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => onChange(valueFromX(e.nativeEvent.locationX)),
      onPanResponderMove: e => onChange(valueFromX(e.nativeEvent.locationX)),
    }),
  ).current;

  const frac = useMemo(() => {
    if (max === min) {
      return 0;
    }
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
  }, [value, min, max]);

  const fillWidth = frac * width;
  const thumbLeft = frac * width - THUMB / 2;

  return (
    <View style={styles.wrap} onLayout={onLayout} {...responder.panHandlers}>
      <View style={styles.track} />
      <View style={[styles.fill, { width: fillWidth }]} />
      <View style={[styles.thumb, { left: thumbLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.track,
  },
  fill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
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
    // 살짝 떠 보이게
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default Slider;
