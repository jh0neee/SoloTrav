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
  const canOpenDetail = limit === undefined;
  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconWrap}>
          <HeartIcon color={colors.goldDeep} size={28} />
        </View>
        <Text style={styles.emptyTitle}>아직 관심 코스가 없어요</Text>
        <Text style={styles.emptyDescription}>
          AI가 생성한 코스에서 하트를 누르면{`\n`}이곳에서 다시 확인할 수 있어요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title ?? 'AI 여행 코스'}</Text>
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
          <Text style={styles.summary}>
            {firstSentence(item.summary ?? 'AI가 추천한 여행 동선입니다.')}
          </Text>
          {item.course || canOpenDetail ? (
            <View style={styles.footer}>
              {item.course ? (
                <Text style={styles.meta}>{item.course.days.length}일 일정{item.course.estimatedTotalCostKrw !== null ? ` · ${item.course.estimatedTotalCostKrw.toLocaleString('ko-KR')}원` : ''}</Text>
              ) : <View />}
              {canOpenDetail ? (
                <Pressable
                  onPress={() => openDetail(item.id)}
                  style={({ pressed }) => [styles.detailLink, pressed && styles.detailLinkPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title ?? 'AI 여행 코스'} 상세 보기`}>
                  <Text style={styles.detailLinkText}>코스 상세보기</Text>
                  <Chevron direction="right" color={colors.primary} size={14} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  summary: { marginTop: 10, fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  meta: { fontSize: 14, fontWeight: '700', color: colors.primary },
  detailLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailLinkPressed: { opacity: 0.62 },
  detailLinkText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  heartButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 8 },
  emptyCard: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 30, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#ffffff' },
  emptyIconWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: colors.goldSoft },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  emptyDescription: { marginTop: 7, fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
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
