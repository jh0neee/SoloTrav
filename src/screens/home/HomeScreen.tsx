/**
 * 홈 화면 — 상단 다크 히어로(브랜드 + 인사 + 검색) + 스포트라이트 + 빠른 시작.
 * 검색 input 을 누르면 도시 선택 화면으로 이동합니다.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentUser } from '../../config/user';
import { CITIES, SPOTLIGHT_CITY_IDS, type City } from '../../data/cities';
import { colors } from '../../theme/colors';
import {
  BellIcon,
  Chevron,
  PinIcon,
  SearchIcon,
  ShieldIcon,
  SparkIcon,
} from '../../components/icons/UiIcons';

type Props = {
  onOpenSearch: () => void;
  onSelectCity: (city: City) => void;
};

const spotlightCities = SPOTLIGHT_CITY_IDS.map(
  id => CITIES.find(c => c.id === id)!,
);

function HomeScreen({ onOpenSearch, onSelectCity }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* 히어로가 상태바 뒤까지 올라가므로 아이콘을 밝게 */}
      <StatusBar barStyle="light-content" />

      {/* ── 다크 히어로 ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
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
          {currentUser.name}님, 어디로{'\n'}혼자 떠나볼까요?
        </Text>

        {/* 검색 input (누르면 도시 선택으로 이동) */}
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

      {/* ── 스포트라이트 ── */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.sectionKicker}>SPOTLIGHT · 충북</Text>
            <Text style={styles.sectionTitle}>등대가 비추는 숨은 동네</Text>
          </View>
          <Pressable style={styles.moreBtn}>
            <Text style={styles.moreText}>전체</Text>
            <Chevron direction="right" color={colors.textSecondary} size={16} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spotlightRow}>
          {spotlightCities.map(city => (
            <SpotlightCard
              key={city.id}
              city={city}
              onPress={() => onSelectCity(city)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── 빠른 시작 ── */}
      <View style={styles.section}>
        <Text style={styles.quickTitle}>빠른 시작</Text>
        <View style={styles.quickRow}>
          <Pressable
            style={[styles.tile, styles.tileLight]}
            onPress={onOpenSearch}>
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

/** 작은 등대 로고 */
function Lighthouse() {
  return (
    <View style={styles.logo}>
      <View style={styles.logoLight} />
      <View style={styles.logoTower} />
    </View>
  );
}

/** 숨은 동네 카드 */
function SpotlightCard({ city, onPress }: { city: City; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImage}>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>인구감소지역</Text>
        </View>
        <View style={styles.cardMoon} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCity}>{city.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {city.description}
        </Text>
        <View style={styles.cardPills}>
          <View style={[styles.pill, styles.pillSafe]}>
            <ShieldIcon color={colors.safeText} size={14} />
            <Text style={styles.pillSafeText}>안전 {city.safetyGrade}</Text>
          </View>
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
    // paddingTop 은 상태바 높이(insets.top)를 더해 인라인으로 지정합니다.
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
  cardMoon: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.goldSoft,
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
  pillSafe: {
    backgroundColor: colors.safeBg,
  },
  pillSafeText: {
    color: colors.safeText,
    fontSize: 12,
    fontWeight: '700',
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
