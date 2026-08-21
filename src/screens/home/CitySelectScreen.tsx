/**
 * 도시 선택 화면 — 충북 11개 시군을 안전·방문 데이터로 비교해 고릅니다.
 *
 * 보기 방식이 둘입니다.
 *  - 지도 : 위치 감각으로 고를 때 (기존 지도 칩)
 *  - 목록 : 숫자로 비교할 때 (안전순 / 한적순 / 인기순 정렬)
 *
 * 아래 상세 카드는 공공데이터 네 가지를 한 장에 모읍니다.
 *  지역안전지수(6개 부문) · 지역방문자수(주말 외지인) ·
 *  관광정보 건수(볼거리·먹을거리·잘 곳) · 기초지자체 중심 관광지(많이 찾는 곳)
 *
 * '전국' 탭은 뺐습니다 — 충북 밖은 안전·방문 데이터를 함께 붙일 수 없어
 * 이름만 나열되는 빈 화면이 되기 때문입니다.
 */
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CITIES,
  CITY_TYPE_LABEL,
  type City,
  type CityType,
} from '../../data/cities';
import { cityTypeColors, colors } from '../../theme/colors';
import { Chevron, ShieldIcon } from '../../components/icons/UiIcons';
import {
  FestivalCard,
  RankingRow,
  SafetyBars,
  SectionState,
  StatTile,
  gradeColor,
} from '../../components/travel/TravelCards';
import {
  formatCount,
  formatSigned,
  safetyOf,
  useCityFestivals,
  useCityIntro,
  useCityRankings,
  useRegionSafety,
  useSpotCounts,
  useVisitorStats,
} from '../../travel/homeQueries';
import {
  RANKING_KINDS,
  SAFETY_CATEGORIES,
  SAFETY_GRADE_LABEL,
  type RankingKind,
  type TourSpot,
} from '../../types/travel';

type Props = {
  onBack: () => void;
  onCreateCourse: (city: City) => void;
  /** 둘러보기·축제 카드 탭 → 장소 상세 */
  onSelectSpot: (spot: TourSpot) => void;
  /** 홈 랭킹·스포트라이트에서 넘어올 때 미리 선택할 도시 */
  initialCityId?: string;
};

const VIEW_TABS = ['지도', '목록'] as const;
const CHIP = 54;

function CitySelectScreen({
  onBack,
  onCreateCourse,
  onSelectSpot,
  initialCityId,
}: Props) {
  const insets = useSafeAreaInsets();
  const [viewTab, setViewTab] = useState(0);
  const [sortKind, setSortKind] = useState<RankingKind>('safe');
  const [selectedId, setSelectedId] = useState(initialCityId ?? 'danyang');

  const selected = CITIES.find(c => c.id === selectedId) ?? CITIES[0];

  const safety = useRegionSafety();
  const visitors = useVisitorStats();
  const ranking = useCityRankings();
  const counts = useSpotCounts(selected);
  const intro = useCityIntro(selected);
  const festivals = useCityFestivals(selected);

  const citySafety = safetyOf(selected, safety.data);
  const visitor = visitors.data?.stats[selected.municipalityCode] ?? null;

  const sortedCities = ranking.rankings[sortKind];
  const sortCaption =
    RANKING_KINDS.find(kind => kind.id === sortKind)?.caption ?? '';

  /** 상세 카드의 안전 막대는 등급 6개가 다 있어야 그립니다 */
  const safetyGrades = useMemo(
    () =>
      citySafety.detail
        ? (citySafety.detail.grades as unknown as Record<string, number>)
        : null,
    [citySafety.detail],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>도시 선택</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>어느 동네로{'\n'}떠나볼까요?</Text>
        <Text style={styles.subtitle}>
          충북 11개 시군을 지역안전지수·주말 방문자 데이터로 비교해요
        </Text>

        {/* 지도 / 목록 전환 */}
        <View style={styles.segment}>
          {VIEW_TABS.map((tab, i) => {
            const active = viewTab === i;
            return (
              <Pressable
                key={tab}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setViewTab(i)}>
                <Text
                  style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {viewTab === 0 ? (
          <>
            {/* 지도 */}
            <View style={styles.mapCard}>
              <View style={styles.mapBlob}>
                {CITIES.map(city => (
                  <CityMapChip
                    key={city.id}
                    city={city}
                    selected={city.id === selectedId}
                    crimeGrade={safetyOf(city, safety.data).crimeGrade}
                    onPress={() => setSelectedId(city.id)}
                  />
                ))}
              </View>
            </View>

            {/* 범례 */}
            <View style={styles.legend}>
              {(Object.keys(CITY_TYPE_LABEL) as CityType[]).map(type => (
                <View key={type} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: cityTypeColors[type].ring },
                    ]}
                  />
                  <Text style={styles.legendText}>{CITY_TYPE_LABEL[type]}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.listCard}>
            {/* 정렬 */}
            <View style={styles.sortRow}>
              {RANKING_KINDS.map(kind => {
                const active = sortKind === kind.id;
                return (
                  <Pressable
                    key={kind.id}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                    onPress={() => setSortKind(kind.id)}>
                    <Text
                      style={[
                        styles.sortChipText,
                        active && styles.sortChipTextActive,
                      ]}>
                      {kind.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.sortCaption}>
              {sortCaption}
              {sortKind !== 'safe' && ranking.visitorBaseLabel
                ? ` · ${ranking.visitorBaseLabel}`
                : ''}
            </Text>

            <SectionState
              status={
                ranking.isLoading ? 'loading' : ranking.error ? 'error' : 'ready'
              }
              error={ranking.error}
              isEmpty={sortedCities.length === 0}
              emptyText="비교할 데이터를 불러오지 못했어요"
              onRetry={ranking.reload}
              height={200}
            />

            {sortedCities.map(item => (
              <RankingRow
                key={item.city.id}
                rank={item.rank}
                name={item.city.name}
                value={item.value}
                caption={item.caption}
                safetyGrade={item.safetyGrade}
                onPress={() => setSelectedId(item.city.id)}
              />
            ))}
          </View>
        )}

        {/* ── 선택 도시 상세 ── */}
        <View style={styles.detailCard}>
          <View style={styles.detailHead}>
            <View style={styles.detailNameRow}>
              <Text style={styles.detailName}>{selected.name}</Text>
              <View style={styles.detailTag}>
                <Text style={styles.detailTagText}>{selected.tag}</Text>
              </View>
            </View>
            <View style={styles.gradeRow}>
              <ShieldIcon color={colors.safeText} size={16} />
              <Text style={styles.gradeText}>혼행 안전 {citySafety.grade}</Text>
            </View>
          </View>

          <Text style={styles.detailDesc}>{selected.description}</Text>

          {/* 핵심 수치 3칸 */}
          <View style={styles.statsRow}>
            <StatTile
              label="혼행 안전"
              value={`${citySafety.score}`}
              unit="/100"
            />
            <StatTile
              label="주말 외지인"
              value={visitor ? formatCount(visitor.visitor) : '—'}
            />
            <StatTile
              label="외지인 비율"
              value={visitor ? `${visitor.visitorRatio}` : '—'}
              unit="%"
            />
          </View>

          {visitor?.changeRate !== null && visitor ? (
            <Text style={styles.trendLine}>
              4주 전 같은 요일 대비{' '}
              <Text
                style={[
                  styles.trendValue,
                    // 증감 방향에 따라 색이 달라 inline 이 불가피합니다.
                  {
                    color:
                      (visitor.changeRate ?? 0) >= 0
                        ? colors.safeText
                        : colors.danger,
                  },
                ]}>
                {formatSigned(visitor.changeRate ?? 0)}
              </Text>
              {ranking.visitorBaseLabel ? ` · ${ranking.visitorBaseLabel}` : ''}
            </Text>
          ) : null}

          {/* 지역안전지수 6개 부문 */}
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockTitle}>지역안전지수</Text>
              <Text style={styles.blockNote}>
                {citySafety.isLive
                  ? `행정안전부 ${citySafety.baseYear}년 · 6개 부문 종합 ${citySafety.overallGrade}`
                  : '불러오는 중'}
              </Text>
            </View>

            {safetyGrades ? (
              <>
                <SafetyBars
                  grades={safetyGrades}
                  categories={SAFETY_CATEGORIES}
                  gradeLabels={SAFETY_GRADE_LABEL}
                />
                {citySafety.crimeGrade ? (
                  <Text style={styles.soloNote}>
                    막대가 길수록 안전해요. 혼자 다닐 때 가장 중요한{' '}
                    <Text
                      style={[
                        styles.soloNoteStrong,
                        { color: gradeColor(citySafety.crimeGrade) },
                      ]}>
                      치안은 {SAFETY_GRADE_LABEL[citySafety.crimeGrade]}
                    </Text>{' '}
                    수준이에요.
                  </Text>
                ) : null}
              </>
            ) : (
              <SectionState
                status={safety.status}
                error={safety.error}
                isEmpty={safety.status === 'ready'}
                emptyText="이 지역 안전지수가 없어요"
                onRetry={safety.reload}
                height={90}
              />
            )}
          </View>

          {/* 관광 인프라 건수 */}
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockTitle}>이 동네에 있는 것</Text>
              <Text style={styles.blockNote}>한국관광공사 등록 기준</Text>
            </View>
            <View style={styles.countRow}>
              <CountBox label="관광지" value={counts.data?.attraction} />
              <CountBox label="문화시설" value={counts.data?.culture} />
              <CountBox label="음식점" value={counts.data?.food} />
              <CountBox label="숙박" value={counts.data?.stay} />
            </View>
          </View>

          {/* 많이 찾는 곳 */}
          {intro.data && intro.data.attractions.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockHead}>
                <Text style={styles.blockTitle}>많이 찾는 곳</Text>
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
            style={styles.cta}
            onPress={() => onCreateCourse(selected)}
            accessibilityRole="button">
            <Text style={styles.ctaText}>{selected.name} (으)로 코스 만들기</Text>
            <Chevron direction="right" color="#ffffff" size={18} />
          </Pressable>
        </View>

        {/* 이 동네 축제 */}
        {festivals.data && festivals.data.length > 0 ? (
          <View style={styles.exploreSection}>
            <Text style={styles.exploreTitle}>
              {selected.name}에서 열리는 축제
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exploreRow}>
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

        {/* 둘러보기 */}
        <View style={styles.exploreSection}>
          <Text style={styles.exploreTitle}>{selected.name} 둘러보기</Text>

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
              contentContainerStyle={styles.exploreRow}>
              {intro.data.spots.map(spot => (
                <Pressable
                  key={spot.contentId}
                  style={styles.exploreCard}
                  onPress={() => onSelectSpot(spot)}>
                  {spot.thumbnailUrl ? (
                    <Image
                      source={{ uri: spot.thumbnailUrl }}
                      style={styles.exploreImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.exploreImage, styles.explorePlaceholder]}>
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

/** 지도 위 도시 칩 — 선택 여부와 치안 등급 점을 함께 보여줍니다 */
function CityMapChip({
  city,
  selected,
  crimeGrade,
  onPress,
}: {
  city: City;
  selected: boolean;
  crimeGrade: number | null;
  onPress: () => void;
}) {
  const c = cityTypeColors[city.type];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.mapChip,
        // 위치·선택 색상이 런타임 계산이라 inline 이 불가피합니다.
        // eslint-disable-next-line react-native/no-inline-styles
        {
          left: `${city.pos.x}%`,
          top: `${city.pos.y}%`,
          backgroundColor: selected ? colors.ink : c.bg,
          borderColor: selected ? colors.gold : c.ring,
          borderWidth: selected ? 3 : 1.5,
        },
      ]}>
      <Text
        // eslint-disable-next-line react-native/no-inline-styles
        style={[styles.mapChipText, { color: selected ? '#ffffff' : c.text }]}>
        {city.name}
      </Text>
      {crimeGrade ? (
        <View
          style={[styles.mapChipDot, { backgroundColor: gradeColor(crimeGrade) }]}
        />
      ) : null}
    </Pressable>
  );
}

/** 관광정보 건수 한 칸 — 아직 안 왔으면 '—' */
function CountBox({ label, value }: { label: string; value?: number }) {
  return (
    <View style={styles.countBox}>
      <Text style={styles.countValue}>
        {value === undefined ? '—' : value.toLocaleString()}
      </Text>
      <Text style={styles.countLabel}>{label}</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 34,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 20,
  },

  // 보기 전환
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 21,
    includeFontPadding: true,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },

  // 지도
  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  mapBlob: {
    height: 320,
    borderRadius: 140,
    backgroundColor: colors.mapBlob,
    position: 'relative',
  },
  mapChip: {
    position: 'absolute',
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -CHIP / 2 }, { translateY: -CHIP / 2 }],
  },
  mapChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mapChipDot: {
    position: 'absolute',
    right: 6,
    bottom: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // 범례
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // 목록
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 18,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  sortChipActive: {
    backgroundColor: colors.ink,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: true,
  },
  sortChipTextActive: {
    color: '#ffffff',
  },
  sortCaption: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 10,
  },

  // 상세 카드
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailTag: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bonusText,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.safeText,
  },
  detailDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendLine: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: -6,
  },
  trendValue: {
    fontWeight: '700',
  },

  // 상세 안 블록
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
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  blockNote: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  soloNote: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  soloNoteStrong: {
    fontWeight: '700',
  },

  // 관광정보 건수
  countRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: colors.surface,
  },
  countValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // 많이 찾는 곳
  hubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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
  hubRank: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  hubName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hubCategory: {
    fontSize: 11,
    color: colors.textSecondary,
  },

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
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // 둘러보기 · 축제
  exploreSection: {
    marginTop: 24,
    gap: 12,
  },
  exploreTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exploreRow: {
    gap: 12,
    paddingRight: 8,
  },
  exploreCard: {
    width: 128,
    gap: 6,
  },
  exploreImage: {
    width: 128,
    height: 96,
    borderRadius: 14,
    backgroundColor: colors.darkCard,
  },
  explorePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorePlaceholderText: {
    color: colors.textTertiary,
    fontSize: 26,
    fontWeight: '700',
  },
  exploreName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  exploreType: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

export default CitySelectScreen;
