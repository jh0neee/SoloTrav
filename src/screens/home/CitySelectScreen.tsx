/** 선택한 기준으로 충북 11개 시군 전체 순위를 비교하는 화면입니다. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';
import { type City } from '../../data/cities';
import { colors } from '../../theme/colors';
import { Chevron } from '../../components/icons/UiIcons';
import { RankingRow, SectionState } from '../../components/travel/TravelCards';
import { useCityRankings } from '../../travel/homeQueries';
import { RANKING_KINDS, type RankingKind } from '../../types/travel';

type Props = {
  onBack: () => void;
  onOpenDetail: (city: City) => void;
  initialRankingKind: RankingKind;
};

function CitySelectScreen({ onBack, onOpenDetail, initialRankingKind }: Props) {
  const insets = useSafeAreaInsets();
  const [sortKind, setSortKind] = useState<RankingKind>(initialRankingKind);
  const ranking = useCityRankings();
  const sortedCities = ranking.rankings[sortKind];
  const selectedKind = RANKING_KINDS.find(kind => kind.id === sortKind);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>충북 동네 전체 순위</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{selectedKind?.label} 전체 목록</Text>
        <Text style={styles.subtitle}>
          충북 11개 시군을 같은 기준으로 한눈에 비교해요
        </Text>

        <View style={styles.sortRow}>
          {RANKING_KINDS.map(kind => {
            const active = sortKind === kind.id;
            return (
              <Pressable
                key={kind.id}
                style={[styles.sortChip, active && styles.sortChipActive]}
                onPress={() => setSortKind(kind.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Text
                  style={[
                    styles.sortChipText,
                    active && styles.sortChipTextActive,
                  ]}>
                  {kind.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sortCaption}>{selectedKind?.caption}</Text>
          <SectionState
            status={
              ranking.isLoading ? 'loading' : ranking.error ? 'error' : 'ready'
            }
            error={ranking.error}
            isEmpty={sortedCities.length === 0}
            emptyText="비교할 데이터를 불러오지 못했어요"
            onRetry={ranking.reload}
            height={220}
          />

          {sortedCities.map(item => (
            <RankingRow
              key={item.city.id}
              rank={item.rank}
              name={item.city.name}
              value={item.value}
              caption={item.caption}
              safetyStatus={sortKind === 'safe' ? item.safetyStatus : undefined}
              onPress={() => onOpenDetail(item.city)}
            />
          ))}

          {sortKind !== 'safe' && ranking.visitorBaseLabel ? (
            <Text style={styles.sortSource}>
              한국관광공사 지역방문자수 · {ranking.visitorBaseLabel}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: {
    paddingHorizontal: 20,
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 34,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 20,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  sortChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  sortChipActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
    includeFontPadding: true,
  },
  sortChipTextActive: { color: colors.primary, fontWeight: '700' },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  sortCaption: {
    fontSize: 11,
    color: colors.textSecondary,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sortSource: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 8,
  },
});

export default CitySelectScreen;
