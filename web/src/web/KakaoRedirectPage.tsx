/**
 * 카카오 로그인 복귀 페이지 — 주소는 `/redirect` 입니다.
 *
 * 서버가 카카오와 토큰 교환을 끝낸 뒤 1회용 ticket 을 붙여 이 주소로 돌려보냅니다
 * (카카오가 직접 오지 않습니다 — 카카오의 redirect_uri 는 서버 콜백입니다).
 *
 * 여기서 하는 일은 두 갈래입니다.
 *
 *   팝업으로 열렸으면 → 티켓을 부모 창에 넘기고 스스로 닫습니다.
 *                      (세션 교환은 부모 창의 kakaoWebLogin.ts 가 이어서 합니다)
 *   같은 창으로 왔으면 → 여기서 티켓을 세션으로 바꿔 저장하고, 로그인을 시작했던
 *                      화면으로 되돌아갑니다.
 *
 * 앱 화면이 아니라 '거쳐 가는 페이지' 라서 react-native-web 이 아닌 평범한
 * HTML/CSS 로 만들었고, 모바일 프레임(AppShell) 밖에서 혼자 그려집니다.
 * 팝업 창(480×700)에서도, 같은 탭에서도 같은 모양으로 보입니다.
 *
 * 이 화면은 대부분 0.5초도 머무르지 않습니다. 그래도 상태를 또박또박 보여주는
 * 이유는, 느린 네트워크나 실패했을 때 사용자가 흰 화면 앞에서 기다리지 않게
 * 하기 위해서입니다.
 *
 * 예전 복귀 지점인 public/kakao-callback.html 도 그대로 둡니다. 서버가 아직 그쪽
 * 주소로 보내고 있어도 로그인이 되도록, 두 경로 모두 살려둔 것입니다.
 */
import { useEffect, useRef, useState } from 'react';
import {
  completeLoginInThisTab,
  credentialsFromMessage,
  readCallbackFromUrl,
  returnScreenFromState,
  type CallbackMessage,
} from './kakaoWebLogin';
import { navigate, toPath } from '../shell/router';
import './kakaoRedirect.css';

type Phase =
  /** 주소를 읽고 티켓을 교환하는 중 */
  | { kind: 'working' }
  /** 팝업 — 부모 창에 결과를 넘겼습니다. 창이 곧 닫힙니다. */
  | { kind: 'handoff'; ok: boolean }
  /** 같은 창 — 로그인을 마치고 원래 화면으로 돌아가는 중 */
  | { kind: 'returning' }
  /** 로그인과 무관하게 주소만 열어본 경우 */
  | { kind: 'empty'; raw: string }
  | { kind: 'error'; message: string; back: string };

function toMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return message || '로그인을 마무리하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

/**
 * 부모 창에 결과를 넘기고 스스로 닫습니다.
 *
 * 부모(kakaoWebLogin.ts)도 메시지를 받으면 이 창을 닫습니다. 둘 다 시도하는
 * 이유는, 부모 창이 그 사이 다른 화면으로 갔거나 메시지를 놓쳤을 때 팝업만
 * 덩그러니 남는 일을 막기 위해서입니다. 닫기가 막히면 아래 UI 가 그대로 남아
 * 사용자가 직접 닫을 수 있습니다.
 */
function handOff(message: CallbackMessage): void {
  try {
    window.opener?.postMessage(message, window.location.origin);
  } catch {
    // 부모 창이 이미 닫혔거나 접근할 수 없는 경우 — 아래 안내가 대신 남습니다.
  }
  window.setTimeout(() => window.close(), 150);
}

export default function KakaoRedirectPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'working' });
  /*
   * 티켓은 1회용입니다. StrictMode 는 개발 중 effect 를 두 번 실행하는데,
   * 그대로 두면 두 번째 교환이 401 로 떨어져 멀쩡한 로그인이 실패로 보입니다.
   */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    // 티켓·토큰이 실려 온 경우에만 주소를 비웁니다(주소창·방문 기록에 남지 않게).
    const { message, raw } = readCallbackFromUrl();
    const back = returnScreenFromState(message.state);
    const credentials = credentialsFromMessage(message);

    if (!credentials && !message.error) {
      setPhase({ kind: 'empty', raw });
      return;
    }

    if (window.opener && window.opener !== window) {
      handOff(message);
      setPhase({ kind: 'handoff', ok: Boolean(credentials) });
      return;
    }

    completeLoginInThisTab(message)
      .then(() => {
        setPhase({ kind: 'returning' });
        /*
         * SPA 이동이 아니라 통째로 다시 띄웁니다. 로그인 상태는 앱이 시작할 때
         * AuthProvider 가 저장소에서 복원하는데, 이 페이지는 그 바깥에서
         * 그려지고 있어 지금 화면만 갈아끼우면 앱은 여전히 로그아웃으로 봅니다.
         */
        window.location.replace(back);
      })
      .catch(error => {
        setPhase({ kind: 'error', message: toMessage(error), back });
      });
  }, []);

  return (
    <div className="kr-page">
      <main className="kr-card" role="status" aria-live="polite">
        <p className="kr-brand">
          <span className="kr-mark" aria-hidden="true" />
          혼행등대
        </p>

        {phase.kind === 'working' && (
          <>
            <Spinner />
            <h1 className="kr-title">로그인을 마무리하는 중이에요</h1>
            <p className="kr-desc">잠시만 기다려주세요.</p>
          </>
        )}

        {phase.kind === 'handoff' && (
          <>
            <Badge tone={phase.ok ? 'ok' : 'warn'} />
            <h1 className="kr-title">
              {phase.ok ? '로그인이 확인되었습니다' : '로그인하지 못했습니다'}
            </h1>
            <p className="kr-desc">
              {phase.ok
                ? '이 창은 곧 닫힙니다. 원래 창에서 계속 진행해주세요.'
                : '원래 창으로 돌아가 안내를 확인해주세요.'}
            </p>
            <button
              type="button"
              className="kr-button kr-button-quiet"
              onClick={() => window.close()}>
              창 닫기
            </button>
          </>
        )}

        {phase.kind === 'returning' && (
          <>
            <Badge tone="ok" />
            <h1 className="kr-title">로그인되었습니다</h1>
            <p className="kr-desc">보던 화면으로 돌아가는 중이에요.</p>
          </>
        )}

        {phase.kind === 'empty' && (
          <>
            <Badge tone="info" />
            <h1 className="kr-title">로그인 정보가 없습니다</h1>
            <p className="kr-desc">
              이 페이지는 카카오 로그인을 마치면 자동으로 열립니다. 주소를 직접
              여신 경우라면 홈에서 다시 로그인해주세요.
            </p>
            {/*
             * 개발 중에만 보이는 단서. 로그인을 마치고 왔는데 이 화면이 나왔다면
             * 서버가 티켓(ticket)도 토큰(accessToken)도 붙이지 않은 것입니다.
             * 어떤 이름으로 보내고 있는지가 바로 다음에 확인할 값이라 적어둡니다.
             */}
            {import.meta.env.DEV && (
              <p className="kr-debug">주소에 실려 온 값: {phase.raw || '없음'}</p>
            )}
            <button
              type="button"
              className="kr-button"
              onClick={() => navigate(toPath('home'))}>
              홈으로 가기
            </button>
          </>
        )}

        {phase.kind === 'error' && (
          <>
            <Badge tone="warn" />
            <h1 className="kr-title">로그인하지 못했습니다</h1>
            <p className="kr-desc kr-desc-error">{phase.message}</p>
            <button
              type="button"
              className="kr-button"
              onClick={() => navigate(phase.back)}>
              다시 시도하기
            </button>
          </>
        )}
      </main>
    </div>
  );
}

/** 진행 중 표시 — 테두리 한 줄이 도는 고리 */
function Spinner() {
  return <span className="kr-spinner" aria-hidden="true" />;
}

/** 결과 표시 — 확인/주의/안내 */
function Badge({ tone }: { tone: 'ok' | 'warn' | 'info' }) {
  const glyph = tone === 'ok' ? '✓' : tone === 'warn' ? '!' : 'i';
  return (
    <span className={`kr-badge kr-badge-${tone}`} aria-hidden="true">
      {glyph}
    </span>
  );
}
