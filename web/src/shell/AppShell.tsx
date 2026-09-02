/**
 * 앱 화면을 감싸는 웹 셸.
 *
 * 안드로이드 화면 비율의 세로 칸을 만들어 그 안에 앱을 그대로 띄웁니다.
 * 앱 코드는 자기가 웹에 있는지 모릅니다.
 *
 * 여기에 얇은 상단 바를 하나 둡니다. 앱에는 없는, **웹에만 필요한 길**을 내기
 * 위해서입니다. 지금은 회원 탈퇴 페이지로 가는 링크가 그것입니다.
 *
 * 그 링크는 **로그아웃 상태에서만** 보입니다. 로그인한 사람에게는 앱의 마이
 * 화면에 이미 탈퇴 메뉴가 있어서, 같은 길을 두 번 내면 화면만 시끄러워집니다.
 * 반대로 로그인하지 않은 사람에게는 이 링크 말고 그 페이지에 닿을 방법이
 * 없습니다 — 구글 플레이에 제출한 '계정 삭제 URL' 은 앱을 지운 뒤에도 열려야
 * 하는 주소라, 로그인 전에도 반드시 보여야 합니다.
 *
 * 로그인 여부는 앱의 사용자 스토어에서 읽습니다. AuthProvider 는 이 셸보다
 * 안쪽(App 안)에 있어 useAuth 를 쓸 수 없지만, userStore 는 Context 가 아니라
 * 외부 스토어라 트리 어디에서나 구독할 수 있습니다.
 */
import type { ReactNode } from 'react';
import { useUser } from '@app/user/userStore';
import {
  DELETE_ACCOUNT_PATH,
  navigate,
  toPath,
  useLocation,
} from './router';

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isDeleteAccount =
    location.kind === 'page' && location.page === 'deleteAccount';
  /*
   * 로그인 직후 이 값이 채워집니다. 앱이 시작하며 저장된 세션을 복원하는
   * 사이에는 잠깐 null 이라, 새로고침 직후 한 프레임 동안 링크가 보였다가
   * 사라질 수 있습니다. 저장소가 localStorage 라 그 간격은 첫 페인트 한 번입니다.
   */
  const isSignedIn = useUser() !== null;

  return (
    <>
      <div className="shell-label" aria-hidden="true">
        <strong>SoloTrav</strong>
        <span>혼자 여행하는 사람을 위한 안전한 여행 가이드</span>
      </div>

      <div className="app-frame" id="app-frame">
        <nav className="shell-bar" aria-label="사이트 메뉴">
          <button
            type="button"
            className="shell-bar-brand"
            onClick={() => navigate(toPath('home'))}>
            <span className="shell-bar-mark" aria-hidden="true" />
            혼행등대
          </button>

          {isDeleteAccount && (
            <button
              type="button"
              className="shell-bar-link"
              onClick={() => navigate(toPath('home'))}>
              홈으로
            </button>
          )}

          {/* 로그인한 사람은 마이 화면에서 탈퇴합니다 — 여기서는 숨깁니다. */}
          {!isDeleteAccount && !isSignedIn && (
            <button
              type="button"
              className="shell-bar-link"
              onClick={() => navigate(DELETE_ACCOUNT_PATH)}>
              회원 탈퇴
            </button>
          )}
        </nav>

        <div className="app-frame-body">{children}</div>
      </div>
    </>
  );
}
