import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { OPEN_SOURCE_LIBRARIES } from '../data/openSourceLicenses';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function OpenSourceLicenseModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const handleOpenUrl = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>오픈소스 라이선스</Text>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Text style={styles.closeButtonText}>닫기</Text>
          </Pressable>
        </View>

        {/* 라이브러리 목록 */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.noticeText}>
            혼행등대는 다음의 오픈소스 소프트웨어를 활용하여 개발되었습니다. 각 소프트웨어의 저작권 및 라이선스 고지는 아래와 같습니다.
          </Text>

          {OPEN_SOURCE_LIBRARIES.map((lib, index) => (
            <View key={lib.name} style={styles.libCard}>
              <View style={styles.cardHeader}>
                <View style={styles.titleBox}>
                  <Text style={styles.libName}>{lib.name}</Text>
                  <Text style={styles.libVersion}>v{lib.version}</Text>
                </View>
                <View style={styles.licenseBadge}>
                  <Text style={styles.licenseBadgeText}>{lib.license}</Text>
                </View>
              </View>

              <Text style={styles.libDesc}>{lib.description}</Text>

              {lib.repository ? (
                <Pressable
                  onPress={() => handleOpenUrl(lib.repository)}
                  style={({ pressed }) => [
                    styles.repoLink,
                    pressed && styles.repoLinkPressed,
                  ]}
                >
                  <Text style={styles.repoLinkText} numberOfLines={1}>
                    {lib.repository}
                  </Text>
                </Pressable>
              ) : null}

              {index < OPEN_SOURCE_LIBRARIES.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  closeButtonPressed: {
    opacity: 0.6,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  libCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBox: {
    flex: 1,
  },
  libName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  libVersion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  licenseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  licenseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  libDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 6,
  },
  repoLink: {
    marginTop: 6,
  },
  repoLinkPressed: {
    opacity: 0.6,
  },
  repoLinkText: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
  },
});

