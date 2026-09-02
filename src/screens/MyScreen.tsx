/**
 * 마이 화면 — 상단 다크 히어로(프로필 + 활동 통계) 아래로
 * 나의 여행 취향 / 관심 코스 / 나의 배지 / 안전 설정을 구성합니다.
 * 안전 설정은 SOS 단축 버튼을 포함한 토글(Switch) 목록입니다.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useAuth } from '../auth/AuthContext';
import { toApiError } from '../api/errors';
import { useMyProfile, userStore } from '../user/userStore';
import {
  preferenceStore,
  usePreferences,
  type PreferenceState,
} from '../preferences/preferenceStore';
import { badgeStore, countEarned, useBadges } from '../badges/badgeStore';
import PreferencePromptScreen from './home/PreferencePromptScreen';
import { useMyView } from '../navigation/useMyView';
import FavoriteCoursesSection from './favorites/FavoriteCoursesSection';
import { favoriteStore } from '../favorites/favoriteStore';
import { highlightPreferences } from '../data/preferences';
import type { Badge, BadgeIcon } from '../types/badge';
import type { BadgeState } from '../badges/badgeStore';
import {
  EMERGENCY_CONTACT,
  PROFILE,
  PROFILE_STATS,
  SAFETY_SETTINGS,
  type SafetyIcon,
} from '../data/profile';
import {
  BellIcon,
  Chevron,
  HeartIcon,
  LockIcon,
  PinIcon,
  ShieldIcon,
  SirenIcon,
  SparkIcon,
} from '../components/icons/UiIcons';

type IconComponent = React.ComponentType<{ color: string; size?: number }>;

const BADGE_ICONS: Record<BadgeIcon, IconComponent> = {
  pin: PinIcon,
  spark: SparkIcon,
  shield: ShieldIcon,
  heart: HeartIcon,
};

const SAFETY_ICONS: Record<SafetyIcon, IconComponent> = {
  siren: SirenIcon,
  pin: PinIcon,
  bell: BellIcon,
  shield: ShieldIcon,
};

function MyScreen() {
  const { logout, withdraw } = useAuth();
  const insets = useSafeAreaInsets();
  const profile = useMyProfile();
  const preferences = usePreferences();
  const badges = useBadges();
  const earnedBadgeCount = countEarned(badges.badges);
  const [refreshing, setRefreshing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 마이 탭에 들어올 때마다 내 정보를 서버 기준으로 다시 불러옵니다.
  // (로그인 직후 한 번만 받으면 다른 기기에서 바꾼 닉네임 등이 반영되지 않습니다)
  useEffect(() => {
    userStore.refresh();
  }, []);

  /** 당겨서 새로고침 — 마이페이지가 보여주는 세 가지를 한 번에 다시 받습니다. */
  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      userStore.refresh(),
      preferenceStore.reload(),
      badgeStore.reload(),
      favoriteStore.reload(),
    ]);
    setRefreshing(false);
  };
  // 취향 편집·저장한 코스는 이 화면 위에 전체 화면으로 띄웁니다.
  // 어느 것이 열려 있는지는 useMyView 가 들고 있습니다 — 앱은 지역 상태,
  // 웹은 주소창(/my/preference, /my/courses) 과 이어진 구현으로 교체됩니다.
  const [view, setView] = useMyView();
  const [safety, setSafety] = useState<Record<string, boolean>>(() =>
    SAFETY_SETTINGS.reduce<Record<string, boolean>>((acc, setting) => {
      acc[setting.key] = setting.defaultOn;
      return acc;
    }, {}),
  );

  const toggleSafety = (key: string) =>
    setSafety(prev => ({ ...prev, [key]: !prev[key] }));

  const confirmLogout = () =>
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        // logout() 은 내부에서 실패를 흡수하므로 결과를 기다리지 않습니다.
        onPress: () => {
          logout();
        },
      },
    ]);

  const confirmWithdrawal = () =>
    Alert.alert(
      '회원탈퇴',
      '탈퇴 즉시 계정 이용이 중지되며, 사용자 데이터와 원본 이미지는 요청 90일 후 영구 삭제됩니다. 정말 탈퇴하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '회원탈퇴',
          style: 'destructive',
          onPress: async () => {
            setIsWithdrawing(true);
            try {
              await withdraw();
            } catch (error) {
              setIsWithdrawing(false);
              Alert.alert(
                '탈퇴하지 못했어요',
                toApiError(error).message,
              );
            }
          },
        },
      ],
    );

  if (view === 'preference') {
    return (
      <PreferencePromptScreen
        initialAnswers={preferences.answers}
        isSaving={preferences.isSaving}
        saveError={preferences.error}
        onBack={() => setView('root')}
        onComplete={async answers => {
          try {
            await preferenceStore.save(answers);
            setView('root');
          } catch {
            // 실패 메시지는 위저드 하단에 뜹니다. 답변이 날아가지 않게 열어둡니다.
          }
        }}
      />
    );
  }

  if (view === 'courses') {
    return (
      <SavedCoursesListScreen onBack={() => setView('root')} />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshAll}
          tintColor={colors.goldDeep}
        />
      }
    >
      {/* ── 다크 히어로: 프로필 + 활동 통계 ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            {/* 카카오 프로필 사진이 있으면 쓰고, 없으면 이름 첫 글자 */}
            {profile.profileImageUrl ? (
              <Image
                source={{ uri: profile.profileImageUrl }}
                style={styles.avatarImage}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text style={styles.avatarText}>{profile.initial}</Text>
            )}
          </View>
          <View style={styles.heroTexts}>
            <Text style={styles.heroName} numberOfLines={1}>
              {profile.displayName}
              <Text style={styles.heroTitle}> · {PROFILE.title}</Text>
            </Text>
            <Text style={styles.heroMeta}>
              혼행 {PROFILE.tripCount}회 · 후기 {PROFILE.reviewCount}개 · 배지{' '}
              {earnedBadgeCount}개
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          {PROFILE_STATS.map(stat => (
            <View key={stat.key} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── 나의 여행 취향 ── */}
      <Section
        title="나의 여행 취향"
        actionLabel={preferences.answers ? '수정' : undefined}
        onAction={() => setView('preference')}
      >
        <TravelPreferenceCard
          state={preferences}
          onStart={() => setView('preference')}
          onRetry={() => preferenceStore.reload()}
        />
      </Section>

      {/* ── 관심 코스 ── */}
      <Section
        title="관심 코스"
        actionLabel="전체"
        onAction={() => setView('courses')}
      >
        <FavoriteCoursesSection limit={2} />
      </Section>

      {/* ── 나의 배지 ── */}
      <Section
        title="나의 배지"
        hint={
          badges.status === 'ready' && badges.badges.length > 0
            ? `${earnedBadgeCount}/${badges.badges.length}`
            : undefined
        }
        actionLabel={badges.badges.length > 0 ? '전체' : undefined}
      >
        <BadgeSection state={badges} onRetry={() => badgeStore.reload()} />
      </Section>

      {/* ── 안전 설정 (토글) ── */}
      <Section title="안전 설정" hint="혼행 필수">
        <View style={styles.card}>
          {SAFETY_SETTINGS.map((setting, index) => {
            const Icon = SAFETY_ICONS[setting.icon];
            const isSos = setting.key === 'sos';
            const on = safety[setting.key];
            return (
              <View key={setting.key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.safetyRow}>
                  <View
                    style={[
                      styles.safetyIcon,
                      isSos ? styles.safetyIconSos : null,
                    ]}
                  >
                    <Icon
                      color={isSos ? colors.danger : colors.goldDeep}
                      size={18}
                    />
                  </View>
                  <View style={styles.safetyTexts}>
                    <Text style={styles.safetyTitle}>{setting.title}</Text>
                    <Text style={styles.safetySub}>{setting.description}</Text>
                  </View>
                  <Switch
                    value={on}
                    onValueChange={() => toggleSafety(setting.key)}
                    trackColor={{
                      false: colors.track,
                      true: isSos ? colors.danger : colors.ink,
                    }}
                    thumbColor="#ffffff"
                    accessibilityLabel={setting.title}
                  />
                </View>

                {/* SOS 가 켜져 있을 때만 발송 대상 노출 */}
                {isSos && on ? (
                  <Pressable
                    style={styles.contactRow}
                    accessibilityRole="button"
                    accessibilityLabel="긴급 연락처 변경"
                  >
                    <Text style={styles.contactLabel}>긴급 연락처</Text>
                    <Text style={styles.contactValue}>
                      {EMERGENCY_CONTACT.name} · {EMERGENCY_CONTACT.phone}
                    </Text>
                    <Chevron
                      direction="right"
                      color={colors.textSecondary}
                      size={16}
                    />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </Section>

      {/* ── 계정 ── */}
      {/* 서버가 이메일을 안 주는 계정이 있어(카카오 동의 항목 미수집) 없으면 연결 상태만 알립니다. */}
      <Section title="계정" hint={profile.email ?? '카카오 계정 연결됨'}>
        <Pressable
          style={styles.logoutBtn}
          onPress={confirmLogout}
          disabled={isWithdrawing}
          accessibilityRole="button"
          accessibilityLabel="로그아웃"
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.withdrawalBtn,
            pressed ? styles.accountBtnPressed : null,
            isWithdrawing ? styles.accountBtnDisabled : null,
          ]}
          onPress={confirmWithdrawal}
          disabled={isWithdrawing}
          accessibilityRole="button"
          accessibilityLabel="회원탈퇴"
          accessibilityState={{ disabled: isWithdrawing }}
        >
          {isWithdrawing ? (
            <ActivityIndicator color={colors.textSecondary} size="small" />
          ) : (
            <Text style={styles.withdrawalText}>회원탈퇴</Text>
          )}
        </Pressable>
      </Section>
    </ScrollView>
  );
}

/** 섹션 헤더 + 본문 */
function SavedCoursesListScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.fullListScreen}>
      <View
        style={[
          styles.fullListHeader,
          { height: 60 + insets.top, paddingTop: insets.top },
        ]}
      >
        <Pressable
          onPress={onBack}
          style={styles.fullListBackButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.fullListTitle}>관심 코스</Text>
        <View style={styles.fullListBackButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.fullListContent}
        showsVerticalScrollIndicator={false}
      >
        <FavoriteCoursesSection />
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  hint,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
        {actionLabel ? (
          <Pressable
            style={styles.moreBtn}
            onPress={onAction}
            accessibilityRole="button"
          >
            <Text style={styles.moreText}>{actionLabel}</Text>
            <Chevron direction="right" color={colors.textSecondary} size={16} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * 나의 여행 취향 카드.
 * 조회 중 / 실패 / 미등록 / 등록됨 네 가지 상태를 모두 다룹니다.
 */
function TravelPreferenceCard({
  state,
  onStart,
  onRetry,
}: {
  state: PreferenceState;
  onStart: () => void;
  onRetry: () => void;
}) {
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <View style={[styles.card, styles.prefPlaceholder]}>
        <ActivityIndicator color={colors.goldDeep} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.card, styles.prefPlaceholder]}>
        <Text style={styles.prefEmptyText}>
          {state.error ?? '취향을 불러오지 못했습니다.'}
        </Text>
        <Pressable
          style={styles.prefCta}
          onPress={onRetry}
          accessibilityRole="button"
        >
          <Text style={styles.prefCtaText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  // 조회는 됐지만 아직 등록한 적이 없는 경우
  if (!state.answers) {
    return (
      <View style={[styles.card, styles.prefPlaceholder]}>
        <Text style={styles.prefEmptyText}>
          아직 여행 취향을 등록하지 않았어요.{'\n'}
          등록하면 취향에 맞는 코스를 추천해드려요.
        </Text>
        <Pressable
          style={styles.prefCta}
          onPress={onStart}
          accessibilityRole="button"
        >
          <Text style={styles.prefCtaText}>취향 등록하기</Text>
        </Pressable>
      </View>
    );
  }

  const highlights = highlightPreferences(state.answers);
  return (
    <View style={styles.card}>
      <PreferenceRow
        label="여행 기간"
        value={highlights.duration ?? '미설정'}
      />
      <PreferenceRow label="여행 페이스" value={highlights.pace ?? '미설정'} />
      <PreferenceRow
        label="하루 예산"
        value={
          highlights.dailyBudget !== null
            ? `${highlights.dailyBudget}만원`
            : '미설정'
        }
      />
      {highlights.moods.length > 0 ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.prefLabel}>좋아하는 무드</Text>
          <View style={styles.moodWrap}>
            {highlights.moods.map(mood => (
              <View key={mood} style={styles.moodPill}>
                <Text style={styles.moodText}>{mood}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** 취향 한 줄 (라벨 - 값) */
function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>{label}</Text>
      <Text style={styles.prefValue}>{value}</Text>
    </View>
  );
}

/** 관심 코스 카드 */
/**
 * 나의 배지 목록.
 * 조회 중 / 실패 / 아직 배지 없음 / 목록 네 가지 상태를 다룹니다.
 */
function BadgeSection({
  state,
  onRetry,
}: {
  state: BadgeState;
  onRetry: () => void;
}) {
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <View style={[styles.card, styles.prefPlaceholder]}>
        <ActivityIndicator color={colors.goldDeep} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.card, styles.prefPlaceholder]}>
        <Text style={styles.prefEmptyText}>
          {state.error ?? '배지를 불러오지 못했습니다.'}
        </Text>
        <Pressable
          style={styles.prefCta}
          onPress={onRetry}
          accessibilityRole="button"
        >
          <Text style={styles.prefCtaText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (state.badges.length === 0) {
    return (
      <View style={[styles.card, styles.prefPlaceholder]}>
        <Text style={styles.prefEmptyText}>
          아직 받은 배지가 없어요.{'\n'}
          여행을 기록하면 배지가 하나씩 열려요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.badgeGrid}>
      {state.badges.map(badge => (
        <BadgeCell key={badge.id} badge={badge} />
      ))}
    </View>
  );
}

/** 배지 한 칸 (미획득은 자물쇠) */
function BadgeCell({ badge }: { badge: Badge }) {
  const Icon = BADGE_ICONS[badge.icon];
  return (
    <View style={styles.badgeCell}>
      <View
        style={[
          styles.badgeCircle,
          badge.earned ? styles.badgeCircleOn : styles.badgeCircleOff,
        ]}
      >
        {badge.earned ? (
          <Icon color={colors.goldDeep} size={22} />
        ) : (
          <LockIcon color={colors.textSecondary} size={18} />
        )}
      </View>
      <Text
        style={[styles.badgeName, badge.earned ? null : styles.badgeNameOff]}
        numberOfLines={1}
      >
        {badge.name}
      </Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>
        {badge.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  fullListScreen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  fullListHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#ffffff',
  },
  fullListBackButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullListTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fullListContent: {
    padding: 20,
    paddingBottom: 32,
  },
  fullListSectionTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fullListDivider: {
    height: 1,
    marginVertical: 28,
    backgroundColor: colors.border,
  },
  content: {
    paddingBottom: 28,
  },

  // 히어로
  hero: {
    backgroundColor: colors.heroBg,
    paddingHorizontal: 20,
    // paddingTop 은 상태바 높이(insets.top)를 더해 인라인으로 지정합니다.
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.mascot,
    alignItems: 'center',
    justifyContent: 'center',
    // 프로필 사진이 원 밖으로 삐져나오지 않도록
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.mascotFace,
  },
  heroTexts: {
    flex: 1,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.heroTextMuted,
  },

  // 히어로 통계
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.heroCard,
    borderWidth: 1,
    borderColor: colors.heroCardBorder,
    borderRadius: 14,
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.heroTextMuted,
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // 섹션 공통
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },

  // 여행 취향
  prefPlaceholder: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 24,
  },
  prefEmptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  prefCta: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.ink,
  },
  prefCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  prefLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  prefValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  moodWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  moodPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // 관심 코스
  courseList: {
    gap: 10,
  },
  emptySavedText: {
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  courseThumb: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseMoon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.goldSoft,
  },
  courseThumbText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  courseBody: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  courseMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  coursePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.safeBg,
  },
  coursePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.safeText,
  },
  heartBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 배지
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  badgeCell: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeCircleOn: {
    backgroundColor: colors.goldSoft,
  },
  badgeCircleOff: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeNameOff: {
    color: colors.textSecondary,
  },
  badgeDesc: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // 안전 설정
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  safetyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyIconSos: {
    backgroundColor: colors.dangerSoft,
  },
  safetyTexts: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  safetySub: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  contactLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  contactValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // 계정
  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  withdrawalBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
    borderRadius: 16,
  },
  withdrawalText: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  accountBtnPressed: {
    backgroundColor: colors.surface,
  },
  accountBtnDisabled: {
    opacity: 0.5,
  },
});

export default MyScreen;
