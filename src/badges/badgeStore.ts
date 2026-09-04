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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../api/userApi';
import { toApiError } from '../api/errors';
import type { Badge, BadgeImageKey } from '../types/badge';
import { BADGE_CATALOG } from '../data/badgeCatalog';
import { userStore } from '../user/userStore';
import { tokenStorage } from '../storage/tokenStorage';

export type BadgeState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  badges: Badge[];
  error: string | null;
};

const INITIAL: BadgeState = {
  status: 'idle',
  badges: BADGE_CATALOG,
  error: null,
};

let state: BadgeState = INITIAL;
const listeners = new Set<() => void>();

type LocalBadgeImageKey = Extract<BadgeImageKey, '00' | '03'>;
type LocalEarnedBadges = Partial<Record<LocalBadgeImageKey, string>>;

const LOCAL_BADGE_KEYS: readonly LocalBadgeImageKey[] = ['00', '03'];
const LOCAL_STORAGE_PREFIX = '@solotrav/local-earned-badges/';

let localUserId: string | null = null;
let localEarned: LocalEarnedBadges = {};
let localLoadVersion = 0;

function isLocalBadgeImageKey(value: string): value is LocalBadgeImageKey {
  return (LOCAL_BADGE_KEYS as readonly string[]).includes(value);
}

function parseLocalEarned(raw: string | null): LocalEarnedBadges {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          isLocalBadgeImageKey(key) && typeof value === 'string',
      ),
    ) as LocalEarnedBadges;
  } catch {
    return {};
  }
}

function applyLocalEarned(badges: Badge[]): Badge[] {
  return badges.map(badge => {
    const earnedAt = badge.imageKey
      ? localEarned[badge.imageKey as LocalBadgeImageKey]
      : undefined;
    if (!earnedAt || badge.earned) return badge;
    return {
      ...badge,
      earned: true,
      progress: badge.target,
      earnedAt,
    };
  });
}

async function persistLocalEarned(): Promise<void> {
  if (!localUserId) return;
  try {
    await AsyncStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}${localUserId}`,
      JSON.stringify(localEarned),
    );
  } catch {
    // 로컬 저장 실패가 로그인이나 취향 저장 성공을 되돌리지는 않습니다.
  }
}

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
    if (userStore.get()?.id === 'guest' || !tokenStorage.get()?.accessToken) {
      setState({
        status: 'ready',
        badges: applyLocalEarned(BADGE_CATALOG),
        error: null,
      });
      return Promise.resolve();
    }
    setState({ status: 'loading', error: null });
    inFlight = (async () => {
      try {
        const badges = await userApi.getTravelBadges();
        setState({ status: 'ready', badges: applyLocalEarned(badges) });
      } catch (caught) {
        // 배지 서버 API가 준비되기 전에도 로컬 획득 배지는 정상 표시합니다.
        setState({
          status: 'ready',
          badges: applyLocalEarned(state.badges),
          error: toApiError(caught).message,
        });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  /** 로그인한 계정의 로컬 배지를 불러오고 혼행 스타터를 지급합니다. */
  async activateLocalUser(): Promise<void> {
    const userId = userStore.get()?.id ?? null;
    const version = ++localLoadVersion;
    if (!userId) {
      localUserId = null;
      localEarned = {};
      setState({ badges: BADGE_CATALOG });
      return;
    }

    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(`${LOCAL_STORAGE_PREFIX}${userId}`);
    } catch {
      // 읽기에 실패해도 현재 세션에서는 새 로컬 상태로 계속 동작합니다.
    }
    if (version !== localLoadVersion) return;

    localUserId = userId;
    localEarned = parseLocalEarned(raw);
    if (!localEarned['00']) {
      localEarned['00'] = new Date().toISOString();
      await persistLocalEarned();
    }
    setState({ badges: applyLocalEarned(state.badges) });
  },

  /** 서버 배지 API가 생기기 전까지 특정 배지를 이 계정의 기기에 저장합니다. */
  async earnLocal(imageKey: LocalBadgeImageKey): Promise<void> {
    const userId = userStore.get()?.id ?? null;
    if (!userId) return;
    if (localUserId !== userId) {
      await badgeStore.activateLocalUser();
    }
    if (localEarned[imageKey]) return;

    localEarned = { ...localEarned, [imageKey]: new Date().toISOString() };
    setState({ badges: applyLocalEarned(state.badges) });
    await persistLocalEarned();
  },

  /** 로그아웃 시 초기화 */
  reset(): void {
    localLoadVersion += 1;
    localUserId = null;
    localEarned = {};
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
