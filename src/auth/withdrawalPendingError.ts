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
 * 카카오 본인 확인은 끝났지만 서버 계정이 탈퇴 예약 상태일 때의 별도 흐름.
 * 토큰은 취소 API에만 사용하며 디스크에는 저장하지 않습니다.
 */
export class WithdrawalPendingError extends Error {
  readonly kakaoTokens: KakaoTokens;

  constructor(kakaoTokens: KakaoTokens) {
    super('탈퇴 예약된 계정입니다.');
    this.name = 'WithdrawalPendingError';
    this.kakaoTokens = kakaoTokens;
    Object.setPrototypeOf(this, WithdrawalPendingError.prototype);
  }
}
