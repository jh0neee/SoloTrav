/**
 * 전역 인증 상태.
 *
 * - 앱 시작 시 저장된 세션을 복원합니다 (status: 'restoring').
 * - 토큰 재발급이 최종 실패하면 자동으로 로그아웃 상태가 됩니다.
 * - 화면에서는 `useAuth()` 로 status / login / logout 만 씁니다.
 *
 * 사용자 **정보**는 여기서 들고 있지 않습니다. 같은 값을 Context state 와
 * userStore 두 곳에 두면 어긋나기 때문에, 프로필은 `useMyProfile()` 로 읽습니다.
 * 여기는 "로그인했는가"(세션)만 담당합니다.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authService } from './authService';
import { KakaoLoginCancelled } from './kakaoSdk';
import { toApiError } from '../api/errors';
import { userStore } from '../user/userStore';
import { preferenceStore } from '../preferences/preferenceStore';
import { badgeStore } from '../badges/badgeStore';
import type { AuthStatus } from '../types/auth';

type AuthContextValue = {
  status: AuthStatus;
  /** 로그인 요청이 진행 중인지 (버튼 스피너용) */
  isSigningIn: boolean;
  /** 마지막 로그인 실패 메시지. 취소는 에러로 보지 않아 null 입니다. */
  error: string | null;
  loginWithKakao: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 언마운트 이후 setState 방지
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 앱 시작 시 세션 복원
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 사용자 정보는 authService 가 userStore 에 올려둡니다.
      const session = await authService.restore();
      if (cancelled) {
        return;
      }
      setStatus(session ? 'authenticated' : 'unauthenticated');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 로그인 상태가 되면 서버 기준으로 내 정보를 한 번 갱신합니다.
  // (로그인 응답보다 GET /users/me 가 더 최신·정확합니다. 실패는 무시됩니다)
  useEffect(() => {
    if (status === 'authenticated') {
      userStore.refresh();
    }
  }, [status]);

  // 리프레시 토큰까지 만료되면 로그인 화면으로 되돌립니다.
  useEffect(() => {
    authService.onSessionExpired(() => {
      if (!mounted.current) {
        return;
      }
      // 토큰은 sessionRefresh 가 이미 지웠고, 계정에 딸린 값은 여기서 비웁니다.
      userStore.clear();
      preferenceStore.reset();
      badgeStore.reset();
      setStatus('unauthenticated');
      setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
    });
    return () => authService.onSessionExpired(null);
  }, []);

  const loginWithKakao = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      // 세션의 user 는 authService 가 userStore 에 넣어줍니다.
      await authService.loginWithKakao();
      if (!mounted.current) {
        return;
      }
      setStatus('authenticated');
    } catch (caught) {
      if (!mounted.current) {
        return;
      }
      // 사용자가 스스로 닫은 것은 실패가 아니므로 조용히 넘어갑니다.
      if (!(caught instanceof KakaoLoginCancelled)) {
        setError(toApiError(caught).message);
      }
    } finally {
      if (mounted.current) {
        setIsSigningIn(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    preferenceStore.reset();
    badgeStore.reset();
    if (!mounted.current) {
      return;
    }
    setStatus('unauthenticated');
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isSigningIn,
      error,
      loginWithKakao,
      logout,
      clearError,
    }),
    [status, isSigningIn, error, loginWithKakao, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return context;
}
