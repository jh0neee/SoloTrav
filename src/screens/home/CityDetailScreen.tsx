import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';
import { Chevron, ShieldIcon } from '../../components/icons/UiIcons';
import {
  FestivalCard,
  SafetyBars,
  SectionState,
  StatTile,
  safetyStatusColor,
} from '../../components/travel/TravelCards';
import type { City } from '../../data/cities';
import { colors } from '../../theme/colors';
import {
  formatCount,
  safetyOf,
  useCityFestivals,
  useCityIntro,
  useRegionSafety,
  useSpotCounts,
  useVisitorStats,
} from '../../travel/homeQueries';
import {
  SAFETY_CATEGORIES,
  SAFETY_GRADE_LABEL,
  type TourContent,
} from '../../types/travel';

type Props = {
  city: City;
  onBack: () => void;
  onCreateCourse: (city: City) => void;
  onSelectSpot: (spot: TourContent) => void;
};

function CityDetailScreen({
  city,
  onBack,
  onCreateCourse,
  onSelectSpot,
}: Props) {
  const insets = useSafeAreaInsets();
  const safety = useRegionSafety();
  const visitors = useVisitorStats();
  const counts = useSpotCounts(city);
  const intro = useCityIntro(city);
  const festivals = useCityFestivals(city);
  const citySafety = safetyOf(city, safety.data);
  const visitor = visitors.data?.stats[city.municipalityCode] ?? null;
  const safetyGrades = useMemo(
    () =>
      citySafety.detail
        ? (citySafety.detail.grades as unknown as Record<string, number>)
        : null,
    [citySafety.detail],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="도시 선택으로 돌아가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>{city.name} 혼자 가기 전 체크</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <View style={styles.detailHead}>
            <View style={styles.detailNameRow}>
              <Text style={styles.detailName}>{city.name}</Text>
              {city.type === 'decline' ? (
                <View style={styles.detailTag}>
                  <Text style={styles.detailTagText}>인구감소</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.gradeRow}>
              <ShieldIcon
                color={safetyStatusColor(citySafety.status)}
                size={16}
              />
              <Text
                style={[
                  styles.gradeText,
                  citySafety.status === '보통' && styles.gradeTextNormal,
                  citySafety.status === '확인 필요' && styles.gradeTextCheck,
                ]}
              >
                {citySafety.status}
              </Text>
            </View>
          </View>

          <Text style={styles.detailDesc}>{city.description}</Text>

          <View style={styles.statsRow}>
            <StatTile
              label="혼행 안전점수"
              value={`${citySafety.score}`}
              unit="/100"
            />
            <StatTile
              label="주말 여행객"
              value={visitor ? formatCount(visitor.visitor) : '—'}
            />
            <StatTile
              label="여행객 비율"
              value={visitor ? `${visitor.visitorRatio}` : '—'}
              unit="%"
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>혼행 안전지수</Text>
            {safetyGrades ? (
              <>
                <SafetyBars
                  grades={safetyGrades}
                  categories={SAFETY_CATEGORIES}
                  gradeLabels={SAFETY_GRADE_LABEL}
                />
                {citySafety.crimeGrade &&
                citySafety.trafficGrade &&
                citySafety.lifeSafetyGrade ? (
                  <Text style={styles.soloNote}>
                    치안 {citySafety.crimeGrade}등급 · 교통{' '}
                    {citySafety.trafficGrade}등급 · 생활안전{' '}
                    {citySafety.lifeSafetyGrade}등급
                  </Text>
                ) : null}
                <Text style={styles.safetyCaption}>
                  행정안전부 지역안전지수를 혼행 관점에서 재구성했어요.
                </Text>
              </>
            ) : (
              <SectionState
                status={safety.status}
                error={safety.error}
                isEmpty={safety.status === 'ready'}
                emptyText="이 지역 혼행 안전지수가 없어요"
                onRetry={safety.reload}
                height={90}
              />
            )}
          </View>

          {/* 혼자 가기 전 체크 — 이미 받아온 안전지수·관광정보 개수·축제를 출발 전 체크리스트처럼 묶습니다 */}
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockTitle}>혼자 가기 전 체크</Text>
              <Text style={styles.blockNote}>한국관광공사 등록 기준</Text>
            </View>
            <View style={styles.checkList}>
              <CheckRow
                label="혼행 안전지수"
                value={`${citySafety.score}점`}
                note={citySafety.status}
                noteColor={safetyStatusColor(citySafety.status)}
              />
              <CheckRow
                label="혼자 둘러볼 관광지"
                value={formatPlaceCount(counts.data?.attraction)}
              />
              <CheckRow
                label="혼밥 장소 찾아볼 음식점"
                value={formatPlaceCount(counts.data?.food)}
              />
              <CheckRow
                label="혼자 즐길 문화시설"
                value={formatPlaceCount(counts.data?.culture)}
              />
              <CheckRow
                label="혼자 묵을 숙박"
                value={formatPlaceCount(counts.data?.stay)}
              />
              <CheckRow
                label="진행·예정 축제"
                value={
                  festivals.data ? `${festivals.data.length}개` : '—'
                }
              />
            </View>
            <Text style={styles.safetyCaption}>
              혼자 여행할 때 필요한 정보를 출발 전에 미리 확인하세요.
            </Text>
          </View>

          {intro.data && intro.data.attractions.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockHead}>
                <Text style={styles.blockTitle}>혼자 가도 심심하지 않은 곳</Text>
                <Text style={styles.blockNote}>방문 상위 순</Text>
              </View>
              <View style={styles.hubRow}>
                {intro.data.attractions.map(attraction => (
                  <View key={attraction.code} style={styles.hubChip}>
                    <Text style={styles.hubRank}>{attraction.rank}</Text>
                    <Text style={styles.hubName} numberOfLines={1}>
                      {attraction.name}
                    </Text>
                    {attraction.category ? (
                      <Text style={styles.hubCategory}>
                        {attraction.category}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={() => {
              console.log('[CityDetail] onCreateCourse button clicked for:', city.name);
              onCreateCourse(city);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>{city.name} 혼행 코스 만들기</Text>
            <Chevron direction="right" color="#ffffff" size={18} />
          </Pressable>
        </View>

        {festivals.data && festivals.data.length > 0 ? (
          <View style={styles.exploreSection}>
            <Text style={styles.exploreTitle}>혼자 가도 즐기기 좋은 {city.name} 축제</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exploreRow}
            >
              {festivals.data.map(festival => (
                <FestivalCard
                  key={festival.contentId}
                  festival={festival}
                  onPress={() => onSelectSpot(festival)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.exploreSection}>
          <Text style={styles.exploreTitle}>{city.name} 혼자 둘러보기 좋은 곳 탐색</Text>
          <SectionState
            status={intro.status}
            error={intro.error}
            isEmpty={intro.data?.spots.length === 0}
            emptyText="등록된 관광정보가 아직 없어요"
            onRetry={intro.reload}
            height={150}
          />
          {intro.data && intro.data.spots.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exploreRow}
            >
              {intro.data.spots.map(spot => (
                <Pressable
                  key={spot.contentId}
                  style={styles.exploreCard}
                  onPress={() => onSelectSpot(spot)}
                >
                  {spot.thumbnailUrl ? (
                    <Image
                      source={{ uri: spot.thumbnailUrl }}
                      style={styles.exploreImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.exploreImage, styles.explorePlaceholder]}
                    >
                      <Text style={styles.explorePlaceholderText}>
                        {spot.title.slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.exploreName} numberOfLines={1}>
                    {spot.title}
                  </Text>
                  <Text style={styles.exploreType}>{spot.typeLabel}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function formatPlaceCount(value?: number): string {
  return value === undefined ? '—' : `${value.toLocaleString()}곳`;
}

/** 체크리스트 한 줄 — 왼쪽 라벨, 오른쪽 값(+상태 메모) */
function CheckRow({
  label,
  value,
  note,
  noteColor,
}: {
  label: string;
  value: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkBullet} />
      <Text style={styles.checkLabel}>{label}</Text>
      <View style={styles.checkValueWrap}>
        <Text style={styles.checkValue}>{value}</Text>
        {note ? (
          <Text style={[styles.checkNote, noteColor ? { color: noteColor } : null]}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: {
    paddingHorizontal: 20,
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
  },
  detailCard: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailName: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  detailTag: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailTagText: { fontSize: 12, fontWeight: '600', color: colors.bonusText },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gradeText: { fontSize: 13, fontWeight: '600', color: colors.safeText },
  gradeTextNormal: { color: '#a66b00' },
  gradeTextCheck: { color: colors.danger },
  detailDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  block: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  blockTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  blockNote: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  soloNote: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  safetyCaption: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  checkList: {
    borderRadius: 13,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  checkLabel: { flex: 1, fontSize: 13, color: colors.textPrimary },
  checkValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  checkValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  checkNote: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  hubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  hubRank: { fontSize: 11, fontWeight: '700', color: colors.goldDeep },
  hubName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hubCategory: { fontSize: 11, color: colors.textSecondary },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: colors.ink,
    marginTop: 4,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  exploreSection: { marginTop: 24, gap: 12 },
  exploreTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  exploreRow: { gap: 12, paddingRight: 8 },
  exploreCard: { width: 128, gap: 6 },
  exploreImage: {
    width: 128,
    height: 96,
    borderRadius: 14,
    backgroundColor: colors.darkCard,
  },
  explorePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  explorePlaceholderText: {
    color: colors.textTertiary,
    fontSize: 26,
    fontWeight: '700',
  },
  exploreName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  exploreType: { fontSize: 11, color: colors.textSecondary },
});

export default CityDetailScreen;
