/**
 * 마이페이지 > 약관 및 정책 > '앱 접근권한 안내' 화면.
 *
 * 정보통신망법 제22조의2 및 방송통신위원회 가이드라인 준수.
 * 사용자가 언제든지 앱의 접근권한 목록, 이용 목적, 변경/철회 방법을 확인하고
 * 단말기 설정으로 바로 이동할 수 있습니다.
 */
import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import {
  APP_PERMISSIONS,
  PERMISSION_SETTINGS_INFO,
} from '../../config/permissionGuide';
import {
  Chevron,
  ImageIcon,
  PinIcon,
  ShieldIcon,
  WarningCircle,
} from '../../components/icons/UiIcons';

export default function PermissionGuideScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      // 일부 환경에서 열 수 없을 경우 무시
    }
  };

  const settingPath =
    Platform.OS === 'android'
      ? PERMISSION_SETTINGS_INFO.android
      : PERMISSION_SETTINGS_INFO.ios;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View
        style={[
          styles.header,
          { height: 60 + insets.top, paddingTop: insets.top },
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
        <Text style={styles.headerTitle}>앱 접근권한 안내</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 안내 박스 */}
        <View style={styles.introCard}>
          <View style={styles.introIconBox}>
            <ShieldIcon color={colors.primary} size={22} />
          </View>
          <View style={styles.introTextBox}>
            <Text style={styles.introTitle}>
              이용자 권리 보호를 위한 접근권한 안내
            </Text>
            <Text style={styles.introDesc}>
              혼행등대는 정보통신망 이용촉진 및 정보보호 등에 관한 법률 제22조의2에
              따라 서비스 제공에 필요한 최소한의 접근권한만 요청하고 있습니다.
            </Text>
          </View>
        </View>

        {/* 1. 필수적 접근권한 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 필수적 접근권한</Text>
          <View style={styles.card}>
            <Text style={styles.noneRequiredText}>
              • 해당 없음 (혼행등대는 필수적 접근권한을 요구하지 않습니다.)
            </Text>
          </View>
        </View>

        {/* 2. 선택적 접근권한 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 선택적 접근권한</Text>
          <View style={styles.card}>
            {APP_PERMISSIONS.map((item, index) => (
              <View key={item.key}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.permissionRow}>
                  <View style={styles.iconCircle}>
                    {item.icon === 'location' ? (
                      <PinIcon color={colors.primary} size={20} />
                    ) : (
                      <ImageIcon color={colors.primary} size={20} />
                    )}
                  </View>
                  <View style={styles.permissionInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.permissionName}>{item.name}</Text>
                      <View style={styles.optionalBadge}>
                        <Text style={styles.optionalBadgeText}>선택</Text>
                      </View>
                    </View>
                    <Text style={styles.purposeLabel}>이용 목적</Text>
                    <Text style={styles.purposeText}>{item.purpose}</Text>
                    {item.consequence && (
                      <Text style={styles.consequenceText}>
                        ※ {item.consequence}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 3. 접근권한 철회 및 변경 방법 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 접근권한 철회 및 변경 방법</Text>
          <View style={styles.card}>
            <Text style={styles.settingIntroText}>
              선택적 접근권한은 동의하지 않아도 기본 서비스를 이용할 수 있으며,
              동의 후에도 단말기 설정 메뉴에서 언제든지 철회 및 재설정하실 수 있습니다.
            </Text>

            <View style={styles.pathBox}>
              <Text style={styles.pathTitle}>설정 경로</Text>
              <Text style={styles.pathContent}>{settingPath}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="기기 권한 설정으로 이동"
              style={({ pressed }) => [
                styles.openSettingsBtn,
                pressed && styles.openSettingsBtnPressed,
              ]}
              onPress={handleOpenSettings}
            >
              <Text style={styles.openSettingsBtnText}>
                기기 권한 설정 바로가기
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 4. 유의사항 */}
        <View style={styles.noticeSection}>
          <View style={styles.noticeHeader}>
            <WarningCircle color={colors.textTertiary} size={16} />
            <Text style={styles.noticeSectionTitle}>유의사항</Text>
          </View>
          <Text style={styles.noticeItem}>
            • 안드로이드 6.0 미만 버전의 경우 선택적 접근권한에 대한 개별 동의가 불가능하므로, 운영체제를 6.0 이상으로 업그레이드하시는 것을 권장합니다.
          </Text>
          <Text style={styles.noticeItem}>
            • 혼행등대는 이용자의 위치 좌표나 개인정보를 임의로 저장하거나 외부에 무단 제공하지 않습니다.
          </Text>
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
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: 16,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    gap: 12,
  },
  introIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  introTextBox: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  introDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noneRequiredText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  permissionInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  permissionName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionalBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  purposeLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 2,
  },
  purposeText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  consequenceText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  settingIntroText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  pathBox: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  pathTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 2,
  },
  pathContent: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primaryStrong,
  },
  openSettingsBtn: {
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openSettingsBtnPressed: {
    backgroundColor: colors.border,
  },
  openSettingsBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noticeSection: {
    paddingHorizontal: 6,
    marginTop: 6,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  noticeSectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  noticeItem: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textTertiary,
    marginBottom: 6,
  },
});

