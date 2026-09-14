import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ToiletIcon } from 'phosphor-react-native';
import BottomSheet from '../../components/BottomSheet';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 공공데이터 연결 전에 분류와 화면 구조를 먼저 확인하기 위한 편의시설 시트입니다.
 * 실제 선택 상태와 개수는 공중화장실 API를 연결할 때 추가합니다.
 */
export default function ConvenienceFilterSheet({ visible, onClose }: Props) {
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
      <View
        accessibilityRole="checkbox"
        accessibilityState={{ checked: false, disabled: true }}
        style={[styles.option, styles.optionDisabled]}
      >
        <View style={styles.icon}>
          <ToiletIcon color="#0891b2" size={21} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.optionTitle}>공중화장실</Text>
          <Text style={styles.description}>
            가까운 공중화장실 위치를 확인해요
          </Text>
        </View>
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingText}>연결 예정</Text>
        </View>
      </View>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>확인</Text>
      </Pressable>
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
  optionDisabled: { opacity: 0.62 },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#0891b218',
  },
  copy: { flex: 1, marginLeft: 12 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  description: { marginTop: 3, fontSize: 11, color: colors.textSecondary },
  upcomingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  upcomingText: { fontSize: 10, fontWeight: '700', color: colors.textTertiary },
  closeButton: {
    height: 48,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  closeText: { fontSize: 15, fontWeight: '700', color: colors.textOnPrimary },
});
