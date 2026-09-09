/**
 * 앱 버전 및 업데이트 상세 화면
 * 
 * - 현재 설치된 앱 버전과 원격 스토어 최신 버전을 비교하여 보여줍니다.
 * - 새 버전이 있을 경우 업데이트 안내 카드 및 스토어 바로가기 버튼을 제공합니다.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron, SparkIcon, ShieldIcon } from '../../components/icons/UiIcons';
import {
  APP_PACKAGE_NAME,
  CURRENT_APP_VERSION,
  checkVersionStatus,
  openAppStore,
  type VersionCheckResult,
} from '../../services/appUpdateService';

type Props = {
  onBack: () => void;
};

export default function AppVersionScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [versionStatus, setVersionStatus] = useState<VersionCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        {/* ── 앱 정보 및 업데이트 상태 ── */}
        <View
          style={[
            styles.versionCard,
            versionStatus?.needsUpdate && styles.updateAvailableCard,
          ]}
        >
          <View style={styles.appHero}>
            <View style={styles.appIconWrapper}>
              <SparkIcon color={colors.primaryStrong} size={36} />
            </View>
            <Text style={styles.appName}>혼행등대</Text>
            <Text style={styles.appSub}>혼자 떠나는 여행을 위한 든든한 동반자</Text>
            <View style={styles.currentVersionBadge}>
              <Text style={styles.currentVersionText}>
                현재 버전 v{CURRENT_APP_VERSION}
              </Text>
            </View>
          </View>

          <View style={styles.statusDivider} />

          {loading ? (
            <View style={styles.statusSection}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingText}>최신 버전 확인 중...</Text>
            </View>
          ) : error || !versionStatus ? (
            <View style={styles.statusSection}>
              <Text style={styles.errorTitle}>버전 정보를 가져올 수 없습니다</Text>
              <Text style={styles.errorSub}>
                네트워크 연결을 확인한 뒤 다시 시도해주세요.
              </Text>
              <Pressable
                style={styles.retryButton}
                onPress={fetchVersion}
                accessibilityRole="button"
                accessibilityLabel="다시 시도"
              >
                <Text style={styles.retryButtonText}>다시 확인하기</Text>
              </Pressable>
            </View>
          ) : versionStatus.needsUpdate ? (
            <View style={[styles.statusSection, styles.updateStatusSection]}>
              <View style={styles.updateCardHeader}>
                <View style={styles.updateBadge}>
                  <Text style={styles.updateBadgeText}>업데이트 가능</Text>
                </View>
                <Text style={styles.latestVersionTitle}>
                  새로운 v{versionStatus.latestVersion} 버전이 출시되었습니다!
                </Text>
              </View>

              {versionStatus.releaseNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>주요 업데이트 내용</Text>
                  <Text style={styles.notesContent}>
                    {versionStatus.releaseNotes}
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.updateActionButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => openAppStore(versionStatus.storeUrl)}
                accessibilityRole="button"
                accessibilityLabel="지금 업데이트하기"
              >
                <Text style={styles.updateActionButtonText}>
                  지금 업데이트하기
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.statusSection, styles.upToDateCard]}>
              <View style={styles.checkIconWrapper}>
                <ShieldIcon color={colors.safeText} size={28} />
              </View>
              <Text style={styles.upToDateTitle}>
                현재 최신 버전을 사용하고 있습니다
              </Text>
              <Text style={styles.upToDateSub}>
                안전하고 새로운 기능을 모두 정상적으로 이용하실 수 있습니다.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.refreshCheckButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={fetchVersion}
                accessibilityRole="button"
                accessibilityLabel="업데이트 다시 확인"
              >
                <Text style={styles.refreshCheckButtonText}>업데이트 다시 확인</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── 상세 메타 정보 ── */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>패키지명</Text>
            <Text style={styles.metaValue}>{APP_PACKAGE_NAME}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>설치 버전</Text>
            <Text style={styles.metaValue}>v{CURRENT_APP_VERSION}</Text>
          </View>
          {versionStatus?.latestVersion ? (
            <>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>최신 출시 버전</Text>
                <Text style={styles.metaValue}>v{versionStatus.latestVersion}</Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
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
    gap: 18,
  },
  versionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  appHero: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  appIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  currentVersionBadge: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentVersionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusDivider: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: colors.border,
  },
  statusSection: {
    padding: 22,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorSub: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  updateAvailableCard: {
    borderColor: colors.primaryBorder,
  },
  updateStatusSection: {
    alignItems: 'stretch',
  },
  updateCardHeader: {
    alignItems: 'center',
    gap: 8,
  },
  updateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  updateBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryStrong,
  },
  latestVersionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  notesBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  updateActionButton: {
    marginTop: 18,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  upToDateCard: {
    alignItems: 'center',
  },
  checkIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.safeBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  upToDateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  upToDateSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  refreshCheckButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshCheckButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  metaSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
});
