/**
 * AI 코스 생성 진행 중 전용 로딩 화면.
 * - 중앙 탭바의 샛별이 마스코트(Mascot) 펄스 & 골드 글로우 인터랙션
 * - 큰 헤드라인 크기로 3~4개 단계별 안내 문구 순차 페이드 전환
 * - 하단 탭바 숨김 처리
 * - 오른쪽으로 화면을 밀 때(스와이프 제스처) 뒷면에 '홈 화면으로 이동' 레이어가 자연스럽게 노출
 * - 스와이프 완료 또는 취소 시 백엔드 요청을 abort하고 즉시 홈 화면으로 복귀
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '../../components/icons/TabIcons';
import { Chevron, HomeIcon } from '../../components/icons/UiIcons';
import { colors } from '../../theme/colors';
import type { City } from '../../data/cities';
import type { PreferenceAnswers } from '../../data/preferences';
import { toAiCourseRequest } from '../../api/travelMappers';
import { travelApi } from '../../api/travelApi';
import { toApiError } from '../../api/errors';
import type { AiCourse } from '../../types/travel';
import { preferenceStore } from '../../preferences/preferenceStore';
import { toProfilePreferenceAnswers } from '../../data/preferences';
import { useTabBarVisibility } from '../../navigation/TabBarVisibilityContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  city: City;
  answers: PreferenceAnswers;
  saveToProfile: boolean;
  onSuccess: (course: AiCourse) => void;
  onError: (errorMessage: string) => void;
  onCancel: () => void; // 홈 화면으로 이동
};

export default function CourseLoadingScreen({
  city,
  answers,
  saveToProfile,
  onSuccess,
  onError,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const { setTabBarHidden } = useTabBarVisibility();

  // 1. 하단 탭바 숨김 처리 (마운트 시 숨기고, 언마운트 시 복원)
  useEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [setTabBarHidden]);

  const PHRASES = [
    `${city.name} 혼행 취향을 꼼꼼히 분석하고 있어요 ✨`,
    '안전한 이동 동선과 추천 명소를 매칭하고 있어요 🗺️',
    '취향에 딱 맞는 맛집과 힐링 스팟을 찾고 있어요 ☕',
    '거의 다 되었어요! 나만의 맞춤 일정을 완성 중입니다 🚀',
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const dotProgress = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const abortControllerRef = useRef<AbortController | null>(null);

  // 2. 취소(홈으로 가기) 처리
  const handleCancelAndGoHome = React.useCallback(() => {
    console.log('[CourseLoadingScreen] User cancelled course generation -> going to home.');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onCancel();
  }, [onCancel]);

  // 3. 안드로이드 뒤로가기 버튼 처리
  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancelAndGoHome();
      return true;
    });
    return () => backSub.remove();
  }, [handleCancelAndGoHome]);

  // 4. 왼쪽에서 오른쪽 스와이프 제스처 (PanResponder)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 16 && Math.abs(gestureState.dy) < 35;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          swipeAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100 || gestureState.vx > 0.45) {
          // 스와이프 성공: 화면 슬라이드 아웃 후 홈으로 복귀
          Animated.timing(swipeAnim, {
            toValue: SCREEN_WIDTH,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            handleCancelAndGoHome();
          });
        } else {
          // 스와이프 취소: 원위치 복귀
          Animated.spring(swipeAnim, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  // 5. 샛별이 마스코트 펄스 애니메이션 (숨쉬는 듯한 리듬)
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // 6. 3단 도트 애니메이션
  useEffect(() => {
    const dots = Animated.loop(
      Animated.timing(dotProgress, {
        toValue: 3,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    dots.start();
    return () => dots.stop();
  }, [dotProgress]);

  // 7. 안내 텍스트 2.4초마다 순환 전환 (페이드 인/아웃)
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();

      setPhraseIndex(prev => (prev + 1) % PHRASES.length);
    }, 2400);

    return () => clearInterval(interval);
  }, [fadeAnim, PHRASES.length]);

  // 8. 비동기 AI 코스 생성 API 호출
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const generate = async () => {
      try {
        console.log('[CourseLoadingScreen] Starting course generation for:', city.name);
        const request = toAiCourseRequest(city.name, answers);
        const course = await travelApi.generateAiCourse(request, abortController.signal);

        if (saveToProfile) {
          preferenceStore
            .save(toProfilePreferenceAnswers(answers))
            .catch(err => console.warn('[CourseLoadingScreen] Profile save error:', err));
        }

        if (isMounted) {
          console.log('[CourseLoadingScreen] Course generated successfully.');
          onSuccess(course);
        }
      } catch (err: any) {
        if (!isMounted || abortController.signal.aborted) {
          console.log('[CourseLoadingScreen] Request aborted by user.');
          return;
        }
        console.error('[CourseLoadingScreen] Course generation error:', err);
        const apiError = toApiError(err);
        const errorMsg =
          apiError.message ||
          err?.message ||
          'AI 코스를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.';
        onError(errorMsg);
      }
    };

    generate();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [city.name, answers, saveToProfile, onSuccess, onError]);

  return (
    <View style={styles.rootWrapper}>
      {/* 1) 뒷배경 레이어: 화면을 오른쪽으로 밀 때 노출되는 홈 화면 이동 안내 */}
      <View
        style={[
          styles.underlay,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}>
        <Animated.View
          style={[
            styles.underlayContent,
            {
              opacity: swipeAnim.interpolate({
                inputRange: [0, 40, 120],
                outputRange: [0, 0.5, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateX: swipeAnim.interpolate({
                    inputRange: [0, 120],
                    outputRange: [-24, 0],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  scale: swipeAnim.interpolate({
                    inputRange: [0, 120],
                    outputRange: [0.92, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}>
          <View style={styles.homeIconCircle}>
            <HomeIcon color={colors.primary} size={28} />
          </View>
          <Text style={styles.underlayTitle}>홈 화면으로 이동</Text>
          <Text style={styles.underlaySub}>
            손을 놓으면 생성을 취소하고{'\n'}홈으로 돌아갑니다
          </Text>
        </Animated.View>
      </View>

      {/* 2) 전면 카드 레이어: 스와이프 제스처에 따라 오른쪽으로 밀려남 */}
      <Animated.View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            transform: [{ translateX: swipeAnim }],
          },
        ]}
        {...panResponder.panHandlers}>
        {/* 상단 취소 헤더 영역 */}
        <View style={styles.topHeader}>
          {/* <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.7}
            onPress={handleCancelAndGoHome}>
            <Chevron color={colors.textSecondary} direction="left" size={18} />
            <Text style={styles.cancelBtnText}>홈으로</Text>
          </TouchableOpacity> */}
          <Text style={styles.swipeHintText}>오른쪽으로 밀어 취소</Text>
        </View>

        <View style={styles.centerContent}>
          {/* 가운데 샛별이 마스코트 아이콘 (하단 탭바와 동일한 샛별이 Mascot) */}
          <View style={styles.mascotWrapper}>
            <Animated.View
              style={[
                styles.glowBg,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0.45, 1],
                    outputRange: [0.35, 0.75],
                  }),
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0.45, 1],
                        outputRange: [0.92, 1.28],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.mascotCircle,
                {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0.45, 1],
                        outputRange: [0.97, 1.05],
                      }),
                    },
                  ],
                },
              ]}>
              <Mascot size={74} />
            </Animated.View>
          </View>

          {/* 상단 뱃지 */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{city.name} 맞춤 코스 설계 중</Text>
          </View>

          {/* 메인 타이틀 자리에 3~4개 안내 문구가 큰 크기로 페이드 순환 */}
          <Animated.View style={[styles.titleBox, { opacity: fadeAnim }]}>
            <Text style={styles.headlineTitle}>{PHRASES[phraseIndex]}</Text>
          </Animated.View>

          {/* 3단 타이핑 도트 */}
          <View style={styles.dotsRow}>
            {[0, 1, 2].map(idx => (
              <Animated.View
                key={idx}
                style={[
                  styles.dot,
                  {
                    opacity: dotProgress.interpolate({
                      inputRange: [idx, idx + 0.5, idx + 1, 3],
                      outputRange: [0.25, 1, 0.25, 0.25],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 하단 서브 힌트 */}
        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            혼자 걷기 좋은 최적의 동선을 계산하고 있습니다
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: '#edf2f9',
  },
  underlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingLeft: 28,
    width: '75%',
  },
  underlayContent: {
    alignItems: 'flex-start',
    gap: 8,
  },
  homeIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  underlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  underlaySub: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    shadowColor: '#000000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  topHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 3,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  swipeHintText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
  mascotWrapper: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  glowBg: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.mascotGlow,
  },
  mascotCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.mascotDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  titleBox: {
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  headlineTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
    lineHeight: 30,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.mascotDeep,
  },
  bottomHint: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
