/**
 * 하단 탭 구성 정의.
 * 탭을 추가·수정·재정렬하려면 이 배열만 바꾸면 됩니다.
 * - variant 'center' 탭은 가운데 볼록 튀어나온 샛별이 버튼으로 렌더링됩니다.
 */
import type { ComponentType } from 'react';
import HomeStack from './HomeStack';
import MapScreen from '../screens/map/MapScreen';
import AssistantScreen from '../screens/AssistantScreen';
import RecordScreen from '../screens/RecordScreen';
import MyScreen from '../screens/MyScreen';
import {
  HomeIcon,
  MapIcon,
  RecordIcon,
  ProfileIcon,
} from '../components/icons/TabIcons';

type IconComponent = ComponentType<{ color: string; size?: number }>;

export type TabKey = 'home' | 'map' | 'assistant' | 'record' | 'my';

export type TabItem = {
  key: TabKey;
  label: string;
  variant: 'default' | 'center';
  component: ComponentType;
  Icon?: IconComponent; // center 탭은 마스코트를 쓰므로 아이콘이 없습니다.
};

export const TABS: TabItem[] = [
  { key: 'home', label: '홈', variant: 'default', component: HomeStack, Icon: HomeIcon },
  { key: 'map', label: '지도', variant: 'default', component: MapScreen, Icon: MapIcon },
  { key: 'assistant', label: '샛별이', variant: 'center', component: AssistantScreen },
  { key: 'record', label: '기록', variant: 'default', component: RecordScreen, Icon: RecordIcon },
  { key: 'my', label: '마이', variant: 'default', component: MyScreen, Icon: ProfileIcon },
];
