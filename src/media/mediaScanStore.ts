import { AppState } from 'react-native';
import { mediaApi, type MediaStatus } from '../api/mediaApi';
import { userStore } from '../user/userStore';
import { tokenStorage } from '../storage/tokenStorage';
import { toApiError } from '../api/errors';

export type ScanState = {
  status: string;
  retryable: boolean;
  retrying: boolean;
  message?: string;
};
const INITIAL: ScanState = {
  status: 'LOADING',
  retryable: false,
  retrying: false,
};
type Entry = {
  state: ScanState;
  listeners: Map<() => void, string | undefined>;
  attempts: number;
  checks: number;
  stopped: boolean;
};
const entries = new Map<string, Entry>();
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let appSubscription: ReturnType<typeof AppState.addEventListener> | undefined;

export function isScanReady(status: string): boolean {
  return status === 'CLEAN';
}
export function isScanPending(status: string): boolean {
  return ['LOADING', 'PENDING', 'QUEUED', 'SCANNING', 'PROCESSING'].includes(
    status,
  );
}
function entryFor(id: string): Entry {
  let entry = entries.get(id);
  if (!entry) {
    entry = {
      state: INITIAL,
      listeners: new Map(),
      attempts: 0,
      checks: 0,
      stopped: false,
    };
    entries.set(id, entry);
  }
  return entry;
}
function publish(entry: Entry, state: ScanState) {
  entry.state = state;
  entry.listeners.forEach((_, listener) => listener());
}
function canRetry(entry: Entry): boolean {
  const userId = userStore.get()?.id;
  return (
    !!userId &&
    userId !== 'guest' &&
    !!tokenStorage.get()?.accessToken &&
    [...entry.listeners.values()].some(ownerId => ownerId === userId)
  );
}
function activeEntries() {
  return [...entries].filter(
    ([, entry]) => entry.listeners.size > 0 && !entry.stopped,
  );
}
function schedule(delay = 3000) {
  if (
    timer ||
    controller ||
    AppState.currentState === 'background' ||
    AppState.currentState === 'inactive'
  )
    return;
  if (!activeEntries().length) return;
  timer = setTimeout(() => {
    timer = undefined;
    poll();
  }, delay);
}
async function retry(id: string, entry: Entry) {
  if (!canRetry(entry) || entry.attempts >= 2 || entry.state.retrying) return;
  entry.attempts += 1;
  publish(entry, { ...entry.state, retrying: true });
  try {
    await mediaApi.retry(id);
    entry.stopped = false;
    publish(entry, { status: 'PENDING', retryable: false, retrying: false });
  } catch (error) {
    entry.stopped = true;
    publish(entry, {
      ...entry.state,
      retrying: false,
      message: toApiError(error).message,
    });
  }
}
async function applyStatus(id: string, result: MediaStatus) {
  const entry = entryFor(id);
  if (!entry.listeners.size) return;
  const status =
    typeof result.status === 'string' ? result.status.toUpperCase() : 'UNKNOWN';
  publish(entry, {
    status,
    retryable: result.retryable === true,
    retrying: false,
  });
  if (
    status === 'ERROR' &&
    result.retryable === true &&
    canRetry(entry) &&
    entry.attempts < 2
  ) {
    await retry(id, entry);
  } else if (!isScanPending(status)) {
    entry.stopped = true;
  }
}
async function poll() {
  controller = new AbortController();
  const signal = controller.signal;
  const active = activeEntries();
  try {
    for (let i = 0; i < active.length && !signal.aborted; i += 20) {
      const chunk = active.slice(i, i + 20);
      const ids = chunk.map(([id]) => id);
      try {
        const results =
          ids.length === 1
            ? [{ ...(await mediaApi.status(ids[0], signal)), id: ids[0] }]
            : await mediaApi.statuses(ids, signal);
        if (signal.aborted) break;
        for (const [id, entry] of chunk) {
          if (!entry.listeners.size) continue;
          entry.checks += 1;
          const result = results.find(item => item.id === id);
          if (!result) throw new Error('사진 검사 상태가 응답에 없습니다.');
          await applyStatus(id, result);
          if (entry.checks >= 40 && !entry.stopped) {
            entry.stopped = true;
            publish(entry, {
              ...entry.state,
              message: '검사가 지연되고 있어요. 잠시 후 다시 확인해주세요.',
            });
          }
        }
      } catch (error) {
        if (signal.aborted) break;
        for (const [, entry] of chunk) {
          entry.stopped = true;
          publish(entry, {
            ...entry.state,
            message: toApiError(error).message,
          });
        }
      }
    }
  } finally {
    controller = undefined;
    schedule();
  }
}
export const mediaScanStore = {
  get(id: string): ScanState {
    return entryFor(id).state;
  },
  subscribe(id: string, listener: () => void, ownerId?: string) {
    const entry = entryFor(id);
    entry.listeners.set(listener, ownerId);
    if (!isScanReady(entry.state.status)) {
      entry.stopped = false;
      entry.checks = 0;
    }
    if (!appSubscription) {
      appSubscription = AppState.addEventListener('change', state => {
        if (state === 'active') schedule(100);
        else {
          clearTimeout(timer);
          timer = undefined;
          controller?.abort();
        }
      });
    }
    schedule(100);
    return () => {
      entry.listeners.delete(listener);
      if (![...entries.values()].some(item => item.listeners.size)) {
        clearTimeout(timer);
        timer = undefined;
        controller?.abort();
        appSubscription?.remove();
        appSubscription = undefined;
      }
    };
  },
  recheck(id: string) {
    const entry = entryFor(id);
    entry.stopped = false;
    entry.checks = 0;
    publish(entry, INITIAL);
    schedule(100);
  },
};
