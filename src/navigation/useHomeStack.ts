/**
 * 홈 탭 안쪽 화면 스택 — 상태만 따로 빼둔 모듈입니다.
 *
 * 앱에서는 그냥 배열 하나에 push/pop 하는 지역 상태입니다(원래 HomeStack.tsx 안에
 * 있던 코드 그대로). 웹(../../SoloTravWeb)에서는 이 모듈이 **주소창과 이어진
 * 구현으로 통째 교체**되어, 화면을 옮기면 /search, /spot/12/126508 처럼 URL 이
 * 바뀌고 브라우저 뒤로가기가 그대로 동작합니다.
 *
 * 교체 지점: SoloTravWeb/vite.config.ts 의 moduleOverrides
 * 웹 구현  : SoloTravWeb/src/overrides/useHomeStack.ts
 *
 * 화면을 그리는 일은 HomeStack.tsx 가 그대로 합니다. 여기서 내주는 것은
 * "지금 어느 화면인지" 와 "옮기는 방법" 뿐이라, 웹은 화면 코드를 한 줄도
 * 다시 만들지 않습니다.
 */
import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { City } from '../data/cities';
import type { PreferenceAnswers, PreferencePromptMode } from '../data/preferences';
import type { RankingKind, TourContent } from '../types/travel';

/**
 *   홈 → 검색 → 장소 상세
 *   홈 → 사진첩
 *   홈 → 도시 랭킹 → 도시 상세 → 취향 프롬프트(코스)
 *   홈 → 취향 프롬프트 (홈 배너에서 바로 진입, 프로필)
 *   홈 → 축제 카드 → 장소 상세
 */
export type HomeRoute =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'gallery'; albumTitle?: string }
  | { name: 'spot'; spot: TourContent }
  | { name: 'citySelect'; rankingKind: RankingKind }
  | { name: 'cityDetail'; city: City }
  | {
      name: 'preference';
      city?: City;
      promptMode?: PreferencePromptMode;
      initialAnswersOverride?: PreferenceAnswers | null;
      resetAnswers?: boolean;
    }
  | {
      name: 'preferenceEdit';
      city: City;
      initialAnswersOverride?: PreferenceAnswers | null;
    };

export type HomeStackState = {
  /** 지금 그려야 할 화면 */
  current: HomeRoute;
  push: (route: HomeRoute) => void;
  pop: () => void;
};

export function useHomeStack(): HomeStackState {
  const [stack, setStack] = useState<HomeRoute[]>([{ name: 'home' }]);
  const current = stack[stack.length - 1];

  const push = useCallback(
    (route: HomeRoute) => setStack(prev => [...prev, route]),
    [],
  );
  const pop = useCallback(
    () => setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev)),
    [],
  );

  // 안드로이드 뒤로가기: 루트가 아니면 pop 하고 이벤트 소비
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, pop]);

  return { current, push, pop };
}
