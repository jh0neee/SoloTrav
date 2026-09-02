/**
 * 기록 탭 화면 — 웹 구현. 앱의 src/navigation/useRecordRoute.ts 를 대신합니다.
 * (교체 지점: vite.config.ts 의 moduleOverrides)
 *
 *   /record            피드
 *   /record/new        새 기록 작성
 *   /record/:기록ID     상세
 *   /record/:기록ID/edit  수정
 *
 * 수정 화면은 기록을 통째로 넘겨받아야 해서 history.state 에 싣습니다.
 * 링크로 수정 화면에 바로 들어오면 그 값이 없으므로 상세로 물러납니다
 * (남의 수정 링크를 여는 것은 정상적인 흐름이 아닙니다).
 */
import { useCallback } from 'react';
import type {
  RecordRoute,
  RecordRouteState,
} from '@solotrav/src/navigation/useRecordRoute';
import type { TravelRecord } from '@solotrav/src/types/travelRecord';
import {
  goBack,
  locationState,
  navigate,
  toPath,
  useLocation,
} from '../shell/router';

const FEED = toPath('record');

/** 수정할 기록 — 주소에 담을 수 없어 state 로 넘깁니다. */
type FormState = { record: TravelRecord };

function toRoute(segments: string[]): RecordRoute {
  const [first, second] = segments;

  if (!first) {
    return { name: 'feed' };
  }
  if (first === 'new') {
    return { name: 'form', record: null };
  }
  if (second === 'edit') {
    const saved = locationState<FormState>().record;
    // 넘겨받은 기록이 없으면 수정할 내용을 알 수 없어 상세로 돌아갑니다.
    return saved?.id === first
      ? { name: 'form', record: saved }
      : { name: 'detail', recordId: first };
  }
  return { name: 'detail', recordId: first };
}

function pathFor(route: RecordRoute): string {
  switch (route.name) {
    case 'detail':
      return toPath('record', [route.recordId]);
    case 'form':
      return route.record
        ? toPath('record', [route.record.id, 'edit'])
        : toPath('record', ['new']);
    default:
      return FEED;
  }
}

/** '/record/abc' 는 '/record/abc/edit' 의 위. 위로 가는 것은 '뒤로' 입니다. */
function isAbove(target: string, here: string): boolean {
  return here !== target && here.startsWith(`${target}/`);
}

export function useRecordRoute(): RecordRouteState {
  const location = useLocation();
  const segments = location.kind === 'tab' ? location.segments : [];

  const setRoute = useCallback((next: RecordRoute) => {
    const to = pathFor(next);
    // 화면의 '뒤로' 버튼은 브라우저 뒤로가기와 같게 — 히스토리가 늘지 않습니다.
    if (isAbove(to, window.location.pathname)) {
      goBack(to);
      return;
    }
    navigate(
      to,
      next.name === 'form' && next.record
        ? ({ record: next.record } satisfies FormState)
        : null,
    );
  }, []);

  return [toRoute(segments), setRoute];
}
