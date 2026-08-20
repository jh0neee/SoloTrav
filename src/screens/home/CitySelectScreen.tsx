/**
 * 도시 선택 화면.
 * 지도 위 지역 칩을 눌러 도시를 고르고, 하단 상세 카드에서 코스 만들기로 진입합니다.
 *
 * 안전등급·안전점수는 지역안전지수 API 값이고(응답 전에는 정적 기본값),
 * 대표 명소와 둘러보기 카드는 선택한 도시가 바뀔 때마다 다시 조회합니다.
 */
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CITIES,
  CITY_TYPE_LABEL,
  type City,
  type CityType,
} from '../../data/cities';
import { cityTypeColors, colors } from '../../theme/colors';
import { Chevron, ShieldIcon } from '../../components/icons/UiIcons';
import { SectionState } from '../../components/travel/TravelCards';
import {
  safetyOf,
  useCityIntro,
  useRegionSafety,
} from '../../travel/homeQueries';
import type { TourSpot } from '../../types/travel';

type Props = {
  onBack: () => void;
  onCreateCourse: (city: City) => void;
  /** 둘러보기 카드 탭 → 장소 상세 */
  onSelectSpot: (spot: TourSpot) => void;
};

const REGION_TABS = ['충북 시군', '전국'] as const;
const CHIP = 54;

function CitySelectScreen({ onBack, onCreateCourse, onSelectSpot }: Props) {
  const [regionTab, setRegionTab] = useState(0);
  const [selectedId, setSelectedId] = useState('danyang');

  const selected = CITIES.find(c => c.id === selectedId) ?? CITIES[0];
  const safety = useRegionSafety();
  const citySafety = safetyOf(selected, safety.data);
  const intro = useCityIntro(selected);

  return (
    <View style={styles.container}>
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
        <Text style={styles.title}>
          어느 동네로{'\n'}떠나볼까요?
        </Text>
        <Text style={styles.subtitle}>
          도시를 선택하면 안전·트렌드 데이터로 맞춤 코스를 만들어요
        </Text>

        {/* 지역 토글 */}
        <View style={styles.segment}>
          {REGION_TABS.map((tab, i) => {
            const active = regionTab === i;
            return (
              <Pressable
                key={tab}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setRegionTab(i)}>
                <Text
                  style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 지도 */}
        <View style={styles.mapCard}>
          <View style={styles.mapBlob}>
            {CITIES.map(city => (
              <CityMapChip
                key={city.id}
                city={city}
                selected={city.id === selectedId}
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

        {/* 선택 도시 상세 */}
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
              <Text style={styles.gradeText}>안전등급 {citySafety.grade}</Text>
            </View>
          </View>

          <Text style={styles.detailDesc} numberOfLines={2}>
            {selected.description}
          </Text>

          <View style={styles.statsRow}>
            <Stat label="안전 점수" value={`${citySafety.score}`} unit="/100" />
            <Stat label="트렌드" value={`${selected.stats.trend}`} unit="%" />
            <Stat label="추천 가산점" value={`+${selected.stats.bonus}`} unit="" />
          </View>

          {/* 안전 점수 출처 — 임시값과 API 값을 구분해 보여줍니다 */}
          <Text style={styles.safetySource}>
            {citySafety.isLive
              ? `행정안전부 지역안전지수 ${citySafety.baseYear}년 기준`
              : '안전 점수를 불러오는 중이에요'}
          </Text>

          {/* 방문 상위 명소 (기초지자체 중심 관광지) */}
          {intro.data && intro.data.attractions.length > 0 ? (
            <View style={styles.hubBox}>
              <Text style={styles.hubTitle}>많이 찾는 곳</Text>
              <View style={styles.hubRow}>
                {intro.data.attractions.map(attraction => (
                  <View key={attraction.code} style={styles.hubChip}>
                    <Text style={styles.hubRank}>{attraction.rank}</Text>
                    <Text style={styles.hubName} numberOfLines={1}>
                      {attraction.name}
                    </Text>
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

        {/* 이 동네 둘러보기 — 관광정보 카드 */}
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

/** 지도 위 도시 칩 */
function CityMapChip({
  city,
  selected,
  onPress,
}: {
  city: City;
  selected: boolean;
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
    </Pressable>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}>{unit}</Text>
      </Text>
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
    fontWeight: '800',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 34,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 18,
  },

  // 지역 토글
  segment: {
    flexDirection: 'row',
    backgroundColor: '#e8e3d8',
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
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
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
    fontWeight: '700',
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

  // 상세 카드
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '800',
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
    fontWeight: '700',
    color: colors.bonusText,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.safeText,
  },
  detailDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  safetySource: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  // 많이 찾는 곳 (기초지자체 중심 관광지 랭킹)
  hubBox: {
    marginBottom: 18,
    gap: 8,
  },
  hubTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
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
    fontWeight: '800',
    color: colors.goldDeep,
  },
  hubName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // 둘러보기
  exploreSection: {
    marginTop: 24,
    gap: 12,
  },
  exploreTitle: {
    fontSize: 17,
    fontWeight: '800',
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
    color: colors.goldSoft,
    fontSize: 26,
    fontWeight: '800',
  },
  exploreName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exploreType: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 18,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default CitySelectScreen;
