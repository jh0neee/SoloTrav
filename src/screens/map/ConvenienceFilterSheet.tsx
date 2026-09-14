import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ToiletIcon } from 'phosphor-react-native';
import BottomSheet from '../../components/BottomSheet';
import { colors } from '../../theme/colors';

export const CONVENIENCE_FILTER = {
  key: 'toilet' as const,
  label: '공중화장실',
  markerLabel: '화장실',
  description: '가까운 공중화장실 위치를 확인해요',
  color: '#0891b2',
  Icon: ToiletIcon,
};

type Props = {
  visible: boolean;
  selected: boolean;
  onToggle: () => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
};

export default function ConvenienceFilterSheet({
  visible,
  selected,
  onToggle,
  onClear,
  onApply,
  onClose,
}: Props) {
  const { label, description, color, Icon } = CONVENIENCE_FILTER;
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.42]}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>편의시설</Text>
          <Text style={styles.subtitle}>
            여행 중 필요한 주변 시설을 확인하세요
          </Text>
        </View>
      }
    >
      <Text style={styles.sectionTitle}>생활 편의</Text>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={[styles.option, selected && styles.optionOn]}
      >
        <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
          <Icon color={color} size={21} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.optionTitle}>{label}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          style={styles.clearButton}
        >
          <Text style={styles.clearText}>전체 해제</Text>
        </Pressable>
        <Pressable
          onPress={onApply}
          accessibilityRole="button"
          style={styles.applyButton}
        >
          <Text style={styles.applyText}>적용</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { marginTop: 5, fontSize: 13, color: colors.textSecondary },
  sectionTitle: {
    marginLeft: 4,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  optionOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  copy: { flex: 1, marginLeft: 12 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  description: { marginTop: 3, fontSize: 11, color: colors.textSecondary },
  check: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 7,
  },
  checkOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  clearButton: {
    height: 48,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  clearText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  applyButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  applyText: { fontSize: 15, fontWeight: '700', color: colors.textOnPrimary },
});
