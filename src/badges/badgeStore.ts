/**
 * 내 여행 배지 스토어.
 *
 * preferenceStore 와 같은 외부 스토어 방식인데, 배지는 서버가 주는 것만 보여주는
 * 읽기 전용이라 저장(save) 관련 상태가 없습니다.
 *
 * pub/sub 보일러플레이트가 preferenceStore 와 겹치지만, 지금은 둘뿐이라
 * 공통 팩토리로 묶지 않고 각자 읽기 쉬운 쪽을 택했습니다.
 * 같은 모양이 하나 더 생기면 그때 묶는 게 좋습니다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { userApi } from '../api/userApi';
import { toApiError } from '../api/errors';
import type { Badge } from '../types/badge';

export type BadgeState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  badges: Badge[];
  error: string | null;
};

const INITIAL: BadgeState = {
  status: 'idle',
  badges: [],
  error: null,
};

let state: BadgeState = INITIAL;
const listeners = new Set<() => void>();

/** 스냅샷 참조가 바뀌어야 구독자가 다시 그립니다. 항상 새 객체로 교체합니다. */
function setState(patch: Partial<BadgeState>): void {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

/** 여러 화면이 동시에 떠도 조회는 한 번만 나가게 합니다. */
let inFlight: Promise<void> | null = null;

export const badgeStore = {
  get(): BadgeState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  ensureLoaded(): Promise<void> {
    if (state.status === 'ready' || inFlight) {
      return inFlight ?? Promise.resolve();
    }
    return badgeStore.reload();
  },

  reload(): Promise<void> {
    setState({ status: 'loading', error: null });
    inFlight = (async () => {
      try {
        const badges = await userApi.getTravelBadges();
        setState({ status: 'ready', badges });
      } catch (caught) {
        setState({ status: 'error', error: toApiError(caught).message });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  /** 로그아웃 시 초기화 */
  reset(): void {
    inFlight = null;
    setState(INITIAL);
  },
};

/** 획득한 배지 수 (히어로의 '배지 n개' 표시용) */
export function countEarned(badges: Badge[]): number {
  return badges.filter(badge => badge.earned).length;
}

/** 배지 상태를 구독합니다. 처음 쓰이는 시점에 알아서 한 번 조회합니다. */
export function useBadges(): BadgeState {
  const snapshot = useSyncExternalStore(badgeStore.subscribe, badgeStore.get);

  useEffect(() => {
    badgeStore.ensureLoaded();
  }, []);

  return snapshot;
}
