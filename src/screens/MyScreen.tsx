/**
 * 마이 화면 — 상단 다크 히어로(프로필 + 활동 통계) 아래로
 * 나의 여행 취향 / 찜한 코스 / 나의 배지 / 안전 설정을 구성합니다.
 * 안전 설정은 SOS 단축 버튼을 포함한 토글(Switch) 목록입니다.
 */
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { getCityById } from '../data/cities';
import {
  BADGES,
  EMERGENCY_CONTACT,
  PROFILE,
  PROFILE_STATS,
  SAFETY_SETTINGS,
  SAVED_COURSES,
  TRAVEL_PREFERENCE,
  type Badge,
  type BadgeIcon,
  type SafetyIcon,
  type SavedCourse,
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

const earnedBadgeCount = BADGES.filter(badge => badge.earned).length;

function MyScreen() {
  // 찜 해제해도 목록에는 남기고 하트만 꺼지도록 id 집합으로 관리합니다.
  const [savedIds, setSavedIds] = useState<string[]>(
    SAVED_COURSES.map(course => course.id),
  );
  const [safety, setSafety] = useState<Record<string, boolean>>(() =>
    SAFETY_SETTINGS.reduce<Record<string, boolean>>((acc, setting) => {
      acc[setting.key] = setting.defaultOn;
      return acc;
    }, {}),
  );

  const toggleSaved = (id: string) =>
    setSavedIds(prev =>
      prev.includes(id) ? prev.filter(saved => saved !== id) : [...prev, id],
    );

  const toggleSafety = (key: string) =>
    setSafety(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* ── 다크 히어로: 프로필 + 활동 통계 ── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{PROFILE.initial}</Text>
          </View>
          <View style={styles.heroTexts}>
            <Text style={styles.heroName} numberOfLines={1}>
              {PROFILE.name}
              <Text style={styles.heroTitle}> · {PROFILE.title}</Text>
            </Text>
            <Text style={styles.heroMeta}>
              혼행 {PROFILE.tripCount}회 · 후기 {PROFILE.reviewCount}개 · 배지{' '}
              {earnedBadgeCount}개
            </Text>
          </View>
          <Pressable
            style={styles.bellBtn}
            accessibilityRole="button"
            accessibilityLabel="알림">
            <BellIcon color="#ffffff" size={20} />
          </Pressable>
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
      <Section title="나의 여행 취향" actionLabel="수정">
        <View style={styles.card}>
          <PreferenceRow label="여행 기간" value={TRAVEL_PREFERENCE.period} />
          <PreferenceRow label="여행 페이스" value={TRAVEL_PREFERENCE.pace} />
          <PreferenceRow
            label="하루 예산"
            value={`${TRAVEL_PREFERENCE.budget}만원`}
          />
          <View style={styles.divider} />
          <Text style={styles.prefLabel}>좋아하는 무드</Text>
          <View style={styles.moodWrap}>
            {TRAVEL_PREFERENCE.moods.map(mood => (
              <View key={mood} style={styles.moodPill}>
                <Text style={styles.moodText}>{mood}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>

      {/* ── 찜한 코스 ── */}
      <Section
        title="찜한 코스"
        hint={`${savedIds.length}개`}
        actionLabel="전체">
        <View style={styles.courseList}>
          {SAVED_COURSES.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              saved={savedIds.includes(course.id)}
              onToggleSave={() => toggleSaved(course.id)}
            />
          ))}
        </View>
      </Section>

      {/* ── 나의 배지 ── */}
      <Section
        title="나의 배지"
        hint={`${earnedBadgeCount}/${BADGES.length}`}
        actionLabel="전체">
        <View style={styles.badgeGrid}>
          {BADGES.map(badge => (
            <BadgeCell key={badge.id} badge={badge} />
          ))}
        </View>
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
                    ]}>
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
                    accessibilityLabel="긴급 연락처 변경">
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
    </ScrollView>
  );
}

/** 섹션 헤더 + 본문 */
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
            accessibilityRole="button">
            <Text style={styles.moreText}>{actionLabel}</Text>
            <Chevron direction="right" color={colors.textSecondary} size={16} />
          </Pressable>
        ) : null}
      </View>
      {children}
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

/** 찜한 코스 카드 */
function CourseCard({
  course,
  saved,
  onToggleSave,
}: {
  course: SavedCourse;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const city = getCityById(course.cityId);
  return (
    <Pressable style={styles.courseCard} accessibilityRole="button">
      <View style={styles.courseThumb}>
        <View style={styles.courseMoon} />
        <Text style={styles.courseThumbText}>{city.name}</Text>
      </View>

      <View style={styles.courseBody}>
        <Text style={styles.courseTitle} numberOfLines={1}>
          {course.title}
        </Text>
        <Text style={styles.courseMeta} numberOfLines={1}>
          {course.period} · {course.spotCount}곳 · {course.savedAt} 저장
        </Text>
        <View style={styles.coursePill}>
          <ShieldIcon color={colors.safeText} size={13} />
          <Text style={styles.coursePillText}>안전 {course.safetyGrade}</Text>
        </View>
      </View>

      <Pressable
        style={styles.heartBtn}
        onPress={onToggleSave}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        accessibilityLabel={saved ? '찜 해제' : '찜하기'}>
        <HeartIcon color={saved ? colors.goldDeep : colors.border} size={20} />
      </Pressable>
    </Pressable>
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
        ]}>
        {badge.earned ? (
          <Icon color={colors.goldDeep} size={22} />
        ) : (
          <LockIcon color={colors.textSecondary} size={18} />
        )}
      </View>
      <Text
        style={[styles.badgeName, badge.earned ? null : styles.badgeNameOff]}
        numberOfLines={1}>
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
  content: {
    paddingBottom: 28,
  },

  // 히어로
  hero: {
    backgroundColor: colors.heroBg,
    paddingHorizontal: 20,
    paddingTop: 18,
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
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.mascotFace,
  },
  heroTexts: {
    flex: 1,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gold,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.heroTextMuted,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '800',
    color: '#ffffff',
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
    fontWeight: '800',
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
    fontWeight: '700',
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

  // 찜한 코스
  courseList: {
    gap: 10,
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
    fontWeight: '800',
    color: '#ffffff',
  },
  courseBody: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    fontWeight: '700',
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
    fontWeight: '800',
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
    fontWeight: '800',
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
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default MyScreen;
