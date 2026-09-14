/**
 * AI 코스 생성 실패 전용 화면.
 * 일시적 네트워크 오류나 백엔드 생성 실패 시 호출되며,
 * 재시도, 취향 수정, 홈으로 돌아가기 기능을 제공합니다.
 *
 * 둘러보기(게스트 모드)에서는 서버가 코스를 만들어 주지 않으므로
 * 오류 대신 "로그인하면 취향 기반 코스를 받을 수 있다"는 안내로 유도합니다.
 */
import React, { useEffect } from 'react';
import {
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Chevron,
  RefreshIcon,
  SparkIcon,
  WarningCircle,
} from '../../components/icons/UiIcons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../auth/AuthContext';
import type { City } from '../../data/cities';
import { useTabBarVisibility } from '../../navigation/TabBarVisibilityContext';

type Props = {
  city: City;
  errorMessage?: string;
  onRetry: () => void;
  onEditPreference: () => void;
  onGoHome: () => void;
};

export default function CourseErrorScreen({
  city,
  errorMessage,
  onRetry,
  onEditPreference,
  onGoHome,
}: Props) {
  const insets = useSafeAreaInsets();
  const { setTabBarHidden } = useTabBarVisibility();
  const { isGuest, logout } = useAuth();

  // 1. 하단 탭바 숨김 처리
  useEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [setTabBarHidden]);

  // 2. 안드로이드 하드웨어 뒤로가기 시 홈으로 복귀
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onGoHome();
      return true;
    });
    return () => sub.remove();
  }, [onGoHome]);

  const displayError =
    errorMessage && errorMessage.trim().length > 0
      ? errorMessage
      : '일시적인 네트워크 지연이나 응답 지연이 발생했습니다.';

  // 게스트 모드: 로그인 화면으로 보내는 안내 화면으로 대체
  // (logout 은 게스트 세션을 비우고 status 를 unauthenticated 로 돌려 로그인 화면이 뜹니다)
  if (isGuest) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            activeOpacity={0.7}
            onPress={onGoHome}
            accessibilityRole="button"
            accessibilityLabel="홈으로 가기">
            <Chevron direction="left" color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>혼자 떠나는 {city.name} 코스</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.centerContent}>
          <View style={styles.iconWrapper}>
            <View style={[styles.glowBg, styles.glowBgGuest]} />
            <View style={[styles.iconCircle, styles.iconCircleGuest]}>
              <SparkIcon color={colors.primary} size={40} filled />
            </View>
          </View>

          <View style={[styles.badge, styles.badgeGuest]}>
            <Text style={[styles.badgeText, styles.badgeTextGuest]}>
              로그인하면 열려요
            </Text>
          </View>

          <Text style={styles.title}>
            {city.name} 혼행 코스는{'\n'}로그인 후 받아볼 수 있어요
          </Text>
          <Text style={styles.subtitle}>
            로그인하면 샛별이가 내 혼행 스타일을 바탕으로{'\n'}
            혼자 떠나는 {city.name} 일정을 설계해 드려요.
          </Text>

          <View style={styles.benefitBox}>
            {[
              '내 혼행 스타일에 딱 맞는 AI 코스',
              '만든 코스와 혼행 기록 저장',
              '혼행의 흔적(배지) 모으기',
            ].map(item => (
              <View key={item} style={styles.benefitRow}>
                <SparkIcon color={colors.primary} size={14} filled />
                <Text style={styles.benefitText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel="로그인하고 맞춤 코스 받기">
            <Text style={styles.primaryButtonText}>로그인하고 맞춤 코스 받기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textButton}
            activeOpacity={0.7}
            onPress={onGoHome}>
            <Text style={styles.textButtonText}>계속 둘러보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* 상단 헤더: < 버튼 누르면 홈으로 이동 */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          activeOpacity={0.7}
          onPress={onGoHome}
          accessibilityRole="button"
          accessibilityLabel="홈으로 가기">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>혼자 떠나는 {city.name} 코스</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
      {/* 중앙 에러 상태 영역 */}
      <View style={styles.centerContent}>
        <View style={styles.iconWrapper}>
          <View style={styles.glowBg} />
          <View style={styles.iconCircle}>
            <WarningCircle color="#EF4444" size={40} />
          </View>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{city.name} 코스 생성 안내</Text>
        </View>

        <Text style={styles.title}>코스를 완성하지 못했어요</Text>
        <Text style={styles.subtitle}>
          샛별이가 일정을 설계하는 도중 문제가 생겼습니다.{'\n'}
          잠시 후 다시 시도해보시거나 조건을 변경해 보세요.
        </Text>

        {/* 에러 상세 박스 */}
        <View style={styles.errorBox}>
          <Text style={styles.errorLabel}>안내 사항</Text>
          <Text style={styles.errorText} numberOfLines={3}>
            {displayError}
          </Text>
        </View>
      </View>

      {/* 하단 버튼 그룹 */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onRetry}>
          <RefreshIcon color="#FFFFFF" size={18} />
          <Text style={styles.primaryButtonText}>다시 시도하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={onEditPreference}>
          <Text style={styles.secondaryButtonText}>취향 조건 수정하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          activeOpacity={0.7}
          onPress={onGoHome}>
          <Text style={styles.textButtonText}>홈으로 가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconWrapper: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  glowBg: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBgGuest: {
    backgroundColor: colors.primarySoft,
  },
  iconCircleGuest: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  badgeGuest: {
    backgroundColor: colors.primarySoft,
  },
  badgeTextGuest: {
    color: colors.primaryStrong,
  },
  benefitBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bottomActions: {
    width: '100%',
    paddingBottom: 24,
    gap: 10,
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  textButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textButtonText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
  },
});
