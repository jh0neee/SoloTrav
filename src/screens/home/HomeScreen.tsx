/**
 * 홈 화면 — 상단 다크 히어로(브랜드 + 인사 + 검색) + 실데이터 섹션 3개 + 빠른 시작.
 *
 * 섹션은 모두 서버 API 로 채웁니다.
 *  - 숨은 동네   : 지역안전지수(안전등급) + 관광정보(대표 사진)
 *  - 지금 축제   : 행사정보조회
 *  - 계절 사진   : 관광사진갤러리
 *
 * 섹션마다 독립적으로 로딩·실패하므로 하나가 실패해도 나머지는 그대로 뜹니다.
 */
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMyProfile } from '../../user/userStore';
import { type City } from '../../data/cities';
import { colors } from '../../theme/colors';
import {
  BellIcon,
  Chevron,
  PinIcon,
  SearchIcon,
  SparkIcon,
} from '../../components/icons/UiIcons';
import {
  FestivalCard,
  PhotoCard,
  SafetyPill,
  SectionState,
} from '../../components/travel/TravelCards';
import {
  safetyOf,
  useGalleryPhotos,
  useRegionSafety,
  useSpotlightCities,
  useUpcomingFestivals,
  type SpotlightCity,
} from '../../travel/homeQueries';
import type { SafetyMap } from '../../travel/homeQueries';
import type { TourSpot } from '../../types/travel';

type Props = {
  /** 검색 화면 열기 */
  onOpenSearch: () => void;
  /** 도시 선택 화면 열기 */
  onOpenCitySelect: () => void;
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
  onSelectCity,
  onOpenPreference,
  onSelectSpot,
  preferenceSummary,
}: Props) {
  const profile = useMyProfile();
  const hasPreference = !!preferenceSummary;

  const safety = useRegionSafety();
  const spotlight = useSpotlightCities();
  const festivals = useUpcomingFestivals();
  const photos = useGalleryPhotos();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* ── 다크 히어로 ── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.brandRow}>
            <Lighthouse />
            <Text style={styles.brand}>혼행등대</Text>
          </View>
          <View style={styles.bellBtn}>
            <BellIcon color="#ffffff" size={20} />
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
          accessibilityLabel="가고 싶은 도시 또는 키워드 검색">
          <SearchIcon color={colors.textSecondary} size={20} />
          <Text style={styles.searchPlaceholder}>가고 싶은 도시 또는 키워드</Text>
          <View style={styles.searchDivider} />
          <PinIcon color={colors.goldDeep} size={20} />
        </Pressable>
      </View>

      {/* ── 취향 프롬프트 배너 ── */}
      <Pressable
        style={styles.promptCard}
        onPress={onOpenPreference}
        accessibilityRole="button"
        accessibilityLabel="취향 프롬프트 설정하기">
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
          height={230}
        />

        {spotlight.data && spotlight.data.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spotlightRow}>
            {spotlight.data.map(item => (
              <SpotlightCard
                key={item.city.id}
                item={item}
                safety={safety.data}
                onPress={() => onSelectCity(item.city)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* ── 지금 열리는 축제 ── */}
      <View style={styles.section}>
        <SectionHead
          kicker="FESTIVAL"
          title="지금 충북에서 열리는 축제"
        />

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
            contentContainerStyle={styles.spotlightRow}>
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
            contentContainerStyle={styles.photoRow}>
            {photos.data.map(photo => (
              <PhotoCard key={photo.id} photo={photo} />
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
            onPress={onOpenCitySelect}>
            <View style={styles.tileTop}>
              <SparkIcon color={colors.goldDeep} size={18} />
              <Chevron direction="right" color={colors.textSecondary} size={16} />
            </View>
            <Text style={styles.tileTitle}>AI 코스 짜기</Text>
            <Text style={styles.tileSub}>취향 기반 자동 일정</Text>
          </Pressable>

          <Pressable style={[styles.tile, styles.tileDark]}>
            <View style={styles.tileTop}>
              <SparkIcon color={colors.gold} size={18} />
              <Chevron direction="right" color="#8b93a7" size={16} />
            </View>
            <Text style={[styles.tileTitle, styles.tileTitleDark]}>
              샛별이에게 묻기
            </Text>
            <Text style={[styles.tileSub, styles.tileSubDark]}>대화로 여행 계획</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

/** 섹션 제목 줄 — 오른쪽 '전체' 버튼은 onMore 를 준 섹션에만 붙습니다 */
function SectionHead({
  kicker,
  title,
  onMore,
}: {
  kicker: string;
  title: string;
  onMore?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <View>
        <Text style={styles.sectionKicker}>{kicker}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onMore ? (
        <Pressable style={styles.moreBtn} onPress={onMore}>
          <Text style={styles.moreText}>전체</Text>
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

/** 숨은 동네 카드 — 사진은 그 지역 관광정보에서, 안전등급은 지역안전지수에서 */
function SpotlightCard({
  item,
  safety,
  onPress,
}: {
  item: SpotlightCity;
  safety: SafetyMap | null;
  onPress: () => void;
}) {
  const { city, imageUrl, imageCaption } = item;
  const citySafety = safetyOf(city, safety);

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
        <View style={styles.cardPills}>
          <SafetyPill grade={citySafety.grade} />
          <View style={[styles.pill, styles.pillBonus]}>
            <Text style={styles.pillBonusText}>+{city.stats.bonus} 추천가산점</Text>
          </View>
        </View>
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
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
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

  // 로고
  logo: {
    alignItems: 'center',
  },
  logoLight: {
    width: 12,
    height: 8,
    backgroundColor: colors.gold,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  logoTower: {
    width: 15,
    height: 15,
    backgroundColor: '#ffffff',
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
    fontWeight: '800',
    color: colors.bonusText,
    marginBottom: 4,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    fontWeight: '800',
  },

  // 섹션 공통
  section: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionKicker: {
    color: colors.goldDeep,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
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
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    fontWeight: '700',
  },
  cardCaption: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '800',
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pillBonus: {
    backgroundColor: colors.bonusBg,
  },
  pillBonusText: {
    color: colors.bonusText,
    fontSize: 12,
    fontWeight: '700',
  },

  // 빠른 시작
  quickTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    backgroundColor: colors.goldSoft,
  },
  tileDark: {
    backgroundColor: colors.darkCard,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '800',
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
    color: '#c7cbd6',
  },
});

export default HomeScreen;
