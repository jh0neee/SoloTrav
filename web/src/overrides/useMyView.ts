/**
 * 마이 탭 화면 — 웹 구현. 앱의 src/navigation/useMyView.ts 를 대신합니다.
 * (교체 지점: vite.config.ts 의 moduleOverrides)
 *
 *   /my              마이
 *   /my/preference   취향 편집
 *   /my/courses      저장한 코스
 *
 * 넘길 값이 없어서 주소만으로 온전히 되살아납니다 — 링크를 그대로 공유해도
 * 같은 화면이 열립니다.
 */
import { useCallback } from 'react';
import type { MyView, MyViewState } from '@solotrav/src/navigation/useMyView';
import { goBack, navigate, toPath, useLocation } from '../shell/router';

const ROOT = toPath('my');

const SEGMENT: Record<Exclude<MyView, 'root'>, string> = {
  preference: 'preference',
  courses: 'courses',
};

function toView(segments: string[]): MyView {
  const found = (Object.keys(SEGMENT) as Exclude<MyView, 'root'>[]).find(
    view => SEGMENT[view] === segments[0],
  );
  return found ?? 'root';
}

export function useMyView(): MyViewState {
  const location = useLocation();
  const segments = location.kind === 'tab' ? location.segments : [];

  const setView = useCallback((next: MyView) => {
    // 닫기는 브라우저 뒤로가기와 같게 — 히스토리가 늘지 않습니다.
    if (next === 'root') {
      goBack(ROOT);
      return;
    }
    navigate(toPath('my', [SEGMENT[next]]));
  }, []);

  return [toView(segments), setView];
}
