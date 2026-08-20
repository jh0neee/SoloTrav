/**
 * 기록 화면 — 혼행러들이 어디에 다녀왔는지 보여주는 피드.
 *
 *   전체(GET /travel-records) / 내 기록(GET /travel-records/me) 을 탭으로 나누고,
 *   '+ 기록' 으로 작성 화면(POST /travel-records)을 띄웁니다.
 *
 * 서버가 주는 기록은 안전등급·태그·내용·날짜뿐이라 목업에 있던 좋아요/댓글은
 * 화면에서 뺐습니다. 사진도 API 에 없어서 예전처럼 색 플레이스홀더를 씁니다.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Chip from '../components/Chip';
import RecordFormScreen from './record/RecordFormScreen';
import RecordDetailScreen from './record/RecordDetailScreen';
import {
  recordStore,
  useRecords,
  type RecordListState,
  type RecordScope,
} from '../records/recordStore';
import { colors, photoTones } from '../theme/colors';
import {
  CommentIcon,
  HeartIcon,
  ShieldIcon,
} from '../components/icons/UiIcons';
import type { TravelRecord } from '../types/travelRecord';

const ALL_TAGS = '전체';

const SCOPES: { key: RecordScope; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'mine', label: '내 기록' },
];

/**
 * 탭 안이라 홈 스택처럼 push 할 곳이 없어서, 화면 전환을 이 안에서 관리합니다.
 *   feed → detail → form(수정) / feed → form(작성)
 */
type Route =
  | { name: 'feed' }
  | { name: 'detail'; recordId: string }
  | { name: 'form'; record: TravelRecord | null };

function RecordScreen() {
  const [scope, setScope] = useState<RecordScope>('all');
  const insets = useSafeAreaInsets();
  const [tagFilter, setTagFilter] = useState<string>(ALL_TAGS);
  const [route, setRoute] = useState<Route>({ name: 'feed' });

  const state = useRecords(scope);
  const list = state[scope];

  // 안드로이드 뒤로가기: 피드가 아니면 앱을 닫지 않고 한 단계 되돌립니다.
  useEffect(() => {
    if (route.name === 'feed') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // 수정 화면에서 돌아갈 곳은 그 기록의 상세입니다.
      setRoute(current =>
        current.name === 'form' && current.record
          ? { name: 'detail', recordId: current.record.id }
          : { name: 'feed' },
      );
      return true;
    });
    return () => sub.remove();
  }, [route.name]);

  // 필터 칩은 실제로 올라온 태그에서 만듭니다(서버에 카테고리 개념이 없습니다).
  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    list.records.forEach(record => record.tags.forEach(tag => tags.add(tag)));
    return [ALL_TAGS, ...Array.from(tags)];
  }, [list.records]);

  const visible = useMemo(
    () =>
      tagFilter === ALL_TAGS
        ? list.records
        : list.records.filter(record => record.tags.includes(tagFilter)),
    [list.records, tagFilter],
  );

  const switchScope = (next: RecordScope) => {
    setScope(next);
    // 목록이 바뀌면 이전 목록의 태그로 걸러진 채 남지 않도록 초기화합니다.
    setTagFilter(ALL_TAGS);
  };

  const openForm = (record: TravelRecord | null) => {
    recordStore.clearSubmitError();
    setRoute({ name: 'form', record });
  };

  if (route.name === 'detail') {
    return (
      <RecordDetailScreen
        recordId={route.recordId}
        onBack={() => setRoute({ name: 'feed' })}
        onEdit={record => openForm(record)}
      />
    );
  }

  if (route.name === 'form') {
    const editing = route.record;
    return (
      <RecordFormScreen
        initial={
          editing
            ? {
                safetyGrade: editing.safetyGrade,
                tags: editing.tags,
                description: editing.description,
                date: editing.date,
              }
            : null
        }
        existingImageUrls={editing?.imageUrls ?? []}
        isSubmitting={state.isSubmitting}
        submitError={state.submitError}
        onBack={() =>
          setRoute(
            editing
              ? { name: 'detail', recordId: editing.id }
              : { name: 'feed' },
          )
        }
        onSubmit={async (input, images) => {
          try {
            // 사진만 실패한 경우는 던지지 않고 결과로 옵니다.
            // 기록은 이미 저장됐으니 화면은 닫고, 사진 얘기만 따로 알립니다.
            const result = editing
              ? await recordStore.update(editing.id, input, images)
              : await recordStore.create(input, images);

            if (editing) {
              setRoute({ name: 'detail', recordId: editing.id });
            } else {
              setRoute({ name: 'feed' });
              // 방금 올린 기록이 바로 보이도록 내 기록으로 옮겨줍니다.
              switchScope('mine');
            }

            if (result.imageError) {
              Alert.alert('사진 업로드 실패', result.imageError);
            }
          } catch {
            // 실패 메시지는 작성 화면 하단에 뜹니다. 입력이 날아가지 않게 열어둡니다.
          }
        }}
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visible}
      keyExtractor={record => record.id}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={list.status === 'loading' && list.records.length > 0}
          onRefresh={() => recordStore.reload(scope)}
          tintColor={colors.goldDeep}
        />
      }
      ListHeaderComponent={
        <View>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerTexts}>
              <Text style={styles.kicker}>혼행 피드</Text>
              <Text style={styles.title}>
                {scope === 'mine' ? '내가 다녀온 곳' : '다들 어디 다녀왔을까'}
              </Text>
            </View>
            <Pressable
              style={styles.writeBtn}
              onPress={() => openForm(null)}
              accessibilityRole="button"
              accessibilityLabel="기록 쓰기"
            >
              <Text style={styles.writeText}>+ 기록</Text>
            </Pressable>
          </View>

          {/* 전체 / 내 기록 */}
          <View style={styles.segment}>
            {SCOPES.map(item => {
              const active = item.key === scope;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.segmentItem, active && styles.segmentItemOn]}
                  onPress={() => switchScope(item.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextOn,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tagOptions.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {tagOptions.map(tag => (
                <Chip
                  key={tag}
                  label={tag === ALL_TAGS ? tag : `#${tag}`}
                  selected={tagFilter === tag}
                  onPress={() => setTagFilter(tag)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.filterSpacer} />
          )}
        </View>
      }
      ListEmptyComponent={
        <ListPlaceholder
          state={list}
          scope={scope}
          filtered={tagFilter !== ALL_TAGS}
          onRetry={() => recordStore.reload(scope)}
          onWrite={() => openForm(null)}
        />
      }
      renderItem={({ item }) => (
        <RecordCard
          record={item}
          onPress={() => setRoute({ name: 'detail', recordId: item.id })}
        />
      )}
    />
  );
}

/** 목록이 비어 있을 때: 조회 중 / 실패 / 기록 없음 */
function ListPlaceholder({
  state,
  scope,
  filtered,
  onRetry,
  onWrite,
}: {
  state: RecordListState;
  scope: RecordScope;
  filtered: boolean;
  onRetry: () => void;
  onWrite: () => void;
}) {
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.goldDeep} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {state.error ?? '기록을 불러오지 못했습니다.'}
        </Text>
        <Pressable
          style={styles.emptyCta}
          onPress={onRetry}
          accessibilityRole="button"
        >
          <Text style={styles.emptyCtaText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (filtered) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>이 태그의 기록이 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>
        {scope === 'mine'
          ? '아직 남긴 기록이 없어요.\n다녀온 곳을 기록해보세요.'
          : '아직 올라온 기록이 없어요.\n첫 기록을 남겨보세요.'}
      </Text>
      <Pressable
        style={styles.emptyCta}
        onPress={onWrite}
        accessibilityRole="button"
      >
        <Text style={styles.emptyCtaText}>기록 남기기</Text>
      </Pressable>
    </View>
  );
}

/** 기록 카드 한 장 — 누르면 상세로 들어갑니다. */
function RecordCard({
  record,
  onPress,
}: {
  record: TravelRecord;
  onPress: () => void;
}) {
  const tone = photoTones[record.tone];
  const author = record.authorName ?? '혼행러';
  const isTopGrade = record.safetyGrade === 'A';
  const cover = record.imageUrls[0];

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${author}의 기록 자세히 보기`}
    >
      {/* 작성자 */}
      <View style={styles.postHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{author.charAt(0)}</Text>
        </View>
        <View style={styles.postHeadTexts}>
          <Text style={styles.author}>{author}</Text>
          <Text style={styles.postMeta} numberOfLines={1}>
            {record.date || '날짜 미상'}
          </Text>
        </View>
      </View>

      {/* 이미지가 있으면 첫 장을, 없으면 색 플레이스홀더를 그립니다. */}
      <View style={[styles.photo, { backgroundColor: tone.bg }]}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={styles.photoImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <>
            <View style={[styles.moon, { backgroundColor: tone.accent }]} />
            <View
              style={[styles.ridgeBack, { borderBottomColor: tone.ridge }]}
            />
            <View
              style={[styles.ridgeFront, { borderBottomColor: tone.ridge }]}
            />
          </>
        )}

        <View style={styles.safetyPill}>
          <ShieldIcon
            color={isTopGrade ? colors.safeText : colors.bonusText}
            size={13}
          />
          <Text
            style={[
              styles.safetyGrade,
              isTopGrade ? styles.gradeA : styles.gradeB,
            ]}
          >
            안전 {record.safetyGrade}
          </Text>
        </View>
      </View>

      {/* 좋아요 · 댓글 */}
      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={() => {
            // 실패하면 스토어가 알아서 되돌립니다.
            recordStore.toggleLike(record.id).catch(() => {});
          }}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ selected: record.likedByMe }}
          accessibilityLabel={record.likedByMe ? '좋아요 취소' : '좋아요'}
        >
          <HeartIcon
            color={record.likedByMe ? colors.danger : colors.textSecondary}
            size={20}
          />
          <Text style={styles.actionText}>{record.likeCount}</Text>
        </Pressable>
        <View style={styles.action}>
          <CommentIcon color={colors.textSecondary} size={19} />
          <Text style={styles.actionText}>{record.commentCount}</Text>
        </View>
      </View>

      {/* 본문 */}
      {record.description ? (
        <Text style={styles.caption} numberOfLines={3}>
          {record.description}
        </Text>
      ) : null}
      {record.tags.length > 0 ? (
        <Text style={styles.tags}>
          {record.tags.map(tag => `#${tag}`).join(' ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingBottom: 28,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    // paddingTop 은 상태바 높이(insets.top)를 더해 인라인으로 지정합니다.
  },
  headerTexts: {
    flex: 1,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.goldDeep,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  writeBtn: {
    backgroundColor: colors.ink,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  writeText: {
    color: colors.inkText,
    fontSize: 13,
    fontWeight: '800',
  },

  // 전체 / 내 기록
  segment: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentItemOn: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextOn: {
    color: colors.inkText,
  },

  filterRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSpacer: {
    height: 16,
  },

  // 카드
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mascot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mascotFace,
  },
  postHeadTexts: {
    flex: 1,
  },
  author: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  postMeta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // 사진 자리
  photo: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  moon: {
    position: 'absolute',
    top: 18,
    right: 20,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  ridgeBack: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    width: 0,
    height: 0,
    borderLeftWidth: 90,
    borderRightWidth: 90,
    borderBottomWidth: 78,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.75,
  },
  ridgeFront: {
    position: 'absolute',
    bottom: 0,
    right: -30,
    width: 0,
    height: 0,
    borderLeftWidth: 110,
    borderRightWidth: 110,
    borderBottomWidth: 104,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  safetyPill: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '82%',
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  safetyGrade: {
    fontSize: 11,
    fontWeight: '800',
  },
  gradeA: {
    color: colors.safeText,
  },
  gradeB: {
    color: colors.bonusText,
  },

  // 좋아요 · 댓글
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 12,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // 본문
  caption: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  tags: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.goldDeep,
  },

  // 빈 상태
  empty: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyCta: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.ink,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.inkText,
  },
});

export default RecordScreen;
