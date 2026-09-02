/**
 * 활성 탭 상태 — 한 줄짜리 모듈로 따로 빼둔 이유가 있습니다.
 *
 * 앱에서는 그냥 컴포넌트 지역 상태입니다(원래 BottomTabNavigator 안의 useState).
 * 웹(../../SoloTravWeb)에서는 이 모듈이 **주소창과 이어진 구현으로 통째 교체**되어,
 * 탭을 누르면 /record, /my 처럼 URL 이 바뀌고 브라우저 뒤로가기도 따라옵니다.
 *
 * 교체 지점: SoloTravWeb/vite.config.ts 의 moduleOverrides
 * 웹 구현  : SoloTravWeb/src/overrides/useActiveTab.ts
 *
 * 즉 안드로이드 빌드에는 웹 코드가 한 줄도 실리지 않고, 웹은 탭바 UI 를
 * 다시 만들 필요가 없습니다. 갈아끼우는 면을 이 파일 하나로 좁혀둔 것입니다.
 */
import { useState } from 'react';
import { TABS, type TabKey } from './tabs';

/** useState 와 같은 모양 — 교체 구현도 이 모양을 지켜야 합니다. */
export type ActiveTabState = [TabKey, (key: TabKey) => void];

export function useActiveTab(): ActiveTabState {
  return useState<TabKey>(TABS[0].key);
}
