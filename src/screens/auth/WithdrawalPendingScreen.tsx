/** 탈퇴 예약 계정이 카카오 본인 확인을 마친 뒤 진입하는 복구 화면. */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';

function WithdrawalPendingScreen() {
  const insets = useSafeAreaInsets();
  const {
    cancelWithdrawal,
    leaveWithdrawalRecovery,
    isCancellingWithdrawal,
    error,
  } = useAuth();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 },
      ]}>
      <View style={styles.content}>
        <Text style={styles.title}>탈퇴가 예약된 계정이에요</Text>
        <Text style={styles.description}>
          탈퇴 요청 후 90일 이내에는 예약을 취소하고 기존 계정과 데이터를 그대로
          이용할 수 있어요.
        </Text>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>취소하면 이렇게 처리돼요</Text>
          <Text style={styles.noticeText}>• 기존 여행 기록과 저장 데이터가 유지돼요.</Text>
          <Text style={styles.noticeText}>• 새 서비스 로그인 토큰이 발급돼요.</Text>
          <Text style={styles.noticeText}>• 취소 즉시 서비스를 다시 이용할 수 있어요.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={cancelWithdrawal}
          disabled={isCancellingWithdrawal}
          accessibilityRole="button"
          accessibilityLabel="탈퇴 취소하고 계속하기"
          accessibilityState={{ disabled: isCancellingWithdrawal, busy: isCancellingWithdrawal }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isCancellingWithdrawal ? styles.primaryButtonPressed : null,
            isCancellingWithdrawal ? styles.disabled : null,
          ]}>
          {isCancellingWithdrawal ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.primaryLabel}>탈퇴 취소하고 계속하기</Text>
          )}
        </Pressable>
        <Pressable
          onPress={leaveWithdrawalRecovery}
          disabled={isCancellingWithdrawal}
          accessibilityRole="button"
          accessibilityLabel="로그인 화면으로 돌아가기"
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.secondaryButtonPressed : null,
          ]}>
          <Text style={styles.secondaryLabel}>로그인 화면으로 돌아가기</Text>
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
  },
  title: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  description: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  noticeCard: {
    gap: 10,
    marginTop: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.background,
  },
  noticeTitle: {
    marginBottom: 2,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  actions: {
    gap: 10,
  },
  error: {
    marginBottom: 2,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.danger,
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
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  secondaryButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default WithdrawalPendingScreen;
