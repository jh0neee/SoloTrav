/**
 * 로그인한 사용자 정보 캐시.
 *
 * 현재 API 에는 "내 정보 조회"(/auth/me) 엔드포인트가 없어서, 로그인 응답으로
 * 받은 사용자 정보를 저장해두었다가 앱 재시작 시 복원합니다.
 * 추후 /auth/me 가 생기면 이 캐시는 초기 표시용으로만 쓰고 서버 값으로 갱신하면 됩니다.
 *
 * 토큰과 달리 동기 접근이 필요 없어 메모리 캐시 없이 단순 async API 입니다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '../types/auth';

const STORAGE_KEY = '@solotrav/auth-user';

/**
 * id 만 있으면 유효한 사용자로 봅니다.
 * nickname 은 서버가 null 로 내려주는 값이라 여기서 요구하면(예전 구현)
 * 닉네임 없는 계정이 앱 재시작 때마다 통째로 버려집니다.
 */
function isValidUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<AuthUser>;
  return typeof candidate.id === 'string' && candidate.id.length > 0;
}

export const userStorage = {
  async get(): Promise<AuthUser | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return isValidUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  async save(user: AuthUser | null): Promise<void> {
    if (!user) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
