/**
 * 홈 화면 — 다크 히어로(브랜드 + 인사 + 검색 + 충북 요약) 아래로 실데이터 섹션.
 *
 * 공모전 키워드가 '혼자 여행 · 안전' 이라 화면 위쪽일수록 안전 정보를 둡니다.
 *  - 히어로 통계 : 충북에 볼 것이 얼마나 있고, 안전 데이터는 언제 기준인지
 *  - 혼행 랭킹   : 안전한 곳 / 많이 찾는 곳 / 여유로운 곳 (지역안전지수 + 지역방문자수)
 *  - 숨은 동네   : 대표 사진 + 치안 등급 + 주말 외지인 비율
 *  - 축제 / 사진 : 행사정보조회, 관광사진갤러리
 *
 * 섹션마다 독립적으로 로딩·실패하므로 하나가 실패해도 나머지는 그대로 뜹니다.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyProfile } from '../../user/userStore';
import { CITIES, SPOTLIGHT_CITY_IDS, type City } from '../../data/cities';
import { colors } from '../../theme/colors';
import { Chevron, SearchIcon } from '../../components/icons/UiIcons';
import {
  FestivalCard,
  PhotoCard,
  RankingRow,
  SectionState,
  safetyStatusColor,
} from '../../components/travel/TravelCards';
import { ChungbukMap } from '../../components/travel/ChungbukMap';
import {
  safetyOf,
  useCityRankings,
  useGalleryPhotos,
  useRegionSafety,
  useUpcomingFestivals,
} from '../../travel/homeQueries';
import {
  RANKING_KINDS,
  type GalleryPhoto,
  type RankingKind,
  type TourContent,
} from '../../types/travel';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';

type Props = {
  /** 검색 화면 열기 */
  onOpenSearch: () => void;
  /** 선택한 기준의 충북 11개 시군 전체 순위 열기 */
  onOpenCityRanking: (kind: RankingKind) => void;
  /** 사진첩 화면 열기 */
  onOpenGallery: (albumTitle?: string) => void;
  onSelectCity: (city: City) => void;
  onOpenPreference: () => void;
  onOpenPreferenceDetail: () => void;
  /** 축제·장소 카드 탭 → 상세 화면 */
  onSelectSpot: (spot: TourContent) => void;
  /** 취향 프롬프트를 설정했다면 요약 문구, 아직이면 null */
  preferenceSummary?: string | null;
  preferenceTags?: string[];
  preferenceStatus: 'idle' | 'loading' | 'ready' | 'error';
  onRetryPreference: () => void;
};

function HomeScreen({
  onOpenSearch,
  onOpenCityRanking,
  onOpenGallery,
  onSelectCity,
  onOpenPreference,
  onOpenPreferenceDetail,
  onSelectSpot,
  preferenceSummary,
  preferenceTags,
  preferenceStatus,
  onRetryPreference,
}: Props) {
  const insets = useSafeAreaInsets();
  const profile = useMyProfile();

  const safety = useRegionSafety();
  const festivals = useUpcomingFestivals();
  const photos = useGalleryPhotos();
  const ranking = useCityRankings();

  const [rankingKind, setRankingKind] = useState<RankingKind>('safe');
  const [mapCityId, setMapCityId] = useState<string | null>(null);
  const rankedCities = ranking.rankings[rankingKind].slice(0, 3);
  const rankingCaption =
    RANKING_KINDS.find(kind => kind.id === rankingKind)?.caption ?? '';
  const rankingLabel =
    RANKING_KINDS.find(kind => kind.id === rankingKind)?.label ?? '동네';
  const selectedMapCity = CITIES.find(city => city.id === mapCityId) ?? null;
  const selectedMapCitySafety = selectedMapCity
    ? safetyOf(selectedMapCity, safety.data)
    : null;
  const photoAlbums = useMemo(
    () => groupPhotosByTitle(photos.data ?? []),
    [photos.data],
  );

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
        </View>

        {/* <Text style={styles.heroKicker}>오늘 밤도 안전한 길로</Text> */}
        <Text style={styles.heroTitle}>
          {profile.displayName}님,{'\n'}어디로 혼자 떠나볼까요?
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
        </Pressable>
      </View>

      <PreferencePromptCard
        status={preferenceStatus}
        configured={!!preferenceSummary}
        tags={preferenceTags}
        onPress={preferenceSummary ? onOpenPreferenceDetail : onOpenPreference}
        onRetry={onRetryPreference}
      />

      {/* ── 충북 지역 지도 ── */}
      <View style={styles.section}>
        <SectionHead kicker="EXPLORE" title="지역별로 둘러보기" />

        <Text style={styles.spotlightIntro}>
          지도를 눌러 마음에 드는 동네를 먼저 살펴보세요
        </Text>

        <View style={styles.spotlightMapCard}>
          <View style={styles.mapLegend}>
            <View style={styles.mapLegendItem}>
              <View style={[styles.mapLegendDot, styles.mapLegendDecline]} />
              <Text style={styles.mapLegendText}>인구감소지역</Text>
            </View>
            <View style={styles.mapLegendItem}>
              <View style={styles.mapLegendDot} />
              <Text style={styles.mapLegendText}>그 외 지역</Text>
            </View>
          </View>
          <ChungbukMap
            selectedCityId={mapCityId}
            highlightedCityIds={SPOTLIGHT_CITY_IDS}
            onSelectCity={setMapCityId}
            height={286}
          />
          <View style={styles.mapSelectionBar}>
            {selectedMapCity && selectedMapCitySafety ? (
              <>
                <View style={styles.mapSelectionInfo}>
                  <Text style={styles.mapSelectionName}>
                    {selectedMapCity.name}
                  </Text>
                  <Text
                    style={[
                      styles.mapSelectionStatus,
                      {
                        color: safetyStatusColor(
                          selectedMapCitySafety.status,
                        ),
                      },
                    ]}
                  >
                    혼행 안전 {selectedMapCitySafety.status}
                  </Text>
                </View>
                <Pressable
                  style={styles.mapDetailButton}
                  onPress={() => onSelectCity(selectedMapCity)}
                  accessibilityRole="button"
                  accessibilityLabel={`${selectedMapCity.name} 상세 정보 보기`}
                >
                  <Text style={styles.mapDetailButtonText}>자세히 보기</Text>
                  <Chevron
                    direction="right"
                    color={colors.primary}
                    size={16}
                  />
                </Pressable>
              </>
            ) : (
              <Text style={styles.mapSelectionEmpty}>
                지도에서 지역을 선택해보세요
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── 혼행 랭킹 ── */}
      <View style={styles.section}>
        <SectionHead kicker="RANKING" title="혼행 랭킹" />

        <View style={styles.rankTabs}>
          {RANKING_KINDS.map(kind => {
            const active = rankingKind === kind.id;
            return (
              <Pressable
                key={kind.id}
                style={[styles.rankTab, active && styles.rankTabActive]}
                onPress={() => setRankingKind(kind.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
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
              ? ' · 행정안전부 지역안전지수를 혼행 관점에서 재구성했어요.'
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
              safetyStatus={
                rankingKind === 'safe' ? item.safetyStatus : undefined
              }
              onPress={() => onSelectCity(item.city)}
            />
          ))}
          {rankingKind !== 'safe' && ranking.visitorBaseLabel ? (
            <Text style={styles.rankSource}>
              한국관광공사 지역방문자수 · {ranking.visitorBaseLabel}
            </Text>
          ) : null}
          <Pressable
            style={styles.rankingMoreButton}
            onPress={() => onOpenCityRanking(rankingKind)}
            accessibilityRole="button"
            accessibilityLabel={`${rankingLabel} 전체 목록 보기`}
          >
            <Text style={styles.rankingMoreText}>
              {rankingLabel} 전체 목록 보기
            </Text>
            <Chevron direction="right" color={colors.primary} size={16} />
          </Pressable>
        </View>
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
          isEmpty={photoAlbums.length === 0}
          emptyText="사진을 불러오지 못했어요"
          onRetry={photos.reload}
          height={180}
        />

        {photoAlbums.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {photoAlbums.map(album => (
              <PhotoCard
                key={album.title}
                photo={album.cover}
                count={album.photos.length}
                onPress={() => onOpenGallery(album.title)}
              />
            ))}
          </ScrollView>
        ) : null}
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
  kicker?: string;
  title: string;
  moreLabel?: string;
  onMore?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionHeadTexts}>
        {kicker ? <Text style={styles.sectionKicker}>{kicker}</Text> : null}
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

function PreferencePromptCard({
  status,
  configured,
  tags,
  onPress,
  onRetry,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error';
  configured: boolean;
  tags?: string[];
  onPress: () => void;
  onRetry: () => void;
}) {
  if (status === 'idle' || status === 'loading') {
    return (
      <View style={[styles.promptCard, styles.promptCardLoading]}>
        <ActivityIndicator color={colors.goldDeep} />
        <Text style={styles.promptLoadingText}>
          여행 취향을 불러오는 중이에요
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.promptCard, styles.promptCardLoading]}>
        <Text style={styles.promptLoadingText}>
          여행 취향을 불러오지 못했어요
        </Text>
        <Pressable
          style={styles.promptRetryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="여행 취향 다시 불러오기"
        >
          <Text style={styles.promptRetryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (configured) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.promptCard,
          styles.promptCardConfigured,
          pressed && styles.promptCardPressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="나의 여행 취향 상세 보기"
      >
        <View style={styles.promptTop}>
          <View style={styles.promptTexts}>
            <Text style={styles.configuredTitle}>
              나만의 여행 취향이 등록되었어요 ✈️
            </Text>
            <Text style={styles.configuredSub}>
              등록된 취향을 바탕으로 딱 맞는 여행지를 추천해드려요
            </Text>
          </View>
        </View>
        <View style={[styles.promptFooter, styles.configuredFooter]}>
          <Text style={styles.promptTime}>마이페이지에서 언제든 관리</Text>
          <View style={styles.promptBtn}>
            <Text style={styles.promptBtnText}>상세 보기</Text>
            <Chevron direction="right" color={colors.primaryStrong} size={15} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.promptCard, styles.promptCardBefore]}>
      <View style={styles.promptTop}>
        <View style={styles.promptTexts}>
          <Text style={styles.promptKicker}>나만의 여행 취향 찾기</Text>
          <Text style={styles.promptTitle}>
            몇 가지 질문에 답하면{`\n`}딱 맞는 여행지를 추천해드려요
          </Text>
        </View>
      </View>
      <View style={styles.promptFooter}>
        <Text style={styles.promptTime}>약 2분 소요</Text>
        <Pressable
          style={styles.promptBtn}
          onPress={onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="취향 프롬프트 설정하기"
        >
          <Text style={styles.promptBtnText}>시작하기</Text>
          <Chevron direction="right" color={colors.primaryStrong} size={16} />
        </Pressable>
      </View>
    </View>
  );
}

type PhotoAlbum = {
  title: string;
  cover: GalleryPhoto;
  photos: GalleryPhoto[];
};

function groupPhotosByTitle(photos: GalleryPhoto[]): PhotoAlbum[] {
  const albums = new Map<string, GalleryPhoto[]>();
  photos.forEach(photo => {
    const title = photo.title.trim() || '이름 없는 여행 사진';
    albums.set(title, [...(albums.get(title) ?? []), photo]);
  });
  return Array.from(albums, ([title, albumPhotos]) => ({
    title,
    cover: albumPhotos[0],
    photos: albumPhotos,
  }));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
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
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.promptBannerBorder,
    backgroundColor: colors.promptBanner,
  },
  promptCardConfigured: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    paddingBottom: 8,
  },
  promptCardPressed: {
    opacity: 0.88,
  },
  promptCardLoading: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  promptLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  promptRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  promptRetryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  promptCardBefore: {
    paddingBottom: 10,
  },
  promptTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  promptTexts: {
    flex: 1,
  },
  promptKicker: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bonusText,
    marginBottom: 6,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 23,
  },
  promptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  promptTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  promptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  promptBtnText: {
    color: colors.primaryStrong,
    fontSize: 15,
    fontWeight: '800',
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkIconText: {
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: '800',
  },
  configuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 23,
  },
  configuredSub: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  configuredFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopColor: colors.primaryBorder,
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
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  rankTabActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rankTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: true,
  },
  rankTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
  rankSource: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'right',
    paddingTop: 8,
    paddingBottom: 10,
  },
  rankingMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankingMoreText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // 스포트라이트 카드
  spotlightIntro: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -6,
    marginBottom: 10,
  },
  spotlightMapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    // marginTop: -2,
    marginBottom: 6,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e9edf2',
  },
  mapLegendDecline: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  mapLegendText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  cityChipRow: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  cityChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  cityChipTextActive: {
    color: '#ffffff',
  },
  mapSelectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapSelectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapSelectionEmpty: {
    flex: 1,
    paddingVertical: 3,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapSelectionName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mapSelectionStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  mapDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  mapDetailButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
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
  cardFullWidth: {
    width: 'auto',
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  pillNormal: {
    backgroundColor: '#fff6db',
  },
  pillCheck: {
    backgroundColor: colors.dangerSoft,
  },
  pillSafeText: {
    color: colors.safeText,
    fontSize: 12,
    fontWeight: '600',
  },
  pillNormalText: {
    color: '#a66b00',
  },
  pillCheckText: {
    color: colors.danger,
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
