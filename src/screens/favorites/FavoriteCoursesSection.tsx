import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Chevron, HeartIcon } from '../../components/icons/UiIcons';
import { favoriteStore, useFavorites } from '../../favorites/favoriteStore';
import { colors } from '../../theme/colors';
import type { AiRouteFavorite } from '../../types/favorite';

type Props = { limit?: number };

/** 목록 미리보기에는 줄 수가 아니라 첫 문장 전체를 보여 줍니다. */
function firstSentence(text: string): string {
  const normalized = text.trim();
  const match = normalized.match(/^.*?[.!?](?=\s|$)/);
  return match?.[0] ?? normalized;
}

function FavoriteCoursesSection({ limit }: Props) {
  const { status, favorites, error } = useFavorites();
  const [selected, setSelected] = useState<AiRouteFavorite | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const openDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      setSelected(await favoriteStore.detail(id));
    } catch {
      Alert.alert('조회 실패', '관심 코스 상세 정보를 불러오지 못했습니다.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const remove = (favorite: AiRouteFavorite) => {
    if (removingId) return;
    Alert.alert('관심 해제', '이 코스를 관심 목록에서 해제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '관심 해제',
        style: 'destructive',
        onPress: async () => {
          setRemovingId(favorite.id);
          try {
            await favoriteStore.remove(favorite.id);
            if (selected?.id === favorite.id) setSelected(null);
          } catch {
            Alert.alert('해제 실패', '잠시 후 다시 시도해주세요.');
          } finally {
            setRemovingId(null);
          }
        },
      },
    ]);
  };

  if (selected) {
    return (
      <View style={styles.detail}>
        <Pressable onPress={() => setSelected(null)} style={styles.back} accessibilityRole="button">
          <Chevron direction="left" color={colors.textPrimary} size={18} />
          <Text style={styles.backText}>목록</Text>
        </Pressable>
        <Text style={styles.detailTitle}>{selected.title ?? 'AI 여행 코스'}</Text>
        {selected.summary ? <Text style={styles.detailSummary}>{selected.summary}</Text> : null}
        {selected.course ? (
          <View style={styles.detailMeta}>
            <Text style={styles.detailMetaText}>{selected.course.days.length}일 일정</Text>
            {selected.course.estimatedTotalCostKrw !== null ? (
              <Text style={styles.detailMetaText}>
                예상 {selected.course.estimatedTotalCostKrw.toLocaleString('ko-KR')}원
              </Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          onPress={() => remove(selected)}
          disabled={removingId !== null}
          style={styles.removeButton}
          accessibilityRole="button">
          <HeartIcon color={colors.danger} size={18} filled />
          <Text style={styles.removeText}>{removingId ? '해제 중…' : '관심 해제'}</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'loading' || isLoadingDetail) {
    return <ActivityIndicator color={colors.goldDeep} style={styles.loader} />;
  }
  if (status === 'error') {
    return (
      <Pressable onPress={() => favoriteStore.reload()} style={styles.empty} accessibilityRole="button">
        <Text style={styles.emptyText}>{error ?? '관심 코스 목록을 불러오지 못했습니다.'}</Text>
        <Text style={styles.retry}>다시 시도</Text>
      </Pressable>
    );
  }

  const items = limit === undefined ? favorites : favorites.slice(0, limit);
  if (items.length === 0) {
    return <Text style={styles.emptyText}>AI가 만든 코스를 관심에 추가하면 여기에 모아볼 수 있어요.</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <Pressable onPress={() => openDetail(item.id)} style={styles.cardMain} accessibilityRole="button">
            <View style={styles.cardBody}>
              <Text style={styles.title} numberOfLines={1}>{item.title ?? 'AI 여행 코스'}</Text>
              <Text style={styles.summary}>
                {firstSentence(item.summary ?? 'AI가 추천한 여행 동선입니다.')}
              </Text>
              {item.course ? (
                <Text style={styles.meta}>{item.course.days.length}일 일정{item.course.estimatedTotalCostKrw !== null ? ` · ${item.course.estimatedTotalCostKrw.toLocaleString('ko-KR')}원` : ''}</Text>
              ) : null}
            </View>
          </Pressable>
          <Pressable
            onPress={() => remove(item)}
            disabled={removingId !== null}
            style={styles.heartButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="관심 해제">
            <HeartIcon color={colors.goldDeep} size={21} filled />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  summary: { marginTop: 4, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  meta: { marginTop: 7, fontSize: 11, fontWeight: '600', color: colors.goldDeep },
  heartButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  empty: { paddingVertical: 8 },
  emptyText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  retry: { marginTop: 6, fontSize: 13, fontWeight: '700', color: colors.goldDeep },
  loader: { paddingVertical: 18 },
  detail: { padding: 16, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  detailTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  detailSummary: { marginTop: 7, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  detailMeta: { flexDirection: 'row', gap: 10, marginTop: 12 },
  detailMetaText: { fontSize: 12, fontWeight: '600', color: colors.goldDeep },
  removeButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.dangerSoft },
  removeText: { fontSize: 13, fontWeight: '700', color: colors.danger },
});

export default FavoriteCoursesSection;
