/**
 * 클로드 감성의 Thinking 인디케이터.
 *
 * 샛별이가 질문을 분석하고 코스를 고민하는 과정을 시각화합니다.
 *  - 샛별이 별빛 아이콘(SparkIcon)을 채워진 골드(filled)로 펄스 애니메이션
 *  - 경과 시간에 따른 단계별 안내 문구(0s -> 2.2s -> 5.5s -> 9.5s) 크로스페이드
 *  - 3단 순차 깜빡임 타이핑 도트
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SparkIcon } from '../../components/icons/UiIcons';
import { THINKING_PHASES } from '../../assistant/suggestions';
import { colors } from '../../theme/colors';

export default function ThinkingIndicator() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const dotProgress = useRef(new Animated.Value(0)).current;

  // 채워진 별빛 아이콘 펄스 (숨쉬는 듯한 빛)
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // 도트 순차 깜빡임 애니메이션
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(dotProgress, {
        toValue: 3,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [dotProgress]);

  // 경과 시간에 따른 단계 전환 타이머 (2.2초, 5.5초, 9.5초)
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    THINKING_PHASES.forEach((phase, index) => {
      if (index === 0) {
        return;
      }
      const timer = setTimeout(() => {
        // 문구 교체 시 부드러운 페이드아웃 -> 페이드인
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
        setPhaseIndex(index);
      }, phase.afterMs);
      timers.push(timer);
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [fadeAnim]);

  // 현재 경과 시간 단계에 맞는 문구 표시
  const displayText =
    THINKING_PHASES[phaseIndex]?.text || THINKING_PHASES[0].text;

  return (
    <View style={styles.container}>
      {/* 클로드 스타일 상단 생각 중 헤더 배지 */}
      <View style={styles.thinkingHeader}>
        <Animated.View
          style={{
            opacity: pulseAnim,
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: [0.95, 1.15],
                }),
              },
            ],
          }}>
          <SparkIcon color={colors.mascot} size={15} filled />
        </Animated.View>
        <Text style={styles.thinkingTag}>샛별이 생각 중</Text>
      </View>

      {/* 부드럽게 페이드되는 단계별 안내 문구 */}
      <Animated.View style={[styles.textWrapper, { opacity: fadeAnim }]}>
        <Text style={styles.messageText}>{displayText}</Text>
      </Animated.View>

      {/* 3단 타이핑 도트 */}
      <View style={styles.dots}>
        {[0, 1, 2].map(index => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: dotProgress.interpolate({
                  inputRange: [index, index + 0.5, index + 1, 3],
                  outputRange: [0.25, 1, 0.25, 0.25],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  thinkingTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryStrong,
    letterSpacing: -0.2,
  },
  textWrapper: {
    minHeight: 22,
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.chatBotText,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.chatBubbleMuted,
  },
});
