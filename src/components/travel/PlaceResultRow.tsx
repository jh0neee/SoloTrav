import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Chevron } from '../icons/UiIcons';

type Props = {
  title: string;
  address: string;
  categoryLabel: string;
  imageUrl: string | null;
  distanceLabel?: string | null;
  /** 지도 검색 마커와 결과를 연결할 때만 사진 위에 표시합니다. */
  index?: number;
  onPress: () => void;
};

/** 홈과 지도 검색이 함께 쓰는 장소 결과 한 줄입니다. */
export default function PlaceResultRow({
  title,
  address,
  categoryLabel,
  imageUrl,
  distanceLabel,
  index,
  onPress,
}: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${categoryLabel}`}
    >
      <View style={styles.thumbWrap}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.placeholder]}>
            <Text style={styles.placeholderText}>{title.slice(0, 1)}</Text>
          </View>
        )}
        {index !== undefined ? (
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {categoryLabel || '장소'}
            </Text>
          </View>
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {address || '주소 정보 없음'}
        </Text>
        {distanceLabel ? (
          <Text style={styles.distance}>{distanceLabel}</Text>
        ) : null}
      </View>

      <Chevron direction="right" color={colors.textSecondary} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  thumbWrap: {
    width: 64,
    height: 64,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  placeholder: {
    backgroundColor: colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 22,
    fontWeight: '700',
  },
  indexBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldDeep,
    borderWidth: 2,
    borderColor: colors.background,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryBadge: {
    flexShrink: 1,
    maxWidth: 96,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: colors.bonusBg,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.bonusText,
  },
  address: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.goldDeep,
  },
});
