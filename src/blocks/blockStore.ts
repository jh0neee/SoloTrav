/**
 * 사용자 차단 상태 관리 스토어.
 *
 * 내 차단 목록을 관리하고, 차단 시 피드(recordStore)와 댓글(commentStore)에서도
 * 즉시 해당 사용자의 콘텐츠를 숨기도록 연계합니다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { blockApi } from '../api/blockApi';
import { toApiError } from '../api/errors';
import { recordStore } from '../records/recordStore';
import { commentStore } from '../records/commentStore';
import { userStore } from '../user/userStore';
import { tokenStorage } from '../storage/tokenStorage';
import type { BlockedUser } from '../types/block';

export type BlockState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: BlockedUser[];
  total: number;
  page: number;
  limit: number;
  error: string | null;
  /** 현재 차단 해제 요청이 진행 중인 userId 목록 */
  unblockingIds: string[];
};

const INITIAL: BlockState = {
  status: 'idle',
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  error: null,
  unblockingIds: [],
};

let state: BlockState = INITIAL;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(listener => listener());
}

function setState(patch: Partial<BlockState>): void {
  state = { ...state, ...patch };
  emit();
}

export const blockStore = {
  get(): BlockState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  ensureLoaded(): Promise<void> {
    return state.status === 'ready' || inFlight
      ? inFlight ?? Promise.resolve()
      : blockStore.reload();
  },

  reload(page = 1, limit = 20): Promise<void> {
    if (userStore.get()?.id === 'guest' || !tokenStorage.get()?.accessToken) {
      setState({ status: 'ready', items: [], total: 0, error: null });
      return Promise.resolve();
    }
    setState({ status: 'loading', error: null });
    const request = (async () => {
      try {
        const result = await blockApi.list({ page, limit });
        setState({
          status: 'ready',
          items: result.items,
          total: result.total,
          page: result.page,
          limit: result.limit,
          error: null,
        });
      } catch (caught) {
        setState({
          status: 'error',
          error: toApiError(caught).message,
        });
      } finally {
        inFlight = null;
      }
    })();
    inFlight = request;
    return request;
  },

  /**
   * 사용자 차단.
   * API 호출 후 즉시 화면 피드 및 댓글에서 대상 사용자를 숨깁니다.
   */
  async block(userId: string): Promise<void> {
    try {
      await blockApi.block(userId);
      // 로컬 피드/댓글 목록에서 즉시 숨김
      recordStore.hideAuthor(userId);
      commentStore.hideAuthor(userId);
      // 이미 로드된 차단 목록이 있다면 동기화
      if (state.status === 'ready') {
        await blockStore.reload();
      }
    } catch (caught) {
      throw toApiError(caught);
    }
  },

  /**
   * 사용자 차단 해제.
   * 성공 시 목록에서 즉시 제거합니다.
   */
  async unblock(userId: string): Promise<void> {
    if (state.unblockingIds.includes(userId)) {
      return;
    }
    setState({
      unblockingIds: [...state.unblockingIds, userId],
    });

    try {
      await blockApi.unblock(userId);
      setState({
        items: state.items.filter(item => item.userId !== userId),
        total: Math.max(0, state.total - 1),
        unblockingIds: state.unblockingIds.filter(id => id !== userId),
      });
    } catch (caught) {
      setState({
        unblockingIds: state.unblockingIds.filter(id => id !== userId),
      });
      throw toApiError(caught);
    }
  },

  reset(): void {
    inFlight = null;
    setState(INITIAL);
  },
};

export function useBlockedUsers(): BlockState {
  const snapshot = useSyncExternalStore(blockStore.subscribe, blockStore.get);

  useEffect(() => {
    blockStore.ensureLoaded();
  }, []);

  return snapshot;
}

