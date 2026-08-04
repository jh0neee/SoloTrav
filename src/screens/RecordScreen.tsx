/**
 * 기록 화면 — 혼행러들이 어디에 다녀왔는지 보여주는 인스타그램형 피드.
 * 카테고리 칩으로 거르고, 사진 위에는 장소별 안전 등급을 작게 표시합니다.
 */
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Chip from '../components/Chip';
import { CITY_TYPE_LABEL, getCityById } from '../data/cities';
import { FEED_CATEGORIES, FEED_POSTS, type FeedPost } from '../data/feed';
import { colors, photoTones } from '../theme/colors';
import {
  BookmarkIcon,
  CommentIcon,
  HeartIcon,
  SendIcon,
  ShieldIcon,
} from '../components/icons/UiIcons';

const ALL = '전체';
const FILTERS = [ALL, ...FEED_CATEGORIES];

function RecordScreen() {
  const [filter, setFilter] = useState<string>(ALL);
  const [likedIds, setLikedIds] = useState<string[]>(
    FEED_POSTS.filter(post => post.likedByMe).map(post => post.id),
  );
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const posts = useMemo(
    () =>
      filter === ALL
        ? FEED_POSTS
        : FEED_POSTS.filter(post => post.category === filter),
    [filter],
  );

  const toggle = (id: string, setIds: React.Dispatch<React.SetStateAction<string[]>>) =>
    setIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={posts}
      keyExtractor={post => post.id}
      extraData={[likedIds, savedIds]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text style={styles.kicker}>혼행 피드</Text>
              <Text style={styles.title}>다들 어디 다녀왔을까</Text>
            </View>
            <Pressable
              style={styles.writeBtn}
              accessibilityRole="button"
              accessibilityLabel="기록 쓰기">
              {/* TODO: 기록 작성 화면 연결 */}
              <Text style={styles.writeText}>+ 기록</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            {FILTERS.map(item => (
              <Chip
                key={item}
                label={item}
                selected={filter === item}
                onPress={() => setFilter(item)}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 이 주제의 기록이 없어요.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <PostCard
          post={item}
          liked={likedIds.includes(item.id)}
          saved={savedIds.includes(item.id)}
          onToggleLike={() => toggle(item.id, setLikedIds)}
          onToggleSave={() => toggle(item.id, setSavedIds)}
        />
      )}
    />
  );
}

/** 피드 카드 한 장 */
function PostCard({
  post,
  liked,
  saved,
  onToggleLike,
  onToggleSave,
}: {
  post: FeedPost;
  liked: boolean;
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
}) {
  const city = getCityById(post.cityId);
  const tone = photoTones[post.tone];
  // 데이터의 likes 에는 내 좋아요가 이미 반영돼 있으므로 차이만 더합니다.
  const likeCount = post.likes + (liked ? 1 : 0) - (post.likedByMe ? 1 : 0);

  return (
    <View style={styles.card}>
      {/* 작성자 */}
      <View style={styles.postHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.author.initial}</Text>
        </View>
        <View style={styles.postHeadTexts}>
          <View style={styles.authorRow}>
            <Text style={styles.author}>{post.author.name}</Text>
            <View style={styles.authorTitle}>
              <Text style={styles.authorTitleText}>{post.author.title}</Text>
            </View>
          </View>
          <Text style={styles.postMeta} numberOfLines={1}>
            {city.name} · {post.spot} · {post.timeAgo}
          </Text>
        </View>
      </View>

      {/* 사진 (플레이스홀더) + 안전 등급 */}
      <View style={[styles.photo, { backgroundColor: tone.bg }]}>
        <View style={[styles.moon, { backgroundColor: tone.accent }]} />
        <View style={[styles.ridgeBack, { borderBottomColor: tone.ridge }]} />
        <View style={[styles.ridgeFront, { borderBottomColor: tone.ridge }]} />

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{CITY_TYPE_LABEL[city.type]}</Text>
        </View>

        <View style={styles.safetyPill}>
          <ShieldIcon
            color={post.safetyGrade === 'A' ? colors.safeText : colors.bonusText}
            size={13}
          />
          <Text
            style={[
              styles.safetyGrade,
              post.safetyGrade === 'A' ? styles.gradeA : styles.gradeB,
            ]}>
            안전 {post.safetyGrade}
          </Text>
          <Text style={styles.safetyNote} numberOfLines={1}>
            {post.safetyNote}
          </Text>
        </View>
      </View>

      {/* 액션 */}
      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={onToggleLike}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ selected: liked }}
          accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}>
          <HeartIcon color={liked ? colors.danger : colors.textSecondary} size={20} />
          <Text style={styles.actionText}>{likeCount}</Text>
        </Pressable>

        <Pressable
          style={styles.action}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="댓글">
          <CommentIcon color={colors.textSecondary} size={20} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </Pressable>

        <Pressable
          style={styles.action}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="공유">
          <SendIcon color={colors.textSecondary} size={18} />
        </Pressable>

        <Pressable
          style={styles.saveBtn}
          onPress={onToggleSave}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? '저장 취소' : '저장'}>
          <BookmarkIcon color={saved ? colors.ink : colors.textSecondary} size={20} />
        </Pressable>
      </View>

      {/* 본문 */}
      <Text style={styles.caption}>
        <Text style={styles.captionAuthor}>{post.author.name} </Text>
        {post.caption}
      </Text>
      <Text style={styles.tags}>{post.tags.join(' ')}</Text>
      {post.comments > 0 ? (
        <Pressable accessibilityRole="button">
          <Text style={styles.moreComments}>
            댓글 {post.comments}개 모두 보기
          </Text>
        </Pressable>
      ) : null}
    </View>
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
    paddingTop: 16,
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
  filterRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  author: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  authorTitle: {
    backgroundColor: colors.bonusBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  authorTitleText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.bonusText,
  },
  postMeta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // 사진
  photo: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
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
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(10,14,24,0.45)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e7e9f0',
  },

  // 안전 등급 (사진 위 작은 칩)
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
  safetyNote: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // 액션
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveBtn: {
    marginLeft: 'auto',
  },

  // 본문
  caption: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  captionAuthor: {
    fontWeight: '800',
  },
  tags: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.goldDeep,
  },
  moreComments: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // 빈 상태
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default RecordScreen;
