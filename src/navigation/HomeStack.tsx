/**
 * 홈 탭 내부의 가벼운 스택 네비게이션 — 화면을 그리는 쪽입니다.
 *
 * "지금 어느 화면인지" 와 push/pop 은 ./useHomeStack 이 들고 있습니다.
 * 앱에서는 지역 상태, 웹에서는 주소창(/search, /spot/... )과 이어진 구현으로
 * 교체되기 때문에, 이 파일은 어느 쪽에서 도는지 몰라도 됩니다.
 *
 *   홈 → 검색 → 장소 상세
 *   홈 → 사진첩
 *   홈 → 도시 선택 → 취향 프롬프트
 *   홈 → 취향 프롬프트 (홈 배너에서 바로 진입)
 *   홈 → 축제 카드 → 장소 상세
 */
import React from 'react';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/home/SearchScreen';
import GalleryScreen from '../screens/home/GalleryScreen';
import SpotDetailScreen from '../screens/home/SpotDetailScreen';
import CitySelectScreen from '../screens/home/CitySelectScreen';
import CityDetailScreen from '../screens/home/CityDetailScreen';
import PreferencePromptScreen from '../screens/home/PreferencePromptScreen';
import {
  preferenceTagLabels,
  summarizePreferences,
  toProfilePreferenceAnswers,
} from '../data/preferences';
import {
  preferenceStore,
  usePreferences,
} from '../preferences/preferenceStore';
import { useHomeStack } from './useHomeStack';

function HomeStack({ onOpenMy }: { onOpenMy?: () => void }) {
  const { current, push, pop } = useHomeStack();
  // 취향은 서버가 원본이라 화면 로컬 state 로 들고 있지 않습니다.
  // (탭을 옮기거나 앱을 껐다 켜도 유지되어야 합니다)
  const preferences = usePreferences();

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
