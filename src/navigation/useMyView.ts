/**
 * 마이 탭 안쪽 화면 — 상태만 따로 빼둔 모듈입니다.
 *
 * 취향 편집·저장한 코스는 마이 화면 위에 전체 화면으로 뜹니다.
 * (탭 안이라 홈 스택처럼 push 할 곳이 없습니다)
 *
 * 웹에서는 주소창 기반 구현으로 교체됩니다(/my, /my/preference, /my/courses).
 * 교체 지점: SoloTravWeb/vite.config.ts, 웹 구현: SoloTravWeb/src/overrides/useMyView.ts
 */
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

export type MyView = 'root' | 'preference' | 'courses' | 'blocks';

/** useState 와 같은 모양 — 교체 구현도 이 모양을 지켜야 합니다. */
export type MyViewState = [MyView, (view: MyView) => void];

export function useMyView(): MyViewState {
  const [view, setView] = useState<MyView>('root');

  // 안드로이드 뒤로가기는 앱을 닫지 않고 열려 있는 화면만 닫습니다.
  useEffect(() => {
    if (view === 'root') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setView('root');
      return true;
    });
    return () => sub.remove();
  }, [view]);

  return [view, setView];
}
