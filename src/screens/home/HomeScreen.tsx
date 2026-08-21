/**
 * 홈 화면 — 다크 히어로(브랜드 + 인사 + 검색 + 충북 요약) 아래로 실데이터 섹션.
 *
 * 공모전 키워드가 '혼자 여행 · 안전' 이라 화면 위쪽일수록 안전 정보를 둡니다.
 *  - 히어로 통계 : 충북에 볼 것이 얼마나 있고, 안전 데이터는 언제 기준인지
 *  - 혼행 랭킹   : 안전한 곳 / 핫한 곳 / 한적한 곳 (지역안전지수 + 지역방문자수)
 *  - 숨은 동네   : 대표 사진 + 치안 등급 + 주말 외지인 비율
 *  - 축제 / 사진 : 행사정보조회, 관광사진갤러리
 *
 * 섹션마다 독립적으로 로딩·실패하므로 하나가 실패해도 나머지는 그대로 뜹니다.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyProfile } from '../../user/userStore';
import { type City } from '../../data/cities';
import { colors } from '../../theme/colors';
import {
  BellIcon,
  Chevron,
  PinIcon,
  SearchIcon,
  ShieldIcon,
  SparkIcon,
} from '../../components/icons/UiIcons';
import {
  FestivalCard,
  PhotoCard,
  RankingRow,
  SectionState,
  StatTile,
} from '../../components/travel/TravelCards';
import {
  safetyOf,
  useCityRankings,
  useGalleryPhotos,
  useRegionSafety,
  useSpotTotal,
  useSpotlightCities,
  useUpcomingFestivals,
  useVisitorStats,
  type SpotlightCity,
  type VisitorMap,
} from '../../travel/homeQueries';
import type { SafetyMap } from '../../travel/homeQueries';
import {
  RANKING_KINDS,
  type RankingKind,
  type TourSpot,
} from '../../types/travel';

type Props = {
  /** 검색 화면 열기 */
  onOpenSearch: () => void;
  /** 도시 선택 화면 열기 */
  onOpenCitySelect: () => void;
  /** 사진첩 화면 열기 */
  onOpenGallery: () => void;
  onSelectCity: (city: City) => void;
  onOpenPreference: () => void;
  /** 축제·장소 카드 탭 → 상세 화면 */
  onSelectSpot: (spot: TourSpot) => void;
  /** 취향 프롬프트를 설정했다면 요약 문구, 아직이면 null */
  preferenceSummary?: string | null;
};

function HomeScreen({
  onOpenSearch,
  onOpenCitySelect,
  onOpenGallery,
  onSelectCity,
  onOpenPreference,
  onSelectSpot,
  preferenceSummary,
}: Props) {
  const insets = useSafeAreaInsets();
  const profile = useMyProfile();
  const hasPreference = !!preferenceSummary;

  const safety = useRegionSafety();
  const visitors = useVisitorStats();
  const spotTotal = useSpotTotal();
  const spotlight = useSpotlightCities();
  const festivals = useUpcomingFestivals();
  const photos = useGalleryPhotos();
  const ranking = useCityRankings();

  const [rankingKind, setRankingKind] = useState<RankingKind>('safe');
  const rankedCities = ranking.rankings[rankingKind].slice(0, 5);
  const rankingCaption =
    RANKING_KINDS.find(kind => kind.id === rankingKind)?.caption ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 히어로 ── */}
      {/* 상태바 높이만큼 내려 브랜드 로고가 노치에 가리지 않게 합니다 */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroTop}>
          <View style={styles.brandRow}>
            <Lighthouse />
            <Text style={styles.brand}>혼행등대</Text>
          </View>
          <View style={styles.bellBtn}>
            <BellIcon color={colors.textPrimary} size={20} />
          </View>
        </View>

        <Text style={styles.heroKicker}>오늘 밤도 안전한 길로</Text>
        <Text style={styles.heroTitle}>
          {profile.displayName}님, 어디로{'\n'}혼자 떠나볼까요?
        </Text>

        {/* 검색 input (누르면 검색 화면으로 이동) */}
        <Pressable
          style={styles.searchBox}
          onPress={onOpenSearch}
          accessibilityRole="search"
          accessibilityLabel="가고 싶은 도시 또는 키워드 검색"
        >
          <SearchIcon color={colors.textSecondary} size={20} />
          <Text style={styles.searchPlaceholder}>
            가고 싶은 도시 또는 키워드
          </Text>
          <View style={styles.searchDivider} />
          <PinIcon color={colors.goldDeep} size={20} />
        </Pressable>
      </View>

      {/* ── 취향 프롬프트 배너 ── */}
      <Pressable
        style={styles.promptCard}
        onPress={onOpenPreference}
        accessibilityRole="button"
        accessibilityLabel="취향 프롬프트 설정하기"
      >
        <View style={styles.promptIcon}>
          <SparkIcon color={colors.goldDeep} size={24} />
        </View>
        <View style={styles.promptTexts}>
          <Text style={styles.promptKicker}>
            {hasPreference ? '취향 프롬프트 설정 완료' : '2분이면 끝!'}
          </Text>
          <Text style={styles.promptTitle}>
            {hasPreference
              ? '취향에 맞춰 코스를 찾는 중이에요'
              : '취향을 알려주시면\n딱 맞는 코스를 찾아드려요'}
          </Text>
          <Text style={styles.promptSub} numberOfLines={2}>
            {hasPreference
              ? preferenceSummary
              : '아직 취향 프롬프트가 비어있어요'}
          </Text>
        </View>
        <View style={styles.promptBtn}>
          <Text style={styles.promptBtnText}>
            {hasPreference ? '수정하기' : '설정하기'}
          </Text>
          <Chevron direction="right" color="#ffffff" size={16} />
        </View>
      </Pressable>

      {/* ── 혼행 랭킹 ── */}
      <View style={styles.section}>
        <SectionHead
          kicker="혼행 랭킹 · 충북 11개 시군"
          title="어떤 기준으로 고를까요?"
          onMore={onOpenCitySelect}
        />

        <View style={styles.rankTabs}>
          {RANKING_KINDS.map(kind => {
            const active = rankingKind === kind.id;
            return (
              <Pressable
                key={kind.id}
                style={[styles.rankTab, active && styles.rankTabActive]}
                onPress={() => setRankingKind(kind.id)}
              >
                <Text
                  style={[
                    styles.rankTabText,
                    active && styles.rankTabTextActive,
                  ]}
                >
                  {kind.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rankCard}>
          <Text style={styles.rankHint}>
            {rankingCaption}
            {rankingKind === 'safe'
              ? ' · 행정안전부 지역안전지수'
              : ranking.visitorBaseLabel
              ? ` · 한국관광공사 지역방문자수 ${ranking.visitorBaseLabel}`
              : ''}
          </Text>

          <SectionState
            status={
              ranking.isLoading ? 'loading' : ranking.error ? 'error' : 'ready'
            }
            error={ranking.error}
            isEmpty={rankedCities.length === 0}
            emptyText="랭킹을 만들 데이터가 아직 없어요"
            onRetry={ranking.reload}
            height={180}
          />

          {rankedCities.map(item => (
            <RankingRow
              key={item.city.id}
              rank={item.rank}
              name={item.city.name}
              value={item.value}
              caption={item.caption}
              safetyGrade={item.safetyGrade}
              onPress={() => onSelectCity(item.city)}
            />
          ))}
        </View>
      </View>

      {/* ── 숨은 동네 ── */}
      <View style={styles.section}>
        <SectionHead
          kicker="SPOTLIGHT · 충북"
          title="등대가 비추는 숨은 동네"
          onMore={onOpenCitySelect}
        />

        <SectionState
          status={spotlight.status}
          error={spotlight.error}
          isEmpty={spotlight.data?.length === 0}
          emptyText="추천할 동네를 불러오지 못했어요"
          onRetry={spotlight.reload}
          height={250}
        />

        {spotlight.data && spotlight.data.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spotlightRow}
          >
            {spotlight.data.map(item => (
              <SpotlightCard
                key={item.city.id}
                item={item}
                safety={safety.data}
                visitors={visitors.data?.stats ?? null}
                onPress={() => onSelectCity(item.city)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* ── 지금 열리는 축제 ── */}
      <View style={styles.section}>
        <SectionHead kicker="FESTIVAL" title="지금 충북에서 열리는 축제" />

        <SectionState
          status={festivals.status}
          error={festivals.error}
          isEmpty={festivals.data?.length === 0}
          emptyText="예정된 축제가 아직 없어요"
          onRetry={festivals.reload}
          height={200}
        />

        {festivals.data && festivals.data.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spotlightRow}
          >
            {festivals.data.map(festival => (
              <FestivalCard
                key={festival.contentId}
                festival={festival}
                onPress={() => onSelectSpot(festival)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* ── 관광사진 갤러리 ── */}
      <View style={styles.section}>
        <SectionHead
          kicker="PHOTO"
          title="사진으로 먼저 만나는 충북"
          moreLabel="더 보기"
          onMore={onOpenGallery}
        />

        <SectionState
          status={photos.status}
          error={photos.error}
          isEmpty={photos.data?.length === 0}
          emptyText="사진을 불러오지 못했어요"
          onRetry={photos.reload}
          height={180}
        />

        {photos.data && photos.data.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {photos.data.map(photo => (
              <PhotoCard key={photo.id} photo={photo} onPress={onOpenGallery} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* ── 빠른 시작 ── */}
      <View style={styles.section}>
        <Text style={styles.quickTitle}>빠른 시작</Text>
        <View style={styles.quickRow}>
          <Pressable
            style={[styles.tile, styles.tileLight]}
            onPress={onOpenCitySelect}
          >
            <View style={styles.tileTop}>
              <SparkIcon color={colors.goldDeep} size={18} />
              <Chevron
                direction="right"
                color={colors.textSecondary}
                size={16}
              />
            </View>
            <Text style={styles.tileTitle}>AI 코스 짜기</Text>
            <Text style={styles.tileSub}>취향 기반 자동 일정</Text>
          </Pressable>

          <Pressable style={[styles.tile, styles.tileDark]}>
            <View style={styles.tileTop}>
              <SparkIcon color="#ffffff" size={18} />
              <Chevron
                direction="right"
                color="rgba(255,255,255,0.7)"
                size={16}
              />
            </View>
            <Text style={[styles.tileTitle, styles.tileTitleDark]}>
              샛별이에게 묻기
            </Text>
            <Text style={[styles.tileSub, styles.tileSubDark]}>
              대화로 여행 계획
            </Text>
          </Pressable>
        </View>
        {/* 충북 요약 — 공공데이터로 채운 세 칸 */}
        <View style={styles.heroStats}>
          <StatTile
            label="충북 관광정보"
            value={
              spotTotal.data !== null && spotTotal.data !== undefined
                ? spotTotal.data.toLocaleString()
                : '—'
            }
            unit="곳"
          />
          <View style={styles.heroStatDivider} />
          <StatTile
            label="진행·예정 축제"
            value={festivals.data ? `${festivals.data.length}` : '—'}
            unit="개"
          />
          <View style={styles.heroStatDivider} />
          <StatTile
            label="안전 데이터"
            value={
              safety.data
                ? `${Object.values(safety.data)[0]?.baseYear ?? '—'}`
                : '—'
            }
            unit="년"
          />
        </View>
      </View>
    </ScrollView>
  );
}

/** 섹션 제목 줄 — 오른쪽 버튼은 onMore 를 준 섹션에만 붙습니다 */
function SectionHead({
  kicker,
  title,
  moreLabel = '전체',
  onMore,
}: {
  kicker: string;
  title: string;
  moreLabel?: string;
  onMore?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionHeadTexts}>
        <Text style={styles.sectionKicker}>{kicker}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onMore ? (
        <Pressable style={styles.moreBtn} onPress={onMore}>
          <Text style={styles.moreText}>{moreLabel}</Text>
          <Chevron direction="right" color={colors.textSecondary} size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** 작은 등대 로고 */
function Lighthouse() {
  return (
    <View style={styles.logo}>
      <View style={styles.logoLight} />
      <View style={styles.logoTower} />
    </View>
  );
}

/**
 * 숨은 동네 카드.
 * 사진은 그 지역 관광정보에서, 치안 등급은 지역안전지수에서, 아래 한 줄은
 * 주말 방문자 집계에서 옵니다 — 세 공공데이터가 카드 하나에 모입니다.
 */
function SpotlightCard({
  item,
  safety,
  visitors,
  onPress,
}: {
  item: SpotlightCity;
  safety: SafetyMap | null;
  visitors: VisitorMap | null;
  onPress: () => void;
}) {
  const { city, imageUrl, imageCaption } = item;
  const citySafety = safetyOf(city, safety);
  const visitor = visitors?.[city.municipalityCode] ?? null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImage}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImagePhoto}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{city.tag}</Text>
        </View>
        {imageCaption ? (
          <Text style={styles.cardCaption} numberOfLines={1}>
            {imageCaption}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCity}>{city.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {city.description}
        </Text>

        {/* 혼행 안전 등급 + 치안 등급 */}
        <View style={styles.cardPills}>
          <View style={[styles.pill, styles.pillSafe]}>
            <ShieldIcon color={colors.safeText} size={14} />
            <Text style={styles.pillSafeText}>
              혼행 안전 {citySafety.grade}
            </Text>
          </View>
          {citySafety.crimeGrade ? (
            <View style={[styles.pill, styles.pillBonus]}>
              <Text style={styles.pillBonusText}>
                치안 {citySafety.crimeGrade}등급
              </Text>
            </View>
          ) : null}
        </View>

        {/* 주말 방문자 — 데이터가 오기 전에는 줄 자체를 숨깁니다 */}
        {visitor ? (
          <Text style={styles.cardVisitor}>
            주말 방문객의 {visitor.visitorRatio}% 가 외지인
            {visitor.changeRate !== null
              ? ` · 4주 전 대비 ${visitor.changeRate > 0 ? '+' : ''}${
                  visitor.changeRate
                }%`
              : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingBottom: 24,
  },

  // 히어로
  hero: {
    backgroundColor: colors.heroBg,
    paddingHorizontal: 20,
    // paddingTop 은 화면에서 insets.top 을 더해 지정합니다.
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: 18,
    letterSpacing: -0.7,
  },
  // 레퍼런스처럼 검색창만 블루 테두리로 시선을 모읍니다.
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 15,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.heroCard,
    borderWidth: 1,
    borderColor: colors.heroCardBorder,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.heroCardBorder,
  },

  // 로고
  logo: {
    alignItems: 'center',
  },
  logoLight: {
    width: 12,
    height: 8,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  logoTower: {
    width: 15,
    height: 15,
    backgroundColor: colors.textPrimary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },

  // 취향 프롬프트 배너
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.promptBannerBorder,
    backgroundColor: colors.promptBanner,
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  promptTexts: {
    flex: 1,
  },
  promptKicker: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bonusText,
    marginBottom: 4,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  promptSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
    lineHeight: 17,
  },
  promptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.ink,
  },
  promptBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // 섹션 공통
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  sectionHeadTexts: {
    flex: 1,
  },
  sectionKicker: {
    color: colors.goldDeep,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // 혼행 랭킹
  rankTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rankTab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankTabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  rankTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: true,
  },
  rankTabTextActive: {
    color: '#ffffff',
  },
  rankCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  rankHint: {
    fontSize: 11,
    color: colors.textSecondary,
    paddingTop: 12,
    paddingBottom: 4,
  },

  // 스포트라이트 카드
  spotlightRow: {
    gap: 14,
    paddingRight: 8,
  },
  photoRow: {
    gap: 10,
    paddingRight: 8,
  },
  card: {
    width: 240,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardImage: {
    height: 110,
    backgroundColor: colors.darkCard,
    padding: 12,
  },
  cardImagePhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBadgeText: {
    color: '#e7e9f0',
    fontSize: 11,
    fontWeight: '600',
  },
  cardCaption: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    // 사진 위 글씨라 그림자로 가독성을 확보합니다.
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardBody: {
    padding: 14,
  },
  cardCity: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
    minHeight: 38,
  },
  cardPills: {
    flexDirection: 'row',
    gap: 8,
  },
  cardVisitor: {
    marginTop: 10,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pillSafe: {
    backgroundColor: colors.safeBg,
  },
  pillSafeText: {
    color: colors.safeText,
    fontSize: 12,
    fontWeight: '600',
  },
  pillBonus: {
    backgroundColor: colors.bonusBg,
  },
  pillBonusText: {
    color: colors.bonusText,
    fontSize: 12,
    fontWeight: '600',
  },

  // 빠른 시작
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    height: 120,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
  },
  tileLight: {
    backgroundColor: colors.primarySoft,
  },
  tileDark: {
    backgroundColor: colors.primary,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 'auto',
  },
  tileTitleDark: {
    color: '#ffffff',
  },
  tileSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tileSubDark: {
    color: 'rgba(255,255,255,0.78)',
  },
});

export default HomeScreen;
