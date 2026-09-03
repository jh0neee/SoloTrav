/** 카카오 일반 장소는 정보량에 맞춰 낮은 단일 단계 바텀시트로 보여 줍니다. */
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import { PinIcon } from '../../components/icons/UiIcons';
import { colors } from '../../theme/colors';
import type { SearchPoi } from './searchTypes';
import { formatDistance } from './searchTypes';

type Props = {
  poi: SearchPoi | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

function PoiCard({ poi, index, total, onPrev, onNext, onClose }: Props) {
  const [shown, setShown] = useState<SearchPoi | null>(poi);
  useEffect(() => {
    if (poi) setShown(poi);
  }, [poi]);

  const distance = shown ? formatDistance(shown.distance) : null;

  return (
    <BottomSheet
      visible={poi !== null}
      onClose={onClose}
      snapPoints={[0.36]}
      header={
        shown ? (
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {shown.category || '일반 장소'}
                </Text>
              </View>
              {distance ? (
                <Text style={styles.distance}>{distance}</Text>
              ) : null}
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {shown.name}
            </Text>

            <View style={styles.addressRow}>
              <PinIcon color={colors.goldDeep} size={16} />
              <Text style={styles.address} numberOfLines={2}>
                {shown.roadAddress || shown.address || '주소 정보 없음'}
              </Text>
            </View>

            <View style={styles.actionRow}>
              {shown.phone ? (
                <Pressable
                  style={styles.phoneButton}
                  onPress={() =>
                    Linking.openURL(`tel:${cleanPhone(shown.phone)}`)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="전화 걸기"
                >
                  <Text style={styles.phoneButtonText}>전화하기</Text>
                </Pressable>
              ) : null}

              {total > 1 ? (
                <View style={styles.navRow}>
                  <Pressable
                    style={styles.navButton}
                    onPress={onPrev}
                    accessibilityRole="button"
                    accessibilityLabel="이전 결과"
                  >
                    <Text style={styles.navButtonText}>이전</Text>
                  </Pressable>
                  <Text style={styles.navCount}>
                    {index + 1} / {total}
                  </Text>
                  <Pressable
                    style={styles.navButton}
                    onPress={onNext}
                    accessibilityRole="button"
                    accessibilityLabel="다음 결과"
                  >
                    <Text style={styles.navButtonText}>다음</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        ) : null
      }
    >
      <View />
    </BottomSheet>
  );
}

function cleanPhone(value: string): string {
  return value.replace(/[^\d+*#]/g, '');
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 36,
    marginBottom: 10,
  },
  categoryBadge: {
    flexShrink: 1,
    maxWidth: '72%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: colors.bonusBg,
  },
  categoryText: { fontSize: 12, fontWeight: '700', color: colors.bonusText },
  distance: { fontSize: 12, color: colors.textSecondary },
  title: {
    paddingRight: 32,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  address: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  phoneButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  phoneButtonText: { fontSize: 13, fontWeight: '700', color: colors.inkText },
  navRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  navButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  navCount: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
});

export default PoiCard;
