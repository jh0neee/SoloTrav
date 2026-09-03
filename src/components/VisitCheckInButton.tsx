import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { userApi } from '../api/userApi';
import { toApiError } from '../api/errors';
import { badgeStore } from '../badges/badgeStore';
import { getCurrentPositionOnce } from '../location/useCurrentLocation';
import { colors } from '../theme/colors';

type Props = {
  contentId: string;
  contentTypeId: string;
  lat: number | null;
  lng: number | null;
};

const DEFAULT_RADIUS_METERS = 300;
const FESTIVAL_RADIUS_METERS = 500;
const MAX_ACCURACY_METERS = 150;

function distanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const earthRadius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function VisitCheckInButton({
  contentId,
  contentTypeId,
  lat,
  lng,
}: Props) {
  const [checking, setChecking] = useState(false);

  const checkIn = async () => {
    if (checking) return;
    if (lat === null || lng === null) {
      Alert.alert('방문 인증 불가', '이 장소의 위치 정보가 없습니다.');
      return;
    }

    setChecking(true);
    try {
      const position = await getCurrentPositionOnce();
      if (!position.coords) {
        if (position.status === 'blocked') {
          Alert.alert(
            '위치 권한이 필요해요',
            '설정에서 위치 권한을 허용한 뒤 다시 시도해주세요.',
            [
              { text: '취소', style: 'cancel' },
              { text: '설정 열기', onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert(
            '현재 위치를 확인하지 못했어요',
            '위치 권한과 GPS 상태를 확인한 뒤 다시 시도해주세요.',
          );
        }
        return;
      }

      if (
        position.accuracy !== null &&
        position.accuracy > MAX_ACCURACY_METERS
      ) {
        Alert.alert(
          '위치가 정확하지 않아요',
          '조금 더 열린 장소에서 잠시 후 다시 시도해주세요.',
        );
        return;
      }

      const distance = Math.round(
        distanceMeters(position.coords, { lat, lng }),
      );
      const radius =
        contentTypeId === '15' ? FESTIVAL_RADIUS_METERS : DEFAULT_RADIUS_METERS;
      if (distance > radius) {
        Alert.alert(
          '장소에서 너무 멀리 있어요',
          `장소에서 ${radius}m 이내에 있을 때 인증할 수 있습니다.`,
        );
        return;
      }

      const result = await userApi.checkInPlace({
        contentId,
        contentTypeId,
        distanceMeters: distance,
        verifiedAt: new Date().toISOString(),
      });
      if (!result.checkedIn) {
        Alert.alert('방문 인증 실패', '서버에서 방문을 확인하지 못했습니다.');
        return;
      }
      await badgeStore.reload();

      const earnedNames = result.newlyEarnedBadges
        .map(badge => badge.name)
        .join(', ');
      Alert.alert(
        result.alreadyCheckedIn ? '이미 인증한 장소예요' : '방문 인증 완료',
        earnedNames
          ? `새 배지를 획득했어요: ${earnedNames}`
          : '현재 위치 좌표는 서버에 저장되지 않습니다.',
      );
    } catch (error) {
      Alert.alert('방문 인증 실패', toApiError(error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Pressable
      onPress={checkIn}
      disabled={checking || lat === null || lng === null}
      accessibilityRole="button"
      accessibilityLabel="현재 위치로 방문 인증"
      accessibilityState={{
        disabled: checking || lat === null || lng === null,
      }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        (checking || lat === null || lng === null) && styles.disabled,
      ]}
    >
      {checking ? (
        <ActivityIndicator color={colors.textOnPrimary} size="small" />
      ) : (
        <Text style={styles.label}>방문 인증</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  pressed: { backgroundColor: colors.primaryStrong },
  disabled: { opacity: 0.45 },
  label: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default VisitCheckInButton;
