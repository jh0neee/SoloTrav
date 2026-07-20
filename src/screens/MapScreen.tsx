/**
 * 지도 화면 — 주변 여행지와 안전 정보를 지도로 봅니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors } from '../theme/colors';

function MapScreen() {
  return (
    <ScreenContainer title="지도" subtitle="주변을 둘러보세요">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>내 주변</Text>
        <Text style={styles.cardText}>곧 지도에서 명소와 안전 지점을 보여드릴게요.</Text>
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

export default MapScreen;
