/**
 * 샛별이 화면 배경의 밤하늘.
 *
 * 별 위치는 렌더마다 흔들리면 안 되므로 Math.random 대신 고정 시드 LCG 로
 * 모듈 로드 시 한 번만 계산합니다. (같은 배치가 항상 나옵니다)
 * 화면 전체를 채우기 위해 %(퍼센트) 좌표로 절대배치합니다.
 *
 * size 에 따라 치수를 계산하므로 동적 inline style이 필수라
 * 이 파일에 한해 no-inline-styles 규칙을 끕니다.
 */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';

type Star = {
  /** 화면 너비/높이 대비 위치(%) */
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

const STAR_COUNT = 46;

/** 선형 합동 생성기 — 시드가 같으면 항상 같은 수열이 나옵니다. */
function createRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function createStars(): Star[] {
  const random = createRandom(20260820);
  return Array.from({ length: STAR_COUNT }, () => {
    // 세로로 살짝 길쭉한 타원 — 시안의 별 모양을 따랐습니다.
    const width = 2 + random() * 5;
    return {
      x: random() * 96,
      y: random() * 96,
      width,
      height: width * (1.2 + random() * 1.4),
      opacity: 0.18 + random() * 0.5,
    };
  });
}

const STARS = createStars();

/** 화면 전체를 덮는 별 레이어. 터치는 통과시킵니다. */
function StarField() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((star, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.width,
            height: star.height,
            borderRadius: star.width,
            backgroundColor: colors.chatStar,
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
}

export default StarField;
