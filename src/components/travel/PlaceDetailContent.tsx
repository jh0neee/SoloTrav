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
import VisitCheckInButton from '../VisitCheckInButton';
import { PinIcon } from '../icons/UiIcons';
import { colors } from '../../theme/colors';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';

export type PlaceDetailFact = {
  label: string;
  value: string;
};

type Props = {
  contentId: string;
  contentTypeId: string;
  title: string;
  categoryLabel: string;
  address: string;
  phone: string | null;
  homepageUrl: string | null;
  lat: number | null;
  lng: number | null;
  heroUrl: string | null;
  images: string[];
  facts: PlaceDetailFact[];
  overview: string | null;
  footer?: React.ReactNode;
  onImagePress?: (images: string[], index: number) => void;
  /** 화면 컨테이너에 따라 마지막 콘텐츠 아래 간격만 조절합니다. */
  bottomPadding?: number;
};

/** 홈 전체 화면과 지도 바텀시트가 그대로 공유하는 장소 상세 본문입니다. */
export default function PlaceDetailContent({
  contentId,
  contentTypeId,
  title,
  categoryLabel,
  address,
  phone,
  homepageUrl,
  lat,
  lng,
  heroUrl,
  images,
  facts,
  overview,
  footer,
  onImagePress,
  bottomPadding = TAB_CONTENT_BOTTOM_GAP,
}: Props) {
  const allImages = Array.from(
    new Set([...(heroUrl ? [heroUrl] : []), ...images]),
  );
  const displayedHero = allImages[0] ?? null;
  const extraImages = allImages.slice(1);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      // 연결할 앱이 없더라도 상세 화면은 그대로 유지합니다.
    });
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        disabled={!displayedHero || !onImagePress}
        onPress={() => onImagePress?.(allImages, 0)}
        accessibilityRole={
          displayedHero && onImagePress ? 'imagebutton' : undefined
        }
        accessibilityLabel={
          displayedHero && onImagePress ? '사진 크게 보기' : undefined
        }
      >
        {displayedHero ? (
          <Image
            source={{ uri: displayedHero }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={styles.heroPlaceholderText}>{title.slice(0, 1)}</Text>
          </View>
        )}
      </Pressable>

      <View style={[styles.body, { paddingBottom: bottomPadding }]}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{categoryLabel}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>

        {address ? (
          <View style={styles.addressRow}>
            <PinIcon color={colors.goldDeep} size={16} />
            <Text style={styles.address}>{address}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <VisitCheckInButton
            contentId={contentId}
            contentTypeId={contentTypeId}
            lat={lat}
            lng={lng}
          />
          {phone ? (
            <Pressable
              style={[styles.actionBtn, styles.phoneBtn]}
              onPress={() => openUrl(`tel:${cleanPhone(phone)}`)}
              accessibilityRole="button"
              accessibilityLabel="전화 걸기"
            >
              <Text style={[styles.actionText, styles.phoneText]}>
                전화하기
              </Text>
            </Pressable>
          ) : null}
          {homepageUrl ? (
            <Pressable
              style={styles.actionBtn}
              onPress={() => openUrl(homepageUrl)}
              accessibilityRole="button"
              accessibilityLabel="홈페이지 열기"
            >
              <Text style={styles.actionText}>홈페이지</Text>
            </Pressable>
          ) : null}
        </View>

        {facts.length > 0 ? (
          <View style={styles.factCard}>
            {facts.map(fact => (
              <View key={`${fact.label}:${fact.value}`} style={styles.factRow}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue}>{fact.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {overview ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>소개</Text>
            <Text style={styles.overview}>{overview}</Text>
          </View>
        ) : null}

        {extraImages.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사진</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageRow}
            >
              {extraImages.map((url, index) => (
                <Pressable
                  key={url}
                  disabled={!onImagePress}
                  onPress={() => onImagePress?.(allImages, index + 1)}
                  accessibilityRole={onImagePress ? 'imagebutton' : undefined}
                  accessibilityLabel={
                    onImagePress ? `사진 ${index + 2} 크게 보기` : undefined
                  }
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.extraImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {footer}
      </View>
    </View>
  );
}

function cleanPhone(value: string): string {
  return value.replace(/[^\d+*#]/g, '');
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.cream },
  heroImage: { width: '100%', height: 260, backgroundColor: colors.darkCard },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderText: {
    color: colors.textTertiary,
    fontSize: 56,
    fontWeight: '700',
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
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: colors.bonusText },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  address: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  phoneBtn: { backgroundColor: colors.ink, borderColor: colors.ink },
  phoneText: { color: colors.inkText },
  factCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  factRow: { flexDirection: 'row', gap: 12 },
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
  section: { gap: 10, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  overview: { fontSize: 14, color: colors.textPrimary, lineHeight: 23 },
  imageRow: { gap: 10 },
  extraImage: {
    width: 200,
    height: 130,
    borderRadius: 14,
    backgroundColor: colors.darkCard,
  },
});
