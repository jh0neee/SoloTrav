/**
 * 마이 화면 — 프로필과 앱 설정을 관리합니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors } from '../theme/colors';

function MyScreen() {
  return (
    <ScreenContainer title="마이" subtitle="프로필과 설정">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>프로필</Text>
        <Text style={styles.cardText}>로그인하고 여행 기록을 저장하세요.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>설정</Text>
        <Text style={styles.cardText}>알림, 언어, 개인정보를 관리해요.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default MyScreen;
