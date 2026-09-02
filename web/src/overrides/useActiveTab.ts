/**
 * 활성 탭 — 웹 구현. 앱의 src/navigation/useActiveTab.ts 를 대신합니다.
 * (교체 지점: vite.config.ts 의 moduleOverrides)
 *
 * 앱에서는 탭이 지역 상태라 주소가 그대로였습니다. 웹에서는 그러면 곤란합니다.
 *   - 기록·마이 화면을 링크로 공유하거나 즐겨찾기할 수 없고
 *   - 새로고침하면 늘 홈으로 돌아가고
 *   - 브라우저 뒤로가기가 탭이 아니라 사이트 밖으로 나가버립니다
 *
 * 그래서 주소창을 그대로 탭 상태로 씁니다. 따로 state 를 두지 않으니 주소와
 * 화면이 어긋날 일이 없습니다(원본이 하나뿐입니다).
 *
 * 로그인 게이트는 앱의 RootNavigator 가 그대로 담당합니다. 로그아웃 상태로
 * /my 를 열면 로그인 화면이 뜨고, 로그인하면 주소가 /my 그대로라 곧장 마이
 * 화면으로 들어옵니다 — 돌아올 주소를 따로 기억해둘 필요가 없습니다.
 */
import { useCallback } from 'react';
import type { TabKey } from '@solotrav/src/navigation/tabs';
import { navigate, toPath, useLocation } from '../shell/router';

export type ActiveTabState = [TabKey, (key: TabKey) => void];

export function useActiveTab(): ActiveTabState {
  const location = useLocation();

  // 웹 전용 페이지(/account/delete)에서는 이 훅이 렌더되지 않지만,
  // 타입을 좁히기 위해 홈으로 떨어뜨려 둡니다.
  const activeKey: TabKey = location.kind === 'tab' ? location.tab : 'home';

  const setActiveKey = useCallback((key: TabKey) => {
    // 탭은 늘 그 탭의 첫 화면으로 — 앱에서 탭을 눌렀을 때와 같습니다.
    navigate(toPath(key));
  }, []);

  return [activeKey, setActiveKey];
}
