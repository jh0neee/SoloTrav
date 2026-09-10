import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { RELEASE_NOTES } from '../data/releaseNotes';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ReleaseHistoryModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.headerTitle}>전체 업데이트 내역</Text>
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

        {/* 내역 목록 */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {RELEASE_NOTES.map((note, index) => {
            const isLatest = index === 0;
            return (
              <View key={note.version} style={styles.noteItem}>
                {/* 버전 & 날짜 헤더 */}
                <View style={styles.versionHeader}>
                  <View style={styles.versionTitleRow}>
                    <Text style={styles.versionNumber}>{note.version}</Text>
                    {isLatest && (
                      <View style={styles.latestTag}>
                        <Text style={styles.latestTagText}>최신</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.releaseDate}>{note.date}</Text>
                </View>

                {/* 항목 목록 */}
                <View style={styles.itemsList}>
                  {note.items.map((item, itemIdx) => (
                    <View key={itemIdx} style={styles.itemRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.itemText}>{item}</Text>
                    </View>
                  ))}
                </View>

                {index < RELEASE_NOTES.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            );
          })}
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
    paddingTop: 20,
  },
  noteItem: {
    marginBottom: 8,
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  versionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  latestTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  latestTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  releaseDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
});

