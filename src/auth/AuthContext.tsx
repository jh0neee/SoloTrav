/**
 * 전역 인증 상태.
 *
 * - 앱 시작 시 저장된 세션을 복원합니다 (status: 'restoring').
 * - 토큰 재발급이 최종 실패하면 자동으로 로그아웃 상태가 됩니다.
 * - 화면에서는 `useAuth()` 로 status / user / login / logout 만 씁니다.
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
import type { AuthStatus, AuthUser } from '../types/auth';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
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
      const session = await authService.restore();
      if (cancelled) {
        return;
      }
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'unauthenticated');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 리프레시 토큰까지 만료되면 로그인 화면으로 되돌립니다.
  useEffect(() => {
    authService.onSessionExpired(() => {
      if (!mounted.current) {
        return;
      }
      setUser(null);
      setStatus('unauthenticated');
      setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
    });
    return () => authService.onSessionExpired(null);
  }, []);

  const loginWithKakao = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const session = await authService.loginWithKakao();
      if (!mounted.current) {
        return;
      }
      setUser(session.user);
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
    if (!mounted.current) {
      return;
    }
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isSigningIn,
      error,
      loginWithKakao,
      logout,
      clearError,
    }),
    [status, user, isSigningIn, error, loginWithKakao, logout, clearError],
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
