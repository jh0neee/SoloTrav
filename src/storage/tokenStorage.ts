/**
 * 서비스 토큰 보관소 (AsyncStorage + 메모리 캐시).
 *
 * API 인터셉터는 매 요청마다 토큰이 필요한데 AsyncStorage 는 비동기라
 * 앱 시작 시 `load()` 로 한 번 읽어 메모리에 올려두고 이후에는 `get()` 으로
 * 동기 접근합니다. 쓰기는 메모리와 디스크에 함께 반영합니다.
 *
 * 저장소 구현을 바꾸더라도(예: Keychain/EncryptedStorage) 이 파일만 교체하면
 * api·auth 레이어는 영향을 받지 않습니다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens } from '../types/auth';

const STORAGE_KEY = '@solotrav/auth-tokens';

let cached: AuthTokens | null = null;
let loaded = false;

function isValidTokens(value: unknown): value is AuthTokens {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<AuthTokens>;
  return (
    typeof candidate.accessToken === 'string' && candidate.accessToken.length > 0
  );
}

export const tokenStorage = {
  /** 앱 시작 시 1회 호출 — 디스크의 토큰을 메모리로 올립니다. */
  async load(): Promise<AuthTokens | null> {
    if (loaded) {
      return cached;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      cached = isValidTokens(parsed) ? parsed : null;
    } catch {
      // 저장 값이 깨졌거나 읽기에 실패하면 로그아웃 상태로 시작합니다.
      cached = null;
    }
    loaded = true;
    return cached;
  },

  /** 메모리에 올라온 토큰 (동기). load() 이전에는 항상 null 입니다. */
  get(): AuthTokens | null {
    return cached;
  },

  async save(tokens: AuthTokens): Promise<void> {
    cached = tokens;
    loaded = true;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  },

  async clear(): Promise<void> {
    cached = null;
    loaded = true;
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
