/**
 * 기록 탭 안쪽 화면 — 상태만 따로 빼둔 모듈입니다.
 *
 * 탭 안이라 홈 스택처럼 push 할 곳이 없어서 이 안에서 화면을 고릅니다.
 *   feed → detail → form(수정) / feed → form(작성)
 *
 * 웹에서는 주소창 기반 구현으로 교체됩니다(/record, /record/:id, /record/new …).
 * 교체 지점: SoloTravWeb/vite.config.ts, 웹 구현: SoloTravWeb/src/overrides/useRecordRoute.ts
 */
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { TravelRecord } from '../types/travelRecord';

export type RecordRoute =
  | { name: 'feed' }
  | { name: 'detail'; recordId: string }
  | { name: 'form'; record: TravelRecord | null };

/** useState 와 같은 모양 — 교체 구현도 이 모양을 지켜야 합니다. */
export type RecordRouteState = [RecordRoute, (route: RecordRoute) => void];

export function useRecordRoute(): RecordRouteState {
  const [route, setRoute] = useState<RecordRoute>({ name: 'feed' });

  // 안드로이드 뒤로가기: 피드가 아니면 앱을 닫지 않고 한 단계 되돌립니다.
  useEffect(() => {
    if (route.name === 'feed') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // 수정 화면에서 돌아갈 곳은 그 기록의 상세입니다.
      setRoute(current =>
        current.name === 'form' && current.record
          ? { name: 'detail', recordId: current.record.id }
          : { name: 'feed' },
      );
      return true;
    });
    return () => sub.remove();
  }, [route.name]);

  return [route, setRoute];
}
