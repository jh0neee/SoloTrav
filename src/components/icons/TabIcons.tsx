/**
 * 샛별이 마스코트.
 * 일반 탭 아이콘은 phosphor-react-native 를 쓰고, 브랜드 캐릭터인 마스코트만
 * 자체 구현으로 남겨둡니다.
 *
 * size 에 따라 치수를 계산하므로 동적 inline style이 필수라
 * 이 파일에 한해 no-inline-styles 규칙을 끕니다.
 */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../theme/colors';

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
