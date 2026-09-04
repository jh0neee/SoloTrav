/**
 * 회원 탈퇴 페이지 (웹 전용).
 *
 * 구글 플레이 '계정 삭제' 정책에 제출하는 페이지입니다. 정책이 요구하는 것은
 * 대략 이렇습니다.
 *
 *   1) 앱을 설치하지 않아도 열 수 있는 공개 주소일 것
 *   2) 무엇이 지워지고 무엇이 남는지, 얼마나 보관되는지 **로그인 전에도** 보일 것
 *   3) 본인 확인을 거쳐 실제로 탈퇴를 요청할 수 있을 것
 *
 * 그래서 안내문은 항상 보여주고, 실행 버튼만 로그인 뒤에 열립니다.
 */
import { useState } from 'react';
import { useAuth } from '@app/auth/AuthContext';
import { useMyProfile } from '@app/user/userStore';
import type { WithdrawalResult } from '@app/types/auth';
import { navigate, toPath } from '../shell/router';
import './deleteAccount.css';

/**
 * 문의처 — 플레이 콘솔 심사에서 연락 수단을 함께 보는 경우가 있습니다.
 * 값을 넣으면 화면 아래 문의 안내가 나타나고, 비워두면 그 블록이 숨겨집니다.
 */
const SUPPORT_EMAIL = '';

/** 되돌릴 수 없는 작업이라 '탈퇴' 두 글자를 직접 입력하게 합니다. */
const CONFIRM_WORD = '탈퇴';

function formatDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function DeleteAccountPage() {
  const {
    status,
    isSigningIn,
    isWithdrawalPending,
    isCancellingWithdrawal,
    error: authError,
    loginWithKakao,
    cancelWithdrawal,
    leaveWithdrawalRecovery,
    withdraw,
  } = useAuth();
  const profile = useMyProfile();

  const [understood, setUnderstood] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [typed, setTyped] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawalResult | null>(null);

  const canSubmit =
    understood && agreed && typed.trim() === CONFIRM_WORD && !isSubmitting;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const withdrawal = await withdraw();
      setResult(withdrawal);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : '탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="da-page">
      <main className="da-sheet">
        <header className="da-header">
          <h1 className="da-title">회원 탈퇴</h1>
          <p className="da-subtitle">혼행등대 계정과 데이터를 삭제합니다.</p>
        </header>

        {result ? (
          <Completed result={result} />
        ) : (
          <>
            {/* ── 로그인 전에도 보여야 하는 안내 (정책 요구사항) ── */}
            <DataNotice />

            <section className="da-section">
              <h2 className="da-section-title">탈퇴 진행</h2>

              {status === 'restoring' && (
                <p className="da-muted">로그인 상태를 확인하는 중입니다…</p>
              )}

              {status === 'unauthenticated' && isWithdrawalPending && (
                <WithdrawalRecovery
                  error={authError}
                  isCancelling={isCancellingWithdrawal}
                  onCancel={cancelWithdrawal}
                  onLeave={leaveWithdrawalRecovery}
                />
              )}

              {status === 'unauthenticated' && !isWithdrawalPending && (
                <>
                  <p className="da-muted">
                    본인 확인을 위해, 탈퇴할 계정으로 먼저 로그인해주세요.
                  </p>
                  {authError && <p className="da-error">{authError}</p>}
                  <button
                    type="button"
                    className="da-button da-button-kakao"
                    onClick={loginWithKakao}
                    disabled={isSigningIn}>
                    {isSigningIn ? '로그인 중…' : '카카오로 로그인'}
                  </button>
                </>
              )}

              {status === 'authenticated' && (
                <>
                  <div className="da-account">
                    <span className="da-account-label">탈퇴할 계정</span>
                    <span className="da-account-name">
                      {profile.displayName}
                    </span>
                    {profile.email && (
                      <span className="da-account-email">{profile.email}</span>
                    )}
                  </div>

                  <label className="da-check">
                    <input
                      type="checkbox"
                      checked={understood}
                      onChange={event => setUnderstood(event.target.checked)}
                    />
                    <span>
                      탈퇴하면 계정이 즉시 사용 중지되고, 되돌릴 수 없다는 점을
                      이해했습니다.
                    </span>
                  </label>

                  <label className="da-check">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={event => setAgreed(event.target.checked)}
                    />
                    <span>
                      작성한 여행 기록·사진·AI 대화가 삭제되는 것에 동의합니다.
                    </span>
                  </label>

                  <label className="da-field">
                    <span className="da-field-label">
                      확인을 위해 <b>{CONFIRM_WORD}</b> 를 입력해주세요
                    </span>
                    <input
                      type="text"
                      className="da-input"
                      value={typed}
                      onChange={event => setTyped(event.target.value)}
                      placeholder={CONFIRM_WORD}
                      autoComplete="off"
                    />
                  </label>

                  {error && <p className="da-error">{error}</p>}

                  <button
                    type="button"
                    className="da-button da-button-danger"
                    onClick={submit}
                    disabled={!canSubmit}>
                    {isSubmitting ? '처리 중…' : '회원 탈퇴하기'}
                  </button>

                  <button
                    type="button"
                    className="da-button da-button-ghost"
                    onClick={() => navigate(toPath('home'))}>
                    취소하고 돌아가기
                  </button>
                </>
              )}
            </section>
          </>
        )}

        {SUPPORT_EMAIL && (
          <footer className="da-footer">
            문의: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </footer>
        )}
      </main>
    </div>
  );
}

/**
 * 무엇이 지워지고 무엇이 남는지.
 * 플레이 정책이 "삭제되는 데이터와 보관되는 데이터를 구분해 알릴 것" 을 요구합니다.
 */
function DataNotice() {
  return (
    <section className="da-section">
      <h2 className="da-section-title">탈퇴하면 이렇게 됩니다</h2>

      <ol className="da-steps">
        <li>
          <span className="da-step-when">즉시</span>
          <span className="da-step-what">
            계정이 사용 중지되어 더 이상 로그인할 수 없습니다.
          </span>
        </li>
        <li>
          <span className="da-step-when">즉시</span>
          <span className="da-step-what">
            AI 대화 내역과 업로드한 이미지가 서비스에서 내려갑니다.
          </span>
        </li>
        <li>
          <span className="da-step-when">90일 후</span>
          <span className="da-step-what">
            계정 정보와 원본 이미지가 정기 작업에서 영구 삭제됩니다.
          </span>
        </li>
      </ol>

      <h3 className="da-sub-title">삭제되는 데이터</h3>
      <ul className="da-list">
        <li>계정 정보 (카카오 연결 정보, 닉네임, 프로필 이미지)</li>
        <li>여행 기록과 업로드한 사진</li>
        <li>샛별이 AI 대화 내역과 저장한 관심 코스</li>
        <li>여행 취향 설정과 획득한 배지</li>
      </ul>

      <h3 className="da-sub-title">바로 지워지지 않는 데이터</h3>
      <ul className="da-list">
        <li>
          원본 이미지와 계정 데이터는 오처리·복구 요청에 대비해 <b>90일간 보관</b>
          된 뒤 영구 삭제됩니다.
        </li>
        <li>
          다른 이용자의 게시물에 남긴 댓글처럼 타인의 기록에 섞인 내용은 작성자
          표시가 지워진 채 남을 수 있습니다.
        </li>
      </ul>

      <p className="da-note">
        탈퇴 후에는 같은 카카오 계정으로 다시 가입할 수 있지만, 이전 데이터는
        복구되지 않습니다.
      </p>
    </section>
  );
}

/** 이미 탈퇴 예약된 계정으로 로그인했을 때의 복구 안내 */
function WithdrawalRecovery({
  error,
  isCancelling,
  onCancel,
  onLeave,
}: {
  error: string | null;
  isCancelling: boolean;
  onCancel: () => void;
  onLeave: () => void;
}) {
  return (
    <>
      <p className="da-muted">
        이미 탈퇴가 예약된 계정이에요. 탈퇴 요청 후 90일 이내에는 예약을
        취소하고 기존 계정과 데이터를 그대로 이용할 수 있어요.
      </p>
      {error && <p className="da-error">{error}</p>}
      <button
        type="button"
        className="da-button da-button-kakao"
        onClick={onCancel}
        disabled={isCancelling}>
        {isCancelling ? '취소하는 중…' : '탈퇴 취소하고 계속하기'}
      </button>
      <button
        type="button"
        className="da-button da-button-ghost"
        onClick={onLeave}>
        로그인 화면으로 돌아가기
      </button>
    </>
  );
}

/** 탈퇴 접수 완료 화면 */
function Completed({ result }: { result: WithdrawalResult }) {
  const requestedAt = formatDate(result.requestedAt);
  const purgeAfter = formatDate(result.purgeAfter);

  return (
    <section className="da-section">
      <div className="da-done">
        <div className="da-done-mark" aria-hidden="true">
          ✓
        </div>
        <h2 className="da-done-title">탈퇴가 접수되었습니다</h2>
        <p className="da-muted">
          계정은 지금부터 사용할 수 없습니다. 그동안 이용해주셔서 감사합니다.
        </p>
      </div>

      {(requestedAt || purgeAfter) && (
        <dl className="da-result">
          {requestedAt && (
            <div>
              <dt>접수 시각</dt>
              <dd>{requestedAt}</dd>
            </div>
          )}
          {purgeAfter && (
            <div>
              <dt>영구 삭제 예정</dt>
              <dd>{purgeAfter}</dd>
            </div>
          )}
        </dl>
      )}

      <button
        type="button"
        className="da-button da-button-ghost"
        onClick={() => navigate(toPath('home'))}>
        처음으로
      </button>
    </section>
  );
}
