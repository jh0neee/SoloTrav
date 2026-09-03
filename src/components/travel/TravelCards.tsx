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
import PlaceResultRow from './PlaceResultRow';
import type {
  GalleryPhoto,
  TourContent,
  TourFestival,
} from '../../types/travel';
import type { SafetyStatus } from '../../travel/homeQueries';

export function safetyStatusColor(status: SafetyStatus): string {
  if (status === '안심') {
    return colors.safeText;
  }
  if (status === '보통') {
    return '#a66b00';
  }
  return colors.danger;
}

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
            accessibilityRole="button"
          >
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
  spot: TourContent;
  onPress: () => void;
}) {
  const distanceLabel =
    spot.distance === null
      ? null
      : spot.distance < 1000
      ? `${spot.distance}m`
      : `${(spot.distance / 1000).toFixed(1)}km`;

  return (
    <PlaceResultRow
      title={spot.title}
      address={spot.address}
      categoryLabel={spot.typeLabel}
      imageUrl={spot.thumbnailUrl ?? spot.imageUrl}
      distanceLabel={distanceLabel}
      onPress={onPress}
    />
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
          ]}
        >
          <Text
            style={[
              styles.ddayText,
              festival.isOngoing && styles.ddayTextOngoing,
            ]}
          >
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
  count,
  onPress,
}: {
  photo: GalleryPhoto;
  count?: number;
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
          {count && count > 1 ? ` · ${count}장` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────── 지역안전지수 막대

/**
 * 등급(1~5)에 맞는 색.
 * 1·2는 초록, 3은 파랑, 4는 노랑, 5는 빨강으로 구분합니다.
 * 숫자만 보여주면 "3등급이 좋은 건가?" 를 매번 되묻게 되어 색으로 방향을 줍니다.
 */
export function gradeColor(grade: number): string {
  if (grade <= 2) {
    return colors.safeText;
  }
  if (grade === 3) {
    return colors.goldDeep;
  }
  if (grade === 4) {
    return '#d99a00';
  }
  return colors.danger;
}

/**
 * 지역안전지수 6개 부문 막대.
 * 1등급이 가장 안전하므로 **막대가 길수록 안전**하도록 뒤집어 그립니다.
 */
export function SafetyBars({
  grades,
  categories,
  gradeLabels,
}: {
  grades: Record<string, number>;
  categories: { key: string; label: string; note: string }[];
  gradeLabels: Record<number, string>;
}) {
  return (
    <View style={styles.barList}>
      {categories.map(category => {
        const grade = grades[category.key] ?? 0;
        const color = gradeColor(grade);
        // 1등급 100%, 5등급 20% — 0(값 없음)이면 빈 막대
        const ratio = grade ? ((6 - grade) / 5) * 100 : 0;

        return (
          <View key={category.key} style={styles.barRow}>
            <Text style={styles.barLabel}>{category.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  // 비율·색이 런타임 계산이라 inline 이 불가피합니다.
                  { width: `${ratio}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={[styles.barGrade, { color }]}>
              {grade ? gradeLabels[grade] ?? `${grade}등급` : '-'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────── 랭킹 한 줄

export function RankingRow({
  rank,
  name,
  value,
  caption,
  safetyStatus,
  onPress,
}: {
  rank: number;
  name: string;
  value: string;
  caption: string;
  safetyStatus?: SafetyStatus;
  onPress: () => void;
}) {
  const isTop = rank <= 3;

  return (
    <Pressable style={styles.rankRow} onPress={onPress}>
      <View style={[styles.rankBadge, isTop && styles.rankBadgeTop]}>
        <Text style={[styles.rankNum, isTop && styles.rankNumTop]}>{rank}</Text>
      </View>
      <View style={styles.rankBody}>
        <View style={styles.rankNameLine}>
          <Text style={styles.rankName}>{name}</Text>
          {safetyStatus ? (
            <View
              style={[
                styles.rankSafety,
                safetyStatus === '보통' && styles.rankSafetyNormal,
                safetyStatus === '확인 필요' && styles.rankSafetyCheck,
              ]}
            >
              <Text
                style={[
                  styles.rankSafetyText,
                  safetyStatus === '보통' && styles.rankSafetyTextNormal,
                  safetyStatus === '확인 필요' && styles.rankSafetyTextCheck,
                ]}
              >
                {safetyStatus}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rankCaption}>{caption}</Text>
      </View>
      <Text style={styles.rankValue}>{value}</Text>
    </Pressable>
  );
}

// ─────────────────────────────── 통계 타일

/** 숫자 하나 + 라벨 */
export function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
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
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // 플레이스홀더
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: colors.bonusText,
  },
  rowAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowDistance: {
    fontSize: 12,
    fontWeight: '600',
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
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
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
    fontWeight: '700',
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
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  festivalPeriod: {
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: '700',
  },
  photoLocation: {
    color: '#d7dbe4',
    fontSize: 11,
    marginTop: 2,
  },

  // 지역안전지수 막대
  barList: {
    gap: 9,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barGrade: {
    width: 58,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },

  // 랭킹
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  rankBadgeTop: {
    backgroundColor: colors.ink,
  },
  rankNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rankNumTop: {
    // 배지 배경이 포인트 블루라 숫자는 흰색이어야 읽힙니다.
    color: '#ffffff',
  },
  rankBody: {
    flex: 1,
    gap: 3,
  },
  rankNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rankSafety: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: colors.safeBg,
  },
  rankSafetyNormal: {
    backgroundColor: '#fff6db',
  },
  rankSafetyCheck: {
    backgroundColor: colors.dangerSoft,
  },
  rankSafetyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.safeText,
  },
  rankSafetyTextNormal: {
    color: '#a66b00',
  },
  rankSafetyTextCheck: {
    color: colors.danger,
  },
  rankCaption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rankValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // 통계 타일
  statTile: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
