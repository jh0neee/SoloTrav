/**
 * 인증 API 요청 모음.
 * 경로는 ENDPOINTS 에서, 응답 해석은 mappers 에서 가져오고
 * 이 파일은 "어떤 요청을 보내는가"만 담당합니다.
 */
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import {
  toAuthSession,
  toKakaoAuthUrl,
  toKakaoNativeConfig,
  toTermsInfo,
  unwrap,
  type ParsedTermsInfo,
} from './mappers';
import { refreshSession } from './sessionRefresh';
import type {
  AcceptTermsRequest,
  AcceptTermsResponseDto,
  Envelope,
  KakaoNativeLoginRequest,
  MyTermsStatusDto,
  RefreshTokenRequest,
  ServiceTermsDto,
  TermsInfoDto,
} from './dto';
import type { AuthSession, AuthTokens, KakaoNativeConfig } from '../types/auth';

export const authApi = {
  /** GET /auth/kakao/native/config — 네이티브 SDK 설정 조회 */
  getKakaoNativeConfig: async (): Promise<KakaoNativeConfig> => {
    const { data } = await apiClient.get(ENDPOINTS.kakaoNativeConfig());
    return toKakaoNativeConfig(data);
  },

  /** GET /auth/kakao/auth-url — 웹 OAuth 인가 URL 조회 (웹 폴백용) */
  getKakaoAuthUrl: async (params?: {
    redirectUri?: string;
    state?: string;
  }): Promise<string> => {
    const _params = Object.assign({}, params); // 개발용 카카오 앱은 redirectUri 가 localhost 여야 합니다.
    const { data } = await apiClient.get(ENDPOINTS.kakaoAuthUrl(Object.assign(_params, { dev: 'ENABLED' })));
    return toKakaoAuthUrl(data);
  },

  /** GET /auth/kakao/callback — 웹 OAuth 인가 코드로 로그인 (웹 폴백용) */
  loginWithKakaoCallback: async (params: {
    code: string;
    state?: string;
  }): Promise<AuthSession> => {
    const _params = Object.assign({}, params); // 개발용 카카오 앱은 redirectUri 가 localhost 여야 합니다.
    const { data } = await apiClient.get(ENDPOINTS.kakaoCallback(Object.assign(_params, { dev: 'ENABLED' })));
    return toAuthSession(data);
  },

  /** POST /auth/kakao/native — 카카오 SDK 토큰으로 서비스 로그인 */
  loginWithKakaoNative: async (
    kakaoTokens: KakaoNativeLoginRequest,
  ): Promise<AuthSession> => {
    const body: KakaoNativeLoginRequest = {
      accessToken: kakaoTokens.accessToken,
      refreshToken: kakaoTokens.refreshToken,
    };
    const { data } = await apiClient.post(ENDPOINTS.kakaoNativeLogin(), body);
    return toAuthSession(data);
  },

  /** POST /auth/withdrawal/cancel — 카카오 재인증 후 탈퇴 예약 취소 */
  cancelWithdrawal: async (
    kakaoTokens: KakaoNativeLoginRequest,
  ): Promise<AuthSession> => {
    const body: KakaoNativeLoginRequest = {
      accessToken: kakaoTokens.accessToken,
      refreshToken: kakaoTokens.refreshToken,
    };
    const { data } = await apiClient.post(ENDPOINTS.cancelWithdrawal(), body);
    return toAuthSession(data);
  },

  /** GET /terms/service — 서비스 이용약관 전문 조회 (공개) */
  getServiceTerms: async (): Promise<ServiceTermsDto> => {
    console.log('[authApi] >>> GET /terms/service 요청 전송');
    try {
      const { data } = await apiClient.get(ENDPOINTS.serviceTerms());
      console.log('[authApi] <<< GET /terms/service 응답 수신:', data);
      return unwrap(data as Envelope<ServiceTermsDto>);
    } catch (error) {
      console.error('[authApi] !!! GET /terms/service 실패:', error);
      throw error;
    }
  },

  /** GET /auth/terms — 내 약관 동의 상태 조회 (인증) */
  getMyTermsStatus: async (): Promise<MyTermsStatusDto> => {
    console.log('[authApi] >>> GET /auth/terms 요청 전송');
    try {
      const { data } = await apiClient.get(ENDPOINTS.myTermsStatus());
      console.log(
        '[authApi] <<< GET /auth/terms 전체 응답 수신:',
        JSON.stringify(data, null, 2),
      );
      return unwrap(data as Envelope<MyTermsStatusDto>);
    } catch (error) {
      console.error('[authApi] !!! GET /auth/terms 실패:', error);
      throw error;
    }
  },

  /** GET /auth/terms — 파싱된 약관 정보 조회 */
  getTerms: async (): Promise<ParsedTermsInfo> => {
    const data = await authApi.getMyTermsStatus();
    return toTermsInfo(data);
  },

  /** POST /auth/terms/accept — 이용약관 동의 */
  acceptTerms: async (
    body: AcceptTermsRequest,
  ): Promise<AcceptTermsResponseDto> => {
    console.log('[authApi] >>> POST /auth/terms/accept 요청 바디:', body);
    try {
      const { data } = await apiClient.post(ENDPOINTS.termsAccept(), body);
      console.log('[authApi] <<< POST /auth/terms/accept 응답 수신:', data);
      return unwrap(data as Envelope<AcceptTermsResponseDto>);
    } catch (error) {
      console.error('[authApi] !!! POST /auth/terms/accept 실패:', error);
      throw error;
    }
  },

  /**
   * POST /auth/refresh — 토큰 재발급.
   * 401 자동 재시도와 동일한 single-flight 경로를 씁니다.
   */
  refresh: refreshSession,

  /**
   * POST /auth/logout — 서버의 refresh token 폐기.
   *
   * 로그아웃은 로컬 세션을 먼저 비운 뒤에 호출되므로 요청 인터셉터가 헤더를
   * 붙여줄 토큰이 남아 있지 않습니다. 그래서 Authorization 을 직접 싣습니다.
   */
  logout: async (tokens: AuthTokens): Promise<void> => {
    const body: RefreshTokenRequest = { refreshToken: tokens.refreshToken ?? '' };
    await apiClient.post(ENDPOINTS.logout(), body, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
  },
};
