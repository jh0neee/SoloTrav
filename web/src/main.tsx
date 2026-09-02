/**
 * 웹 진입점.
 *
 * 안드로이드 앱의 App.tsx 를 **그대로** 불러다 브라우저에 붙입니다.
 * (index.js 가 AppRegistry 로 하는 일을 여기서는 react-dom 이 합니다)
 *
 * 앱 코드가 쓰는 react-native / 네이티브 모듈은 vite.config.ts 의 alias 가
 * 웹 구현으로 바꿔치기하므로, 이 파일에서 따로 손댈 것이 없습니다.
 *
 * 웹에만 있는 페이지(회원 탈퇴 · 카카오 로그인 복귀)는 앱 화면과 형제로 두고
 * 주소로 고릅니다. 앱 안쪽 화면 전환은 지금처럼 앱이 스스로 합니다.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@solotrav/App';
import { AuthProvider } from '@app/auth/AuthContext';
import AppShell from './shell/AppShell';
import DeleteAccountPage from './account/DeleteAccountPage';
import KakaoRedirectPage from './web/KakaoRedirectPage';
import { useLocation } from './shell/router';
import { bootstrapWeb } from './shell/webBootstrap';
import './shell/shell.css';

// 앱을 그리기 전에 웹 제약을 먼저 정리합니다.
bootstrapWeb();

function Root() {
  const location = useLocation();

  /*
   * 로그인 복귀 페이지(/redirect)만 셸 밖에서 혼자 그립니다.
   * 대개 480×700 팝업 창에 뜨는 화면이라 모바일 프레임도, 상단 바도 필요
   * 없습니다. 티켓을 부모 창에 넘기고 스스로 닫는 것이 전부입니다.
   */
  if (location.kind === 'page' && location.page === 'kakaoRedirect') {
    return <KakaoRedirectPage />;
  }

  return (
    <AppShell>
      {location.kind === 'page' ? (
        /*
         * 탈퇴 페이지는 앱의 인증 게이트(RootNavigator) 밖에 둡니다.
         * 로그인하지 않아도 "무엇이 삭제되는지" 를 볼 수 있어야 한다는 것이
         * 구글 플레이 계정 삭제 정책의 요구사항입니다.
         * 다만 로그인 기능 자체는 필요해서 AuthProvider 만 따로 씌웁니다.
         */
        <AuthProvider>
          <DeleteAccountPage />
        </AuthProvider>
      ) : (
        <App />
      )}
    </AppShell>
  );
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('#root 를 찾지 못했습니다. index.html 을 확인해주세요.');
}

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
