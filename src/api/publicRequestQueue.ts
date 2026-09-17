/** 공개 조회만 공유합니다. 마지막 구독자가 취소하면 대기·네트워크 요청도 취소합니다. */
export class PublicRequestQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private nextStart = 0;
  private cooldownUntil = 0;
  private listeners = new Set<() => void>();
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private pending = new Map<
    string,
    {
      controller: AbortController;
      promise: Promise<unknown>;
      users: number;
    }
  >();

  constructor(private spacingMs = 350, private fallbackWaitMs = 60_000) {}

  getCooldownUntil = () => this.cooldownUntil;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async get<T>(
    key: string,
    loader: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    ttlMs = 10 * 60_000,
  ): Promise<T> {
    if (signal?.aborted) throw cancelled();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    let entry = this.pending.get(key);
    if (!entry || entry.controller.signal.aborted) {
      const controller = new AbortController();
      const promise = this.tail
        .catch(() => {})
        .then(async () => {
          for (let attempt = 0; ; attempt++) {
            while (true) {
              if (controller.signal.aborted) throw cancelled();
              const delay =
                Math.max(this.nextStart, this.cooldownUntil) - Date.now();
              if (delay <= 0) break;
              await wait(delay, controller.signal);
            }
            this.nextStart = Date.now() + this.spacingMs;
            try {
              const value = await loader(controller.signal);
              if (controller.signal.aborted) throw cancelled();
              this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
              // 지역·검색 조합이 무한히 쌓이지 않게 오래된 항목부터 제한합니다.
              if (this.cache.size > 150)
                this.cache.delete(this.cache.keys().next().value!);
              return value;
            } catch (error) {
              if (controller.signal.aborted) throw cancelled();
              const failure = error as {
                status?: number;
                retryAfterMs?: number;
              };
              if (failure.status !== 429) throw error;
              this.cooldownUntil = Math.max(
                this.cooldownUntil,
                Date.now() +
                  Math.max(1000, failure.retryAfterMs ?? this.fallbackWaitMs),
              );
              this.listeners.forEach(listener => listener());
              // 원 요청당 자동 재시도는 한 번만 허용합니다.
              if (attempt >= 1) throw error;
            }
          }
        });
      entry = { controller, promise, users: 0 };
      this.pending.set(key, entry);
      this.tail = promise.catch(() => {});
      const created = entry;
      promise
        .finally(() => {
          if (this.pending.get(key) === created) this.pending.delete(key);
        })
        .catch(() => {});
    }
    const shared = entry;
    shared.users++;
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (error: unknown, value?: T) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', abort);
        shared.users--;
        if (shared.users === 0) shared.controller.abort();
        if (error) reject(error);
        else resolve(value as T);
      };
      const abort = () => finish(cancelled());
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      shared.promise.then(
        value => finish(null, value as T),
        error => finish(error),
      );
    });
  }
}

function cancelled() {
  const error = new Error('조회가 취소되었습니다.');
  error.name = 'AbortError';
  return error;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(cancelled());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, Math.min(ms, 60_000));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
