/**
 * 선택형 칩. 단일선택(기간/페이스)·다중선택(무드) 모두에 사용합니다.
 * selected 여부에 따라 다크 채움 / 아웃라인으로 표시됩니다.
 */
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

function Chip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}>
      <Text style={[styles.text, selected ? styles.textOn : styles.textOff]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipOff: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textOn: {
    color: colors.inkText,
  },
  textOff: {
    color: colors.textPrimary,
  },
});

export default Chip;
