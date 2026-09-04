/**
 * 최상위 분기 — 인증 게이트.
 * 저장된 세션을 복원하는 동안 잠깐 로딩을 보여주고,
 * 로그인 여부에 따라 로그인 화면 / 메인 탭을 고릅니다.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import BottomTabNavigator from './BottomTabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import WithdrawalPendingScreen from '../screens/auth/WithdrawalPendingScreen';
import TermsAgreementScreen from '../screens/auth/TermsAgreementScreen';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';

function RootNavigator() {
  const { status, isWithdrawalPending, requiresTermsAgreement } = useAuth();

  if (status === 'restoring') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.mascotDeep} size="large" />
      </View>
    );
  }

  if (isWithdrawalPending) {
    return <WithdrawalPendingScreen />;
  }

  if (requiresTermsAgreement && status !== 'guest') {
    return <TermsAgreementScreen />;
  }

  return status === 'authenticated' || status === 'guest' ? (
    <BottomTabNavigator />
  ) : (
    <LoginScreen />
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
});

export default RootNavigator;
