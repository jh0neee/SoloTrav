import AsyncStorage from '@react-native-async-storage/async-storage';

type Entry<T> = { savedAt: number; value: T };
const pending = new Map<string, Promise<unknown>>();

/** 공개 통계만 저장합니다. 저장소 장애가 데이터 조회 실패로 이어지지 않습니다. */
export function cachedPublicData<T>(
  key: string,
  ttlMs: number,
  loader: (previous: T | undefined) => Promise<T>,
): Promise<T> {
  const storageKey = `@solotrav/public/v1/${key}`;
  const existing = pending.get(storageKey);
  if (existing) return existing as Promise<T>;
  const promise = (async () => {
    let previous: Entry<T> | undefined;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) previous = JSON.parse(raw);
    } catch {
      /* 저장소 없이도 조회합니다. */
    }
    if (
      previous &&
      typeof previous === 'object' &&
      'value' in previous &&
      Number.isFinite(previous.savedAt) &&
      previous.savedAt <= Date.now() &&
      Date.now() - previous.savedAt < ttlMs
    ) {
      return previous.value;
    }
    const value = await loader(previous?.value);
    try {
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ savedAt: Date.now(), value }),
      );
    } catch {
      /* 저장 실패는 다음 실행에서 다시 조회하면 됩니다. */
    }
    return value;
  })();
  pending.set(storageKey, promise);
  promise.finally(() => pending.delete(storageKey)).catch(() => {});
  return promise;
}
