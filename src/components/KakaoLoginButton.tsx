/**
 * 카카오 로그인 버튼.
 * 색상·문구는 카카오 브랜드 가이드를 따르므로 임의로 바꾸지 않습니다.
 * 말풍선 아이콘은 다른 아이콘들과 마찬가지로 순수 View 로 그려
 * 아이콘 라이브러리 없이 동작합니다.
 */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

/** 카카오 말풍선 심볼 */
function KakaoBubble({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size * 0.82,
          borderRadius: size * 0.34,
          backgroundColor: colors.kakaoLabel,
        }}
      />
      {/* 말풍선 꼬리 */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.04,
          left: size * 0.2,
          width: size * 0.24,
          height: size * 0.24,
          backgroundColor: colors.kakaoLabel,
          transform: [{ rotate: '28deg' }],
        }}
      />
    </View>
  );
}

type Props = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

function KakaoLoginButton({ onPress, loading = false, disabled = false }: Props) {
  const inactive = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel="카카오로 시작하기"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && !inactive && styles.buttonPressed,
        inactive && styles.buttonInactive,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.kakaoLabel} />
      ) : (
        <View style={styles.content}>
          <KakaoBubble />
          <Text style={styles.label}>카카오로 시작하기</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.kakaoYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.kakaoYellowPressed,
  },
  buttonInactive: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.kakaoLabel,
  },
});

export default KakaoLoginButton;
