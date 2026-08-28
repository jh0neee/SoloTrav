import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FirstAidKitIcon,
  ForkKnifeIcon,
  LampPendantIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
} from 'phosphor-react-native';
import BottomSheet from '../../components/BottomSheet';
import type { SafetyPlaceType } from '../../api/safetyPlaceApi';
import { colors } from '../../theme/colors';

type IconComponent = React.ComponentType<{ color: string; size?: number }>;

export const SAFETY_FILTERS: Array<{
  key: SafetyPlaceType;
  label: string;
  description: string;
  glyph: string;
  color: string;
  Icon: IconComponent;
}> = [
  {
    key: 'hospital',
    label: '병·의원',
    description: '진료가 필요한 상황에 대비해요',
    glyph: '+',
    color: '#dc4c64',
    Icon: FirstAidKitIcon,
  },
  {
    key: 'femaleHouse',
    label: '여성 안심이 집',
    description: '위급할 때 도움을 요청할 수 있어요',
    glyph: '안',
    color: '#8b5cf6',
    Icon: ShieldCheckIcon,
  },
  {
    key: 'cctv',
    label: 'CCTV',
    description: '방범 카메라 설치 위치를 확인해요',
    glyph: 'C',
    color: '#2563eb',
    Icon: VideoCameraIcon,
  },
  {
    key: 'streetlight',
    label: '스마트 가로등',
    description: '야간에 밝고 안전한 길을 찾기 쉬워요',
    glyph: '빛',
    color: '#e59b18',
    Icon: LampPendantIcon,
  },
  {
    key: 'food',
    label: '음식업소',
    description: '가까운 충북 음식업소를 확인해요',
    glyph: '식',
    color: '#e06a3b',
    Icon: ForkKnifeIcon,
  },
];

type Props = {
  visible: boolean;
  selected: SafetyPlaceType[];
  counts: Record<SafetyPlaceType, number>;
  loadingTypes: SafetyPlaceType[];
  onToggle: (type: SafetyPlaceType) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
};

export default function SafetyFilterSheet({
  visible,
  selected,
  counts,
  loadingTypes,
  onToggle,
  onClear,
  onApply,
  onClose,
}: Props) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.66]}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>안전시설</Text>
          <Text style={styles.subtitle}>
            현재 지도 화면에 보이는 장소 수예요
          </Text>
        </View>
      }
    >
      <View style={styles.list}>
        {SAFETY_FILTERS.map(({ key, label, description, color, Icon }) => {
          const on = selected.includes(key);
          return (
            <Pressable
              key={key}
              onPress={() => onToggle(key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.option, on && styles.optionOn]}
            >
              <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
                <Icon color={color} size={21} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{label}</Text>
                <Text style={styles.optionDescription}>{description}</Text>
              </View>
              <View style={styles.countBox}>
                {loadingTypes.includes(key) ? (
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                ) : (
                  <Text style={styles.countText}>{counts[key]}곳</Text>
                )}
              </View>
              <View style={[styles.check, on && styles.checkOn]}>
                {on && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
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
          <Text style={styles.applyText}>
            {selected.length ? `${selected.length}개 시설 보기` : '적용하기'}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { marginTop: 5, fontSize: 13, color: colors.textSecondary },
  list: { gap: 8 },
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
  optionCopy: { flex: 1, marginLeft: 12 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  optionDescription: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textSecondary,
  },
  countBox: { minWidth: 42, alignItems: 'flex-end', marginRight: 10 },
  countText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
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
