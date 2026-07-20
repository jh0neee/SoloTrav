/**
 * 홈 화면 — 오늘의 여행 요약과 샛별이 빠른 진입 카드.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors } from '../theme/colors';

function HomeScreen() {
  return (
    <ScreenContainer title="홈" subtitle="오늘도 안전한 혼자 여행 되세요 👋">
      {/* 상단 2단 카드 (이미지 구성) */}
      <View style={styles.row}>
        <Pressable style={[styles.tile, styles.tileLight]}>
          <Text style={styles.tileSpark}>✨</Text>
          <Text style={styles.tileTitle}>AI 코스 짜기</Text>
          <Text style={styles.tileSub}>취향 기반 자동 일정</Text>
        </Pressable>

        <Pressable style={[styles.tile, styles.tileDark]}>
          <Text style={styles.tileSpark}>✦</Text>
          <Text style={[styles.tileTitle, styles.tileTitleDark]}>샛별이에게 묻기</Text>
          <Text style={[styles.tileSub, styles.tileSubDark]}>대화로 여행 계획</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>다가오는 일정</Text>
        <Text style={styles.cardText}>등록된 여행 일정이 아직 없어요.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'flex-end',
  },
  tileLight: {
    backgroundColor: colors.mascotGlow,
  },
  tileDark: {
    backgroundColor: colors.darkCard,
  },
  tileSpark: {
    position: 'absolute',
    top: 14,
    left: 16,
    fontSize: 20,
    color: colors.mascotDeep,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tileTitleDark: {
    color: '#ffffff',
  },
  tileSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tileSubDark: {
    color: '#c7cbd6',
  },
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

export default HomeScreen;
