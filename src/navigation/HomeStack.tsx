/**
 * 홈 탭 내부의 가벼운 스택 네비게이션.
 * 외부 라이브러리 없이 상태 배열로 화면 전환(push/pop)을 관리하고,
 * 안드로이드 하드웨어 back 으로도 pop 되게 처리합니다.
 *
 *   홈 → 검색 → 장소 상세
 *   홈 → 사진첩
 *   홈 → 도시 선택 → 취향 프롬프트
 *   홈 → 취향 프롬프트 (홈 배너에서 바로 진입)
 *   홈 → 축제 카드 → 장소 상세
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/home/SearchScreen';
import GalleryScreen from '../screens/home/GalleryScreen';
import SpotDetailScreen from '../screens/home/SpotDetailScreen';
import CitySelectScreen from '../screens/home/CitySelectScreen';
import CityDetailScreen from '../screens/home/CityDetailScreen';
import PreferencePromptScreen from '../screens/home/PreferencePromptScreen';
import type { City } from '../data/cities';
import type { TourContent } from '../types/travel';
import type { RankingKind } from '../types/travel';
import {
  preferenceTagLabels,
  summarizePreferences,
  toProfilePreferenceAnswers,
} from '../data/preferences';
import {
  preferenceStore,
  usePreferences,
} from '../preferences/preferenceStore';

type Route =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'gallery'; albumTitle?: string }
  | { name: 'spot'; spot: TourContent }
  | { name: 'citySelect'; rankingKind: RankingKind }
  | { name: 'cityDetail'; city: City }
  | { name: 'preference'; city?: City };

function HomeStack({ onOpenMy }: { onOpenMy?: () => void }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  // 취향은 서버가 원본이라 화면 로컬 state 로 들고 있지 않습니다.
  // (탭을 옮기거나 앱을 껐다 켜도 유지되어야 합니다)
  const preferences = usePreferences();
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
    case 'search':
      return (
        <SearchScreen
          onBack={pop}
          onSelectSpot={spot => push({ name: 'spot', spot })}
        />
      );
    case 'gallery':
      return (
        <GalleryScreen onBack={pop} initialAlbumTitle={current.albumTitle} />
      );
    case 'spot':
      return <SpotDetailScreen spot={current.spot} onBack={pop} />;
    case 'citySelect':
      return (
        <CitySelectScreen
          initialRankingKind={current.rankingKind}
          onBack={pop}
          onOpenDetail={city => push({ name: 'cityDetail', city })}
        />
      );
    case 'cityDetail':
      return (
        <CityDetailScreen
          city={current.city}
          onBack={pop}
          onCreateCourse={city => push({ name: 'preference', city })}
          onSelectSpot={spot => push({ name: 'spot', spot })}
        />
      );
    case 'preference':
      return (
        <PreferencePromptScreen
          city={current.city}
          mode={current.city ? 'course' : 'profile'}
          initialAnswers={preferences.answers}
          isSaving={preferences.isSaving}
          saveError={preferences.error}
          onBack={pop}
          onComplete={async answers => {
            try {
              await preferenceStore.save(toProfilePreferenceAnswers(answers));
              pop();
              // TODO: course 모드에서는 city + answers 로 AI 코스 생성 결과 연결
            } catch {
              // 저장 실패 메시지는 스토어에 담겨 화면 하단에 뜹니다.
              // 여기서 pop() 하면 입력한 답변이 통째로 날아가므로 남겨둡니다.
            }
          }}
        />
      );
    case 'home':
    default:
      return (
        <HomeScreen
          preferenceSummary={
            preferences.answers
              ? summarizePreferences(preferences.answers)
              : null
          }
          preferenceTags={
            preferences.answers
              ? preferenceTagLabels(preferences.answers)
              : undefined
          }
          preferenceStatus={preferences.status}
          onRetryPreference={() => preferenceStore.reload()}
          onOpenPreference={() => push({ name: 'preference' })}
          onOpenPreferenceDetail={() => onOpenMy?.()}
          onOpenSearch={() => push({ name: 'search' })}
          onOpenCityRanking={rankingKind =>
            push({ name: 'citySelect', rankingKind })
          }
          onOpenGallery={albumTitle => push({ name: 'gallery', albumTitle })}
          onSelectCity={city => push({ name: 'cityDetail', city })}
          onSelectSpot={spot => push({ name: 'spot', spot })}
        />
      );
  }
}

export default HomeStack;
