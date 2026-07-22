/**
 * 공용 UI 아이콘 (라인 스타일).
 * 외부 아이콘 라이브러리 없이 순수 View로 그려 네이티브 재빌드가 필요 없습니다.
 * size·color 에 따라 치수를 계산하므로 동적 inline style이 필수라
 * 이 파일에 한해 no-inline-styles 규칙을 끕니다.
 */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';

type IconProps = { color: string; size?: number };

/** 방향 화살표 (< 또는 >) */
export function Chevron({
  direction = 'left',
  color,
  size = 18,
}: IconProps & { direction?: 'left' | 'right' }) {
  const s = size * 0.5;
  const rotate = direction === 'left' ? '-135deg' : '45deg';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: s,
          height: s,
          borderTopWidth: 2,
          borderRightWidth: 2,
          borderColor: color,
          transform: [{ rotate }],
        }}
      />
    </View>
  );
}

/** 돋보기 */
export function SearchIcon({ color, size = 20 }: IconProps) {
  const r = size * 0.42;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: r, height: r, borderRadius: r / 2, borderWidth: 2, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          right: 1,
          bottom: 1,
          width: size * 0.34,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** 위치 핀 */
export function PinIcon({ color, size = 20 }: IconProps) {
  const c = size * 0.5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: c, height: c, borderRadius: c / 2, borderWidth: 2, borderColor: color }} />
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -2,
          borderLeftWidth: c * 0.32,
          borderRightWidth: c * 0.32,
          borderTopWidth: c * 0.5,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: c * 0.28,
          width: c * 0.34,
          height: c * 0.34,
          borderRadius: c * 0.17,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** 알림 벨 */
export function BellIcon({ color, size = 22 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View
        style={{
          width: size * 0.6,
          height: size * 0.48,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
          borderBottomWidth: 0,
        }}
      />
      <View style={{ width: size * 0.78, height: 2, borderRadius: 1, backgroundColor: color, marginTop: -1 }} />
      <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 2, borderColor: color, marginTop: 1 }} />
    </View>
  );
}

/** 방패 (안전 등급) */
export function ShieldIcon({ color, size = 16 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.82,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: size * 0.36,
          borderBottomRightRadius: size * 0.36,
        }}
      />
    </View>
  );
}

/** 마이크 (음성 입력) */
export function MicIcon({ color, size = 18 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: size * 0.34, height: size * 0.5, borderRadius: size * 0.17, borderWidth: 2, borderColor: color }} />
      <View
        style={{
          width: size * 0.5,
          height: size * 0.26,
          borderWidth: 2,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.25,
          borderBottomRightRadius: size * 0.25,
          marginTop: -2,
        }}
      />
      <View style={{ width: 2, height: size * 0.12, backgroundColor: color }} />
    </View>
  );
}

/** 반짝임 ✦ (AI/샛별이) */
export function SparkIcon({ color, size = 18 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 2, height: size, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: size, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 1.5, height: size * 0.6, borderRadius: 1, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.6, height: 1.5, borderRadius: 1, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}
