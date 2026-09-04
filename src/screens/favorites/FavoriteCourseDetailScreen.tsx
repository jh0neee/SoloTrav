import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chevron, HeartIcon, ShieldIcon } from '../../components/icons/UiIcons';
import { favoriteStore } from '../../favorites/favoriteStore';
import { colors } from '../../theme/colors';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';
import type { AiRouteFavorite } from '../../types/favorite';
import type { CourseDay, CourseStop } from '../../types/assistant';

type Props = {
  favorite: AiRouteFavorite;
  onBack: () => void;
};

/** 코스 일수 계산 */
function getDurationText(favorite: AiRouteFavorite): string {
  const days = favorite.course?.days?.length ?? 1;
  if (days <= 1) return '당일치기';
  return `${days - 1}박 ${days}일`;
}

/** 금액 포맷 */
function formatCost(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    const text = Number.isInteger(man) ? String(man) : man.toFixed(1);
    return `${text}만원`;
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 카테고리 라벨 */
const CATEGORY_LABEL: Record<string, string> = {
  CAFE: '카페',
  FOOD: '식사',
  RESTAURANT: '식사',
  NATURE_WALK: '자연·산책',
  WALK: '산책',
  NIGHT_VIEW: '야경',
  PHOTO_SPOT: '사진',
  STAY: '숙소',
  MOVE: '이동',
  REST: '휴식',
  CULTURE: '문화',
  MARKET: '시장',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category.toUpperCase()] ?? category;
}

/** 타임라인 정류장 행 */
function TimelineStopRow({ stop, isLast }: { stop: CourseStop; isLast: boolean }) {
  return (
    <View style={styles.stopRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{stop.time ?? '·'}</Text>
      </View>

      <View style={styles.railColumn}>
        <View style={styles.railDot} />
        {isLast ? null : <View style={styles.railLine} />}
      </View>

      <View style={styles.stopBody}>
        <View style={styles.stopHeader}>
          <Text style={styles.stopTitle}>{stop.title}</Text>
          {stop.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {categoryLabel(stop.category)}
              </Text>
            </View>
          ) : null}
        </View>

        {stop.description ? (
          <Text style={styles.stopDescription}>{stop.description}</Text>
        ) : null}

        {stop.transport || stop.estimatedCostKrw !== null ? (
          <View style={styles.metaRow}>
            {stop.transport ? (
              <Text style={styles.metaText}>{stop.transport}</Text>
            ) : null}
            {stop.transport && stop.estimatedCostKrw !== null ? (
              <Text style={styles.metaDot}>·</Text>
            ) : null}
            {stop.estimatedCostKrw !== null ? (
              <Text style={styles.metaText}>
                {formatCost(stop.estimatedCostKrw)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {stop.notes && stop.notes.length > 0
          ? stop.notes.map((note, idx) => (
              <Text key={idx} style={styles.stopNote}>
                · {note}
              </Text>
            ))
          : null}
      </View>
    </View>
  );
}

/** 일차별 섹션 */
function TimelineDaySection({ day }: { day: CourseDay }) {
  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{day.day}일차</Text>
        </View>
        {day.title ? <Text style={styles.dayTitle}>{day.title}</Text> : null}
      </View>

      {day.stops.map((stop, index) => (
        <TimelineStopRow
          key={`${day.day}-${index}`}
          stop={stop}
          isLast={index === day.stops.length - 1}
        />
      ))}
    </View>
  );
}

export default function FavoriteCourseDetailScreen({ favorite, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    if (isRemoving) return;
    Alert.alert('관심 해제', '이 코스를 관심 목록에서 해제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '관심 해제',
        style: 'destructive',
        onPress: async () => {
          setIsRemoving(true);
          try {
            await favoriteStore.remove(favorite.id);
            onBack();
          } catch {
            Alert.alert('해제 실패', '잠시 후 다시 시도해주세요.');
          } finally {
            setIsRemoving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 상단 네비게이션 바 */}
      <View
        style={[
          styles.header,
          { height: 60 + insets.top, paddingTop: insets.top },
        ]}
      >
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>관심 코스 상세</Text>
        <View style={styles.backButton} />
      </View>

      {/* 본문 스크롤 영역 */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 코스 개요 카드 */}
        <View style={styles.heroCard}>
          <View style={styles.heroTagRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{getDurationText(favorite)}</Text>
            </View>
            {favorite.course?.estimatedTotalCostKrw !== null &&
            favorite.course?.estimatedTotalCostKrw !== undefined ? (
              <View style={styles.costPill}>
                <Text style={styles.costPillText}>
                  예상 경비 {favorite.course.estimatedTotalCostKrw.toLocaleString('ko-KR')}원
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.courseTitle}>
            {favorite.title ?? 'AI 추천 여행 코스'}
          </Text>

          {favorite.summary ? (
            <Text style={styles.courseSummary}>{favorite.summary}</Text>
          ) : null}
        </View>

        {/* 상세 여행 동선 */}
        {favorite.course?.days && favorite.course.days.length > 0 ? (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionHeading}>상세 여행 일정</Text>
            {favorite.course.days.map(day => (
              <TimelineDaySection key={day.day} day={day} />
            ))}
          </View>
        ) : null}

        {/* 안전 안내 (Safety Notes) */}
        {favorite.course?.safetyNotes && favorite.course.safetyNotes.length > 0 ? (
          <View style={styles.safetyBox}>
            <View style={styles.safetyHeader}>
              <Text style={styles.safetyTitle}>혼행 안전 가이드</Text>
            </View>
            {favorite.course.safetyNotes.map((note, idx) => (
              <Text key={idx} style={styles.safetyItem}>
                · {note}
              </Text>
            ))}
          </View>
        ) : null}

        {/* 확인 사항 (Assumptions) */}
        {favorite.course?.assumptions && favorite.course.assumptions.length > 0 ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>확인해주세요</Text>
            {favorite.course.assumptions.map((item, idx) => (
              <Text key={idx} style={styles.noticeItem}>
                · {item}
              </Text>
            ))}
          </View>
        ) : null}

        {/* 관심 해제 버튼 */}
        <Pressable
          onPress={handleRemove}
          disabled={isRemoving}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.removeButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="관심 코스 해제"
        >
          <HeartIcon color={colors.danger} size={18} filled />
          <Text style={styles.removeButtonText}>
            {isRemoving ? '해제 중…' : '관심 코스에서 해제'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: TAB_CONTENT_BOTTOM_GAP + 24,
    gap: 16,
  },

  // 코스 개요 카드
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryStrong,
  },
  costPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  costPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  courseTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  courseSummary: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // 타임라인 카드
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  daySection: {
    marginBottom: 18,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stopRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timeColumn: {
    width: 48,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  railColumn: {
    width: 20,
    alignItems: 'center',
  },
  railDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  railLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  stopBody: {
    flex: 1,
    paddingBottom: 18,
    paddingLeft: 8,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stopDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.goldDeep,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  stopNote: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textTertiary,
  },

  // 안전 가이드
  safetyBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryStrong,
  },
  safetyItem: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary,
  },

  // 유의사항
  noticeBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  noticeItem: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  // 해제 버튼
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
  },
  removeButtonPressed: {
    opacity: 0.7,
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
});

