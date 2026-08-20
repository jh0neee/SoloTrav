/**
 * 관광정보 표시용 작은 카드 모음.
 *
 * 홈·검색·도시 선택이 같은 데이터를 조금씩 다른 크기로 보여줘서, 화면마다
 * 카드를 다시 만들지 않도록 한곳에 모았습니다. (UiIcons 와 같은 묶음 파일 방식)
 *
 * 사진은 TourAPI 가 항상 주지는 않습니다. 없을 때 회색 사각형이 뜨면 화면이
 * 초라해 보여서, 제목 첫 글자를 넣은 플레이스홀더로 대신합니다.
 */
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Chevron, ShieldIcon } from '../icons/UiIcons';
import type { GalleryPhoto, TourFestival, TourSpot } from '../../types/travel';

// ─────────────────────────────── 상태 표시

type SectionStateProps = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string | null;
  /** 비어 있을 때 문구. 넘기지 않으면 빈 상태를 그리지 않습니다 */
  emptyText?: string;
  isEmpty?: boolean;
  onRetry?: () => void;
  height?: number;
};

/**
 * 섹션 하나의 로딩·실패·빈 상태.
 * 그릴 게 없으면 null 을 돌려주므로 `{...}` 로 감싸 그대로 끼워 넣으면 됩니다.
 */
export function SectionState({
  status,
  error,
  emptyText,
  isEmpty,
  onRetry,
  height = 120,
}: SectionStateProps) {
  if (status === 'loading' || status === 'idle') {
    return (
      <View style={[styles.stateBox, { height }]}>
        <ActivityIndicator color={colors.goldDeep} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.stateBox, { height }]}>
        <Text style={styles.stateText}>
          {error ?? '정보를 불러오지 못했어요'}
        </Text>
        {onRetry ? (
          <Pressable
            style={styles.retryBtn}
            onPress={onRetry}
            accessibilityRole="button">
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (isEmpty && emptyText) {
    return (
      <View style={[styles.stateBox, { height }]}>
        <Text style={styles.stateText}>{emptyText}</Text>
      </View>
    );
  }

  return null;
}

// ─────────────────────────────── 사진 플레이스홀더

function Thumb({
  uri,
  label,
  style,
}: {
  uri: string | null;
  label: string;
  style: object;
}) {
  if (uri) {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  }
  return (
    <View style={[style, styles.placeholder]}>
      <Text style={styles.placeholderText}>{label.slice(0, 1)}</Text>
    </View>
  );
}

// ─────────────────────────────── 검색 결과 한 줄

export function SpotRow({
  spot,
  onPress,
}: {
  spot: TourSpot;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${spot.title} ${spot.typeLabel}`}>
      <Thumb uri={spot.thumbnailUrl} label={spot.title} style={styles.rowThumb} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {spot.title}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{spot.typeLabel}</Text>
          </View>
        </View>
        <Text style={styles.rowAddress} numberOfLines={1}>
          {spot.address || '주소 정보 없음'}
        </Text>
        {spot.distance !== null ? (
          <Text style={styles.rowDistance}>
            {spot.distance < 1000
              ? `${spot.distance}m`
              : `${(spot.distance / 1000).toFixed(1)}km`}
          </Text>
        ) : null}
      </View>
      <Chevron direction="right" color={colors.textSecondary} size={18} />
    </Pressable>
  );
}

// ─────────────────────────────── 축제 카드

export function FestivalCard({
  festival,
  onPress,
}: {
  festival: TourFestival;
  onPress: () => void;
}) {
  // 진행 중이면 'D-'가 아니라 '진행 중'이 맞습니다.
  const dday = festival.isOngoing
    ? '진행 중'
    : festival.daysUntilStart !== null
    ? `D-${festival.daysUntilStart}`
    : null;

  return (
    <Pressable style={styles.festivalCard} onPress={onPress}>
      <Thumb
        uri={festival.imageUrl}
        label={festival.title}
        style={styles.festivalImage}
      />
      {dday ? (
        <View
          style={[
            styles.ddayBadge,
            festival.isOngoing && styles.ddayBadgeOngoing,
          ]}>
          <Text
            style={[
              styles.ddayText,
              festival.isOngoing && styles.ddayTextOngoing,
            ]}>
            {dday}
          </Text>
        </View>
      ) : null}
      <View style={styles.festivalBody}>
        <Text style={styles.festivalTitle} numberOfLines={2}>
          {festival.title}
        </Text>
        <Text style={styles.festivalPeriod}>{festival.periodLabel}</Text>
        <Text style={styles.festivalPlace} numberOfLines={1}>
          {festival.address || '장소 미정'}
        </Text>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────── 관광사진 카드

export function PhotoCard({
  photo,
  onPress,
}: {
  photo: GalleryPhoto;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.photoCard} onPress={onPress} disabled={!onPress}>
      <Image
        source={{ uri: photo.imageUrl }}
        style={styles.photoImage}
        resizeMode="cover"
      />
      <View style={styles.photoOverlay}>
        <Text style={styles.photoTitle} numberOfLines={1}>
          {photo.title}
        </Text>
        <Text style={styles.photoLocation} numberOfLines={1}>
          {photo.location}
        </Text>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────── 안전 등급 필

export function SafetyPill({
  grade,
  score,
}: {
  grade: string;
  score?: number;
}) {
  return (
    <View style={[styles.pill, styles.pillSafe]}>
      <ShieldIcon color={colors.safeText} size={14} />
      <Text style={styles.pillSafeText}>
        안전 {grade}
        {score !== undefined ? ` · ${score}점` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 상태
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // 플레이스홀더
  placeholder: {
    backgroundColor: colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.goldSoft,
    fontSize: 22,
    fontWeight: '800',
  },

  // 검색 결과 줄
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: colors.bonusBg,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bonusText,
  },
  rowAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowDistance: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldDeep,
  },

  // 축제 카드
  festivalCard: {
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  festivalImage: {
    width: '100%',
    height: 118,
  },
  ddayBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: colors.ink,
  },
  ddayBadgeOngoing: {
    backgroundColor: colors.safeText,
  },
  ddayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  ddayTextOngoing: {
    color: '#ffffff',
  },
  festivalBody: {
    padding: 13,
    gap: 4,
  },
  festivalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  festivalPeriod: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  festivalPlace: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // 관광사진 카드
  photoCard: {
    width: 140,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.darkCard,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    // 사진 위 글씨가 묻히지 않도록 아래쪽만 어둡게 깔아줍니다.
    backgroundColor: 'rgba(20,24,35,0.55)',
  },
  photoTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  photoLocation: {
    color: '#d7dbe4',
    fontSize: 11,
    marginTop: 2,
  },

  // 안전 필
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
});
