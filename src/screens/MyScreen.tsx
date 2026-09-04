/**
 * 마이 화면 — 상단 다크 히어로(프로필 + 활동 통계) 아래로
 * 나의 여행 취향 / 관심 코스 / 나의 배지 / 안전 설정을 구성합니다.
 * 안전 설정에서는 휴대폰 긴급 SOS와 긴급 정보 카드를 관리합니다.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { recordStore, useRecords } from '../records/recordStore';
import PreferencePromptScreen from './home/PreferencePromptScreen';
import FavoriteCoursesSection from './favorites/FavoriteCoursesSection';
import BlockedUsersScreen from './my/BlockedUsersScreen';
import { favoriteStore } from '../favorites/favoriteStore';
import { blockStore } from '../blocks/blockStore';
import {
  highlightPreferences,
  toProfilePreferenceAnswers,
} from '../data/preferences';
import type {
  Badge,
  BadgeCategory,
  BadgeIcon,
  BadgeImageKey,
} from '../types/badge';
import type { BadgeState } from '../badges/badgeStore';
import { BADGE_IMAGES } from '../assets/badges';
import { Grayscale } from 'react-native-color-matrix-image-filters';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../config/legal';
import { SAFETY_SETTINGS, type SafetyIcon } from '../data/profile';
import {
  Chevron,
  HeartIcon,
  IdCardIcon,
  MedalIcon,
  PinIcon,
  ShieldIcon,
  SirenIcon,
  SparkIcon,
} from '../components/icons/UiIcons';
import SafetyDetailScreen, {
  type SafetyDetailKey,
} from './safety/SafetyDetailScreen';
import { useMyView } from '../navigation/useMyView';
import { TAB_CONTENT_BOTTOM_GAP } from '../navigation/layout';

type IconComponent = React.ComponentType<{ color: string; size?: number }>;

const BADGE_ICONS: Record<BadgeIcon, IconComponent> = {
  pin: PinIcon,
  spark: SparkIcon,
  shield: ShieldIcon,
  heart: HeartIcon,
};

const SAFETY_ICONS: Record<SafetyIcon, IconComponent> = {
  siren: SirenIcon,
  idCard: IdCardIcon,
};

function MyScreen() {
  const { isGuest, logout, withdraw } = useAuth();
  const insets = useSafeAreaInsets();
  const profile = useMyProfile();
  const preferences = usePreferences();
  const badges = useBadges();
  const records = useRecords('mine');
  const visibleBadges = badges.badges.filter(
    badge => badge.category !== 'streak',
  );
  const earnedBadgeCount = countEarned(visibleBadges);
  const [refreshing, setRefreshing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 마이 탭에 들어올 때마다 내 정보를 서버 기준으로 다시 불러옵니다.
  // (로그인 직후 한 번만 받으면 다른 기기에서 바꾼 닉네임 등이 반영되지 않습니다)
  useEffect(() => {
    userStore.refresh();
  }, []);

  /** 당겨서 새로고침 — 마이페이지에 쓰는 서버 데이터를 한 번에 다시 받습니다. */
  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      userStore.refresh(),
      preferenceStore.reload(),
      badgeStore.reload(),
      favoriteStore.reload(),
      recordStore.reload('mine'),
      blockStore.reload(),
    ]);
    setRefreshing(false);
  };
  // 취향 편집·저장한 코스는 이 화면 위에 전체 화면으로 띄웁니다.
  // 어느 것이 열려 있는지는 useMyView 가 들고 있습니다 — 앱은 지역 상태,
  // 웹은 주소창(/my/preference, /my/courses) 과 이어진 구현으로 교체됩니다.
  const [view, setView] = useMyView();
  const [badgeView, setBadgeView] = useState<'main' | 'list' | 'detail'>(
    'main',
  );
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [badgeListScrollOffset, setBadgeListScrollOffset] = useState(0);
  const [safetyDetail, setSafetyDetail] = useState<SafetyDetailKey | null>(null);

  useEffect(() => {
    if (badgeView === 'main') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (badgeView === 'detail') {
        setBadgeView('list');
      } else {
        setBadgeView('main');
      }
      return true;
    });
    return () => sub.remove();
  }, [badgeView]);

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
              Alert.alert('탈퇴하지 못했어요', toApiError(error).message);
            }
          },
        },
      ],
    );

  const openLegalDocument = async (label: string, url: string | null) => {
    if (!url) {
      Alert.alert(
        `${label} 준비 중`,
        '문서 URL은 백엔드 약관 API가 확정되면 연결할 예정입니다.',
      );
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('문서를 열 수 없어요', '잠시 후 다시 시도해주세요.');
    }
  };

  if (view === 'preference') {
    return (
      <PreferencePromptScreen
        mode="profile"
        initialAnswers={preferences.answers}
        isSaving={preferences.isSaving}
        saveError={preferences.error}
        onBack={() => setView('root')}
        onComplete={async answers => {
          try {
            await preferenceStore.save(toProfilePreferenceAnswers(answers));
            setView('root');
          } catch {
            // 실패 메시지는 위저드 하단에 뜹니다. 답변이 날아가지 않게 열어둡니다.
          }
        }}
      />
    );
  }

  if (view === 'courses') {
    return <SavedCoursesListScreen onBack={() => setView('root')} />;
  }

  if (view === 'blocks') {
    return <BlockedUsersScreen onBack={() => setView('root')} />;
  }

  if (badgeView === 'detail' && selectedBadge) {
    return (
      <BadgeDetailScreen
        badge={selectedBadge}
        onBack={() => setBadgeView('list')}
      />
    );
  }

  if (badgeView === 'list') {
    return (
      <BadgesListScreen
        state={badges}
        initialScrollOffset={badgeListScrollOffset}
        onScrollOffset={setBadgeListScrollOffset}
        onBack={() => setBadgeView('main')}
        onSelect={badge => {
          setSelectedBadge(badge);
          setBadgeView('detail');
        }}
      />
    );
  }

  if (safetyDetail) {
    return (
      <SafetyDetailScreen
        type={safetyDetail}
        userId={profile.user?.id ?? 'guest'}
        onBack={() => setSafetyDetail(null)}
      />
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
      {/* ── 프로필 ── */}
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
              {isGuest ? '게스트 (둘러보기 모드)' : profile.displayName}
            </Text>
            <Text style={styles.heroMeta} numberOfLines={1}>
              {isGuest
                ? '로그인하고 여행 기록과 배지를 저장해보세요'
                : profile.email ?? '카카오 계정 연결됨'}
            </Text>
            {!isGuest && records.mine.status === 'ready' ? (
              <Text style={styles.heroActivity}>
                내가 쓴 후기 {records.mine.records.length}개
              </Text>
            ) : null}
          </View>
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
      <Section title="나의 혼행 배지">
        <BadgeSummaryBar
          earnedCount={earnedBadgeCount}
          totalCount={visibleBadges.length}
          isLoading={badges.status === 'idle' || badges.status === 'loading'}
          onPress={() => {
            setSelectedBadge(null);
            setBadgeView('list');
          }}
        />
      </Section>

      {/* ── 안전 설정 ── */}
      <Section title="안전 설정">
        <View style={styles.card}>
          {SAFETY_SETTINGS.map((setting, index) => {
            const Icon = SAFETY_ICONS[setting.icon];
            return (
              <View key={setting.key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.safetyRow,
                    pressed ? styles.safetyRowPressed : null,
                  ]}
                  onPress={() => setSafetyDetail(setting.key)}
                  accessibilityRole="button"
                  accessibilityLabel={setting.title}
                >
                  <View style={styles.safetyIcon}>
                    <Icon color={colors.danger} size={18} />
                  </View>
                  <View style={styles.safetyTexts}>
                    <Text style={styles.safetyTitle}>{setting.title}</Text>
                    <Text style={styles.safetySub}>{setting.description}</Text>
                  </View>
                  <Chevron
                    direction="right"
                    color={colors.textTertiary}
                    size={18}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      </Section>

      {/* ── 커뮤니티 관리 ── */}
      {!isGuest && (
        <Section title="커뮤니티 관리">
          <View style={styles.card}>
            <PolicyRow
              label="차단 목록 관리"
              onPress={() => setView('blocks')}
            />
          </View>
        </Section>
      )}

      {/* ── 약관 및 정책 ── */}
      <Section title="약관 및 정책">
        <View style={styles.card}>
          <PolicyRow
            label="이용약관"
            onPress={() => openLegalDocument('이용약관', TERMS_OF_SERVICE_URL)}
          />
          <View style={styles.divider} />
          <PolicyRow
            label="개인정보 처리방침"
            onPress={() =>
              openLegalDocument('개인정보 처리방침', PRIVACY_POLICY_URL)
            }
          />
        </View>
      </Section>

      {/* ── 계정 ── */}
      {/* 서버가 이메일을 안 주는 계정이 있어(카카오 동의 항목 미수집) 없으면 연결 상태만 알립니다. */}
      <Section title="계정">
        {isGuest ? (
          <View style={styles.guestAccountBox}>
            <Pressable
              style={styles.guestLoginBtn}
              onPress={logout}
              accessibilityRole="button"
              accessibilityLabel="카카오로 로그인하기"
            >
              <Text style={styles.guestLoginText}>카카오로 로그인하기</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.withdrawalBtn,
                pressed ? styles.accountBtnPressed : null,
              ]}
              onPress={logout}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="둘러보기 종료"
            >
              <Text style={styles.withdrawalText}>
                둘러보기 종료 (로그인 화면으로 이동)
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
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
              hitSlop={8}
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
          </>
        )}
      </Section>
    </ScrollView>
  );
}

function PolicyRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label} 보기`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.policyRow,
        pressed && styles.policyRowPressed,
      ]}
    >
      <Text style={styles.policyLabel}>{label}</Text>
      <Chevron direction="right" color={colors.textSecondary} size={16} />
    </Pressable>
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

const BADGE_LIST_SECTIONS: {
  key: string;
  label: string;
  categories: BadgeCategory[];
}[] = [
  { key: 'action', label: '액션', categories: ['exploration'] },
  { key: 'region', label: '지역', categories: ['region'] },
  {
    key: 'safety-record',
    label: '안전·기록',
    categories: ['safety', 'record'],
  },
];

const BADGE_PROGRESS_META: Partial<
  Record<BadgeImageKey, { label: string; unit: string }>
> = {
  '00': { label: '혼행 시작', unit: '단계' },
  '02': { label: 'AI 코스 생성', unit: '회' },
  '03': { label: '여행 취향 등록', unit: '회' },
  '04': { label: '장소 방문 인증', unit: '곳' },
  '05': { label: '축제 방문 인증', unit: '곳' },
  '06': { label: '음식점 방문 인증', unit: '곳' },
  '07': { label: '안전 후기 작성', unit: '개' },
  '08': { label: '안전 후기 작성', unit: '개' },
  '09': { label: '여행 기록 작성', unit: '개' },
  '10': { label: '계절별 여행 기록', unit: '계절' },
  'cb_1': { label: '청주시 방문 인증', unit: '회' },
  'cb_2': { label: '충주시 방문 인증', unit: '회' },
  'cb_3': { label: '제천시 방문 인증', unit: '회' },
  'cb_4': { label: '보은군 방문 인증', unit: '회' },
  'cb_5': { label: '옥천군 방문 인증', unit: '회' },
  'cb_6': { label: '영동군 방문 인증', unit: '회' },
  'cb_7': { label: '증평군 방문 인증', unit: '회' },
  'cb_8': { label: '진천군 방문 인증', unit: '회' },
  'cb_9': { label: '괴산군 방문 인증', unit: '회' },
  'cb_10': { label: '음성군 방문 인증', unit: '회' },
  'cb_11': { label: '단양군 방문 인증', unit: '회' },
};

export function BadgesListScreen({
  state,
  onBack,
  onSelect,
  initialScrollOffset = 0,
  onScrollOffset,
}: {
  state: BadgeState;
  onBack: () => void;
  onSelect: (badge: Badge) => void;
  initialScrollOffset?: number;
  onScrollOffset?: (offset: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const sections = BADGE_LIST_SECTIONS.map(section => ({
    ...section,
    badges: state.badges.filter(badge =>
      section.categories.includes(badge.category),
    ),
  })).filter(section => section.badges.length > 0);

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
        <Text style={styles.fullListTitle}>나의 혼행 배지</Text>
        <View style={styles.fullListBackButton} />
      </View>
      <ScrollView
        contentContainerStyle={styles.badgeListContent}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: initialScrollOffset }}
        onScroll={event =>
          onScrollOffset?.(event.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={16}
      >
        {sections.length ? (
          sections.map(section => (
            <View key={section.key} style={styles.badgeListSection}>
              <Text style={styles.badgeListSectionTitle}>
                {section.label}
              </Text>
              <View style={styles.badgeListGrid}>
                {section.badges.map(badge => (
                  <BadgeCell
                    key={badge.id}
                    badge={badge}
                    onPress={onSelect}
                    variant="list"
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptySavedText}>표시할 배지가 아직 없어요.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export function BadgeDetailScreen({
  badge,
  onBack,
}: {
  badge: Badge;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const Icon = BADGE_ICONS[badge.icon];
  const image = badge.imageKey ? BADGE_IMAGES[badge.imageKey] : null;
  const progress = Math.min(badge.progress, badge.target);
  const isInProgress = !badge.earned && progress > 0;
  const progressMeta =
    (badge.imageKey ? BADGE_PROGRESS_META[badge.imageKey] : undefined) ??
    ({ label: badge.description, unit: '회' } as const);

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
          accessibilityLabel="배지 목록으로 돌아가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.fullListTitle}>배지 상세</Text>
        <View style={styles.fullListBackButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.badgeDetailContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeDetailVisual}>
          {image ? (
            badge.earned ? (
              <Image
                source={image}
                resizeMode="contain"
                style={styles.badgeDetailImage}
              />
            ) : (
              <Grayscale amount={1} style={styles.badgeDetailImageOff}>
                <Image
                  source={image}
                  resizeMode="contain"
                  style={styles.badgeDetailImage}
                />
              </Grayscale>
            )
          ) : (
            <View
              style={[
                styles.badgeDetailFallback,
                badge.earned
                  ? styles.badgeCircleOn
                  : styles.badgeCircleOff,
              ]}
            >
              <Icon
                color={badge.earned ? colors.goldDeep : colors.textTertiary}
                size={72}
              />
            </View>
          )}
        </View>

        <Text style={styles.badgeDetailTitle}>{badge.name}</Text>
        <Text style={styles.badgeDetailDescription}>{badge.description}</Text>

        {badge.earned ? (
          <View style={[styles.badgeDetailResult, styles.badgeDetailResultOn]}>
            {/* <Text
              style={[
                // styles.badgeDetailResultIcon,
                // styles.badgeDetailResultIconOn,
              ]}
            >
              ✓
            </Text> */}
            <Text
              style={[
                styles.badgeDetailResultText,
                styles.badgeDetailResultTextOn,
              ]}
            >
              획득한 배지입니다.
            </Text>
          </View>
        ) : (
          <View style={styles.badgeDetailProgressCard}>
            <View style={styles.badgeDetailProgressRow}>
              <Text style={styles.badgeDetailProgressLabel}>
                {progressMeta.label}
              </Text>
              <Text style={styles.badgeDetailProgressValue}>
                <Text
                  style={
                    isInProgress
                      ? styles.badgeDetailProgressCurrent
                      : styles.badgeDetailProgressCurrentOff
                  }
                >
                  {progress}
                  {progressMeta.unit}
                </Text>{' '}
                / {badge.target}
                {progressMeta.unit}
              </Text>
            </View>
          </View>
        )}
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
  const [showAllMoods, setShowAllMoods] = useState(false);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <View style={[styles.card, styles.prefPlaceholder]}>
        <ActivityIndicator color={colors.goldDeep} />
        <Text style={styles.prefLoadingText}>여행 취향을 불러오는 중이에요</Text>
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
  const moodPreviewLimit = 5;
  const visibleMoods = showAllMoods
    ? highlights.moods
    : highlights.moods.slice(0, moodPreviewLimit);
  const hasHiddenMoods = highlights.moods.length > moodPreviewLimit;
  const avoidSummary = summarizePreferenceList(highlights.avoid);
  const transport = highlights.transport.join(' · ');
  const moveSummary =
    [transport, highlights.moveLoad].filter(Boolean).join(' / ') || '미설정';
  return (
    <View style={[styles.card, styles.preferenceListCard]}>
      <PreferenceRow label="여행 페이스" value={highlights.pace ?? '미설정'} />
      {highlights.dailyBudget ? (
        <PreferenceRow label="하루 예산" value={`${highlights.dailyBudget}만원`} />
      ) : null}
      <PreferenceRow label="피하고 싶은 곳" value={avoidSummary} />
      <PreferenceRow label="이동" value={moveSummary} />
      <PreferenceRow label="계획 스타일" value={highlights.planStyle ?? '미설정'} />
      {highlights.moods.length > 0 ? (
        <View style={styles.moodSection}>
          <View style={styles.moodHeader}>
            <Text style={styles.prefLabel}>좋아하는 무드</Text>
            {hasHiddenMoods ? (
              <Pressable
                style={styles.moodToggle}
                onPress={() => setShowAllMoods(current => !current)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showAllMoods }}
                accessibilityLabel={showAllMoods ? '좋아하는 무드 접기' : '좋아하는 무드 전체 펼쳐보기'}>
                <Text style={styles.moodToggleText}>
                  {showAllMoods
                    ? '접기'
                    : `전체 펼쳐보기 (${highlights.moods.length})`}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.moodWrap}>
            {visibleMoods.map(mood => (
              <View key={mood} style={styles.moodPill}>
                <Text style={styles.moodText}>{mood}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function summarizePreferenceList(values: string[], limit = 2): string {
  if (values.length === 0) {
    return '미설정';
  }
  const visible = values.slice(0, limit).join(' · ');
  return values.length > limit ? `${visible} 외 ${values.length - limit}` : visible;
}

function PreferenceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>{label}</Text>
      <Text style={styles.prefValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** 마이탭에서는 배지 이미지를 펼치지 않고 획득 개수만 요약합니다. */
function BadgeSummaryBar({
  earnedCount,
  totalCount,
  isLoading,
  onPress,
}: {
  earnedCount: number;
  totalCount: number;
  isLoading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.badgeSummaryBar,
        pressed ? styles.badgeSummaryBarPressed : null,
      ]}
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={`혼행 배지 ${totalCount}개 중 ${earnedCount}개 획득, 전체 보기`}
    >
      <View style={styles.badgeSummaryIcon}>
        <MedalIcon color={colors.primaryStrong} size={22} />
      </View>
      <Text style={styles.badgeSummaryText}>
        {isLoading ? (
          '배지를 불러오는 중이에요'
        ) : (
          <>
            {totalCount}개 중{' '}
            <Text style={styles.badgeSummaryCount}>{earnedCount}개</Text>{' '}
            모았어요
          </>
        )}
      </Text>
      <Chevron direction="right" color={colors.textSecondary} size={18} />
    </Pressable>
  );
}

/** 배지 한 칸 (미획득은 흑백, 진행 중이면 상태 칩 표시) */
function BadgeCell({
  badge,
  onPress,
  variant = 'card',
}: {
  badge: Badge;
  onPress: (badge: Badge) => void;
  variant?: 'card' | 'list';
}) {
  const Icon = BADGE_ICONS[badge.icon];
  const image = badge.imageKey ? BADGE_IMAGES[badge.imageKey] : null;
  const isList = variant === 'list';
  const isInProgress = !badge.earned && badge.progress > 0;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.badgeCell,
        isList ? styles.badgeListCell : null,
        pressed ? styles.badgeCellPressed : null,
      ]}
      onPress={() => onPress(badge)}
      accessibilityRole="button"
      accessibilityLabel={`${badge.name} 배지 상세 보기`}
    >
      <View
        style={[styles.badgeVisual, isList ? styles.badgeListVisual : null]}
      >
        {image ? (
          badge.earned ? (
            <Image
              source={image}
              resizeMode="contain"
              style={[styles.badgeImage, isList ? styles.badgeListImage : null]}
            />
          ) : (
            <Grayscale
              amount={1}
              style={[
                styles.badgeImageOff,
                isList ? styles.badgeListImageOff : null,
              ]}
            >
              <Image
                source={image}
                resizeMode="contain"
                style={[
                  styles.badgeImage,
                  isList ? styles.badgeListImage : null,
                ]}
              />
            </Grayscale>
          )
        ) : (
          <View
            style={[
              styles.badgeCircle,
              badge.earned ? styles.badgeCircleOn : styles.badgeCircleOff,
            ]}
          >
            {badge.earned ? <Icon color={colors.goldDeep} size={28} /> : null}
          </View>
        )}
        {isList && isInProgress ? (
          <View style={styles.badgeListProgressPill}>
            <Text style={styles.badgeListProgressText}>진행 중</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.badgeName,
          isList ? styles.badgeListName : null,
          badge.earned ? null : styles.badgeNameOff,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit={isList}
        minimumFontScale={0.75}
      >
        {badge.name}
      </Text>
    </Pressable>
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
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
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
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
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
  heroMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.heroTextMuted,
  },
  heroActivity: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryStrong,
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
  policyRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  policyRowPressed: {
    opacity: 0.55,
  },
  policyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // 여행 취향
  preferenceListCard: {
    paddingVertical: 8,
  },
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
  prefLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
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
    gap: 16,
    minHeight: 38,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prefLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  prefValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  moodSection: {
    paddingTop: 12,
    paddingBottom: 6,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
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
  badgeSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  badgeSummaryBarPressed: {
    backgroundColor: colors.surface,
  },
  badgeSummaryIcon: {
    width: 42,
    height: 42,
    marginRight: 13,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  badgeSummaryText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeSummaryCount: {
    color: colors.primaryStrong,
    fontWeight: '900',
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
  badgeCellPressed: {
    opacity: 0.65,
  },
  badgeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeVisual: {
    width: 82,
    height: 82,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: { width: 82, height: 82 },
  badgeImageOff: { width: 82, height: 82, opacity: 0.48 },
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
  badgeListContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
  },
  badgeListSection: {
    marginTop: 28,
  },
  badgeListSectionTitle: {
    marginBottom: 20,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  badgeListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    rowGap: 28,
  },
  badgeListCell: {
    width: '33.333%',
    minHeight: 136,
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  badgeListVisual: {
    width: 104,
    height: 104,
    marginBottom: 12,
  },
  badgeListImage: {
    width: 104,
    height: 104,
  },
  badgeListImageOff: {
    width: 104,
    height: 104,
  },
  badgeListName: {
    width: '100%',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeListProgressPill: {
    position: 'absolute',
    bottom: -3,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: colors.primaryStrong,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeListProgressText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  badgeDetailContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
  },
  badgeDetailVisual: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDetailImage: {
    width: 260,
    height: 260,
  },
  badgeDetailImageOff: {
    width: 260,
    height: 260,
    opacity: 0.48,
  },
  badgeDetailFallback: {
    width: 230,
    height: 230,
    borderRadius: 115,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDetailTitle: {
    marginTop: 28,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  badgeDetailDescription: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  badgeDetailResult: {
    marginTop: 28,
    minHeight: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    borderWidth: 1,
  },
  badgeDetailResultOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  badgeDetailResultIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    color: colors.textTertiary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeDetailResultIconOn: {
    borderColor: colors.primaryStrong,
    color: colors.primaryStrong,
  },
  badgeDetailResultText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.textSecondary,
  },
  badgeDetailResultTextOn: {
    color: colors.primaryStrong,
  },
  badgeDetailProgressCard: {
    marginTop: 28,
    borderRadius: 18,
    padding: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeDetailProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  badgeDetailProgressLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  badgeDetailProgressValue: {
    flexShrink: 0,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeDetailProgressCurrent: {
    color: colors.primaryStrong,
    fontWeight: '900',
  },
  badgeDetailProgressCurrentOff: {
    color: colors.textSecondary,
    fontWeight: '900',
  },

  // 안전 설정
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 12,
  },
  safetyRowPressed: {
    backgroundColor: colors.surface,
  },
  safetyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  moodToggle: {
    paddingVertical: 4,
  },
  moodToggleText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.primaryStrong,
  },

  // 계정
  guestAccountBox: {
    gap: 10,
  },
  guestLoginBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  guestLoginText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
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
    minHeight: 32,
    marginTop: 4,
    borderRadius: 10,
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
