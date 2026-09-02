import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import { colors } from '../../theme/colors';
import {
  TOUR_CATEGORY_COLOR,
  TOUR_CATEGORY_LABEL,
  type TourCategory,
} from '../../types/tourPlace';

const ALL_CATEGORIES: TourCategory[] = [
  'attraction',
  'culture',
  'festival',
  'course',
  'leports',
  'stay',
  'shopping',
  'food',
];

type Props = {
  visible: boolean;
  selected: TourCategory;
  onSelect: (category: TourCategory) => void;
  onClose: () => void;
};

export default function MapDetailFilterSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.48]}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>관광 카테고리</Text>
          <Text style={styles.subtitle}>
            현재 지도 화면에서 확인할 종류를 선택하세요
          </Text>
        </View>
      }
    >
      <View style={styles.grid}>
        {ALL_CATEGORIES.map(category => {
          const active = category === selected;
          const color = TOUR_CATEGORY_COLOR[category];
          return (
            <Pressable
              key={category}
              onPress={() => onSelect(category)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.option, active && styles.optionOn]}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.optionText, active && styles.optionTextOn]}>
                {TOUR_CATEGORY_LABEL[category]}
              </Text>
              {active ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { marginTop: 5, fontSize: 13, color: colors.textSecondary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    width: '48%',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 9 },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionTextOn: { color: colors.primary },
  check: { fontSize: 15, fontWeight: '800', color: colors.primary },
});
