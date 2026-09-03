/**
 * 인증 유스케이스.
 *
 * "카카오 SDK → 서버 토큰 교환 → 로컬 저장" 처럼 여러 레이어에 걸친 흐름을
 * 여기서만 조립합니다. 화면(AuthContext)은 이 함수들만 호출하면 되고,
 * api·storage·SDK 를 직접 다루지 않습니다.
 */
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { setSessionExpiredHandler } from '../api/sessionRefresh';
import { ApiError, toApiError } from '../api/errors';
import { tokenStorage } from '../storage/tokenStorage';
import { userStore } from '../user/userStore';
import {
  signInWithKakao,
  signOutFromKakao,
  type KakaoTokens,
} from './kakaoSdk';
import { CURRENT_TERMS_VERSION } from '../config/legal';
import type { ParsedTermsInfo } from '../api/mappers';
import type { AuthSession, AuthTokens } from '../types/auth';
import type { MyTermsStatusDto, ServiceTermsDto } from '../api/dto';
import { WithdrawalPendingError } from './withdrawalPendingError';

function isWithdrawalPending(error: ReturnType<typeof toApiError>): boolean {
  return (
    /WITHDRAW/i.test(error.code ?? '') ||
    (/탈퇴/.test(error.message) && /예약/.test(error.message))
  );
}

/**
 * 서버 refresh token 폐기 + 카카오 세션 해제.
 * 로그아웃 화면 전환을 막지 않도록 백그라운드에서 돌며 실패는 전부 흡수합니다.
 * 로컬 토큰은 이미 지워진 뒤라 인터셉터가 헤더를 붙여주지 못하므로
 * authApi.logout 이 Authorization 을 직접 싣습니다.
 */
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

export const authService = {
  /**
   * 앱 시작 시 저장된 세션을 복원합니다.
   * 토큰이 없거나 깨졌으면 null → 로그인 화면으로 보냅니다.
   */
  restore: async (): Promise<AuthSession | null> => {
    const tokens = await tokenStorage.load();
    if (!tokens) {
      return null;
    }
    const user = await userStore.load();
    return { tokens, user };
  },

  /**
   * 카카오 로그인 → 서비스 JWT 교환 → 로컬 저장.
   * @throws {KakaoLoginCancelled} 사용자가 카카오 로그인 창을 닫은 경우
   * @throws {ApiError} 서버 교환에 실패한 경우
   */
  loginWithKakao: async (): Promise<AuthSession> => {
    const kakaoTokens = await signInWithKakao();

    let session: AuthSession;
    try {
      session = await authApi.loginWithKakaoNative(kakaoTokens);
    } catch (error) {
      const apiError = toApiError(error);
      if (isWithdrawalPending(apiError)) {
        // 방금 받은 카카오 토큰으로 탈퇴 취소를 진행해야 하므로 로그아웃하지 않습니다.
        throw new WithdrawalPendingError(kakaoTokens);
      }
      // 서버 교환에 실패하면 카카오 세션도 정리해 다음 시도에서 계정 선택부터
      // 다시 시작하도록 합니다.
      await signOutFromKakao();
      throw apiError;
    }

    await tokenStorage.save(session.tokens);
    await userStore.save(session.user);
    return session;
  },

  /**
   * 로그아웃.
   * 로컬 세션을 먼저 비우고 로그인 화면으로 돌려보낸 뒤, 서버 refresh token 폐기와
   * 카카오 세션 해제는 뒤에서 이어서 처리합니다.
   *
   * 서버 폐기를 기다렸다가 정리하면 서버가 느리거나 꺼져 있을 때 타임아웃(15초)
   * 동안 로그아웃 버튼이 먹통처럼 보입니다. 어차피 실패해도 로컬은 비워야 하므로
   * 기다릴 이유가 없습니다.
   */
  logout: async (): Promise<void> => {
    const tokens = tokenStorage.get();

    await tokenStorage.clear();
    await userStore.clear();

    // 결과를 기다리지 않습니다. 실패는 revokeRemoteSession 안에서 흡수됩니다.
    revokeRemoteSession(tokens);
  },

  /**
   * 회원 탈퇴 예약.
   * 서버가 탈퇴 예약을 정상 처리한 뒤에만 로컬 세션을 지웁니다. 요청이 실패하면
   * 사용자가 오류를 확인하고 다시 시도할 수 있도록 로그인 상태를 유지합니다.
   */
  withdraw: async (): Promise<void> => {
    await userApi.requestWithdrawal();
    await tokenStorage.clear();
    await userStore.clear();
    await signOutFromKakao();
  },

  /** 카카오 토큰으로 탈퇴 예약을 취소하고 새 서비스 세션을 저장합니다. */
  cancelWithdrawal: async (kakaoTokens: KakaoTokens): Promise<AuthSession> => {
    const session = await authApi.cancelWithdrawal(kakaoTokens);
    await tokenStorage.save(session.tokens);
    await userStore.save(session.user);
    return session;
  },


  /** 서비스 이용약관 전문 및 최신 버전 조회 (GET /terms/service) */
  getServiceTerms: async (): Promise<ServiceTermsDto> => {
    return authApi.getServiceTerms();
  },

  /** 내 약관 동의 상태 조회 (GET /auth/terms) */
  getMyTermsStatus: async (): Promise<MyTermsStatusDto> => {
    return authApi.getMyTermsStatus();
  },

  /** 파싱된 약관 정보 조회 */
  getTerms: async (): Promise<ParsedTermsInfo> => {
    return authApi.getTerms();
  },

  /**
   * 현재 사용자의 약관 동의 필요 여부 확인.
   * GET /auth/terms 응답의 accepted 가 true 이거나 agreedAt/acceptedAt 이 존재하면 false,
   * 미동의 상태이면 true 를 반환합니다.
   */
  checkTermsAgreementRequired: async (): Promise<boolean> => {
    try {
      const status = await authApi.getMyTermsStatus();
      console.log(
        '[authService] 내 약관 동의 상태 원본 (GET /auth/terms):',
        JSON.stringify(status, null, 2),
      );
      // 서버의 required 필드가 있으면 그것을 우선하고, 없으면 버전/시각으로 동의 여부(isAgreed) 판별
      const isAgreed =
        typeof status.required === 'boolean'
          ? !status.required
          : Boolean(
              (status.acceptedVersion &&
                status.currentVersion &&
                status.acceptedVersion === status.currentVersion) ||
                status.accepted === true ||
                status.agreed === true ||
                Boolean(status.agreedAt) ||
                Boolean(status.acceptedAt),
            );

      const requiresTermsAgreement = !isAgreed;

      console.log('[authService] 약관 동의 판별 결과:', {
        required: status.required,
        currentVersion: status.currentVersion,
        acceptedVersion: status.acceptedVersion,
        acceptedAt: status.acceptedAt,
        isAgreed,
        '약관동의화면표시(requiresTermsAgreement)': requiresTermsAgreement,
      });

      return requiresTermsAgreement;
    } catch (error) {
      console.warn('[authService] 약관 상태 조회 실패 (기본값 false):', error);
      return false;
    }
  },

  /**
   * 이용약관 동의 요청.
   * 전달된 version이 없거나 64자리 해시가 아니면 GET /terms/service 에서 최신 버전(또는 기본 상수)을 가져와 동의합니다.
   * 이전 버전 요청 시 409 ApiError 가 발생합니다.
   */
  acceptTerms: async (version?: string): Promise<void> => {
    let targetVersion = version?.trim();
    if (!targetVersion || !/^[a-f0-9]{64}$/i.test(targetVersion)) {
      try {
        const serviceTerms = await authApi.getServiceTerms();
        const fetched = serviceTerms.version?.trim();
        if (fetched && /^[a-f0-9]{64}$/i.test(fetched)) {
          targetVersion = fetched;
        }
      } catch (err) {
        console.warn('[authService] GET /terms/service 조회 실패, 기본 버전 상수 사용:', err);
      }
    }
    if (!targetVersion || !/^[a-f0-9]{64}$/i.test(targetVersion)) {
      targetVersion = CURRENT_TERMS_VERSION;
    }
    console.log('[authService] 최종 약관 동의 요청 전송. version:', targetVersion);
    await authApi.acceptTerms({
      version: targetVersion,
      accepted: true,
    });
  },

  /** 탈퇴 취소 화면을 닫을 때 임시 카카오 세션도 정리합니다. */
  abandonWithdrawalRecovery: signOutFromKakao,

  /** 토큰 재발급이 최종 실패했을 때(=재로그인 필요) 호출될 콜백 등록 */
  onSessionExpired: (handler: (() => void) | null): void => {
    setSessionExpiredHandler(handler);
  },
};
