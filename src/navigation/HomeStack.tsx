/**
 * 홈 탭 내부의 가벼운 스택 네비게이션.
 * 외부 라이브러리 없이 상태 배열로 화면 전환(push/pop)을 관리하고,
 * 안드로이드 하드웨어 back 으로도 pop 되게 처리합니다.
 *
 *   홈 → 도시 선택 → 취향 프롬프트
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import HomeScreen from '../screens/home/HomeScreen';
import CitySelectScreen from '../screens/home/CitySelectScreen';
import PreferencePromptScreen from '../screens/home/PreferencePromptScreen';
import type { City } from '../data/cities';

type Route =
  | { name: 'home' }
  | { name: 'citySelect' }
  | { name: 'preference'; city: City };

function HomeStack() {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const current = stack[stack.length - 1];

  const push = useCallback(
    (route: Route) => setStack(prev => [...prev, route]),
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

  switch (current.name) {
    case 'citySelect':
      return (
        <CitySelectScreen
          onBack={pop}
          onCreateCourse={city => push({ name: 'preference', city })}
        />
      );
    case 'preference':
      return (
        <PreferencePromptScreen
          city={current.city}
          onBack={pop}
          onGenerate={() => {
            // TODO: AI 코스 생성 결과 화면 연결
          }}
        />
      );
    case 'home':
    default:
      return (
        <HomeScreen
          onOpenSearch={() => push({ name: 'citySelect' })}
          onSelectCity={city => push({ name: 'preference', city })}
        />
      );
  }
}

export default HomeStack;
