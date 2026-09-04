/**
 * 내 차단 목록 화면.
 *
 * 마이페이지에서 "차단 목록 관리"를 누르면 열리며,
 * 차단된 사용자를 확인하고 차단을 해제할 수 있습니다.
 */
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron } from '../../components/icons/UiIcons';
import { blockStore, useBlockedUsers } from '../../blocks/blockStore';
import { toApiError } from '../../api/errors';
import type { BlockedUser } from '../../types/block';

type Props = {
  onBack: () => void;
};

function formatBlockedDate(date: Date | null): string {
  if (!date) {
    return '';
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d} 차단`;
}

export default function BlockedUsersScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const state = useBlockedUsers();

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      '차단 해제',
      `'${user.nickname}' 님의 차단을 해제할까요?\n피드와 댓글에서 다시 상대방의 활동이 표시됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단 해제',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockStore.unblock(user.userId);
              Alert.alert('차단 해제 완료', `'${user.nickname}' 님의 차단을 해제했습니다.`);
            } catch (caught) {
              Alert.alert('차단 해제 실패', toApiError(caught).message);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const isUnblocking = state.unblockingIds.includes(item.userId);
    const initial = item.nickname.charAt(0) || '?';

    return (
      <View style={styles.userRow}>
        <View style={styles.avatarWrap}>
          {item.profileImageUrl ? (
            <Image
              source={{ uri: item.profileImageUrl }}
              style={styles.avatarImage}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.nickname} numberOfLines={1}>
            {item.nickname}
          </Text>
          {item.blockedAt ? (
            <Text style={styles.dateText}>{formatBlockedDate(item.blockedAt)}</Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.unblockBtn, isUnblocking && styles.unblockBtnDisabled]}
          onPress={() => handleUnblock(item)}
          disabled={isUnblocking}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${item.nickname} 차단 해제`}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={styles.unblockText}>차단 해제</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View
        style={[
          styles.header,
          { height: 60 + insets.top, paddingTop: insets.top },
        ]}
      >
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>차단 목록</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 본문 목록 */}
      <FlatList
        data={state.items}
        keyExtractor={item => item.userId}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          state.items.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.status === 'loading' && state.items.length > 0}
            onRefresh={() => blockStore.reload()}
            tintColor={colors.goldDeep}
          />
        }
        ListEmptyComponent={
          state.status === 'loading' ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.goldDeep} size="large" />
              <Text style={styles.placeholderText}>차단 목록을 불러오는 중이에요</Text>
            </View>
          ) : state.status === 'error' ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>
                {state.error ?? '차단 목록을 불러오지 못했습니다.'}
              </Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => blockStore.reload()}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>차단한 사용자가 없어요</Text>
              <Text style={styles.emptySubtitle}>
                피드나 댓글에서 차단한 사용자는 이곳에서 확인할 수 있습니다.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.mascot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.mascotFace,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  nickname: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dateText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textTertiary,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  unblockBtnDisabled: {
    opacity: 0.6,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.ink,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkText,
  },
});

