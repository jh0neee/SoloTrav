/**
 * 여행 기록 상세 화면.
 *
 * 피드에서 카드를 누르면 들어옵니다.
 *   - 기록 본문 + 좋아요(POST/DELETE .../likes)
 *   - 내 글이면 수정·삭제
 *   - 댓글 목록/등록/수정/삭제 + 댓글 좋아요
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, photoTones } from '../../theme/colors';
import {
  Chevron,
  CommentIcon,
  HeartIcon,
  SendIcon,
  ShieldIcon,
} from '../../components/icons/UiIcons';
import { commentStore, useComments } from '../../records/commentStore';
import {
  recordStore,
  useIsMyRecord,
  useRecord,
} from '../../records/recordStore';
import { useMyProfile } from '../../user/userStore';
import type { RecordComment, TravelRecord } from '../../types/travelRecord';

type Props = {
  recordId: string;
  onBack: () => void;
  onEdit: (record: TravelRecord) => void;
};

const COMMENT_MAX = 300;

function RecordDetailScreen({ recordId, onBack, onEdit }: Props) {
  const record = useRecord(recordId);
  const comments = useComments(recordId);
  const profile = useMyProfile();
  const myId = profile.user?.id ?? null;
  const myName = profile.user?.nickname?.trim() || null;
  /** 내 기록 목록(GET /travel-records/me)에 있으면 내 글 */
  const isMineByList = useIsMyRecord(recordId);

  const [draft, setDraft] = useState('');
  /** 수정 중인 댓글 id. null 이면 새 댓글 작성 중입니다. */
  const [editingId, setEditingId] = useState<string | null>(null);

  // 목록에서 지워졌거나(삭제) 아직 안 받은 경우
  if (!record) {
    return (
      <View style={styles.container}>
        <TopBar onBack={onBack} />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>기록을 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  /**
   * 수정·삭제를 열어줄지.
   * 작성자 id 가 맞거나, 내 기록 목록에 들어있으면 내 글입니다. 전체 피드 응답에
   * 작성자가 안 실려 오면 authorId 가 null 이라 id 비교만으로는 영영 안 열립니다.
   */
  const isMine = isMineByList || (!!myId && record.authorId === myId);

  /**
   * 내 댓글인지.
   * 작성자 id 를 둘 다 아는 경우엔 그걸로 판단하고, 서버가 댓글에 작성자 id 를
   * 안 실어줄 때만 닉네임으로 갈음합니다. 이렇게라도 열어두지 않으면 수정·삭제가
   * 어떤 댓글에도 뜨지 않습니다. (동명이인이 눌러도 서버가 막습니다)
   */
  const isMyComment = (comment: RecordComment): boolean =>
    myId && comment.authorId
      ? comment.authorId === myId
      : !!myName && comment.authorName === myName;

  const submitComment = async () => {
    const content = draft.trim();
    if (!content) {
      return;
    }
    try {
      if (editingId) {
        await commentStore.update(recordId, editingId, content);
      } else {
        await commentStore.create(recordId, content);
      }
      setDraft('');
      setEditingId(null);
    } catch {
      // 실패 메시지는 입력창 위에 뜹니다. 입력은 그대로 둡니다.
    }
  };

  const confirmDeleteRecord = () =>
    Alert.alert('기록 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await recordStore.remove(recordId);
            onBack();
          } catch (caught) {
            Alert.alert(
              '삭제 실패',
              caught instanceof Error ? caught.message : '다시 시도해주세요.',
            );
          }
        },
      },
    ]);

  const confirmDeleteComment = (commentId: string) =>
    Alert.alert('댓글 삭제', '이 댓글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          // 실패해도 스토어가 되돌리고 메시지를 남깁니다.
          commentStore.remove(recordId, commentId).catch(() => {});
          if (editingId === commentId) {
            setEditingId(null);
            setDraft('');
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TopBar
        onBack={onBack}
        right={
          isMine ? (
            <View style={styles.ownerActions}>
              <Pressable
                onPress={() => onEdit(record)}
                hitSlop={6}
                accessibilityRole="button"
              >
                <Text style={styles.ownerAction}>수정</Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteRecord}
                hitSlop={6}
                accessibilityRole="button"
              >
                <Text style={[styles.ownerAction, styles.ownerDanger]}>
                  삭제
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      <FlatList
        data={comments.comments}
        keyExtractor={comment => comment.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              comments.status === 'loading' && comments.comments.length > 0
            }
            onRefresh={() => commentStore.reload(recordId)}
            tintColor={colors.goldDeep}
          />
        }
        ListHeaderComponent={
          <View>
            <RecordBody record={record} />
            <View style={styles.commentHead}>
              <Text style={styles.commentHeadText}>
                댓글 {comments.comments.length}
              </Text>
            </View>
            {comments.status === 'error' ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>
                  {comments.error ?? '댓글을 불러오지 못했습니다.'}
                </Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => commentStore.reload(recordId)}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>다시 시도</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          comments.status === 'loading' || comments.status === 'idle' ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.goldDeep} />
            </View>
          ) : comments.status === 'ready' ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                아직 댓글이 없어요.{'\n'}먼저 다녀온 이야기를 물어보세요.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            isMine={isMyComment(item)}
            isEditing={editingId === item.id}
            onToggleLike={() => {
              commentStore.toggleLike(recordId, item.id).catch(() => {});
            }}
            onEdit={() => {
              setEditingId(item.id);
              setDraft(item.content);
            }}
            onDelete={() => confirmDeleteComment(item.id)}
          />
        )}
      />

      {/* 댓글 입력 */}
      <View style={styles.composer}>
        {comments.submitError ? (
          <Text style={styles.error}>{comments.submitError}</Text>
        ) : null}
        {editingId ? (
          <View style={styles.editingBar}>
            <Text style={styles.editingText}>댓글 수정 중</Text>
            <Pressable
              onPress={() => {
                setEditingId(null);
                setDraft('');
              }}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.editingCancel}>취소</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={text => setDraft(text.slice(0, COMMENT_MAX))}
            placeholder="댓글을 남겨보세요"
            placeholderTextColor={colors.textSecondary}
            multiline
            editable={!comments.isSubmitting}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!draft.trim() || comments.isSubmitting) && styles.sendBtnOff,
            ]}
            onPress={submitComment}
            disabled={!draft.trim() || comments.isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={editingId ? '댓글 수정' : '댓글 등록'}
          >
            <SendIcon color="#ffffff" size={18} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function TopBar({
  onBack,
  right,
}: {
  onBack: () => void;
  right?: React.ReactNode;
}) {
  // 상태바가 투명(translucent)이라 상단 여백은 화면이 직접 만들어 줍니다.
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="뒤로"
      >
        <Chevron direction="left" color={colors.textPrimary} size={22} />
      </Pressable>
      <Text style={styles.topTitle}>기록</Text>
      <View style={styles.topRight}>{right}</View>
    </View>
  );
}

/** 기록 본문 + 좋아요 */
function RecordBody({ record }: { record: TravelRecord }) {
  const tone = photoTones[record.tone];
  const author = record.authorName ?? '혼행러';
  const isTopGrade = record.safetyGrade === 'A';
  const cover = record.imageUrls[0];

  return (
    <View style={styles.card}>
      <View style={styles.postHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{author.charAt(0)}</Text>
        </View>
        <View style={styles.postHeadTexts}>
          <Text style={styles.author}>{author}</Text>
          <Text style={styles.postMeta}>{record.date || '날짜 미상'}</Text>
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

      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={() => {
            recordStore.toggleLike(record.id).catch(() => {});
          }}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ selected: record.likedByMe }}
          accessibilityLabel={record.likedByMe ? '좋아요 취소' : '좋아요'}
        >
          <HeartIcon
            color={record.likedByMe ? colors.danger : colors.textSecondary}
            size={22}
          />
          <Text style={styles.actionText}>{record.likeCount}</Text>
        </Pressable>
        <View style={styles.action}>
          <CommentIcon color={colors.textSecondary} size={20} />
          <Text style={styles.actionText}>{record.commentCount}</Text>
        </View>
      </View>

      {record.description ? (
        <Text style={styles.caption}>{record.description}</Text>
      ) : null}
      {record.tags.length > 0 ? (
        <Text style={styles.tags}>
          {record.tags.map(tag => `#${tag}`).join(' ')}
        </Text>
      ) : null}
    </View>
  );
}

/** 댓글 한 줄 */
function CommentRow({
  comment,
  isMine,
  isEditing,
  onToggleLike,
  onEdit,
  onDelete,
}: {
  comment: RecordComment;
  isMine: boolean;
  isEditing: boolean;
  onToggleLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const author = comment.authorName ?? '혼행러';
  return (
    <View style={[styles.commentRow, isEditing && styles.commentRowEditing]}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{author.charAt(0)}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentTop}>
          <Text style={styles.commentAuthor}>{author}</Text>
          {comment.createdAt ? (
            <Text style={styles.commentDate}>{comment.createdAt}</Text>
          ) : null}
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
        {isMine ? (
          <View style={styles.commentActions}>
            <Pressable onPress={onEdit} hitSlop={6} accessibilityRole="button">
              <Text style={styles.commentAction}>수정</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={[styles.commentAction, styles.ownerDanger]}>
                삭제
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Pressable
        style={styles.commentLike}
        onPress={onToggleLike}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ selected: comment.likedByMe }}
        accessibilityLabel={comment.likedByMe ? '좋아요 취소' : '좋아요'}
      >
        <HeartIcon
          color={comment.likedByMe ? colors.danger : colors.border}
          size={16}
        />
        {comment.likeCount > 0 ? (
          <Text style={styles.commentLikeText}>{comment.likeCount}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
    // paddingTop 은 상태바 높이(insets.top)를 더해 인라인으로 지정합니다.
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  topRight: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 14,
  },
  ownerAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  ownerDanger: {
    color: colors.danger,
  },

  content: {
    paddingBottom: 20,
  },
  centered: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 36,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.ink,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkText,
  },

  // 기록 본문
  card: {
    marginHorizontal: 20,
    marginBottom: 8,
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
    fontWeight: '700',
    color: colors.mascotFace,
  },
  postHeadTexts: {
    flex: 1,
  },
  author: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  postMeta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },
  photo: {
    height: 220,
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
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  safetyGrade: {
    fontSize: 11,
    fontWeight: '700',
  },
  gradeA: {
    color: colors.safeText,
  },
  gradeB: {
    color: colors.bonusText,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 12,
    marginBottom: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  caption: {
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

  // 댓글
  commentHead: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 6,
  },
  commentHeadText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  commentRowEditing: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commentBody: {
    flex: 1,
  },
  commentTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commentDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  commentText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  commentAction: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commentLike: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  commentLikeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // 입력창
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  error: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  editingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.goldDeep,
  },
  editingCancel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  sendBtnOff: {
    backgroundColor: colors.ctaDisabled,
  },
});

export default RecordDetailScreen;
