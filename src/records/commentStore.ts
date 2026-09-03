/**
 * 댓글 스토어.
 *
 * 기록마다 댓글 목록을 따로 들고 있습니다(키 = recordId). 상세 화면을 열 때마다
 * 조회하되, 이미 받아둔 게 있으면 그걸 먼저 보여주고 뒤에서 갱신합니다.
 *
 * 댓글 좋아요도 기록 좋아요와 같이 낙관적 갱신입니다(이유는 recordStore 참고).
 */
import { useEffect, useSyncExternalStore } from 'react';
import { recordApi } from '../api/recordApi';
import { toApiError } from '../api/errors';
import { recordStore } from './recordStore';
import type { RecordComment } from '../types/travelRecord';

export type CommentListState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  comments: RecordComment[];
  error: string | null;
  /** 등록·수정·삭제가 진행 중인지 (입력창 잠금용) */
  isSubmitting: boolean;
  submitError: string | null;
};

const EMPTY: CommentListState = {
  status: 'idle',
  comments: [],
  error: null,
  isSubmitting: false,
  submitError: null,
};

let byRecord: Record<string, CommentListState> = {};
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(listener => listener());
}

function setFor(recordId: string, patch: Partial<CommentListState>): void {
  const current = byRecord[recordId] ?? EMPTY;
  byRecord = { ...byRecord, [recordId]: { ...current, ...patch } };
  emit();
}

/** 목록의 댓글 수 배지가 실제 개수와 어긋나지 않게 맞춰줍니다. */
function syncCount(recordId: string): void {
  const list = byRecord[recordId];
  if (list) {
    recordStore.setCommentCount(recordId, list.comments.length);
  }
}

const inFlight: Record<string, Promise<void> | null> = {};

export const commentStore = {
  getFor(recordId: string): CommentListState {
    return byRecord[recordId] ?? EMPTY;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  reload(recordId: string): Promise<void> {
    setFor(recordId, { status: 'loading', error: null });
    const request = (async () => {
      try {
        const comments = await recordApi.listComments(recordId);
        setFor(recordId, { status: 'ready', comments });
        syncCount(recordId);
      } catch (caught) {
        setFor(recordId, {
          status: 'error',
          error: toApiError(caught).message,
        });
      } finally {
        inFlight[recordId] = null;
      }
    })();
    inFlight[recordId] = request;
    return request;
  },

  /** 상세 화면 진입 시 호출. 이미 받아둔 목록이 있어도 뒤에서 한 번 갱신합니다. */
  ensureLoaded(recordId: string): Promise<void> {
    return inFlight[recordId] ?? commentStore.reload(recordId);
  },

  /** 댓글 등록. 실패는 던져서 입력 내용이 날아가지 않게 합니다. */
  async create(recordId: string, content: string): Promise<void> {
    setFor(recordId, { isSubmitting: true, submitError: null });
    try {
      await recordApi.createComment(recordId, content);
      await commentStore.reload(recordId);
      setFor(recordId, { isSubmitting: false });
    } catch (caught) {
      const error = toApiError(caught);
      setFor(recordId, { isSubmitting: false, submitError: error.message });
      throw error;
    }
  },

  /** 댓글 수정 */
  async update(
    recordId: string,
    commentId: string,
    content: string,
  ): Promise<void> {
    setFor(recordId, { isSubmitting: true, submitError: null });
    try {
      await recordApi.updateComment(commentId, content);
      await commentStore.reload(recordId);
      setFor(recordId, { isSubmitting: false });
    } catch (caught) {
      const error = toApiError(caught);
      setFor(recordId, { isSubmitting: false, submitError: error.message });
      throw error;
    }
  },

  /** 댓글 삭제 — 먼저 목록에서 빼고, 실패하면 되돌립니다. */
  async remove(recordId: string, commentId: string): Promise<void> {
    const snapshot = commentStore.getFor(recordId).comments;
    setFor(recordId, {
      comments: snapshot.filter(comment => comment.id !== commentId),
      submitError: null,
    });
    syncCount(recordId);
    try {
      await recordApi.removeComment(commentId);
      await commentStore.reload(recordId);
    } catch (caught) {
      const error = toApiError(caught);
      setFor(recordId, { comments: snapshot, submitError: error.message });
      syncCount(recordId);
      throw error;
    }
  },

  /** 차단 직후 불러와 둔 모든 기록에서 해당 사용자의 댓글을 숨깁니다. */
  hideAuthor(authorId: string): void {
    Object.entries(byRecord).forEach(([recordId, list]) => {
      const comments = list.comments.filter(
        comment => comment.authorId !== authorId,
      );
      if (comments.length !== list.comments.length) {
        setFor(recordId, { comments });
        syncCount(recordId);
      }
    });
  },

  /** 로그아웃 시 초기화 */
  reset(): void {
    byRecord = {};
    Object.keys(inFlight).forEach(key => {
      inFlight[key] = null;
    });
    emit();
  },
};

/** 특정 기록의 댓글을 구독합니다. 진입 시 한 번 조회합니다. */
export function useComments(recordId: string): CommentListState {
  const snapshot = useSyncExternalStore(commentStore.subscribe, () =>
    commentStore.getFor(recordId),
  );

  useEffect(() => {
    commentStore.ensureLoaded(recordId);
  }, [recordId]);

  return snapshot;
}
