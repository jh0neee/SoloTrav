/**
 * 인증 유스케이스 — 웹 전용 교체판.
 *
 * 원본: ../src/auth/authService.ts
 * vite.config.ts 의 moduleOverrides 가 이 파일로 통째 갈아끼웁니다.
 *
 * 왜 교체하는가:
 * 앱은 카카오 SDK 가 준 **카카오 토큰**을 POST /auth/kakao/native 에 넘겨 서비스
 * JWT 로 바꿉니다. 웹은 카카오 토큰을 만질 수 없습니다 — 이 카카오 앱은 Client
 * Secret 이 켜져 있어서 code → token 교환을 서버만 할 수 있고(브라우저가 하면
 * KOE010), 그 대신 서버가 **서비스 세션까지 만들어서** 돌려줍니다. 그래서 웹의
 * 로그인은 "카카오 토큰 → 서버 교환" 두 단계가 아니라 "서버 주도 OAuth" 한
 * 단계입니다.
 *
 * loginWithKakao 만 다르고 나머지(restore/logout/onSessionExpired)는 원본과
 * 같은 코드입니다. 원본을 고칠 때 이 파일도 같이 보세요.
 * (오버라이드 대상이라 여기서 원본을 import 하면 자기 자신이 됩니다)
 */
import { authApi } from '@solotrav/src/api/authApi';
import { userApi } from '@solotrav/src/api/userApi';
import { setSessionExpiredHandler } from '@solotrav/src/api/sessionRefresh';
import { toApiError } from '@solotrav/src/api/errors';
import { tokenStorage } from '@solotrav/src/storage/tokenStorage';
import { userStore } from '@solotrav/src/user/userStore';
import {
  KakaoLoginCancelled,
  signOutFromKakao,
} from '@solotrav/src/auth/kakaoSdk';
import {
  WithdrawalPendingError,
  type WithdrawalRecoveryCredential,
} from '@solotrav/src/auth/withdrawalPendingError';
import type {
  AuthSession,
  AuthTokens,
  WithdrawalResult,
} from '@solotrav/src/types/auth';
import {
  cancelWithdrawalWithTicket,
  KakaoLoginFailed,
  loginWithKakaoWeb,
} from '../web/kakaoWebLogin';

/** 원본과 동일 — 서버 refresh token 폐기 + 카카오 세션 해제. */
async function revokeRemoteSession(tokens: AuthTokens | null): Promise<void> {
  try {
    if (tokens?.refreshToken) {
      await authApi.logout(tokens);
    }
  } catch {
    // 서버가 이미 폐기했거나 오프라인일 수 있습니다. 로컬은 이미 정리됐으니 무시합니다.
  }
  await signOutFromKakao();
}

/**
 * 사용자가 팝업을 닫은 경우를 취소로 구분합니다.
 * AuthContext 가 `instanceof KakaoLoginCancelled` 로 보고 에러를 띄울지
 * 말지 정하므로, 앱과 **같은 클래스**를 던져야 합니다.
 */
function isCancelledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /cancel|취소/i.test(message);
}

export const authService = {
  /** 원본과 동일 — 앱 시작 시 저장된 세션을 복원합니다. */
  restore: async (): Promise<AuthSession | null> => {
    const tokens = await tokenStorage.load();
    if (!tokens) {
      return null;
    }
    const user = await userStore.load();
    return { tokens, user };
  },

  /**
   * 카카오 로그인(서버 주도) → 로컬 저장.
   * 서버가 세션까지 만들어 주므로 authApi.loginWithKakaoNative 를 거치지 않습니다.
   *
   * @throws {KakaoLoginCancelled} 사용자가 팝업을 닫은 경우
   * @throws {WithdrawalPendingError} 탈퇴 예약된 계정인 경우 — 취소 티켓을 담아 던집니다
   * @throws {ApiError} 서버 교환에 실패한 경우
   */
  loginWithKakao: async (): Promise<AuthSession> => {
    let session: AuthSession;
    try {
      session = await loginWithKakaoWeb();
    } catch (error) {
      if (error instanceof KakaoLoginFailed && error.withdrawalTicket) {
        throw new WithdrawalPendingError({
          kind: 'ticket',
          ticket: error.withdrawalTicket,
        });
      }
      if (isCancelledError(error)) {
        throw new KakaoLoginCancelled();
      }
      throw toApiError(error);
    }

    await tokenStorage.save(session.tokens);
    await userStore.save(session.user);
    return session;
  },

  /**
   * 원본과 동일 — 회원 탈퇴 예약.
   * 서버가 탈퇴 예약을 정상 처리한 뒤에만 로컬 세션을 지웁니다.
   */
  withdraw: async (): Promise<WithdrawalResult> => {
    const result = await userApi.requestWithdrawal();
    await tokenStorage.clear();
    await userStore.clear();
    await signOutFromKakao();
    return result;
  },

  /**
   * 탈퇴 취소 티켓으로 탈퇴 예약을 취소하고 새 서비스 세션을 저장합니다.
   * 웹은 카카오 SDK 토큰이 없어 네이티브(카카오 토큰)와는 다른 방식입니다.
   */
  cancelWithdrawal: async (
    credential: WithdrawalRecoveryCredential,
  ): Promise<AuthSession> => {
    if (credential.kind !== 'ticket') {
      throw new Error('웹은 취소 티켓으로만 탈퇴를 취소할 수 있습니다.');
    }
    const session = await cancelWithdrawalWithTicket(credential.ticket);
    await tokenStorage.save(session.tokens);
    await userStore.save(session.user);
    return session;
  },

  /**
   * 탈퇴 취소 화면을 닫을 때 정리할 것.
   * 웹은 카카오 SDK 세션을 들고 있지 않아(서버 주도 OAuth) 정리할 게 없습니다.
   */
  abandonWithdrawalRecovery: async (): Promise<void> => {},

  /** 원본과 동일 — 로컬을 먼저 비우고 서버 폐기는 뒤에서 이어서 처리합니다. */
  logout: async (): Promise<void> => {
    const tokens = tokenStorage.get();

    await tokenStorage.clear();
    await userStore.clear();

    // 결과를 기다리지 않습니다. 실패는 revokeRemoteSession 안에서 흡수됩니다.
    revokeRemoteSession(tokens);
  },

  /** 원본과 동일 — 재발급 최종 실패(=재로그인 필요) 콜백 등록 */
  onSessionExpired: (handler: (() => void) | null): void => {
    setSessionExpiredHandler(handler);
  },
};
