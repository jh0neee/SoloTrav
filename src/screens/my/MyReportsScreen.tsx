/**
 * 내 신고 목록 및 처리 결과 화면.
 *
 * 마이페이지에서 "신고 내역"을 누르면 열리며,
 * 사용자가 접수한 신고의 상태와 처리 결과를 확인할 수 있습니다.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Chevron } from '../../components/icons/UiIcons';
import { reportApi } from '../../api/reportApi';
import { toApiError } from '../../api/errors';
import type { ReportReason, ReportTargetType, UserReport } from '../../types/report';

type Props = {
  onBack: () => void;
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  POST: '여행 기록',
  COMMENT: '댓글',
  AI_RESPONSE: 'AI 답변',
  USER: '사용자',
};

const REASON_LABELS: Record<ReportReason, string> = {
  HARASSMENT: '괴롭힘 또는 따돌림',
  SEXUAL: '음란하거나 선정적인 콘텐츠',
  HATE: '혐오 또는 차별 표현',
  VIOLENCE: '폭력적이거나 위험한 콘텐츠',
  PRIVACY: '개인정보 노출',
  SPAM: '스팸 또는 광고',
  OTHER: '기타 부적절한 콘텐츠',
};

function formatReportDate(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function MyReportsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setStatus(prev => (prev === 'ready' ? 'ready' : 'loading'));
    setError(null);
    try {
      const result = await reportApi.list({ page: 1, limit: 20 });
      setReports(result.items);
      setStatus('ready');
    } catch (caught) {
      setError(toApiError(caught).message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const renderStatusBadge = (reportStatus: string) => {
    const upper = reportStatus.toUpperCase();
    if (upper === 'RESOLVED') {
      return (
        <View style={[styles.badge, styles.badgeResolved]}>
          <Text style={[styles.badgeText, styles.badgeTextResolved]}>조치 완료</Text>
        </View>
      );
    }
    if (upper === 'REJECTED') {
      return (
        <View style={[styles.badge, styles.badgeRejected]}>
          <Text style={[styles.badgeText, styles.badgeTextRejected]}>처리 불가</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeOpen]}>
        <Text style={[styles.badgeText, styles.badgeTextOpen]}>접수됨</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: UserReport }) => {
    const targetLabel = TARGET_LABELS[item.targetType] ?? '콘텐츠';
    const reasonLabel = REASON_LABELS[item.reason] ?? '부적절한 콘텐츠';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetBadgeText}>{targetLabel}</Text>
          </View>
          {renderStatusBadge(item.status)}
        </View>

        <Text style={styles.reasonText}>{reasonLabel}</Text>

        {item.description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        ) : null}

        {item.resolution ? (
          <View style={styles.resolutionBox}>
            <Text style={styles.resolutionLabel}>조치 내용</Text>
            <Text style={styles.resolutionText}>{item.resolution}</Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {formatReportDate(item.createdAt)} 접수
            {item.resolvedAt ? ` · ${formatReportDate(item.resolvedAt)} 완료` : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View
        style={[
          styles.header,
          { height: 60 + insets.top, paddingTop: insets.top },
        ]}
      >
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>신고 내역</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          reports.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status === 'loading' && reports.length > 0}
            onRefresh={loadReports}
            tintColor={colors.goldDeep}
          />
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.goldDeep} size="large" />
              <Text style={styles.placeholderText}>신고 내역을 불러오는 중이에요</Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>
                {error ?? '신고 내역을 불러오지 못했습니다.'}
              </Text>
              <Pressable
                style={styles.retryBtn}
                onPress={loadReports}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>신고 내역이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                접수하신 신고 및 조치 결과는 이곳에서 확인할 수 있습니다.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listContent: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  targetBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeOpen: {
    backgroundColor: colors.primarySoft,
  },
  badgeTextOpen: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryStrong,
  },
  badgeResolved: {
    backgroundColor: colors.safeBg,
  },
  badgeTextResolved: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.safeText,
  },
  badgeRejected: {
    backgroundColor: colors.surface,
  },
  badgeTextRejected: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  descriptionBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  resolutionBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    gap: 3,
  },
  resolutionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  resolutionText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.ink,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkText,
  },
});

