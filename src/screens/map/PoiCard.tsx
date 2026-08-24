/**
 * 검색 결과(카카오 POI) 선택 시 하단에 뜨는 간단 카드.
 *
 * 관광 콘텐츠는 개요·이용시간·사진이 있어 TourPlaceSheet 를 쓰지만,
 * 카카오 POI 는 이름·주소·전화번호 정도만 있으므로 가벼운 카드로 보여 줍니다.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { SearchPoi } from './searchTypes';
import { formatDistance } from './searchTypes';

type Props = {
  poi: SearchPoi;
  /** 목록에서 몇 번째인지 — 지도 마커 번호와 맞춥니다. */
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

function PoiCard({ poi, index, total, onPrev, onNext, onClose }: Props) {
  const distance = formatDistance(poi.distance);
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexBadgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {poi.name}
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="닫기">
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        {poi.category ? <Text style={styles.category}>{poi.category}</Text> : null}
        {distance ? <Text style={styles.distance}>· {distance}</Text> : null}
      </View>

      <Text style={styles.address} numberOfLines={2}>
        {poi.roadAddress || poi.address}
      </Text>
      {poi.phone ? <Text style={styles.phone}>{poi.phone}</Text> : null}

      {/* 결과가 여러 개면 카드에서 바로 앞뒤로 넘겨봅니다 */}
      {total > 1 && (
        <View style={styles.navRow}>
          <Pressable
            style={styles.navButton}
            onPress={onPrev}
            accessibilityRole="button"
            accessibilityLabel="이전 결과">
            <Text style={styles.navButtonText}>이전</Text>
          </Pressable>
          <Text style={styles.navCount}>
            {index + 1} / {total}
          </Text>
          <Pressable
            style={styles.navButton}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel="다음 결과">
            <Text style={styles.navButtonText}>다음</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.goldDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  close: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bonusText,
  },
  distance: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  address: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  phone: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  navCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default PoiCard;
