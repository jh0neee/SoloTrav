import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BellRingingIcon,
  FirstAidKitIcon,
  HospitalIcon,
  LampPendantIcon,
  PillIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
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
  markerLabel: string;
  color: string;
  Icon: IconComponent;
}> = [
  {
    key: 'femaleHouse',
    label: '여성안심지킴이집',
    description: '위급할 때 도움을 요청할 수 있어요',
    markerLabel: '여성안심지킴이집',
    color: '#8b5cf6',
    Icon: ShieldCheckIcon,
  },
  {
    key: 'cctv',
    label: 'CCTV',
    description: '방범 카메라 설치 위치를 확인해요',
    markerLabel: 'CCTV',
    color: '#2563eb',
    Icon: VideoCameraIcon,
  },
  {
    key: 'emergencyBell',
    label: '공공 비상벨',
    description: '위급할 때 사용할 수 있는 현장 비상벨이에요',
    markerLabel: '비상벨',
    color: '#f97316',
    Icon: BellRingingIcon,
  },
  {
    key: 'streetlight',
    label: '빛길',
    description: '보안등과 스마트 가로등이 이어지는 밤길이에요',
    markerLabel: '스마트 가로등',
    color: '#f0a91f',
    Icon: LampPendantIcon,
  },
  {
    key: 'securityLight',
    label: '빛길',
    description: '보안등과 스마트 가로등이 이어지는 밤길이에요',
    markerLabel: '보안등',
    color: '#f6c453',
    Icon: LampPendantIcon,
  },
  {
    key: 'hospital',
    label: '병원',
    description: '진료가 필요한 상황에 대비해요',
    markerLabel: '병원',
    color: '#dc4c64',
    Icon: FirstAidKitIcon,
  },
  {
    key: 'clinic',
    label: '의원',
    description: '가까운 동네 의원 위치를 확인해요',
    markerLabel: '의원',
    color: '#e11d48',
    Icon: StethoscopeIcon,
  },
  {
    key: 'pharmacy',
    label: '약국',
    description: '가까운 약국 위치를 확인해요',
    markerLabel: '약국',
    color: '#16a34a',
    Icon: PillIcon,
  },
  {
    key: 'affiliatedClinic',
    label: '부속의료기관',
    description: '기관 안에서 운영하는 의료시설이에요',
    markerLabel: '부속의료기관',
    color: '#0f766e',
    Icon: HospitalIcon,
  },
];

const SECTIONS: Array<{
  title: string;
  keys: SafetyPlaceType[];
}> = [
  {
    title: '긴급·방범',
    keys: ['femaleHouse', 'cctv', 'emergencyBell', 'securityLight'],
  },
  {
    title: '의료',
    keys: ['hospital', 'clinic', 'pharmacy', 'affiliatedClinic'],
  },
];

type Props = {
  visible: boolean;
  selected: SafetyPlaceType[];
  onToggle: (type: SafetyPlaceType) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
};

export default function SafetyFilterSheet({
  visible,
  selected,
  onToggle,
  onClear,
  onApply,
  onClose,
}: Props) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.72, 0.92]}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>도움이 필요할 때</Text>
          <Text style={styles.subtitle}>
            혼자 여행할 때 필요한 시설만 골라 지도에서 확인하세요
          </Text>
        </View>
      }
    >
      <View style={styles.list}>
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.keys.map(key => {
              const filter = SAFETY_FILTERS.find(item => item.key === key)!;
              const on = selected.includes(key);
              const { label, description, color, Icon } = filter;
              return (
                <Pressable
                  key={key}
                  onPress={() => onToggle(key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.option, on && styles.optionOn]}
                >
                  <View
                    style={[styles.icon, { backgroundColor: `${color}18` }]}
                  >
                    <Icon color={color} size={21} />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{label}</Text>
                    <Text style={styles.optionDescription}>{description}</Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
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
  list: { gap: 16 },
  section: { gap: 8 },
  sectionTitle: {
    marginLeft: 4,
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
  optionCopy: { flex: 1, marginLeft: 12 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  optionDescription: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textSecondary,
  },
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
