/**
 * 탈퇴 예약 계정 전용 에러.
 *
 * authService 안에 두지 않고 따로 뺀 이유:
 * 웹(../../SoloTravWeb)은 vite 의 moduleOverrides 로 `auth/authService.ts` 를
 * 파일 통째로 갈아끼웁니다. 그 안에 클래스를 두면 웹 빌드에서 export 가 사라져
 * `does not provide an export named 'WithdrawalPendingError'` 로 터집니다.
 * 여기(교체 대상이 아닌 모듈)에 두면 앱과 웹이 **같은 클래스**를 보므로
 * `instanceof` 판별도 그대로 동작합니다.
 */
import type { KakaoTokens } from './kakaoSdk';

/**
 * 탈퇴 예약 취소에 쓸 재인증 증거.
 * 네이티브는 카카오 SDK 가 준 토큰 쌍, 웹은 서버 주도 OAuth 콜백이 내려준
 * 1회용 취소 티켓입니다 — 웹은 카카오 토큰 자체를 받을 방법이 없습니다
 * (web/src/web/kakaoWebLogin.ts 상단 주석 참고).
 */
export type WithdrawalRecoveryCredential =
  | { kind: 'kakaoTokens'; tokens: KakaoTokens }
  | { kind: 'ticket'; ticket: string };

/**
 * 카카오 본인 확인은 끝났지만 서버 계정이 탈퇴 예약 상태일 때의 별도 흐름.
 * credential 은 취소 API에만 사용하며 디스크에는 저장하지 않습니다.
 */
export class WithdrawalPendingError extends Error {
  readonly credential: WithdrawalRecoveryCredential;

  constructor(credential: WithdrawalRecoveryCredential) {
    super('탈퇴 예약된 계정입니다.');
    this.name = 'WithdrawalPendingError';
    this.credential = credential;
    Object.setPrototypeOf(this, WithdrawalPendingError.prototype);
  }
}
