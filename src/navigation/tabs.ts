/**
 * 하단 탭 구성 정의.
 * 탭을 추가·수정·재정렬하려면 이 배열만 바꾸면 됩니다.
 * - variant 'center' 탭은 가운데 볼록 튀어나온 샛별이 버튼으로 렌더링됩니다.
 */
import {
  House,
  Map,
  SquarePen,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import AssistantScreen from '../screens/assistant/AssistantScreen';
import MapScreen from '../screens/map/MapScreen';
import MyScreen from '../screens/MyScreen';
import RecordScreen from '../screens/RecordScreen';
import HomeStack from './HomeStack';

export type TabKey = 'home' | 'map' | 'assistant' | 'record' | 'my';

export type TabItem = {
  key: TabKey;
  label: string;
  variant: 'default' | 'center';
  component: ComponentType;
  Icon?: LucideIcon; // center 탭은 마스코트를 쓰므로 아이콘이 없습니다.
};

export const TABS: TabItem[] = [
  {
    key: 'home',
    label: '홈',
    variant: 'default',
    component: HomeStack,
    Icon: House,
  },
  {
    key: 'map',
    label: '지도',
    variant: 'default',
    component: MapScreen,
    Icon: Map,
  },
  {
    key: 'assistant',
    label: '샛별이',
    variant: 'center',
    component: AssistantScreen,
  },
  {
    key: 'record',
    label: '기록',
    variant: 'default',
    component: RecordScreen,
    Icon: SquarePen,
  },
  {
    key: 'my',
    label: '마이',
    variant: 'default',
    component: MyScreen,
    Icon: User,
  },
];
