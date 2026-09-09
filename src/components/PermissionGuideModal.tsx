/**
 * 앱 최초 실행 시 노출되는 '앱 접근권한 안내' 모달.
 *
 * 방송통신위원회 「스마트폰 앱 접근권한 개인정보보호 가이드라인」 및 원스토어 심사 기준 준수.
 * - 필수/선택적 접근권한 구분
 * - 권한 항목별 이용 목적 명시
 * - 선택 권한 거부 시에도 기본 서비스 이용 가능 안내
 * - 접근권한 철회 및 변경 경로 안내
 */
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import {
  APP_PERMISSIONS,
  PERMISSION_SETTINGS_INFO,
  setSeenPermissionGuide,
} from '../config/permissionGuide';
import { ImageIcon, PinIcon, ShieldIcon } from './icons/UiIcons';

type PermissionGuideModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function PermissionGuideModal({
  visible,
  onClose,
}: PermissionGuideModalProps) {
  const insets = useSafeAreaInsets();

  const handleConfirm = async () => {
    await setSeenPermissionGuide();
    onClose();
  };

  const settingPath =
    Platform.OS === 'android'
      ? PERMISSION_SETTINGS_INFO.android
      : PERMISSION_SETTINGS_INFO.ios;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleConfirm}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
        >
          {/* 상단 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerIconCircle}>
              <ShieldIcon color={colors.primary} size={24} />
            </View>
            <Text style={styles.title}>앱 접근권한 안내</Text>
            <Text style={styles.subTitle}>
              혼행등대를 편리하고 안전하게 이용하기 위해{'\n'}다음 권한을 사용하고 있습니다.
            </Text>
          </View>

          {/* 권한 목록 */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 선택적 접근권한 */}
            <View style={styles.section}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>선택적 접근권한</Text>
              </View>

              {APP_PERMISSIONS.map(item => (
                <View key={item.key} style={styles.permissionItem}>
                  <View style={styles.itemIconBox}>
                    {item.icon === 'location' ? (
                      <PinIcon color={colors.primary} size={22} />
                    ) : (
                      <ImageIcon color={colors.primary} size={22} />
                    )}
                  </View>
                  <View style={styles.itemTextBox}>
                    <Text style={styles.itemName}>
                      {item.name}
                      <Text style={styles.optionalTag}> (선택)</Text>
                    </Text>
                    <Text style={styles.itemPurpose}>{item.purpose}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 법적 안내문 */}
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>
                • {PERMISSION_SETTINGS_INFO.notice}
              </Text>
              <Text style={[styles.noticeText, styles.noticeSpacing]}>
                • 권한 변경:{' '}
                <Text style={styles.settingPathText}>{settingPath}</Text>
              </Text>
            </View>
          </ScrollView>

          {/* 확인 버튼 */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="접근권한 안내 확인"
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && styles.confirmButtonPressed,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 12,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  itemTextBox: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  optionalTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  itemPurpose: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  noticeCard: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  noticeText: {
    fontSize: 11.5,
    lineHeight: 16.5,
    color: colors.textSecondary,
  },
  noticeSpacing: {
    marginTop: 6,
  },
  settingPathText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    marginTop: 16,
  },
  confirmButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonPressed: {
    backgroundColor: colors.primaryStrong,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});

