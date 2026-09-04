import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chevron, HeartIcon } from '../../components/icons/UiIcons';
import { favoriteStore, useFavorites } from '../../favorites/favoriteStore';
import { colors } from '../../theme/colors';
import type { AiRouteFavorite } from '../../types/favorite';

const PREVIEW_LIMIT = 3;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_DRAG_THRESHOLD = 70;

type Props = {
  onSelectCourse: (favorite: AiRouteFavorite) => void;
};

/** 코스 일수 계산 */
function getDurationText(favorite: AiRouteFavorite): string {
  const days = favorite.course?.days?.length ?? 1;
  if (days <= 1) return '당일';
  return `${days - 1}박 ${days}일`;
}

export default function FavoriteCoursesSection({ onSelectCourse }: Props) {
  const insets = useSafeAreaInsets();
  const { status, favorites, error } = useFavorites();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isLoadingDetailId, setIsLoadingDetailId] = useState<string | null>(null);

  // 바텀시트 위치 및 배경 투명도 애니메이션
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    translateY.setValue(SCREEN_HEIGHT);
    backdropOpacity.setValue(0);
    setIsSheetVisible(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          bounciness: 4,
          speed: 14,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSheetVisible(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 3,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          const ratio = Math.max(0, 1 - gestureState.dy / 300);
          backdropOpacity.setValue(ratio);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_DRAG_THRESHOLD || gestureState.vy > 0.5) {
          closeSheet();
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              bounciness: 4,
              speed: 16,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  const handleSelect = async (item: AiRouteFavorite) => {
    closeSheet();
    if (item.course) {
      onSelectCourse(item);
      return;
    }
    setIsLoadingDetailId(item.id);
    try {
      const detailed = await favoriteStore.detail(item.id);
      onSelectCourse(detailed);
    } catch {
      Alert.alert('조회 실패', '관심 코스 상세 정보를 불러오지 못했습니다.');
    } finally {
      setIsLoadingDetailId(null);
    }
  };

  const remove = (favorite: AiRouteFavorite) => {
    if (removingId) return;
    Alert.alert('관심 해제', '이 코스를 관심 목록에서 해제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '관심 해제',
        style: 'destructive',
        onPress: async () => {
          setRemovingId(favorite.id);
          try {
            await favoriteStore.remove(favorite.id);
          } catch {
            Alert.alert('해제 실패', '잠시 후 다시 시도해주세요.');
          } finally {
            setRemovingId(null);
          }
        },
      },
    ]);
  };

  // 로딩 상태
  if (status === 'idle' || status === 'loading') {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color={colors.goldDeep} />
        <Text style={styles.loadingText}>관심 코스를 불러오는 중이에요</Text>
      </View>
    );
  }

  // 에러 상태
  if (status === 'error') {
    return (
      <Pressable
        onPress={() => favoriteStore.reload()}
        style={styles.errorCard}
        accessibilityRole="button"
      >
        <Text style={styles.errorText}>
          {error ?? '관심 코스 목록을 불러오지 못했습니다.'}
        </Text>
        <Text style={styles.retryText}>다시 시도</Text>
      </Pressable>
    );
  }

  // 빈 상태
  if (favorites.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>아직 관심 코스가 없어요</Text>
        <Text style={styles.emptyDescription}>
          AI가 추천한 여행 코스에서 하트를 누르면{'\n'}이곳에서 편하게 모아볼 수 있어요.
        </Text>
      </View>
    );
  }

  const previewItems = favorites.slice(0, PREVIEW_LIMIT);
  const remainingCount = favorites.length - PREVIEW_LIMIT;

  return (
    <>
      {/* ── 마이페이지 본문 콤팩트 카드 (최대 3개 고정) ── */}
      <View style={styles.containerCard}>
        {previewItems.map((item, index) => {
          const costStr =
            item.course?.estimatedTotalCostKrw !== null &&
            item.course?.estimatedTotalCostKrw !== undefined
              ? ` · 예상 ${item.course.estimatedTotalCostKrw.toLocaleString('ko-KR')}원`
              : '';
          const isLoadingThis = isLoadingDetailId === item.id;

          return (
            <View key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                style={({ pressed }) => [
                  styles.courseRow,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title ?? 'AI 여행 코스'} 상세 화면으로 이동`}
              >
                <View style={styles.infoArea}>
                  <View style={styles.titleLine}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title ?? 'AI 추천 여행 코스'}
                    </Text>
                    <View style={styles.miniTag}>
                      <Text style={styles.miniTagText}>
                        {getDurationText(item)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {item.summary ? item.summary : `혼행 추천 코스${costStr}`}
                  </Text>
                </View>

                {/* 우측 하트 버튼 */}
                <View style={styles.actionArea}>
                  <Pressable
                    onPress={e => {
                      e.stopPropagation?.();
                      remove(item);
                    }}
                    disabled={removingId !== null}
                    style={styles.heartBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="관심 해제"
                  >
                    <HeartIcon color={colors.goldDeep} size={18} filled />
                  </Pressable>
                  {isLoadingThis ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : null}
                </View>
              </Pressable>
            </View>
          );
        })}

        {/* 3개 초과 시 바텀시트 열기 버튼 */}
        {remainingCount > 0 ? (
          <>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [
                styles.sheetOpenBtn,
                pressed && styles.rowPressed,
              ]}
              onPress={openSheet}
              accessibilityRole="button"
              accessibilityLabel={`관심 코스 전체보기 (총 ${favorites.length}개)`}
            >
              <Text style={styles.sheetOpenText}>
                더보기 ({remainingCount}개 더보기)
              </Text>
              <Chevron direction="right" color={colors.primary} size={14} />
            </Pressable>
          </>
        ) : null}
      </View>

      {/* ── 관심 코스 바텀시트 모달 (열렸을 때만 안전하게 렌더링) ── */}
      {isSheetVisible ? (
        <Modal
          visible={isSheetVisible}
          transparent
          animationType="none"
          onRequestClose={closeSheet}
        >
          <View style={styles.modalRoot}>
            {/* 어두운 배경 (투명도 애니메이션 연동) */}
            <Animated.View
              style={[
                styles.sheetBackdrop,
                { opacity: backdropOpacity },
              ]}
            >
              <Pressable
                style={styles.sheetBackdropTouch}
                onPress={closeSheet}
              />
            </Animated.View>

            {/* 바텀시트 본체 (위치 애니메이션 연동) */}
            <Animated.View
              style={[
                styles.sheetContainer,
                {
                  paddingBottom: Math.max(insets.bottom, 20),
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* 드래그 핸들 + 헤더 영역 (아래로 쓸어내려 닫기 지원) */}
              <View {...panResponder.panHandlers} style={styles.dragHeaderArea}>
                <View style={styles.dragHandle} />
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetTitleGroup}>
                    <Text style={styles.sheetTitle}>관심 코스 목록</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{favorites.length}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={closeSheet}
                    style={styles.closeBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="닫기"
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>

              {/* 바텀시트 내 전체 스크롤 리스트 */}
              <ScrollView
                style={styles.sheetScrollView}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {favorites.map((item, index) => {
                  const costStr =
                    item.course?.estimatedTotalCostKrw !== null &&
                    item.course?.estimatedTotalCostKrw !== undefined
                      ? ` · 예상 ${item.course.estimatedTotalCostKrw.toLocaleString('ko-KR')}원`
                      : '';

                  return (
                    <View key={item.id}>
                      {index > 0 ? <View style={styles.sheetDivider} /> : null}
                      <Pressable
                        style={({ pressed }) => [
                          styles.sheetCourseRow,
                          pressed && styles.rowPressed,
                        ]}
                        onPress={() => handleSelect(item)}
                        accessibilityRole="button"
                      >
                        <View style={styles.infoArea}>
                          <View style={styles.titleLine}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {item.title ?? 'AI 추천 여행 코스'}
                            </Text>
                            <View style={styles.miniTag}>
                              <Text style={styles.miniTagText}>
                                {getDurationText(item)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.rowSub} numberOfLines={1}>
                            {item.summary ? item.summary : `혼행 추천 코스${costStr}`}
                          </Text>
                        </View>

                        {/* 바텀시트 행 우측 하트 */}
                        <View style={styles.actionArea}>
                          <Pressable
                            onPress={e => {
                              e.stopPropagation?.();
                              remove(item);
                            }}
                            disabled={removingId !== null}
                            style={styles.heartBtn}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="관심 해제"
                          >
                            <HeartIcon color={colors.goldDeep} size={18} filled />
                          </Pressable>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // 본문 컴팩트 카드
  containerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: -2,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  infoArea: {
    flex: 1,
    gap: 4,
  },
  titleLine: {
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
  miniTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
  },
  miniTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  rowSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  actionArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 바텀시트 열기 버튼
  sheetOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  sheetOpenText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // 바텀시트 모달 스타일
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetBackdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  dragHeaderArea: {
    paddingTop: 6,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryStrong,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sheetScrollView: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingVertical: 6,
  },
  sheetCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // 상태 카드들
  loadingCard: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyDescription: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorCard: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  retryText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.goldDeep,
  },
});
