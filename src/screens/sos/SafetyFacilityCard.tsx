/**
 * "가장 가까운 안전 시설" 카드 — 비상벨 화면 아래쪽에 붙습니다.
 * 오른쪽 원형 버튼을 누르면 기기 통화 화면이 번호가 채워진 채로 열립니다.
 */
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FirstAidIcon,
  MapPinAreaIcon,
  PhoneCallIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  type Icon,
} from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import type { SafetyFacility, SafetyFacilityType } from '../../api/sos';

const TYPE_ICON: Record<SafetyFacilityType, Icon> = {
  police: ShieldCheckIcon,
  store: StorefrontIcon,
  medical: FirstAidIcon,
  etc: MapPinAreaIcon,
};

/** tel: 스킴에는 숫자와 +, * , # 만 남깁니다 (하이픈·공백이 섞이면 기기에 따라 무시됩니다). */
function toDialNumber(phone: string) {
  return phone.replace(/[^\d+*#]/g, '');
}

type Props = {
  facilities: SafetyFacility[];
  loading: boolean;
  error: string | null;
  /** 사이렌이 울리는 중이면 붉은 배경 위에 얹히므로 카드 톤을 바꿉니다. */
  active: boolean;
  onRetry: () => void;
};

function SafetyFacilityCard({
  facilities,
  loading,
  error,
  active,
  onRetry,
}: Props) {
  const handleCall = useCallback(async (facility: SafetyFacility) => {
    if (!facility.phone) return;
    const url = `tel:${toDialNumber(facility.phone)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('전화를 걸 수 없어요', `${facility.name} ${facility.phone}`);
    }
  }, []);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: active ? colors.sosActiveCard : colors.sosIdleCard },
      ]}>
      <Text style={styles.cardTitle}>가장 가까운 안전 시설</Text>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.inkText} />
          <Text style={styles.stateText}>주변 안전 시설을 찾고 있어요</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable
            onPress={onRetry}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="다시 불러오기">
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : facilities.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>주변에서 찾은 안전 시설이 없어요</Text>
        </View>
      ) : (
        facilities.map((facility, index) => {
          const Icon = TYPE_ICON[facility.type];
          const meta = [facility.distanceText, facility.walkTimeText]
            .filter(Boolean)
            .join(' · ');
          return (
            <View
              key={facility.id}
              style={[styles.row, index > 0 && styles.rowGap]}>
              <View style={styles.iconBadge}>
                <Icon color={colors.gold} size={20} weight="fill" />
              </View>

              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {facility.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>

              {facility.phone ? (
                <Pressable
                  onPress={() => handleCall(facility)}
                  style={({ pressed }) => [
                    styles.callButton,
                    pressed && styles.callButtonPressed,
                  ]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`${facility.name}에 전화 걸기`}>
                  <PhoneCallIcon
                    color={colors.inkText}
                    size={20}
                    weight="fill"
                  />
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.goldSoft,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowGap: {
    marginTop: 14,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(227,178,92,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.inkText,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.sosTextMuted,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  stateBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.sosTextMuted,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkText,
  },
});

export default SafetyFacilityCard;
