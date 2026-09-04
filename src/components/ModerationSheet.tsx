import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  onReportContent: (reason: ReportReason, description?: string) => void;
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
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      setIsOtherMode(false);
      setOtherText('');
    }
  }, [translateY, visible]);

  const dismiss = useCallback(() => {
    if (submitting) {
      return;
    }
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: 520,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  }, [onClose, submitting, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !submitting &&
          !isOtherMode &&
          !isKeyboardVisible &&
          gesture.dy > 8 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 120 || gesture.vy > 0.8) {
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
    [dismiss, isKeyboardVisible, isOtherMode, submitting, translateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={dismiss}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <Pressable
          style={styles.backdropTouch}
          disabled={submitting}
          onPress={() => {
            if (isKeyboardVisible) {
              Keyboard.dismiss();
            } else {
              dismiss();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="신고 메뉴 닫기"
        />
        <Animated.View
          {...(isOtherMode ? {} : panResponder.panHandlers)}
          style={[
            styles.sheet,
            {
              paddingBottom: isKeyboardVisible ? 16 : insets.bottom + 16,
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

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
          {isOtherMode ? (
            <View style={styles.otherContainer}>
              <Text style={styles.title}>기타 사유 입력</Text>
              <Text style={styles.description}>
                신고 사유를 구체적으로 입력해주세요. (필수)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="신고 사유를 입력해주세요 (최대 200자)"
                placeholderTextColor={colors.textSecondary}
                value={otherText}
                onChangeText={setOtherText}
                multiline
                maxLength={200}
                autoFocus
                editable={!submitting}
              />
              <View style={styles.otherActions}>
                <Pressable
                  style={styles.otherBackBtn}
                  disabled={submitting}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsOtherMode(false);
                  }}
                  accessibilityRole="button">
                  <Text style={styles.otherBackText}>이전</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.otherSubmitBtn,
                    !otherText.trim() && styles.otherSubmitBtnDisabled,
                  ]}
                  disabled={submitting || !otherText.trim()}
                  onPress={() => {
                    Keyboard.dismiss();
                    onReportContent('OTHER', otherText.trim());
                  }}
                  accessibilityRole="button">
                  <Text style={styles.otherSubmitText}>신고하기</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{contentLabel} 신고</Text>
              <Text style={styles.description}>신고 사유를 선택해주세요.</Text>

              <View style={styles.options}>
                {REASONS.map(reason => (
                  <Pressable
                    key={reason.value}
                    style={styles.option}
                    disabled={submitting}
                    onPress={() => {
                      if (reason.value === 'OTHER') {
                        setIsOtherMode(true);
                      } else {
                        onReportContent(reason.value);
                      }
                    }}
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
            </>
          )}
          </ScrollView>

          {submitting ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>처리 중이에요</Text>
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
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
    maxHeight: '88%',
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 6,
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
  otherContainer: {
    paddingBottom: 8,
  },
  textInput: {
    minHeight: 100,
    maxHeight: 160,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  otherActions: {
    flexDirection: 'row',
    gap: 10,
  },
  otherBackBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  otherBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  otherSubmitBtn: {
    flex: 2,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.danger,
  },
  otherSubmitBtnDisabled: {
    opacity: 0.45,
  },
  otherSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default ModerationSheet;
