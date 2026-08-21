/**
 * 관광 콘텐츠 상세 화면.
 *
 * 검색 결과·축제 카드에서 넘어옵니다. 목록에서 이미 받은 요약(TourSpot)을 함께
 * 받아서 제목·사진을 먼저 그려두고, 상세 응답이 도착하면 개요·이용안내를 채웁니다.
 * (상세를 기다리며 빈 화면을 보여주지 않기 위함입니다)
 */
import React, { useCallback } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron, PinIcon } from '../../components/icons/UiIcons';
import { SectionState } from '../../components/travel/TravelCards';
import { travelApi } from '../../api/travelApi';
import { useTravelQuery } from '../../travel/useTravelQuery';
import type { TourSpot } from '../../types/travel';

type Props = {
  /** 목록에서 넘어온 요약 정보 — 상세를 기다리는 동안 먼저 보여줍니다 */
  spot: TourSpot;
  onBack: () => void;
};

function SpotDetailScreen({ spot, onBack }: Props) {
  const insets = useSafeAreaInsets();

  const loader = useCallback(
    () => travelApi.getSpotDetail(spot.contentId, spot.contentTypeId),
    [spot.contentId, spot.contentTypeId],
  );
  const detail = useTravelQuery(`spot:${spot.contentId}`, loader);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      // 열 수 있는 앱이 없을 때 앱이 죽지 않도록 삼킵니다.
    });
  }, []);

  const heroUri = detail.data?.imageUrl ?? spot.imageUrl;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* 히어로 */}
        <View style={styles.hero}>
          {heroUri ? (
            <Image
              source={{ uri: heroUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Text style={styles.heroPlaceholderText}>
                {spot.title.slice(0, 1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{spot.typeLabel}</Text>
          </View>
          <Text style={styles.title}>{spot.title}</Text>

          {spot.address ? (
            <View style={styles.addressRow}>
              <PinIcon color={colors.goldDeep} size={16} />
              <Text style={styles.address}>{spot.address}</Text>
            </View>
          ) : null}

          {/* 전화 · 홈페이지 */}
          <View style={styles.actionRow}>
            {spot.tel ? (
              <Pressable
                style={styles.actionBtn}
                onPress={() => openUrl(`tel:${spot.tel}`)}>
                <Text style={styles.actionText}>전화하기</Text>
              </Pressable>
            ) : null}
            {detail.data?.homepageUrl ? (
              <Pressable
                style={styles.actionBtn}
                onPress={() => openUrl(detail.data!.homepageUrl!)}>
                <Text style={styles.actionText}>홈페이지</Text>
              </Pressable>
            ) : null}
          </View>

          {/* 이용 안내 */}
          {detail.data && detail.data.facts.length > 0 ? (
            <View style={styles.factCard}>
              {detail.data.facts.map(fact => (
                <View key={fact.label} style={styles.factRow}>
                  <Text style={styles.factLabel}>{fact.label}</Text>
                  <Text style={styles.factValue}>{fact.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 개요 */}
          {detail.data?.overview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>소개</Text>
              <Text style={styles.overview}>{detail.data.overview}</Text>
            </View>
          ) : null}

          {/* 추가 사진 */}
          {detail.data && detail.data.images.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>사진</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageRow}>
                {detail.data.images.map(url => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={styles.extraImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <SectionState
            status={detail.status}
            error={detail.error}
            isEmpty={detail.status === 'ready' && detail.data === null}
            emptyText="이 장소의 상세 정보가 아직 없어요"
            onRetry={detail.reload}
            height={100}
          />
        </View>
      </ScrollView>

      {/* 뒤로가기 — 사진 위에 겹칩니다 */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기">
        <Chevron direction="left" color="#ffffff" size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingBottom: 40,
  },

  hero: {
    backgroundColor: colors.darkCard,
  },
  heroImage: {
    width: '100%',
    height: 260,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    color: colors.textTertiary,
    fontSize: 56,
    fontWeight: '700',
  },
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,24,35,0.5)',
  },

  body: {
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.cream,
    gap: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: colors.bonusBg,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bonusText,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  factCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  factRow: {
    flexDirection: 'row',
    gap: 12,
  },
  factLabel: {
    width: 72,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  factValue: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },

  section: {
    gap: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overview: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 23,
  },
  imageRow: {
    gap: 10,
  },
  extraImage: {
    width: 200,
    height: 130,
    borderRadius: 14,
    backgroundColor: colors.darkCard,
  },
});

export default SpotDetailScreen;
