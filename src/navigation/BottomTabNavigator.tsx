/**
 * 외부 의존성 없는 자체 하단 탭 네비게이터.
 * - 떠 있는 둥근 알약형 탭바.
 * - 가운데(샛별이) 탭은 볼록 튀어나온 금색 마스코트 버튼.
 * - 탭 목록은 ./tabs.ts 에서 관리합니다.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Mascot } from '../components/icons/TabIcons';
import { TABS, type TabItem, type TabKey } from './tabs';

function BottomTabNavigator() {
  const [activeKey, setActiveKey] = useState<TabKey>(TABS[0].key);
  const insets = useSafeAreaInsets();

  const activeTab = TABS.find(tab => tab.key === activeKey) ?? TABS[0];
  const ActiveScreen = activeTab.component;

  return (
    <View style={styles.container}>
      {/* 현재 선택된 화면 */}
      <View style={styles.screen}>
        <ActiveScreen />
      </View>

      {/* 떠 있는 하단 탭바 */}
      <View style={[styles.tabBarWrap, { paddingBottom: (insets.bottom || 10) }]}>
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
    </View>
  );
}

type TabProps = {
  tab: TabItem;
  focused: boolean;
  onPress: () => void;
};

/** 일반 탭 — 아이콘 + 라벨 */
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
      {Icon ? <Icon color={color} size={24} /> : null}
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

/** 가운데 탭 — 볼록 튀어나온 샛별이 마스코트 */
function CenterTab({ tab, focused, onPress }: TabProps) {
  return (
    <Pressable
      style={styles.centerItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}>
      <View style={styles.mascotWrap}>
        <View style={styles.mascotGlow} />
        <Mascot size={54} />
      </View>
      <Text style={[styles.tabLabel, styles.centerLabel]} numberOfLines={1}>
        {tab.label}
      </Text>
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
  tabBarWrap: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 66,
    backgroundColor: colors.tabBarBackground,
    borderRadius: 33,
    paddingHorizontal: 8,
    // 부드러운 그림자 (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    // Android
    elevation: 12,
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
    shadowRadius: 10,
    elevation: 8,
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
