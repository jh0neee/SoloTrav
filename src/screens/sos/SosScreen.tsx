/**
 * 비상벨(SOS) 화면.
 *
 *  - 큰 원형 버튼을 누르면 사이렌 상태가 켜지고 배경이 붉게 바뀝니다.
 *    (진동은 바로 동작하고, 실제 사이렌 음원은 오디오 모듈 연동 지점에 TODO 로 두었습니다.)
 *  - 아래에는 현위치 기준으로 가장 가까운 안전 시설을 API 로 받아 보여 주고,
 *    전화 버튼을 누르면 번호가 채워진 통화 화면이 열립니다.
 *
 * 하단 탭바까지 덮어야 해서 일반 화면이 아니라 Modal 로 띄웁니다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SirenIcon, XIcon } from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import { MY_LOCATION } from '../../data/places';
import { sosApi, type SafetyFacility } from '../../api/sos';
import SafetyFacilityCard from './SafetyFacilityCard';

/** 사이렌이 울리는 동안 반복할 진동 패턴 (진동 0.6s / 쉼 0.4s) */
const VIBRATION_PATTERN = [0, 600, 400];

const BUTTON_SIZE = 190;
const FACILITY_LIMIT = 3;

type Props = {
  visible: boolean;
  onClose: () => void;
};

function SosScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const [sirenOn, setSirenOn] = useState(false);
  const [facilities, setFacilities] = useState<SafetyFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 재시도 버튼이 같은 좌표로도 다시 요청하게 만드는 카운터 */
  const [reloadKey, setReloadKey] = useState(0);

  /* ── 안전 시설 조회 ── */
  useEffect(() => {
    if (!visible) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    sosApi
      .safetyFacilities(
        {
          // TODO: geolocation 연동 시 실제 현위치로 교체 (지금은 지도와 같은 임시 좌표)
          latitude: MY_LOCATION.lat,
          longitude: MY_LOCATION.lng,
          limit: FACILITY_LIMIT,
        },
        controller.signal,
      )
      .then(items => {
        if (controller.signal.aborted) {
          return;
        }
        setFacilities(items);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err.message || '안전 시설을 불러오지 못했어요.');
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, [visible, reloadKey]);

  /* ── 사이렌 진동 ── */
  useEffect(() => {
    if (!sirenOn) return;
    // TODO: 음원 재생 모듈(react-native-sound 등) 연동 시 여기서 사이렌 사운드도 함께 시작
    Vibration.vibrate(VIBRATION_PATTERN, true);
    return () => Vibration.cancel();
  }, [sirenOn]);

  /** 화면을 닫을 때는 사이렌도 반드시 함께 끕니다. */
  const handleClose = useCallback(() => {
    setSirenOn(false);
    Vibration.cancel();
    onClose();
  }, [onClose]);

  // 안드로이드 하드웨어 back — 사이렌이 켜져 있으면 먼저 끄고, 그 다음에 닫습니다.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sirenOn) {
        setSirenOn(false);
        return true;
      }
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, sirenOn, handleClose]);

  const background = sirenOn ? colors.sosActiveBg : colors.sosIdleBg;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 헤더 — 제목은 가운데, 닫기 버튼은 우측 상단 */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>비상벨</Text>
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="비상벨 닫기">
            <XIcon color={colors.inkText} size={20} weight="bold" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.headline}>
            {sirenOn
              ? '사이렌이 울리고 있어요'
              : '버튼을 누르면 큰 소리로 사이렌이 울려요'}
          </Text>
          <Text style={styles.subhead}>
            {sirenOn
              ? '다시 누르면 꺼져요'
              : '주변에 위험을 알리고 주의를 끌 수 있어요'}
          </Text>

          <View style={styles.buttonArea}>
            <PulseRing size={BUTTON_SIZE + 62} delay={0} />
            <PulseRing size={BUTTON_SIZE + 62} delay={900} />
            <Pressable
              onPress={() => setSirenOn(prev => !prev)}
              style={({ pressed }) => [
                styles.sirenButton,
                sirenOn ? styles.sirenButtonOn : styles.sirenButtonOff,
                pressed && styles.sirenButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: sirenOn }}
              accessibilityLabel={sirenOn ? '비상벨 끄기' : '비상벨 울리기'}>
              <SirenIcon
                color={sirenOn ? colors.sosActiveBg : colors.inkText}
                size={30}
                weight="fill"
              />
              <Text
                style={[styles.sirenLabel, sirenOn && styles.sirenLabelOn]}>
                {sirenOn ? '벨 끄기' : '비상벨 울리기'}
              </Text>
            </Pressable>
          </View>

          <SafetyFacilityCard
            facilities={facilities}
            loading={loading}
            error={error}
            active={sirenOn}
            onRetry={() => setReloadKey(prev => prev + 1)}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

/** 버튼 주변으로 계속 퍼져 나가는 파장 링 (delay 로 두 겹을 엇갈리게 겹칩니다) */
function PulseRing({ size, delay }: { size: number; delay: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // 다음 바퀴를 위해 즉시 처음으로 되돌립니다.
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 0],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.86, 1.24],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.inkText,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  headline: {
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '800',
    color: colors.inkText,
    textAlign: 'center',
  },
  subhead: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    color: colors.sosTextMuted,
    textAlign: 'center',
  },
  buttonArea: {
    height: BUTTON_SIZE + 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.sosRing,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sirenButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  sirenButtonOff: {
    backgroundColor: colors.danger,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  sirenButtonOn: {
    backgroundColor: colors.background,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  sirenButtonPressed: {
    opacity: 0.88,
  },
  sirenLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.inkText,
  },
  sirenLabelOn: {
    color: colors.sosActiveBg,
  },
});

export default SosScreen;
