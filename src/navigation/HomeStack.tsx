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
import React, { useState } from 'react';
import { Alert } from 'react-native';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/home/SearchScreen';
import GalleryScreen from '../screens/home/GalleryScreen';
import SpotDetailScreen from '../screens/home/SpotDetailScreen';
import CitySelectScreen from '../screens/home/CitySelectScreen';
import CityDetailScreen from '../screens/home/CityDetailScreen';
import PreferencePromptScreen from '../screens/home/PreferencePromptScreen';
import CoursePreferenceEditScreen from '../screens/home/CoursePreferenceEditScreen';
import CoursePreferenceModal from '../components/CoursePreferenceModal';
import type { City } from '../data/cities';
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
  const [courseModalCity, setCourseModalCity] = useState<City | null>(null);

  const renderScreen = () => {
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
            onCreateCourse={city => {
              console.log(
                '[HomeStack] onCreateCourse called for:',
                city.name,
                'hasAnswers:',
                !!preferences.answers,
              );
              if (preferences.answers) {
                setCourseModalCity(city);
              } else {
                push({ name: 'preference', city, promptMode: 'course' });
              }
            }}
            onSelectSpot={spot => push({ name: 'spot', spot })}
          />
        );
      case 'preference':
        return (
          <PreferencePromptScreen
            city={current.city}
            mode={current.promptMode ?? (current.city ? 'course' : 'profile')}
            initialAnswers={
              current.initialAnswersOverride !== undefined
                ? current.initialAnswersOverride
                : preferences.answers
            }
            resetAnswers={current.resetAnswers}
            isSaving={preferences.isSaving}
            saveError={preferences.error}
            onBack={pop}
            onComplete={async (answers, saveToProfile) => {
              try {
                if (saveToProfile) {
                  await preferenceStore.save(toProfilePreferenceAnswers(answers));
                }
                pop();
                const budgetText = answers.dailyBudget
                  ? `\n하루 예산: ${answers.dailyBudget}만원`
                  : '';
                Alert.alert(
                  '코스 생성 요청 완료',
                  `${current.city?.name ?? ''} 맞춤 코스 생성을 요청했습니다.${budgetText}`,
                );
              } catch {
                Alert.alert(
                  '저장 실패',
                  '서버에 취향을 저장하지 못했습니다. 다시 시도해주세요.',
                );
              }
            }}
          />
        );
      case 'preferenceEdit':
        return (
          <CoursePreferenceEditScreen
            city={current.city}
            initialAnswers={
              current.initialAnswersOverride !== undefined
                ? current.initialAnswersOverride
                : preferences.answers
            }
            isSaving={preferences.isSaving}
            saveError={preferences.error}
            onBack={pop}
            onComplete={async (answers, saveToProfile) => {
              try {
                if (saveToProfile) {
                  await preferenceStore.save(toProfilePreferenceAnswers(answers));
                }
                pop();
                const budgetText = answers.dailyBudget
                  ? `\n하루 예산: ${answers.dailyBudget}만원`
                  : '';
                Alert.alert(
                  '코스 생성 요청 완료',
                  `${current.city?.name ?? ''} 맞춤 코스 생성을 요청했습니다.${budgetText}`,
                );
              } catch {
                Alert.alert(
                  '저장 실패',
                  '서버에 취향을 저장하지 못했습니다. 다시 시도해주세요.',
                );
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
  };

  return (
    <>
      {renderScreen()}
      <CoursePreferenceModal
        visible={courseModalCity !== null}
        cityName={courseModalCity?.name ?? ''}
        preferenceTags={
          preferences.answers ? preferenceTagLabels(preferences.answers) : []
        }
        onSelectQuick={() => {
          if (!courseModalCity) return;
          const targetCity = courseModalCity;
          console.log('[HomeStack] onSelectQuick -> navigate to course-quick for:', targetCity.name);
          setCourseModalCity(null);
          push({
            name: 'preference',
            city: targetCity,
            promptMode: 'course-quick',
            initialAnswersOverride: preferences.answers,
          });
        }}
        onSelectEdit={() => {
          if (!courseModalCity) return;
          const targetCity = courseModalCity;
          console.log('[HomeStack] onSelectEdit -> navigate to preferenceEdit for:', targetCity.name);
          setCourseModalCity(null);
          push({
            name: 'preferenceEdit',
            city: targetCity,
            initialAnswersOverride: preferences.answers,
          });
        }}
        onSelectNew={() => {
          if (!courseModalCity) return;
          const targetCity = courseModalCity;
          console.log('[HomeStack] onSelectNew -> navigate to course (fresh) for:', targetCity.name);
          setCourseModalCity(null);
          push({
            name: 'preference',
            city: targetCity,
            promptMode: 'course',
            initialAnswersOverride: null,
            resetAnswers: true,
          });
        }}
        onClose={() => {
          console.log('[HomeStack] modal onClose');
          setCourseModalCity(null);
        }}
      />
    </>
  );
}

export default HomeStack;
