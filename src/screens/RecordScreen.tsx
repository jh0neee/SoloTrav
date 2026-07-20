/**
 * 기록 화면 — 지난 여행과 저장한 장소를 모아 봅니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors } from '../theme/colors';

function RecordScreen() {
  return (
    <ScreenContainer title="기록" subtitle="나의 여행 발자취">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>지난 여행</Text>
        <Text style={styles.cardText}>아직 기록된 여행이 없어요.</Text>
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

export default RecordScreen;
