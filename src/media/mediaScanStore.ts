import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { mediaApi, mediaIdFromUrl, type MediaStatus } from '../api/mediaApi';
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

type Entry = {
  state: ScanState;
  listeners: Set<() => void>;
  fetched: boolean;
};

const entries = new Map<string, Entry>();
const pendingFetchIds = new Set<string>();
let fetchTimer: ReturnType<typeof setTimeout> | undefined;

let globalVersion = 0;
const globalListeners = new Set<() => void>();

export function isScanReady(status: string): boolean {
  return status.toUpperCase() === 'CLEAN';
}

export function isScanPending(status: string): boolean {
  return ['LOADING', 'PENDING', 'QUEUED', 'SCANNING', 'PROCESSING'].includes(
    status.toUpperCase(),
  );
}

export function isScanFailed(status: string): boolean {
  return ['ERROR', 'INFECTED', 'BLOCKED', 'REJECTED'].includes(
    status.toUpperCase(),
  );
}

export function isCleanMediaUrl(url: string): boolean {
  const id = mediaIdFromUrl(url);
  if (!id) return true;
  return isScanReady(mediaScanStore.get(id).status);
}

function entryFor(id: string): Entry {
  let entry = entries.get(id);
  if (!entry) {
    entry = {
      state: INITIAL,
      listeners: new Set(),
      fetched: false,
    };
    entries.set(id, entry);
  }
  return entry;
}

function publish(entry: Entry, state: ScanState) {
  entry.state = state;
  entry.listeners.forEach(listener => listener());
  globalVersion += 1;
  globalListeners.forEach(listener => listener());
}

function scheduleFetch() {
  if (fetchTimer) return;
  fetchTimer = setTimeout(() => {
    fetchTimer = undefined;
    void executePendingFetch();
  }, 50);
}

async function executePendingFetch() {
  if (pendingFetchIds.size === 0) return;
  const ids = Array.from(pendingFetchIds);
  pendingFetchIds.clear();

  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    try {
      console.log(`[미디어 상태 조회] 1회 배치 조회 요청 (${chunk.length}개):`, chunk);
      const results =
        chunk.length === 1
          ? [{ ...(await mediaApi.status(chunk[0])), id: chunk[0] }]
          : await mediaApi.statuses(chunk);

      console.log(
        '[미디어 상태 조회] 응답 수신:',
        results.map(r => ({ id: r.id, status: r.status })),
      );

      for (const id of chunk) {
        const entry = entryFor(id);
        entry.fetched = true;
        const result =
          results.find(item => item.id === id) ??
          (chunk.length === 1 ? results[0] : undefined);
        if (result) {
          const status =
            typeof result.status === 'string'
              ? result.status.toUpperCase()
              : 'UNKNOWN';
          publish(entry, {
            status,
            retryable: result.retryable === true,
            retrying: false,
          });
        }
      }
    } catch (error) {
      console.warn('[미디어 상태 조회] 조회 실패:', error);
      for (const id of chunk) {
        const entry = entryFor(id);
        entry.fetched = true;
        publish(entry, {
          ...entry.state,
          message: toApiError(error).message,
        });
      }
    }
  }
}

export type ScanWaitResult = {
  success: boolean;
  cleanIds: string[];
  failedIds: string[];
  retryableId?: string;
  message?: string;
};

export const mediaScanStore = {
  get(id: string): ScanState {
    return entryFor(id).state;
  },

  getVersion(): number {
    return globalVersion;
  },

  subscribeGlobal(listener: () => void) {
    globalListeners.add(listener);
    return () => {
      globalListeners.delete(listener);
    };
  },

  /**
   * 게시물 조회 시점의 구독.
   * 기존 검사 결과를 1회 확인하고 통지하며, 절대 자동 재검사(retry)나 무한 폴링을 돌리지 않습니다.
   */
  subscribe(id: string, listener: () => void) {
    const entry = entryFor(id);
    entry.listeners.add(listener);

    if (!entry.fetched) {
      pendingFetchIds.add(id);
      scheduleFetch();
    }

    return () => {
      entry.listeners.delete(listener);
    };
  },

  /**
   * 업로드 직후: 서버의 검사 완료까지 상태를 확인합니다.
   * 검사가 완료(CLEAN)되거나 실패(ERROR/차단/타임아웃)할 때까지 폴링합니다.
   */
  async waitForScan(
    ids: string[],
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
      onProgress?: (
        pollCount: number,
        elapsed: number,
        cleanCount: number,
        totalCount: number,
      ) => void;
    },
  ): Promise<ScanWaitResult> {
    const timeoutMs = options?.timeoutMs ?? 15000;
    const intervalMs = options?.intervalMs ?? 1500;
    const startTime = Date.now();
    let pollCount = 0;

    if (ids.length === 0) {
      return { success: true, cleanIds: [], failedIds: [] };
    }

    console.log(
      `[바이러스 검사] 대기 시작 — 대상 ${ids.length}개:`,
      ids,
      `(최대 ${timeoutMs / 1000}초 동안 ${intervalMs / 1000}초 간격 확인)`,
    );

    while (Date.now() - startTime < timeoutMs) {
      pollCount += 1;
      const elapsed = Number(((Date.now() - startTime) / 1000).toFixed(1));
      const currentCleanCount = ids.filter(id =>
        isScanReady(mediaScanStore.get(id).status),
      ).length;
      options?.onProgress?.(pollCount, elapsed, currentCleanCount, ids.length);

      try {
        const results =
          ids.length === 1
            ? [{ ...(await mediaApi.status(ids[0])), id: ids[0] }]
            : await mediaApi.statuses(ids);

        console.log(
          `[바이러스 검사] #${pollCount}회차 상태 응답 (${elapsed}초 경과):`,
          results.map(r => ({ id: r.id, status: r.status, retryable: r.retryable })),
        );

        for (const result of results) {
          const mediaId = result.id ?? (ids.length === 1 ? ids[0] : undefined);
          if (!mediaId) continue;
          const entry = entryFor(mediaId);
          entry.fetched = true;
          const status =
            typeof result.status === 'string'
              ? result.status.toUpperCase()
              : 'UNKNOWN';
          publish(entry, {
            status,
            retryable: result.retryable === true,
            retrying: false,
          });
        }

        const allClean = ids.every(id =>
          isScanReady(mediaScanStore.get(id).status),
        );
        if (allClean) {
          console.log(`[바이러스 검사] 🎉 모든 사진 검사 통과 (CLEAN)! 총 소요 시간: ${elapsed}초`);
          return { success: true, cleanIds: ids, failedIds: [] };
        }

        const failed = ids.filter(id =>
          isScanFailed(mediaScanStore.get(id).status),
        );
        if (failed.length > 0) {
          const retryable = ids.find(
            id => mediaScanStore.get(id).retryable === true,
          );
          const hasMalware = ids.some(id =>
            ['INFECTED', 'BLOCKED', 'REJECTED'].includes(
              mediaScanStore.get(id).status,
            ),
          );
          console.warn(`[바이러스 검사] ⚠️ 검사 실패 감지:`, {
            failedIds: failed,
            hasMalware,
            retryableId: retryable,
          });
          return {
            success: false,
            cleanIds: ids.filter(id =>
              isScanReady(mediaScanStore.get(id).status),
            ),
            failedIds: failed,
            retryableId: retryable,
            message: hasMalware
              ? '안전하지 않은 사진(악성코드 의심)이 감지되어 등록에서 제외되었습니다.'
              : retryable
              ? '사진 검사 중 일시적인 오류가 발생했습니다.'
              : '사진 안전성 검사에 실패했습니다.',
          };
        }
      } catch (err) {
        console.warn(`[바이러스 검사] #${pollCount}회차 조회 중 일시적 오류:`, err);
      }

      await sleep(intervalMs);
    }

    console.warn(
      `[바이러스 검사] ⏰ 타임아웃 (${timeoutMs / 1000}초 초과) — 미완료 ID:`,
      ids.filter(id => !isScanReady(mediaScanStore.get(id).status)),
    );

    return {
      success: false,
      cleanIds: ids.filter(id => isScanReady(mediaScanStore.get(id).status)),
      failedIds: ids.filter(id => !isScanReady(mediaScanStore.get(id).status)),
      message:
        '사진 안전성 검사가 지연되고 있습니다. 검사가 완료되는 대로 게시물에 반영됩니다.',
    };
  },

  /**
   * 사용자 요청에 의한 수동 재검사.
   * 자동 재검사가 아니며, 사용자가 실패 안내를 보고 재시도를 누를 때만 호출됩니다.
   */
  async retry(id: string): Promise<void> {
    console.log(`[바이러스 검사] 수동 재검사 요청 시작 — 대상 ID: ${id}`);
    const entry = entryFor(id);
    publish(entry, { ...entry.state, retrying: true });
    try {
      await mediaApi.retry(id);
      console.log(`[바이러스 검사] 수동 재검사 요청 성공 — 대상 ID: ${id}`);
      entry.fetched = false;
      publish(entry, { status: 'PENDING', retryable: false, retrying: false });
    } catch (error) {
      console.error(`[바이러스 검사] 수동 재검사 요청 실패 — 대상 ID: ${id}:`, error);
      publish(entry, {
        ...entry.state,
        retrying: false,
        message: toApiError(error).message,
      });
      throw error;
    }
  },

  recheck(id: string) {
    const entry = entryFor(id);
    entry.fetched = false;
    publish(entry, INITIAL);
    pendingFetchIds.add(id);
    scheduleFetch();
  },
};

/**
 * 주어진 사진 URL 목록 중 검사를 통과한(CLEAN) 사진만 필터링하여 반환하는 훅.
 * 버전 번호를 구독하므로 Maximum update depth exceeded 에러를 원천 방지합니다.
 */
export function useCleanMediaUrls(urls: string[] = []): string[] {
  const version = useSyncExternalStore(
    mediaScanStore.subscribeGlobal,
    mediaScanStore.getVersion,
  );

  const key = Array.isArray(urls) ? urls.join(',') : '';

  useEffect(() => {
    if (!Array.isArray(urls) || urls.length === 0) return;
    const unsubscribes = urls
      .map(mediaIdFromUrl)
      .filter((id): id is string => id !== null)
      .map(id => mediaScanStore.subscribe(id, () => {}));
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => {
    if (!Array.isArray(urls) || urls.length === 0) return [];
    return urls.filter(isCleanMediaUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
}
