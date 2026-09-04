/**
 * 웹 카카오 로그인 — 서버 주도(server-side) OAuth.
 *
 * 앱은 카카오 네이티브 SDK 가 토큰을 들고 돌아오지만, 웹에는 그 통로가 없습니다.
 * 예전에는 브라우저가 직접 code → token 교환을 했는데, 이 카카오 앱은
 * [보안 > Client Secret] 이 켜져 있어서 시크릿 없이 교환하면 카카오가
 * `invalid_client / KOE010` 으로 거절합니다. 시크릿은 서버에만 있어야 하는
 * 값이라 브라우저에 내려줄 수도 없습니다.
 *
 * 그래서 교환을 통째로 서버에 맡깁니다.
 *
 *   1) GET /auth/kakao/auth-url?state=… 로 인가 URL 을 받습니다
 *      (카카오에 등록된 redirect_uri 는 서버 콜백입니다. 우리 주소가 아닙니다)
 *   2) 그 URL 을 팝업으로 엽니다
 *   3) 로그인이 끝나면 카카오가 **서버 콜백**으로 code 를 넘깁니다
 *   4) 서버가 client_secret 을 얹어 토큰을 교환하고, 서비스 세션을 만든 뒤
 *      1회용 ticket 을 붙여 프론트의 /redirect 로 302 리다이렉트합니다
 *   5) 그 페이지(src/web/KakaoRedirectPage.tsx)가 부모 창(이 코드)에 ticket 을
 *      postMessage 로 넘기고 스스로 닫힙니다
 *   6) POST /auth/kakao/ticket 으로 ticket 을 서비스 세션과 바꿉니다
 *
 * ── 돌아올 주소를 state 에 싣는 이유 ──
 * 서버의 auth-url 은 redirectUri·returnUrl·redirect 같은 파라미터를 전부 무시하고
 * (2026-09-02 확인) **state 만** 카카오를 거쳐 서버 콜백까지 그대로 돌아옵니다.
 * 그래서 "로그인 뒤 돌려보낼 주소" 를 state 안에 담아 보냅니다. 서버가 새 파라미터를
 * 받도록 고치지 않아도 콜백 한 곳만 손보면 되는 가장 작은 경로입니다.
 * (혹시 파라미터 쪽이 편할 수도 있어 redirectUri 도 같이 보냅니다 — 지금은 무시됩니다)
 *
 * 앱 흐름과 달리 **카카오 토큰이 브라우저에 오지 않습니다.** 서버가 이미 세션을
 * 만들어 주므로 POST /auth/kakao/native 단계도 웹에는 없습니다.
 *
 * ── 카카오 개발자 콘솔 ──
 *   플랫폼 > Web > 사이트 도메인 : http://localhost:5180  (지도 JS 키용)
 *   카카오 로그인 > Redirect URI : https://mixed-light.kr/api/v1/auth/kakao/callback
 *     (서버 주소 하나면 됩니다. localhost 콜백은 등록할 필요가 없습니다)
 *
 * ── 서버에 필요한 것 ──
 *   docs/kakao-web-login-backend-spec.md 참고 — (A) auth-url 이 redirectUri 를
 *   기억하고, (B) 콜백이 프론트로 302 하고, (C) POST /auth/kakao/ticket 이
 *   있어야 합니다. 서버가 아직 (B) 를 안 하면 팝업이 서버 콜백의 JSON 화면에
 *   멈춰 있다가 사용자가 창을 닫는 순간 '취소' 로 끝납니다. 로그인이 계속
 *   취소로만 끝난다면 서버 반영 여부를 먼저 확인하세요.
 */
import { authApi } from '@solotrav/src/api/authApi';
import { apiClient } from '@solotrav/src/api/client';
import { ENDPOINTS } from '@solotrav/src/api/endpoints';
import { toAuthSession, toMeUser } from '@solotrav/src/api/mappers';
import type { AuthSession } from '@solotrav/src/types/auth';
import { tokenStorage } from '@solotrav/src/storage/tokenStorage';
import { userStore } from '@solotrav/src/user/userStore';
import { KAKAO_REDIRECT_PATH, toPath } from '../shell/router';

/**
 * 팝업 → 부모 창 메시지 표식.
 * 복귀 페이지 두 곳(src/web/KakaoRedirectPage.tsx · public/kakao-callback.html)이
 * **같은 값**을 씁니다. 바꾸려면 세 파일을 함께 고쳐야 합니다.
 */
export const CALLBACK_CHANNEL = '__solotrav_kakao__';
/**
 * 1회용 ticket → 서비스 세션.
 * 서버가 실제로 연 주소입니다(2026-09-02 확인). `/auth/kakao/ticket` 이 아니라
 * 뒤에 `/exchange` 가 붙습니다 — 없는 주소로 부르면 404 로 조용히 실패합니다.
 */
const TICKET_ENDPOINT = '/auth/kakao/ticket/exchange';

/** 취소 표식. 'cancel' 이라는 낱말이 들어가야 취소로 알아봅니다. */
export const CANCELLED = 'cancelled — 카카오 로그인이 취소되었습니다.';

/**
 * 탈퇴 예약 취소용 1회용 티켓으로 세션을 발급받습니다.
 * 웹은 카카오 SDK 토큰을 받을 수 없어(파일 상단 주석 참고) 네이티브의
 * `POST /auth/withdrawal/cancel`(카카오 토큰) 대신 이 티켓 기반 엔드포인트를 씁니다.
 */
const WITHDRAWAL_CANCEL_TICKET_ENDPOINT = '/auth/withdrawal/cancel/ticket';

export async function cancelWithdrawalWithTicket(
  ticket: string,
): Promise<AuthSession> {
  const { data } = await apiClient.post(WITHDRAWAL_CANCEL_TICKET_ENDPOINT, {
    ticket,
  });
  return toAuthSession(data);
}

/**
 * 로그인 실패 중에서도 "탈퇴 예약 계정" 케이스를 구분해서 던지는 에러.
 * 서버 콜백이 이 계정을 감지하면 `#error=...` 와 함께 취소용 티켓
 * (`withdrawalTicket`) 을 실어 보내주기로 되어 있습니다 — 그 티켓이 실려
 * 왔을 때만 이 클래스로 던집니다.
 */
export class KakaoLoginFailed extends Error {
  readonly code?: string;
  readonly withdrawalTicket?: string;

  constructor(
    message: string,
    options: { code?: string; withdrawalTicket?: string } = {},
  ) {
    super(message);
    this.name = 'KakaoLoginFailed';
    this.code = options.code;
    this.withdrawalTicket = options.withdrawalTicket;
    Object.setPrototypeOf(this, KakaoLoginFailed.prototype);
  }
}

/** 실패 메시지 → 일반 에러 또는(취소 티켓이 실려 있으면) KakaoLoginFailed */
function toLoginError(message: CallbackMessage): Error {
  if (message.withdrawalTicket) {
    return new KakaoLoginFailed(
      message.error || '탈퇴 예약된 계정입니다.',
      { code: message.code, withdrawalTicket: message.withdrawalTicket },
    );
  }
  return new Error(message.error || '카카오 로그인에 실패했습니다.');
}

function returnUrl(): string {
  return `${window.location.origin}${KAKAO_REDIRECT_PATH}`;
}

/** URL 에 그대로 실을 수 있는 base64 (표준 base64 의 +/= 를 피합니다) */
function base64url(value: string): string {
  // btoa 는 latin-1 만 받으므로 UTF-8 을 먼저 바이트로 폅니다.
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * state — 카카오를 거쳐 서버 콜백까지 그대로 돌아오는 유일한 값입니다.
 *
 *   n : 이 로그인 시도를 식별하는 난수. 다른 탭·다른 시도의 응답을 걸러냅니다.
 *   r : 로그인이 끝난 뒤 사용자를 돌려보낼 우리 주소.
 *   p : 로그인을 시작한 화면. 팝업이 아니라 **같은 창**으로 다녀온 경우,
 *       복귀 페이지가 사용자를 보던 화면으로 되돌리는 데 씁니다.
 *
 * 서버는 r 을 **허용 목록과 대조한 뒤에** 써야 합니다. 그대로 믿고 리다이렉트하면
 * 오픈 리다이렉트가 됩니다. (docs/kakao-web-login-backend-spec.md 참고)
 */
function makeState(): string {
  const nonce = Math.random().toString(36).slice(2);
  const from = `${window.location.pathname}${window.location.search}`;
  return base64url(JSON.stringify({ n: nonce, r: returnUrl(), p: from }));
}

/** base64url → 원래 문자열 (makeState 의 반대) */
function fromBase64url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * 로그인을 시작했던 화면 — 복귀 페이지가 같은 창에서 돌아왔을 때 씁니다.
 *
 * state 는 주소를 타고 남의 서버를 거쳐 돌아온 값이라 꾸며낼 수 있습니다.
 * `//evil.example` 같은 값을 그대로 따라가면 우리 사이트가 오픈 리다이렉트가
 * 되므로 **우리 사이트 안의 경로**(슬래시 하나로 시작)만 받아들이고, 나머지는
 * 홈으로 보냅니다.
 */
export function returnScreenFromState(state: string | null | undefined): string {
  const home = toPath('home');
  if (!state) {
    return home;
  }
  try {
    const parsed = JSON.parse(fromBase64url(state)) as { p?: unknown };
    const from = typeof parsed.p === 'string' ? parsed.p : '';
    const insideSite = /^\/(?!\/)/.test(from);
    // 복귀 페이지로 되돌아가면 제자리를 맴돕니다.
    return insideSite && !from.startsWith(KAKAO_REDIRECT_PATH) ? from : home;
  } catch {
    return home;
  }
}

/** 팝업을 화면 가운데에 띄웁니다. */
function openPopup(): Window | null {
  const width = 480;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  return window.open(
    '',
    'kakao-login',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
}

/** 복귀 페이지 → 부모 창 메시지. KakaoRedirectPage 가 만들어 보냅니다. */
export type CallbackMessage = {
  channel?: string;
  state?: string;
  error?: string;
  /** 서버 에러 코드 (예: `COMMON.CONFLICT`) */
  code?: string;
  /** 형식 1 — 1회용 티켓 (권장) */
  ticket?: string;
  /** 형식 2 — 서비스 토큰을 그대로 실어 보내는 경우 */
  accessToken?: string;
  refreshToken?: string;
  /** 탈퇴 예약 계정으로 실패했을 때만 함께 오는, 탈퇴 취소 전용 1회용 티켓 */
  withdrawalTicket?: string;
};

/**
 * 서버가 돌려줄 수 있는 두 가지 형식.
 *
 * 티켓 쪽이 안전합니다(토큰이 URL 에 남지 않습니다). 다만 서버에 교환
 * 엔드포인트를 하나 더 만들어야 해서, 콜백 한 곳만 고치고 싶을 때를 위해
 * 토큰 직접 전달도 함께 받습니다. 어느 쪽으로 오든 프론트는 그대로 돕니다.
 */
export type Credentials =
  | { kind: 'ticket'; ticket: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string };

/**
 * 팝업을 열고 서버가 돌려주는 1회용 ticket 을 기다립니다.
 *
 * 팝업은 인가 URL 을 받아오기 **전에** 먼저 엽니다. window.open 은 사용자의 클릭
 * 처리 중에만 허용되는데, 주소를 먼저 받아오면 그 사이 await 로 클릭 맥락이
 * 끊겨서 브라우저가 팝업을 막습니다. 빈 창을 먼저 띄우고 주소만 나중에 넣습니다.
 */
async function requestCredentials(): Promise<Credentials> {
  const state = makeState();
  const popup = openPopup();
  if (!popup) {
    throw new Error(
      '팝업이 차단되었습니다. 주소창의 팝업 차단을 해제한 뒤 다시 시도해주세요.',
    );
  }

  let authUrl: string;
  try {
    authUrl = await authApi.getKakaoAuthUrl({ redirectUri: returnUrl(), state });
  } catch (error) {
    popup.close();
    throw error;
  }

  popup.location.href = authUrl;

  return new Promise<Credentials>((resolve, reject) => {
    let done = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(closedTimer);
    };

    const onMessage = (event: MessageEvent) => {
      // 서버가 우리 origin 으로 되돌려 보낸 페이지만 받아들입니다.
      if (
        event.origin !== window.location.origin ||
        typeof event.data !== 'object' ||
        event.data === null
      ) {
        return;
      }
      const payload = event.data as CallbackMessage;
      if (payload.channel !== CALLBACK_CHANNEL) {
        return;
      }

      /*
       * "이 응답이 정말 내가 시작한 로그인의 것인가" 를 확인하는 자리입니다.
       *
       * 원래 장치는 state 입니다. 우리가 만들어 보냈다가 카카오와 서버 콜백을
       * 거쳐 그대로 돌아오는 값이라, 이게 맞으면 우리 시도가 맞습니다.
       *
       * 그런데 지금 서버는 ticket 만 붙이고 state 는 빼고 돌려보냅니다
       * (2026-09-02 확인). state 만 고집하면 로그인이 통째로 막히므로, 같은 질문에
       * 답해주는 다른 증거를 씁니다 — **메시지를 보낸 창이 우리가 연 그 팝업인가**.
       *
       * event.source 는 메시지를 보낸 창 자체를 가리킵니다. 우리가 window.open 으로
       * 받아둔 팝업 핸들과 같은 창이라면, 그 메시지는 우리가 시작한 로그인의
       * 결과일 수밖에 없습니다. 남의 페이지가 우리 창에 티켓을 밀어 넣어 남의
       * 계정으로 로그인시키는 수법(로그인 CSRF)도 이 확인으로 함께 막힙니다.
       * 그 페이지는 우리 팝업 핸들이 될 수 없기 때문입니다.
       *
       *   state 가 맞다        → 우리 것 (가장 확실)
       *   state 가 없다 + 우리 팝업이 보냈다 → 우리 것으로 인정, 경고만 남김
       *   state 가 다르다      → 다른 시도의 응답. 조용히 흘려보냅니다.
       *
       * 서버가 state 를 돌려주기 시작하면 첫 줄에서 걸러지고 이 예외는 쓰이지
       * 않습니다. 그래도 서버에는 붙여달라고 계속 요청하는 편이 좋습니다 —
       * 여러 탭에서 동시에 로그인할 때 응답을 짝지어주는 건 state 뿐입니다.
       */
      const fromOurPopup = event.source === popup;
      if (payload.state !== state) {
        if (payload.state || !fromOurPopup) {
          if (import.meta.env.DEV) {
            console.warn('[kakao] 우리 시도가 아닌 응답을 흘려보냈습니다.', {
              받은state: payload.state ?? '(없음)',
              기대state: state,
              우리팝업이보냄: fromOurPopup,
            });
          }
          return;
        }
        if (import.meta.env.DEV) {
          console.warn(
            '[kakao] 서버가 state 를 돌려주지 않았습니다. ' +
              '우리가 연 팝업이 보낸 메시지라 이번에는 받아들입니다 — ' +
              '서버 콜백에 `state=<받은 값 그대로>` 를 붙여달라고 요청해 주세요.',
          );
        }
      }

      done = true;
      cleanup();
      popup.close();
      if (payload.ticket) {
        resolve({ kind: 'ticket', ticket: payload.ticket });
      } else if (payload.accessToken) {
        resolve({
          kind: 'tokens',
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken ?? '',
        });
      } else {
        reject(toLoginError(payload));
      }
    };

    window.addEventListener('message', onMessage);

    // 사용자가 창을 직접 닫았는지 감시합니다.
    const closedTimer = window.setInterval(() => {
      if (popup.closed && !done) {
        cleanup();
        if (import.meta.env.DEV) {
          // 취소와 '서버가 안 돌려보냄' 은 겉모습이 같습니다. 둘 다 팝업이
          // 남의 출처(kauth.kakao.com / mixed-light.kr)에 있는 채로 닫히기
          // 때문에, 부모 창에서는 어느 쪽인지 알아낼 방법이 없습니다.
          console.warn(
            '[kakao] 티켓 없이 팝업이 닫혔습니다. 사용자가 취소했거나, ' +
              '서버가 로그인 후 프론트로 되돌려보내지 않은 것입니다. ' +
              '팝업이 우리 주소가 아니라 서버 주소(mixed-light.kr/redirect)에 ' +
              '멈춰 있었다면 후자입니다 — ' +
              'docs/kakao-web-login-backend-spec.md 참고.',
          );
        }
        reject(new Error(CANCELLED));
      }
    }, 400);
  });
}

/** ticket → 서비스 세션. 응답 모양은 POST /auth/kakao/native 와 같습니다. */
async function exchangeTicket(ticket: string): Promise<AuthSession> {
  const { data } = await apiClient.post(TICKET_ENDPOINT, { ticket });
  return toAuthSession(data);
}

/**
 * 토큰만 받은 경우 — 사용자 정보는 따로 조회해서 세션을 맞춥니다.
 *
 * 토큰을 아직 저장하지 않은 시점이라 요청 인터셉터가 헤더를 붙여주지 못합니다.
 * 그래서 Authorization 을 직접 싣습니다. (조회에 실패하면 저장도 하지 않으므로
 * 반쯤 로그인된 상태가 남지 않습니다)
 */
async function fetchSession(
  accessToken: string,
  refreshToken: string,
): Promise<AuthSession> {
  const { data } = await apiClient.get(ENDPOINTS.me(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { tokens: { accessToken, refreshToken }, user: toMeUser(data) };
}

/** 티켓이든 토큰이든 → 서비스 세션. (저장은 하지 않습니다) */
export async function exchangeCredentials(
  credentials: Credentials,
): Promise<AuthSession> {
  return credentials.kind === 'ticket'
    ? exchangeTicket(credentials.ticket)
    : fetchSession(credentials.accessToken, credentials.refreshToken);
}

/**
 * 웹 카카오 로그인.
 * 서비스 JWT 까지 받아서 돌려줍니다(저장은 호출하는 쪽에서).
 */
export async function loginWithKakaoWeb(): Promise<AuthSession> {
  return exchangeCredentials(await requestCredentials());
}

/* ──────────────────────────────────────────────────────────────────────
 * 복귀 페이지(/redirect)가 쓰는 것들 — src/web/KakaoRedirectPage.tsx
 * ────────────────────────────────────────────────────────────────────── */

/** 복귀 페이지가 주소에서 읽어낸 것 — 해석한 결과와, 날것 그대로의 파라미터 */
export type CallbackArrival = {
  message: CallbackMessage;
  /** 주소에 실려 온 이름=값 전부. 무엇이 왔는지 눈으로 확인할 때만 씁니다. */
  raw: string;
};

/** 티켓·토큰처럼 주소에 남으면 안 되는 값이 실려 왔는가 */
function carriesSecret(message: CallbackMessage): boolean {
  return Boolean(
    message.ticket ||
      message.accessToken ||
      message.refreshToken ||
      message.withdrawalTicket,
  );
}

/**
 * 주소에 실려 온 로그인 결과를 읽습니다.
 *
 * 해시(#)를 먼저 봅니다 — 해시는 HTTP 요청에 실려 나가지 않아 서버 접근 로그와
 * Referer 에 티켓이 남지 않습니다. 서버가 쿼리스트링(?)으로 붙여 보내는 경우도
 * 함께 받습니다.
 *
 * **티켓이나 토큰이 실려 왔을 때만** 주소를 비웁니다. 주소창·방문 기록에 비밀이
 * 남지 않게 하려는 것이고, 새로고침해도 이미 써버린 티켓으로 다시 교환하지
 * 않게 됩니다. 반대로 우리가 모르는 이름의 값만 온 경우에는 **일부러 남겨둡니다** —
 * 그 주소가 "서버가 무엇을 보내고 있는지" 를 알려주는 유일한 단서라, 지워버리면
 * 로그인이 왜 안 되는지 확인할 방법이 사라집니다.
 */
export function readCallbackFromUrl(): CallbackArrival {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const pick = (name: string): string | undefined =>
    hash.get(name) || query.get(name) || undefined;

  const message: CallbackMessage = {
    channel: CALLBACK_CHANNEL,
    state: pick('state'),
    error: pick('error_description') || pick('error'),
    // 에러 코드는 별도 `code` 파라미터가 아니라 `error` 자리에 옵니다
    // (예: `error=COMMON.CONFLICT&error_description=...`).
    code: pick('code') || pick('error'),
    // 형식 1 — 1회용 티켓 (권장)
    ticket: pick('ticket'),
    // 형식 2 — 서비스 토큰을 그대로 실어 보내는 경우
    accessToken: pick('accessToken') || pick('access_token'),
    refreshToken: pick('refreshToken') || pick('refresh_token'),
    // 탈퇴 예약 계정으로 실패했을 때만 함께 오는 취소 전용 티켓
    withdrawalTicket:
      pick('withdrawalTicket') || pick('withdrawal_cancel_ticket'),
  };

  // 값 자체는 비밀일 수 있으니 이름만 모읍니다.
  const names = [...hash.keys(), ...query.keys()];
  const raw = names.join(', ');

  if (import.meta.env.DEV) {
    console.info(
      '[kakao] /redirect 도착 — 주소에 실려 온 이름:',
      names.length ? names : '(없음)',
    );
  }

  if (carriesSecret(message)) {
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // 지우지 못해도 로그인 흐름에는 영향이 없습니다.
    }
  }

  return { message, raw };
}

/** 메시지에서 자격증명을 꺼냅니다. 둘 다 없으면 null — 실패로 봅니다. */
export function credentialsFromMessage(
  message: CallbackMessage,
): Credentials | null {
  if (message.ticket) {
    return { kind: 'ticket', ticket: message.ticket };
  }
  if (message.accessToken) {
    return {
      kind: 'tokens',
      accessToken: message.accessToken,
      refreshToken: message.refreshToken ?? '',
    };
  }
  return null;
}

/**
 * 같은 창으로 돌아온 경우 — 여기서 세션을 만들어 **저장까지** 합니다.
 *
 * 팝업으로 돌아왔다면 부모 창이 이어받으므로 이 길로 오지 않습니다. 팝업이
 * 막혔거나 사용자가 복귀 링크를 같은 탭에서 연 경우에만 씁니다.
 *
 * 저장 위치는 앱과 같습니다(tokenStorage·userStore). 그래서 저장한 뒤 페이지를
 * 다시 띄우기만 하면 AuthProvider 의 restore 가 로그인 상태로 복원합니다.
 * overrides/authService.ts 의 저장과 같은 일을 하니 한쪽을 고치면 다른 쪽도 보세요.
 */
export async function completeLoginInThisTab(
  message: CallbackMessage,
): Promise<void> {
  const credentials = credentialsFromMessage(message);
  if (!credentials) {
    throw toLoginError(message);
  }
  const session = await exchangeCredentials(credentials);
  await tokenStorage.save(session.tokens);
  await userStore.save(session.user);
}
