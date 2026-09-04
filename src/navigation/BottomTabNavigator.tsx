/**
 * 외부 의존성 없는 자체 하단 탭 네비게이터.
 * - 화면 하단에 붙는 납작한 탭바 (라운드·그림자 없음, 상단 얇은 구분선).
 * - 가운데(샛별이) 탭은 볼록 튀어나온 금색 마스코트 버튼.
 * - 탭 목록은 ./tabs.ts 에서 관리합니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Mascot } from '../components/icons/TabIcons';
import { TABS, type TabItem } from './tabs';
import { useActiveTab } from './useActiveTab';
import {
  TabBarVisibilityProvider,
  useTabBarVisibility,
} from './TabBarVisibilityContext';

function BottomTabNavigator() {
  return (
    <TabBarVisibilityProvider>
      <BottomTabNavigatorInner />
    </TabBarVisibilityProvider>
  );
}

function BottomTabNavigatorInner() {
  // 어느 탭이 켜져 있는지는 ./useActiveTab 이 정합니다.
  // 앱은 지역 상태, 웹은 주소창(/record, /my …) 과 이어진 구현으로 교체됩니다.
  const [activeKey, setActiveKey] = useActiveTab();
  const insets = useSafeAreaInsets();
  const { isTabBarHidden } = useTabBarVisibility();

  const activeTab = TABS.find(tab => tab.key === activeKey) ?? TABS[0];
  const ActiveScreen = activeTab.component;

  return (
    <View style={styles.container}>
      {/* 현재 선택된 화면 — 모든 화면이 상태바 아래까지 그려집니다.
          상단 여백은 각 화면이 useSafeAreaInsets 로 직접 처리합니다. */}
      <View style={styles.screen}>
        <ActiveScreen
          onBack={() => setActiveKey('home')}
          onOpenMy={() => setActiveKey('my')}
        />
      </View>

      {/* 하단 탭바 — 로딩 등 전체 화면 모드일 때 숨김 */}
      {!isTabBarHidden && (
        <View style={[styles.tabBarWrap, { paddingBottom: insets.bottom }]}>
          <View style={styles.tabBar}>
            {TABS.map(tab =>
              tab.variant === 'center' ? (
                <CenterTab
                  key={tab.key}
                  tab={tab}
                  focused={tab.key === activeKey}
                  onPress={() => setActiveKey(tab.key)}
                />
              ) : (
                <DefaultTab
                  key={tab.key}
                  tab={tab}
                  focused={tab.key === activeKey}
                  onPress={() => setActiveKey(tab.key)}
                />
              ),
            )}
          </View>
        </View>
      )}
    </View>
  );
}

type TabProps = {
  tab: TabItem;
  focused: boolean;
  onPress: () => void;
};

/** 일반 탭 — 아이콘 + 라벨. 선택 시 색과 선 굵기로만 강조합니다(채우지 않습니다). */
function DefaultTab({ tab, focused, onPress }: TabProps) {
  const color = focused ? colors.tabActive : colors.tabInactive;
  const Icon = tab.Icon;
  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}>
      {Icon ? (
        <Icon color={color} size={24} weight={focused ? 'bold' : 'regular'} />
      ) : null}
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

/** 가운데 탭 — 볼록 튀어나온 샛별이 마스코트 */
function CenterTab({ tab, focused, onPress }: TabProps) {
  const focusProgress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: focused ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focusProgress, focused]);

  return (
    <Pressable
      style={styles.centerItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}>
      <Animated.View
        style={[
          styles.mascotWrap,
          {
            transform: [
              {
                translateY: focusProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 30],
                }),
              },
              {
                scale: focusProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 48 / 54],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.mascotGlow} />
        <Mascot size={54} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          styles.centerLabel,
          {
            opacity: focusProgress.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [1, 0, 0],
            }),
          },
        ]}
        numberOfLines={1}>
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  // 카카오맵처럼 화면 하단에 붙는 납작한 바 (라운드·그림자 없음)
  tabBarWrap: {
    backgroundColor: colors.tabBarBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    backgroundColor: colors.tabBarBackground,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  // 가운데 탭
  centerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: 8,
  },
  mascotWrap: {
    position: 'absolute',
    top: -26,
    alignItems: 'center',
    justifyContent: 'center',
    // 마스코트 자체 그림자
    shadowColor: colors.mascotDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 1,
  },
  mascotGlow: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.mascotGlow,
    opacity: 0.55,
  },
  centerLabel: {
    color: colors.mascotDeep,
    fontWeight: '600',
  },
});

export default BottomTabNavigator;
