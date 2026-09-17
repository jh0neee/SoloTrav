import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import { CITIES, type City } from '../../data/cities';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: City | null) => void;
};
export default function RegionSelectSheet({
  visible,
  onClose,
  onSelect,
}: Props) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={[0.58, 0.85]}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>어디로 떠나볼까요?</Text>
          <Text style={styles.description}>충북 여행 지역을 선택해 주세요</Text>
        </View>
      }
    >
      <View style={styles.grid}>
        <Pressable
          accessibilityRole="button"
          style={styles.option}
          onPress={() => onSelect(null)}
        >
          <Text style={styles.label}>충북 전체</Text>
        </Pressable>
        {CITIES.map(city => (
          <Pressable
            key={city.id}
            accessibilityRole="button"
            accessibilityLabel={`${city.sigungu} 지도로 이동`}
            style={styles.option}
            onPress={() => onSelect(city)}
          >
            <Text style={styles.label}>{city.name}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  description: { marginTop: 8, fontSize: 14, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  option: {
    width: '30%',
    minHeight: 48,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
});
