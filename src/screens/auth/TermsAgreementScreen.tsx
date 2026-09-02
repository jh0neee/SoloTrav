/** 카카오 인증 뒤, 서비스 진입 전에 표시하는 이용약관 동의 화면. */
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../../config/legal';
import { colors } from '../../theme/colors';

async function openDocument(label: string, url: string | null) {
  if (!url) {
    Alert.alert(
      `${label} 준비 중`,
      '문서 URL은 백엔드 약관 API가 확정되면 연결할 예정입니다.',
    );
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('문서를 열 수 없어요', '잠시 후 다시 시도해주세요.');
  }
}

function TermsAgreementScreen() {
  const insets = useSafeAreaInsets();
  const { completeTermsAgreement, logout } = useAuth();
  const [agreed, setAgreed] = useState(false);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          혼행등대를 시작하기 전에{`\n`}약관을 확인해주세요
        </Text>
        <Text style={styles.description}>
          서비스 이용에 필요한 필수 약관이에요.
        </Text>

        <View style={styles.agreementCard}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="필수 혼행등대 이용약관 동의"
            accessibilityState={{ checked: agreed }}
            onPress={() => setAgreed(value => !value)}
            style={styles.agreementToggle}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed ? (
                <CheckIcon
                  color={colors.textOnPrimary}
                  size={16}
                  weight="bold"
                />
              ) : null}
            </View>
            <Text style={styles.agreementLabel}>
              <Text style={styles.required}>[필수] </Text>
              혼행등대 이용약관 동의
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="혼행등대 이용약관 보기"
            hitSlop={8}
            onPress={() => openDocument('이용약관', TERMS_OF_SERVICE_URL)}
          >
            <Text style={styles.viewLabel}>보기</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="개인정보 처리방침 보기"
          hitSlop={8}
          onPress={() => openDocument('개인정보 처리방침', PRIVACY_POLICY_URL)}
          style={styles.privacyLink}
        >
          <Text style={styles.privacyLinkText}>개인정보 처리방침 보기</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="동의하고 시작하기"
          accessibilityState={{ disabled: !agreed }}
          disabled={!agreed}
          onPress={completeTermsAgreement}
          style={({ pressed }) => [
            styles.primaryButton,
            !agreed && styles.primaryButtonDisabled,
            pressed && agreed && styles.primaryButtonPressed,
          ]}
        >
          <Text
            style={[
              styles.primaryButtonLabel,
              !agreed && styles.primaryButtonLabelDisabled,
            ]}
          >
            동의하고 시작하기
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="동의하지 않고 로그아웃"
          onPress={logout}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>동의하지 않고 나가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 56,
  },
  title: {
    fontSize: 27,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  agreementCard: {
    minHeight: 68,
    marginTop: 34,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  agreementToggle: {
    flex: 1,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    borderRadius: 7,
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  agreementLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  required: {
    color: colors.primaryStrong,
  },
  viewLabel: {
    paddingLeft: 10,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  privacyLink: {
    alignSelf: 'center',
    marginTop: 18,
  },
  privacyLinkText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  actions: {
    gap: 8,
  },
  primaryButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryStrong,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.ctaDisabled,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  primaryButtonLabelDisabled: {
    color: colors.ctaDisabledText,
  },
  secondaryButton: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surface,
  },
  secondaryButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default TermsAgreementScreen;
