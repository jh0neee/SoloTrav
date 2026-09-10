/**
 * 앱 버전 및 업데이트 정보 화면
 * 
 * - 상단: 공식 로고 및 타이틀
 * - 버전 카드: 현재 버전 / 최신 버전 비교 및 업데이트 액션
 * - 최근 업데이트 카드: 최신 릴리즈 요약 및 전체 내역 보기 모달
 * - 하단: 오픈소스 라이선스 모달 및 이용약관 / 개인정보 처리방침 링크
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron } from '../../components/icons/UiIcons';
import {
  CURRENT_APP_VERSION,
  checkVersionStatus,
  openAppStore,
  type VersionCheckResult,
} from '../../services/appUpdateService';
import { RELEASE_NOTES } from '../../data/releaseNotes';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../config/legal';
import ReleaseHistoryModal from '../../components/ReleaseHistoryModal';
import OpenSourceLicenseModal from '../../components/OpenSourceLicenseModal';

type Props = {
  onBack: () => void;
};

export default function AppVersionScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [versionStatus, setVersionStatus] = useState<VersionCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);

  const latestRelease = RELEASE_NOTES[0];

  const fetchVersion = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await checkVersionStatus();
      if (result) {
        setVersionStatus(result);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  const handleOpenLegalUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* ── 헤더 ── */}
      <View
        style={[
          styles.header,
          { height: 56 + insets.top, paddingTop: insets.top },
        ]}
      >
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>앱 버전 정보</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 상단 앱 히어로 ── */}
        <View style={styles.appHero}>
          <Image
            source={require('../../assets/app_icon.png')}
            style={styles.appLauncherIcon}
            resizeMode="contain"
          />
          <Text style={styles.appName}>혼행등대</Text>
          <Text style={styles.appSub}>혼자 떠나는 여행을 위한 든든한 동반자</Text>
        </View>

        {/* ── 1. 버전 정보 카드 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>버전 정보</Text>
          </View>

          <View style={styles.versionRowsContainer}>
            <View style={styles.versionRow}>
              <Text style={styles.versionRowLabel}>현재 설치 버전</Text>
              <Text style={styles.versionRowValue}>v{CURRENT_APP_VERSION}</Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.versionRow}>
              <Text style={styles.versionRowLabel}>최신 출시 버전</Text>
              <Text style={styles.versionRowValue}>
                v{versionStatus?.latestVersion ?? CURRENT_APP_VERSION}
              </Text>
            </View>
          </View>

          <View style={styles.cardActionDivider} />

          {/* 상태별 액션 영역 */}
          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingText}>최신 버전 확인 중...</Text>
            </View>
          ) : error || !versionStatus ? (
            <View style={styles.statusBox}>
              <Text style={styles.errorText}>버전 정보를 가져올 수 없습니다</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.smallRetryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={fetchVersion}
              >
                <Text style={styles.smallRetryButtonText}>다시 확인</Text>
              </Pressable>
            </View>
          ) : versionStatus.needsUpdate ? (
            <View style={styles.updateAvailableBox}>
              <View style={styles.updateNoticeRow}>
                <View style={styles.updateDot} />
                <Text style={styles.updateNoticeText}>
                  새로운 버전(v{versionStatus.latestVersion})이 있습니다.
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryActionButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => openAppStore(versionStatus.storeUrl)}
              >
                <Text style={styles.primaryActionButtonText}>
                  지금 업데이트하기
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.upToDateBox}>
              <Text style={styles.upToDateText}>최신 버전을 사용 중입니다</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.smallCheckButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={fetchVersion}
              >
                <Text style={styles.smallCheckButtonText}>업데이트 다시 확인</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── 2. 최근 업데이트 내역 카드 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.updateCardTitleRow}>
              <Text style={styles.cardTitle}>최근 업데이트</Text>
              <Text style={styles.updateVersionTag}>{latestRelease.version}</Text>
            </View>
            <Text style={styles.updateDateText}>{latestRelease.date}</Text>
          </View>

          <View style={styles.releaseList}>
            {latestRelease.items.map((item, idx) => (
              <View key={idx} style={styles.releaseItemRow}>
                <Text style={styles.releaseBullet}>•</Text>
                <Text style={styles.releaseItemText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cardActionDivider} />

          <Pressable
            style={({ pressed }) => [
              styles.viewAllHistoryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setHistoryModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="전체 업데이트 내역 보기"
          >
            <Text style={styles.viewAllHistoryButtonText}>
              전체 업데이트 내역 보기
            </Text>
            <Chevron direction="right" color={colors.textSecondary} size={16} />
          </Pressable>
        </View>

        {/* ── 3. 오픈소스 라이선스 버튼 카드 ── */}
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.licenseRow,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setLicenseModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="오픈소스 라이선스 고지 확인"
          >
            <Text style={styles.licenseLabel}>오픈소스 라이선스</Text>
            <Chevron direction="right" color={colors.textSecondary} size={16} />
          </Pressable>
        </View>

        {/* ── 4. 하단 푸터 (약관 링크 & 저작권) ── */}
        <View style={styles.footerSection}>
          <View style={styles.footerLegalLinks}>
            <Pressable
              onPress={() => handleOpenLegalUrl(TERMS_OF_SERVICE_URL)}
              hitSlop={8}
            >
              <Text style={styles.footerLinkText}>이용약관</Text>
            </Pressable>
            <Text style={styles.footerDivider}>|</Text>
            <Pressable
              onPress={() => handleOpenLegalUrl(PRIVACY_POLICY_URL)}
              hitSlop={8}
            >
              <Text style={styles.footerLinkText}>개인정보 처리방침</Text>
            </Pressable>
          </View>
          <Text style={styles.copyrightText}>
            © 2026 SoloTrav. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* ── 전체 업데이트 내역 모달 ── */}
      <ReleaseHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
      />

      {/* ── 오픈소스 라이선스 모달 ── */}
      <OpenSourceLicenseModal
        visible={licenseModalVisible}
        onClose={() => setLicenseModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  appHero: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  appLauncherIcon: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 14,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  appSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  versionRowsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  versionRowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  versionRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 14,
    marginBottom: 12,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  smallRetryButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallRetryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  updateAvailableBox: {
    gap: 10,
  },
  updateNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  updateNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryStrong,
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  upToDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  upToDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.safeText,
  },
  smallCheckButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallCheckButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  updateCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateVersionTag: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  updateDateText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  releaseList: {
    gap: 8,
  },
  releaseItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  releaseBullet: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  releaseItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  viewAllHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  viewAllHistoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  licenseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  footerLegalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLinkText: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerDivider: {
    fontSize: 11,
    color: colors.borderStrong,
  },
  copyrightText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
