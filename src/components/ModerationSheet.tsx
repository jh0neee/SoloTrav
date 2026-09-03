import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export type ReportReason =
  | 'HARASSMENT'
  | 'SEXUAL'
  | 'HATE'
  | 'VIOLENCE'
  | 'PRIVACY'
  | 'SPAM'
  | 'OTHER';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'HARASSMENT', label: '괴롭힘 또는 따돌림' },
  { value: 'SEXUAL', label: '음란하거나 선정적인 콘텐츠' },
  { value: 'HATE', label: '혐오 또는 차별 표현' },
  { value: 'VIOLENCE', label: '폭력적이거나 위험한 콘텐츠' },
  { value: 'PRIVACY', label: '개인정보 노출' },
  { value: 'SPAM', label: '스팸 또는 광고' },
  { value: 'OTHER', label: '기타 부적절한 콘텐츠' },
];

type Props = {
  visible: boolean;
  contentLabel: string;
  canBlockUser?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onReportContent: (reason: ReportReason) => void;
  onBlockUser?: () => void;
};

/** 신고 버튼을 누르면 곧바로 사유를 고르고, 필요하면 작성자를 차단하는 시트. */
function ModerationSheet({
  visible,
  contentLabel,
  canBlockUser = false,
  submitting = false,
  onClose,
  onReportContent,
  onBlockUser,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  const dismiss = () => {
    if (submitting) {
      return;
    }
    Animated.timing(translateY, {
      toValue: 520,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !submitting &&
          gesture.dy > 6 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 0.8) {
            dismiss();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [submitting, translateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropTouch}
          disabled={submitting}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="신고 메뉴 닫기"
        />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY }],
            },
          ]}>
          <Pressable
            onPress={dismiss}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="신고 메뉴 닫기">
            <View style={styles.handle} />
          </Pressable>
          <Text style={styles.title}>{contentLabel} 신고</Text>
          <Text style={styles.description}>신고 사유를 선택해주세요.</Text>

          <View style={styles.options}>
            {REASONS.map(reason => (
              <Pressable
                key={reason.value}
                style={styles.option}
                disabled={submitting}
                onPress={() => onReportContent(reason.value)}
                accessibilityRole="button">
                <Text style={styles.optionText}>{reason.label}</Text>
              </Pressable>
            ))}

            {canBlockUser && onBlockUser ? (
              <Pressable
                style={styles.blockOption}
                disabled={submitting}
                onPress={onBlockUser}
                accessibilityRole="button">
                <Text style={styles.dangerText}>이 사용자 차단하기</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.cancel}
              disabled={submitting}
              onPress={onClose}
              accessibilityRole="button">
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>

          {submitting ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>처리 중이에요</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22,24,29,0.45)',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.background,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 16,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  title: {
    marginBottom: 4,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    marginBottom: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  options: {
    gap: 8,
  },
  option: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  optionText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  blockOption: {
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default ModerationSheet;
