/**
 * @react-native-async-storage/async-storage 대체 — localStorage 위에 얹습니다.
 *
 * 앱은 로그인 토큰(tokenStorage)과 사용자 정보(userStorage)를 여기에 담습니다.
 * 원본 API 가 Promise 기반이라 동기 저장소를 감싸서 같은 모양으로 돌려줍니다.
 *
 * 시크릿 창이나 저장소 차단 환경에서 localStorage 접근은 예외를 던질 수 있어
 * 전부 try/catch 로 감싸고, 실패하면 메모리에만 담습니다
 * (새로고침하면 로그아웃되지만 화면이 죽지는 않습니다).
 */
const memory = new Map<string, string>();

let usable: boolean | null = null;

function canUseLocalStorage(): boolean {
  if (usable !== null) {
    return usable;
  }
  try {
    const probe = '@solotrav/probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    usable = true;
  } catch {
    usable = false;
  }
  return usable;
}

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!canUseLocalStorage()) {
      return memory.get(key) ?? null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memory.set(key, value);
    if (canUseLocalStorage()) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // 용량 초과 등 — 메모리 값은 이미 갱신했습니다.
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    memory.delete(key);
    if (canUseLocalStorage()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* 무시 */
      }
    }
  },

  async clear(): Promise<void> {
    memory.clear();
    if (canUseLocalStorage()) {
      try {
        window.localStorage.clear();
      } catch {
        /* 무시 */
      }
    }
  },

  async getAllKeys(): Promise<string[]> {
    if (!canUseLocalStorage()) {
      return [...memory.keys()];
    }
    try {
      return Object.keys(window.localStorage);
    } catch {
      return [...memory.keys()];
    }
  },

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    return Promise.all(
      keys.map(async key => [key, await AsyncStorage.getItem(key)] as [
        string,
        string | null,
      ]),
    );
  },

  async multiSet(pairs: [string, string][]): Promise<void> {
    await Promise.all(pairs.map(([key, value]) => AsyncStorage.setItem(key, value)));
  },

  async multiRemove(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
  },
};

export default AsyncStorage;
