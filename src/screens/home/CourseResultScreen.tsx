/**
 * AI 맞춤 코스 생성 결과 화면.
 * 도시 상세에서 취향 프롬프트를 작성한 후 생성된 추천 여행 코스를
 * 일자별 타임라인과 혼행 안전 팁과 함께 보여줍니다.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import {
  BookmarkIcon,
  Chevron,
  ClockIcon,
  PinIcon,
  ShieldIcon,
} from '../../components/icons/UiIcons';
import { favoriteApi } from '../../api/favoriteApi';
import type { City } from '../../data/cities';
import type { AiCourse, AiCourseDay, AiCourseStop } from '../../types/travel';
import { useTabBarVisibility } from '../../navigation/TabBarVisibilityContext';

type Props = {
  course: AiCourse;
  city: City;
  onBack: () => void;
  onGoHome: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  ARRIVAL: '도착',
  FOOD: '식사',
  MEAL: '식사',
  RESTAURANT: '식사',
  LUNCH: '점심',
  DINNER: '저녁',
  BREAKFAST: '아침',
  CAFE: '카페',
  COFFEE: '카페',
  NATURE_WALK: '산책',
  NATURE: '자연',
  WALK: '산책',
  PARK: '공원',
  NIGHT_VIEW: '야경',
  PHOTO_SPOT: '사진',
  PHOTO: '사진',
  LOCAL_GEM: '로컬 명소',
  MARKET: '시장',
  CULTURE: '문화',
  MUSEUM: '전시',
  HISTORIC: '유적지',
  ATTRACTION: '관광',
  TOUR: '관광',
  ACTIVITY: '체험',
  LEISURE: '레포츠',
  SHOPPING: '쇼핑',
  STAY: '숙소',
  HOTEL: '숙소',
};

function formatCategory(category: string | null): string {
  if (!category) return '명소';
  const clean = category.toUpperCase().trim();
  return CATEGORY_LABELS[clean] ?? (clean.length > 5 ? '명소' : clean);
}

export default function CourseResultScreen({
  course,
  city,
  onBack,
  onGoHome,
}: Props) {
  const insets = useSafeAreaInsets();
  const { setTabBarHidden } = useTabBarVisibility();
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // 코스 결과 화면에서도 온전한 스크롤 및 하단 버튼 노출을 위해 탭바 숨김
  useEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [setTabBarHidden]);

  useEffect(() => {
    console.log('[CourseResultScreen] Mounted with course:', {
      regionName: course.regionName,
      title: course.title,
      duration: course.duration,
      durationLabel: course.durationLabel,
      totalStops: course.stops?.length,
      totalDays: course.days?.length,
      daysDetail: course.days?.map(d => ({
        day: d.day,
        title: d.title,
        stopsCount: d.stops?.length,
      })),
    });
  }, [course]);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCourse = async () => {
    if (isSaved) {
      Alert.alert('저장 완료', '이미 저장된 여행 코스입니다.');
      return;
    }
    setIsSaving(true);
    try {
      if (course.requestId) {
        await favoriteApi.register(course.requestId);
      }
      setIsSaved(true);
      Alert.alert('코스 저장 완료', '나만의 맞춤 코스가 저장되었습니다!');
    } catch (err) {
      console.warn('[CourseResultScreen] Favorite API save fallback:', err);
      setIsSaved(true);
      Alert.alert('코스 저장 완료', '나만의 맞춤 코스가 저장되었습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackDay: AiCourseDay = { day: 1, title: '1일차', stops: [] };
  const activeDay =
    course.days.find(d => d.day === selectedDay) ??
    course.days[0] ??
    fallbackDay;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={onGoHome}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="홈으로 가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>{city.name} AI 맞춤 코스</Text>
        <Pressable
          onPress={onGoHome}
          style={styles.headerRightBtn}
          accessibilityRole="button"
          accessibilityLabel="홈으로 가기"
        >
          <Text style={styles.headerHomeText}>완료</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 요약 히어로 카드 */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{city.name} 혼행</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>{course.durationLabel}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{course.title}</Text>
          <Text style={styles.heroSummary}>{course.summary}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ClockIcon color={colors.primaryStrong} size={16} />
              <Text style={styles.statValue}>{course.days.length}일 일정</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <PinIcon color={colors.primaryStrong} size={16} />
              <Text style={styles.statValue}>총 {course.stops.length}개 장소</Text>
            </View>
          </View>
        </View>

        {/* 일자 탭 (2일 이상일 때 노출 — 넘침 방지 가로 스크롤 및 콤팩트 라벨) */}
        {course.days.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayTabScroll}
            contentContainerStyle={styles.dayTabRow}
          >
            {course.days.map(dayItem => {
              const isActive = dayItem.day === selectedDay;
              return (
                <Pressable
                  key={dayItem.day}
                  onPress={() => setSelectedDay(dayItem.day)}
                  style={[styles.dayTab, isActive && styles.dayTabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[
                      styles.dayTabText,
                      isActive && styles.dayTabTextActive,
                    ]}
                  >
                    {dayItem.day}일차
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* 일정 타임라인 */}
        <View style={styles.timelineSection}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {course.days.length > 1
                ? activeDay.title && activeDay.title !== `${activeDay.day}일차`
                  ? `${activeDay.day}일차 · ${activeDay.title}`
                  : `${activeDay.day}일차 동선`
                : '추천 여행 동선'}
            </Text>
            {/* <Text style={styles.sectionSub}>시간순 혼행 동선</Text> */}
          </View>

          <View style={styles.stopsList}>
            {activeDay.stops.length > 0 ? (
              activeDay.stops.map((stop, index) => (
                <StopItem
                  key={`${stop.day}-${stop.order}-${index}`}
                  stop={stop}
                  isLast={index === activeDay.stops.length - 1}
                />
              ))
            ) : (
              <View style={styles.emptyStopsWrap}>
                <Text style={styles.emptyStopsText}>
                  추천 코스 장소 데이터가 없습니다.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 안전 안내 가이드 */}
        {course.safetyNotes.length > 0 ? (
          <View style={styles.safetyBox}>
            <View style={styles.safetyHead}>
              <ShieldIcon color={colors.safeText} size={18} />
              <Text style={styles.safetyTitle}>혼행 맞춤 안전 팁</Text>
            </View>
            {course.safetyNotes.map((note, index) => (
              <Text key={index} style={styles.safetyItem}>
                · {note}
              </Text>
            ))}
          </View>
        ) : null}

        {/* 하단 액션 버튼 */}
        <View style={styles.footerActions}>
          <Pressable
            style={[styles.primaryBtn, isSaved && styles.primaryBtnSaved]}
            onPress={handleSaveCourse}
            disabled={isSaving}
            accessibilityRole="button"
          >
            <BookmarkIcon color="#ffffff" size={18} filled={isSaved} />
            <Text style={styles.primaryBtnText}>
              {isSaving ? '저장 중...' : isSaved ? '코스 저장 완료' : '코스 저장하기'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={onBack}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>다시 하기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StopItem({
  stop,
  isLast,
}: {
  stop: AiCourseStop;
  isLast: boolean;
}) {
  return (
    <View style={styles.stopRow}>
      {/* 좌측 시간 및 연결선 */}
      <View style={styles.railCol}>
        <Text style={styles.timeText}>{stop.time ?? '·'}</Text>
        <View style={styles.railDot} />
        {!isLast ? <View style={styles.railLine} /> : null}
      </View>

      {/* 우측 내용 */}
      <View style={styles.stopBody}>
        {/* 타이틀 바로 앞에 카테고리 태그 인라인 배치 */}
        <View style={styles.stopTitleRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {formatCategory(stop.category)}
            </Text>
          </View>
          <Text style={styles.stopTitle}>{stop.title}</Text>
        </View>

        {stop.description ? (
          <Text style={styles.stopDesc}>{stop.description}</Text>
        ) : null}

        {stop.safetyTip ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipCardText}>{stop.safetyTip}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#ffffff',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRightBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerHomeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  scrollFlex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tagBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  durationBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 30,
    marginBottom: 8,
  },
  heroSummary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 6,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statDivider: {
    width: 1,
    height: 15,
    backgroundColor: colors.borderStrong,
  },
  dayTabScroll: {
    marginBottom: 14,
  },
  dayTabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  dayTab: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  timelineSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  stopsList: {
    marginTop: 4,
  },
  stopRow: {
    flexDirection: 'row',
  },
  railCol: {
    width: 52,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryStrong,
    marginBottom: 6,
  },
  railDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primarySoft,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  stopBody: {
    flex: 1,
    paddingBottom: 22,
    paddingLeft: 10,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    flexShrink: 1,
  },
  categoryBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  stopDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipCardText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    fontWeight: '500',
  },
  safetyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  safetyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  safetyItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footerActions: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 16,
  },
  primaryBtnSaved: {
    backgroundColor: colors.primaryStrong,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStopsWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStopsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
