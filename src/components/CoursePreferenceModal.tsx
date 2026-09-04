/**
 * 코스 만들기 진입 시 기존 취향이 있는 사용자에게 3가지 옵션을 제시하는 선택 모달입니다.
 * 1. 내 취향 그대로 빠른 코스 (추천)
 * 2. 기존 취향 바탕으로 일부 수정
 * 3. 새로운 취향으로 처음부터 작성
 */
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { Chevron } from './icons/UiIcons';

type Props = {
  visible: boolean;
  cityName: string;
  preferenceTags?: string[];
  onSelectQuick: () => void;
  onSelectEdit: () => void;
  onSelectNew: () => void;
  onClose: () => void;
};

export function CoursePreferenceModal({
  visible,
  cityName,
  preferenceTags = [],
  onSelectQuick,
  onSelectEdit,
  onSelectNew,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* 뒷배경 반투명 딤 & 배경 터치 시 닫기 */}
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            console.log('[CoursePreferenceModal] backdrop pressed -> close');
            onClose();
          }}
          accessibilityLabel="모달 닫기"
        />

        {/* 모달 카드 (화면 중앙 정렬, pointerEvents="box-none"으로 카드 바깥 터치만 backdrop 통과) */}
        <View style={styles.cardCenterWrapper} pointerEvents="box-none">
          <View
            style={styles.card}
            pointerEvents="auto"
            onStartShouldSetResponder={() => true}
          >
            {/* 상단 헤더 */}
            <View style={styles.header}>
              <View style={styles.titleArea}>
                <Text style={styles.kicker}>{cityName} 여행 코스</Text>
                <Text style={styles.title}>어떻게 코스를 준비할까요?</Text>
              </View>
              <Pressable
                onPress={() => {
                  console.log('[CoursePreferenceModal] close button pressed');
                  onClose();
                }}
                style={styles.closeBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="닫기"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* 기존 취향 요약 태그 배너 */}
            {preferenceTags.length > 0 ? (
              <View style={styles.tagBanner}>
                <Text style={styles.tagBannerTitle}>현재 저장된 혼행 취향</Text>
                <View style={styles.tagRow}>
                  {preferenceTags.slice(0, 4).map((tag, idx) => (
                    <View key={`${tag}-${idx}`} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 3가지 선택지 리스트 */}
            <View style={styles.optionListContent}>
              {/* 1. 내 취향 그대로 빠른 코스 (추천) */}
              <Pressable
                style={({ pressed }) => [
                  styles.optionCard,
                  styles.optionCardPrimary,
                  pressed && styles.optionCardPressed,
                ]}
                onPress={() => {
                  console.log('[CoursePreferenceModal] Option selected: Quick');
                  onSelectQuick();
                }}
                accessibilityRole="button"
              >
                <View style={styles.optionIconBoxPrimary}>
                  <Text style={styles.optionEmoji}>🚀</Text>
                </View>
                <View style={styles.optionTextBox}>
                  <View style={styles.optionHeaderRow}>
                    <Text style={styles.optionTitlePrimary}>내 취향 그대로 빠른 코스</Text>
                    <View style={styles.badgeRecommend}>
                      <Text style={styles.badgeRecommendText}>추천</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDesc}>
                    기존 취향을 유지하고 기간 · 예산 · 메모만 빠르게 선택해요
                  </Text>
                </View>
                <Chevron direction="right" color={colors.primary} size={16} />
              </Pressable>

              {/* 2. 기존 취향 바탕으로 일부 수정 */}
              <Pressable
                style={({ pressed }) => [
                  styles.optionCard,
                  pressed && styles.optionCardPressed,
                ]}
                onPress={() => {
                  console.log('[CoursePreferenceModal] Option selected: Edit');
                  onSelectEdit();
                }}
                accessibilityRole="button"
              >
                <View style={styles.optionIconBox}>
                  <Text style={styles.optionEmoji}>✏️</Text>
                </View>
                <View style={styles.optionTextBox}>
                  <Text style={styles.optionTitle}>기존 취향 바탕으로 일부 수정</Text>
                  <Text style={styles.optionDesc}>
                    내 취향 답변을 불러와서 원하는 항목만 변경해요
                  </Text>
                </View>
                <Chevron direction="right" color={colors.textSecondary} size={16} />
              </Pressable>

              {/* 3. 새로운 취향으로 처음부터 작성 */}
              <Pressable
                style={({ pressed }) => [
                  styles.optionCard,
                  pressed && styles.optionCardPressed,
                ]}
                onPress={() => {
                  console.log('[CoursePreferenceModal] Option selected: New');
                  onSelectNew();
                }}
                accessibilityRole="button"
              >
                <View style={styles.optionIconBox}>
                  <Text style={styles.optionEmoji}>📄</Text>
                </View>
                <View style={styles.optionTextBox}>
                  <Text style={styles.optionTitle}>새로운 취향으로 처음부터 작성</Text>
                  <Text style={styles.optionDesc}>
                    이번 여행을 위해 백지 상태에서 새로 설정해요
                  </Text>
                </View>
                <Chevron direction="right" color={colors.textSecondary} size={16} />
              </Pressable>
            </View>

            {/* 하단 닫기/취소 */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={() => {
                console.log('[CoursePreferenceModal] cancel pressed');
                onClose();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(22, 24, 29, 0.55)',
  },
  cardCenterWrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleArea: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  tagBanner: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  tagBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  optionList: {
    maxHeight: 320,
  },
  optionListContent: {
    gap: 10,
    paddingVertical: 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 12,
  },
  optionCardPrimary: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  optionCardPressed: {
    opacity: 0.8,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconBoxPrimary: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionTextBox: {
    flex: 1,
    gap: 2,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionTitlePrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  badgeRecommend: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRecommendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default CoursePreferenceModal;

