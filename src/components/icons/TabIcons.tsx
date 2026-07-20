/**
 * 하단 탭용 아이콘 모음.
 * 외부 아이콘 라이브러리 없이 순수 View로 그려 네이티브 재빌드가 필요 없습니다.
 * 모든 아이콘은 { color, size } 를 받아 라인 스타일(외곽선)로 렌더링합니다.
 *
 * size·color 에 따라 치수를 계산하므로 동적 inline style이 필수라
 * 이 파일에 한해 no-inline-styles 규칙을 끕니다.
 */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';

type IconProps = {
  color: string;
  size?: number;
};

const STROKE = 2;

/** 홈 (집 외곽선) */
export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.16,
          width: size * 0.42,
          height: size * 0.42,
          borderTopWidth: STROKE,
          borderLeftWidth: STROKE,
          borderColor: color,
          borderTopLeftRadius: 3,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          width: size * 0.6,
          height: size * 0.4,
          borderWidth: STROKE,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          marginBottom: size * 0.14,
        }}
      />
    </View>
  );
}

/** 지도 (접힌 지도) */
export function MapIcon({ color, size = 24 }: IconProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.56,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 3,
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          overflow: 'hidden',
        }}>
        <View style={{ width: 1.5, height: '100%', backgroundColor: color }} />
        <View style={{ width: 1.5, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
}

/** 기록 (문서/리스트) */
export function RecordIcon({ color, size = 24 }: IconProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          width: size * 0.64,
          height: size * 0.56,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 3,
          paddingHorizontal: size * 0.14,
          paddingVertical: size * 0.13,
          justifyContent: 'space-between',
        }}>
        <View style={{ height: 2, width: '85%', backgroundColor: color, borderRadius: 1 }} />
        <View style={{ height: 2, width: '100%', backgroundColor: color, borderRadius: 1 }} />
        <View style={{ height: 2, width: '60%', backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

/** 마이 (사람 실루엣 외곽선) */
export function ProfileIcon({ color, size = 24 }: IconProps) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size * 0.17,
          borderWidth: STROKE,
          borderColor: color,
          marginBottom: size * 0.05,
        }}
      />
      <View
        style={{
          width: size * 0.6,
          height: size * 0.28,
          borderWidth: STROKE,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
        }}
      />
    </View>
  );
}

/**
 * 샛별이 마스코트 — 금색 원 + 귀여운 얼굴(눈·미소) + 반짝임.
 * 가운데 탭에서 볼록 튀어나온 버튼으로 사용합니다.
 */
export function Mascot({ size = 52 }: { size?: number }) {
  const eye = size * 0.1;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.mascot,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {/* 눈 */}
      <View style={{ flexDirection: 'row', marginBottom: size * 0.05 }}>
        <View
          style={{
            width: eye,
            height: eye * 1.25,
            borderRadius: eye,
            backgroundColor: colors.mascotFace,
            marginHorizontal: eye * 0.75,
          }}
        />
        <View
          style={{
            width: eye,
            height: eye * 1.25,
            borderRadius: eye,
            backgroundColor: colors.mascotFace,
            marginHorizontal: eye * 0.75,
          }}
        />
      </View>
      {/* 미소 */}
      <View
        style={{
          width: size * 0.24,
          height: size * 0.12,
          borderBottomWidth: 2,
          borderColor: colors.mascotFace,
          borderBottomLeftRadius: size * 0.12,
          borderBottomRightRadius: size * 0.12,
        }}
      />
      {/* 반짝임 ✦ */}
      <View style={{ position: 'absolute', top: size * 0.14, right: size * 0.16, width: 8, height: 8 }}>
        <View style={{ position: 'absolute', left: 3, width: 2, height: 8, borderRadius: 1, backgroundColor: '#fff' }} />
        <View style={{ position: 'absolute', top: 3, width: 8, height: 2, borderRadius: 1, backgroundColor: '#fff' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
