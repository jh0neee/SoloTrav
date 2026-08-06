/**
 * 내 여행 취향 스토어.
 *
 * userStore 와 같은 외부 스토어 방식입니다(이유는 그쪽 주석 참고).
 * 다른 점은 서버 왕복이 화면에 보여야 한다는 것 — 조회 중인지, 저장 중인지,
 * 실패했는지를 상태로 들고 있어서 위저드가 "저장 중..." 을 띄우고 실패 시
 * 화면을 닫지 않을 수 있습니다.
 *
 * 취향은 계정에 붙는 값이라 로컬에 저장하지 않습니다. 로그인한 뒤 서버에서
 * 한 번 받아오고, 저장할 때마다 서버가 원본입니다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { userApi } from '../api/userApi';
import { toApiError } from '../api/errors';
import type { PreferenceAnswers } from '../data/preferences';

export type PreferenceState = {
  /** idle: 아직 안 불러옴 / loading: 조회 중 / ready: 조회 완료 / error: 조회 실패 */
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** 등록한 적 없으면 null */
  answers: PreferenceAnswers | null;
  isSaving: boolean;
  /** 마지막 조회·저장 실패 메시지 */
  error: string | null;
};

const INITIAL: PreferenceState = {
  status: 'idle',
  answers: null,
  isSaving: false,
  error: null,
};

let state: PreferenceState = INITIAL;
const listeners = new Set<() => void>();

/** 스냅샷 참조가 바뀌어야 구독자가 다시 그립니다. 항상 새 객체로 교체합니다. */
function setState(patch: Partial<PreferenceState>): void {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

/** 같은 화면이 여러 개 떠도 조회는 한 번만 나가도록 진행 중 Promise 를 공유합니다. */
let inFlight: Promise<void> | null = null;

export const preferenceStore = {
  get(): PreferenceState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** 아직 안 불러왔으면 조회합니다. 이미 불러왔으면 아무것도 하지 않습니다. */
  ensureLoaded(): Promise<void> {
    if (state.status === 'ready' || inFlight) {
      return inFlight ?? Promise.resolve();
    }
    return preferenceStore.reload();
  },

  reload(): Promise<void> {
    setState({ status: 'loading', error: null });
    inFlight = (async () => {
      try {
        const answers = await userApi.getTravelPreferences();
        setState({ status: 'ready', answers });
      } catch (caught) {
        setState({ status: 'error', error: toApiError(caught).message });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  /**
   * 서버에 저장하고 성공하면 스토어를 갱신합니다.
   * 실패는 던집니다 — 위저드가 화면을 닫지 않고 에러를 보여줘야 하기 때문입니다.
   */
  async save(answers: PreferenceAnswers): Promise<PreferenceAnswers> {
    setState({ isSaving: true, error: null });
    try {
      const saved = await userApi.saveTravelPreferences(answers);
      setState({ status: 'ready', answers: saved, isSaving: false });
      return saved;
    } catch (caught) {
      const error = toApiError(caught);
      setState({ isSaving: false, error: error.message });
      throw error;
    }
  },

  /** 로그아웃 시 초기화 */
  reset(): void {
    inFlight = null;
    setState(INITIAL);
  },
};

/**
 * 취향 상태를 구독합니다. 처음 쓰이는 시점에 알아서 한 번 조회합니다.
 * (로그인 직후 어느 화면이 먼저 뜨든 동작하도록 화면 쪽에 부담을 주지 않습니다)
 */
export function usePreferences(): PreferenceState {
  const snapshot = useSyncExternalStore(
    preferenceStore.subscribe,
    preferenceStore.get,
  );

  useEffect(() => {
    preferenceStore.ensureLoaded();
  }, []);

  return snapshot;
}
