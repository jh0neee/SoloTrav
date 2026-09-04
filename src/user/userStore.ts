/**
 * 내 정보 스토어.
 *
 * 로그인한 사용자 정보의 단일 소유자입니다. 화면은 `useMyProfile()` 로 읽고,
 * 쓰기는 authService(로그인·복원·로그아웃)만 합니다.
 *
 * Context 가 아니라 외부 스토어(useSyncExternalStore)로 만든 이유:
 * - 저장소(userStorage)에서 올라온 값을 Provider 트리 밖(authService)에서도
 *   갱신해야 하는데, Context 였다면 setState 를 서비스 레이어까지 넘겨야 합니다.
 * - 토큰(tokenStorage)이 이미 "메모리 캐시 + 동기 get()" 구조라 결이 같습니다.
 *
 * 값의 출처는 두 곳입니다.
 * - 로그인 응답 (즉시 화면에 뿌릴 수 있는 최소 정보)
 * - GET /users/me (`refresh()`) — 로그인 이후 서버 기준으로 덮어씁니다.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { userApi } from '../api/userApi';
import { userStorage } from '../storage/userStorage';
import { tokenStorage } from '../storage/tokenStorage';
import type { AuthUser } from '../types/auth';

/** 서버가 닉네임을 안 내려줄 때 쓰는 표시용 기본값 */
export const FALLBACK_NAME = '여행자';

let cached: AuthUser | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(listener => listener());
}

export const userStore = {
  /** 앱 시작 시 1회 — 디스크에 저장된 사용자 정보를 메모리로 올립니다. */
  async load(): Promise<AuthUser | null> {
    if (loaded) {
      return cached;
    }
    cached = await userStorage.get();
    loaded = true;
    emit();
    return cached;
  },

  /** 메모리에 올라온 사용자 (동기). useSyncExternalStore 의 스냅샷으로 씁니다. */
  get(): AuthUser | null {
    return cached;
  },

  async save(user: AuthUser | null): Promise<void> {
    cached = user;
    loaded = true;
    emit();
    await userStorage.save(user);
  },

  /**
   * GET /users/me 로 서버 기준 최신 정보를 받아 덮어씁니다.
   *
   * 실패해도 던지지 않습니다. 저장된 정보로 화면은 이미 그려져 있고,
   * 갱신에 실패했다고 마이페이지를 막을 이유가 없습니다.
   * (토큰이 만료됐다면 인터셉터가 재발급/로그아웃을 알아서 처리합니다)
   */
  async refresh(): Promise<AuthUser | null> {
    if (cached?.id === 'guest' || !tokenStorage.get()?.accessToken) {
      return cached;
    }
    try {
      const user = await userApi.getMe();
      await userStore.save(user);
      return user;
    } catch {
      return cached;
    }
  },

  async clear(): Promise<void> {
    cached = null;
    loaded = true;
    emit();
    await userStorage.clear();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** 원본 사용자 정보. 로그인 전이면 null 입니다. */
export function useUser(): AuthUser | null {
  // getSnapshot 은 매번 같은 참조를 돌려줘야 해서 파생값을 만들지 않고
  // cached 를 그대로 반환합니다. 가공은 useMyProfile 에서 합니다.
  return useSyncExternalStore(userStore.subscribe, userStore.get);
}

/** 화면에서 바로 쓸 수 있게 가공한 내 정보 */
export type MyProfile = {
  /** 원본이 필요할 때 (id 로 API 를 부르는 등) */
  user: AuthUser | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  /** 닉네임이 없으면 '여행자' */
  displayName: string;
  /** 아바타에 넣을 한 글자 */
  initial: string;
  /** 프로필 이미지. 없으면 null → 화면은 initial 로 대체합니다. */
  profileImageUrl: string | null;
  email: string | null;
};

function derive(user: AuthUser | null): MyProfile {
  const isGuest = user?.id === 'guest';
  const displayName = isGuest
    ? '게스트'
    : user?.nickname?.trim() || FALLBACK_NAME;
  return {
    user,
    isLoggedIn: !!user && !isGuest,
    isGuest,
    displayName,
    initial: displayName.charAt(0),
    profileImageUrl: isGuest ? null : user?.profileImageUrl ?? null,
    email: isGuest ? '둘러보기 모드' : user?.email ?? null,
  };
}

export function useMyProfile(): MyProfile {
  const user = useUser();
  return useMemo(() => derive(user), [user]);
}
