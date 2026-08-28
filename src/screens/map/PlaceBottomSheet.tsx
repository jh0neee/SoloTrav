/**
 * 장소 상세 바텀시트 — 마커를 탭하면 열립니다.
 * 시트의 열고/닫고/드래그는 공용 BottomSheet 가 담당하고, 이 파일은 내용만 그립니다.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import { CommentIcon, HeartIcon, SendIcon } from '../../components/icons/UiIcons';
import { colors } from '../../theme/colors';
import type { Place, PlaceReview } from '../../data/places';

type Props = {
  place: Place | null;
  onClose: () => void;
};

function PlaceBottomSheet({ place, onClose }: Props) {
  /**
   * 닫힐 때 place 는 즉시 null 이 되지만 시트는 아직 내려가는 중입니다.
   * 마지막 장소를 붙들고 있어야 애니메이션 도중 내용이 빈 채로 보이지 않습니다.
   */
  const [shown, setShown] = useState<Place | null>(place);
  useEffect(() => {
    if (place) setShown(place);
  }, [place]);

  return (
    <BottomSheet
      visible={place !== null}
      onClose={onClose}
      snapPoints={[0.55, 0.92]}
      header={shown ? <SheetHeader place={shown} /> : null}>
      {shown ? <SheetBody place={shown} /> : null}
    </BottomSheet>
  );
}

/** 드래그 영역에 함께 들어가는 고정 헤더 */
function SheetHeader({ place }: { place: Place }) {
  return (
    <View style={styles.header}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{place.badge}</Text>
        </View>
        <Text style={styles.distance}>{place.distance}</Text>
      </View>
      <Text style={styles.title}>{place.name}</Text>
      <Text style={styles.area}>{place.area}</Text>
    </View>
  );
}

function SheetBody({ place }: { place: Place }) {
  return (
    <>
      {/* 통계 3칸 */}
      <View style={styles.statRow}>
        {place.stats.map(stat => (
          <View key={stat.label} style={styles.statBox}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={[styles.statValue, stat.highlight && styles.statValueOn]}>
              {stat.value} 
            </Text>
          </View>
        ))}
      </View>

      {/* 길찾기 + 관심 등록 + 공유 */}
      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>길찾기</Text>
        </Pressable>
        <Pressable
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="관심 코스 추가">
          <HeartIcon color={colors.textSecondary} size={20} />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="공유하기">
          <SendIcon color={colors.textSecondary} size={18} />
        </Pressable>
      </View>

      {/* 후기 */}
      <View style={styles.reviewHead}>
        <Text style={styles.reviewTitle}>
          혼행객 후기 <Text style={styles.reviewCount}>{place.reviews.length}</Text>
        </Text>
        <Pressable style={styles.writePill} accessibilityRole="button">
          <Text style={styles.writePillText}>+ 후기 남기기</Text>
        </Pressable>
      </View>

      {place.reviews.map(review => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  return (
    <View style={styles.review}>
      <View style={styles.reviewTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{review.author.slice(0, 1)}</Text>
        </View>
        <Text style={styles.author}>{review.author}</Text>
        <Text style={styles.timeAgo}>· {review.timeAgo}</Text>
        {review.badge ? (
          <View style={styles.reviewBadge}>
            <Text style={styles.reviewBadgeText}>{review.badge}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.reviewText}>{review.text}</Text>

      {review.hasPhoto ? (
        <View style={styles.photo}>
          <Text style={styles.photoText}>골목 사진</Text>
        </View>
      ) : null}

      <View style={styles.reviewFoot}>
        <View style={styles.metric}>
          <HeartIcon color={colors.textSecondary} size={14} />
          <Text style={styles.metricText}>{review.likes}</Text>
        </View>
        <View style={styles.metric}>
          <CommentIcon color={colors.textSecondary} size={14} />
          <Text style={styles.metricText}>{review.comments}</Text>
        </View>
        {review.tag ? <Text style={styles.reviewTag}>{review.tag}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: colors.safeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.safeText,
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  area: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // 통계
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statValueOn: {
    color: colors.safeText,
  },

  // 액션
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.inkText,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 후기 헤더
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reviewCount: {
    color: colors.textSecondary,
  },
  writePill: {
    backgroundColor: colors.bonusBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  writePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bonusText,
  },

  // 후기 카드
  review: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  author: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewBadge: {
    backgroundColor: colors.safeBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.safeText,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  photo: {
    height: 92,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: colors.bonusBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    fontSize: 12,
    color: colors.bonusText,
  },
  reviewFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewTag: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
    color: colors.bonusText,
  },
});

export default PlaceBottomSheet;
