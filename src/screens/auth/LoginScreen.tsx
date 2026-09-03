/**
 * 로그인 화면.
 * 인증 로직은 전부 useAuth() 뒤에 있고, 이 화면은 표시와 입력만 담당합니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KakaoLoginButton from '../../components/KakaoLoginButton';
import { Mascot } from '../../components/icons/TabIcons';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/colors';

function LoginScreen() {
  const { loginWithKakao, isSigningIn, error } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.mascotWrap}>
          <View style={styles.mascotGlow} />
          <Mascot size={96} />
        </View>
        <Text style={styles.title}>혼자여도{'\n'}괜찮은 여행</Text>
        <Text style={styles.subtitle}>
          샛별이가 안전한 길과 어울리는 코스를 함께 찾아드릴게요.
        </Text>
      </View>

      <View
        style={[styles.footer, { paddingBottom: (insets.bottom || 12) + 16 }]}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <KakaoLoginButton onPress={loginWithKakao} loading={isSigningIn} />

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  mascotGlow: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.mascotGlow,
    opacity: 0.5,
  },
  title: {
    fontSize: 30,
    lineHeight: 40,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    gap: 12,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
    textAlign: 'center',
  },
});

export default LoginScreen;
