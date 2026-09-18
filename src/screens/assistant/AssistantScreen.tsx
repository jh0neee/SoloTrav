/**
 * 샛별이 화면 (가운데 탭).
 *
 * 저장된 여행 취향을 바탕으로 AI 가 코스를 만들어 주는 대화 화면입니다.
 * 서버가 결과를 바로 주지 않고 SSE 로 밀어주기 때문에, 요청 상태와 연결은
 * assistantStore 가 들고 있고 이 화면은 그리기만 합니다.
 *
 * 밤하늘 배경 · 흰 말풍선 · 골드 칩으로 다른 탭(밝은 크림 톤)과 구분되는
 * '샛별이만의 공간' 을 만듭니다.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatBubble from './ChatBubble';
import ChatComposer from './ChatComposer';
import StarField from './StarField';
import ModerationSheet, {
  type ReportReason,
} from '../../components/ModerationSheet';
import { Mascot } from '../../components/icons/TabIcons';
import { DotsIcon } from '../../components/icons/UiIcons';
import { assistantStore, useAssistant } from '../../assistant/assistantStore';
import { STARTER_PROMPTS, detectRegionName } from '../../assistant/suggestions';
import { usePreferences } from '../../preferences/preferenceStore';
import { summarizePreferences } from '../../data/preferences';
import { useAuth } from '../../auth/AuthContext';
import { reportApi } from '../../api/reportApi';
import { toApiError } from '../../api/errors';
import { colors } from '../../theme/colors';
import type { ChatMessage } from '../../types/assistant';

/**
 * 첫 인사. 서버에서 오는 답변이 아니라 화면이 항상 먼저 보여주는 말이라
 * 대화 목록(store)에 넣지 않고 여기서 고정으로 그립니다.
 */
const WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-hello',
    role: 'assistant',
    text: '안녕하세요, 혼행 메이트 샛별이예요 ✦ 혼자 여행하며 궁금한 건 뭐든 물어보세요.',
    course: null,
    requestId: null,
    state: 'done',
    createdAt: 0,
  },
  {
    id: 'welcome-guide',
    role: 'assistant',
    text: '혼자 밥 먹을 곳, 주변 안전시설, 혼자 가기 좋은 곳까지 — 안전 데이터를 함께 살펴서 마음 편한 혼행을 도와드릴게요.',
    course: null,
    requestId: null,
    state: 'done',
    createdAt: 0,
  },
];

function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest, logout } = useAuth();
  const { messages, isSending, pending, aiUsage } = useAssistant();
  const preferences = usePreferences();
  const scrollRef = useRef<ScrollView>(null);
  const [reportRequestId, setReportRequestId] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  // 답을 기다리는 동안에는 새 질문을 받지 않습니다.
  const isBusy = isSending || pending !== null;

  // 일일 AI 대화 한도 소진 여부
  const isLimitExceeded = Boolean(
    !isGuest &&
      aiUsage &&
      (!aiUsage.canUseAi ||
        (aiUsage.remainingRequestCount !== null &&
          aiUsage.remainingRequestCount <= 0)),
  );

  // 헤더 상태 표시부 옆에 작게 띄울 보조적인 잔여 횟수 문구
  const usageLabel = React.useMemo(() => {
    if (isGuest || !aiUsage) {
      return null;
    }
    if (aiUsage.remainingRequestCount === null) {
      return '무제한';
    }
    if (aiUsage.remainingRequestCount <= 0 || !aiUsage.canUseAi) {
      return '한도 소진';
    }
    return `오늘 ${aiUsage.remainingRequestCount}회 남음`;
  }, [isGuest, aiUsage]);

  /**
   * 앱이 백그라운드로 가면 스트림을 닫고, 돌아오면 다시 붙습니다.
   * (닫아둔 사이에 끝났다면 attach 가 최종 상태를 조회해 채워 넣습니다)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        assistantStore.attach();
      } else {
        assistantStore.detach();
      }
    });
    return () => subscription.remove();
  }, []);

  // 게스트는 서버가 답을 만들어 주지 않습니다. 같은 샘플이 반복되면 오류처럼 보이므로
  // 보내기 전에 막고 로그인으로 유도합니다.
  const promptGuestLogin = useCallback(() => {
    Alert.alert(
      '로그인이 필요한 기능입니다',
      '샛별이와 대화하려면 로그인이 필요해요.\n로그인하면 내 혼행 스타일에 맞춘 코스를 실시간으로 만들어드려요.',
      [
        { text: '둘러보기 계속', style: 'cancel' },
        { text: '로그인하기', onPress: logout },
      ],
    );
  }, [logout]);

  const handleSend = useCallback(
    (text: string) => {
      if (isGuest) {
        promptGuestLogin();
        return;
      }
      if (isLimitExceeded) {
        Alert.alert(
          '일일 한도 초과',
          '오늘 이용할 수 있는 AI 대화 한도를 모두 사용했습니다. 내일 00:00에 초기화됩니다.',
        );
        return;
      }
      // 문장에 도시 이름이 있으면 그 지역을, 없으면 저장된 취향의 지역을 함께 보냅니다.
      const regionName = detectRegionName(text, preferences.answers);
      assistantStore.send(text, regionName);
    },
    [isGuest, isLimitExceeded, promptGuestLogin, preferences.answers],
  );

  const handleClear = useCallback(() => {
    if (messages.length === 0) {
      return;
    }
    Alert.alert('새 대화를 시작할까요?', '지금까지의 대화가 사라집니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '새 대화',
        style: 'destructive',
        onPress: () => assistantStore.clear(),
      },
    ]);
  }, [messages.length]);

  const preferenceSummary = preferences.answers
    ? summarizePreferences(preferences.answers)
    : null;

  const reportAiResponse = async (
    reason: ReportReason,
    description?: string,
  ) => {
    if (!reportRequestId) {
      return;
    }
    if (isGuest) {
      setReportRequestId(null);
      Alert.alert(
        '로그인이 필요한 기능입니다',
        '신고는 로그인 후 이용할 수 있습니다.',
        [
          { text: '둘러보기 계속', style: 'cancel' },
          { text: '로그인하기', onPress: logout },
        ],
      );
      return;
    }
    setIsReporting(true);
    try {
      await reportApi.create({
        targetType: 'AI_RESPONSE',
        targetId: reportRequestId,
        reason,
        description,
      });
      setReportRequestId(null);
      Alert.alert('신고가 접수됐어요', '더 안전한 답변을 만드는 데 반영하겠습니다.');
    } catch (caught) {
      const err = toApiError(caught);
      if (err.status === 409) {
        Alert.alert('신고 불가', '이미 신고한 답변입니다.');
      } else if (err.status === 429) {
        Alert.alert('신고 제한', '최근 24시간 신고 제한 횟수를 초과했습니다.');
      } else {
        Alert.alert('신고 실패', err.message);
      }
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StarField />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerAvatar}>
          <View style={styles.headerGlow} />
          <Mascot size={34} />
        </View>

        <View style={styles.headerTexts}>
          <Text style={styles.headerTitle}>혼행 메이트 샛별이</Text>
          <View style={styles.headerStatusRow}>
            <View
              style={[styles.statusDot, !isBusy && styles.statusDotIdle]}
            />
            <Text style={styles.headerSubtitle}>
              혼자 여행할 때 24시 동행 · {isBusy ? '응답 중' : '대기 중'}
            </Text>
            {usageLabel ? (
              <View
                style={[
                  styles.usageBadge,
                  isLimitExceeded && styles.usageBadgeEmpty,
                ]}>
                <Text
                  style={[
                    styles.usageBadgeText,
                    isLimitExceeded && styles.usageBadgeTextEmpty,
                  ]}>
                  {usageLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel="새 대화"
          style={styles.headerButton}>
          <DotsIcon color={colors.inkText} size={20} />
        </Pressable>
      </View>

      {/* 대화 */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }>
        {WELCOME_MESSAGES.map(message => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {/* 대화를 아직 시작하지 않았을 때만 보여주는 시작 칩 */}
        {messages.length === 0 ? (
          <View style={styles.starterRow}>
            {STARTER_PROMPTS.map(item => (
              <Pressable
                key={item.label}
                onPress={() => handleSend(item.prompt)}
                disabled={isBusy || isLimitExceeded}
                accessibilityRole="button"
                style={[
                  styles.starterChip,
                  (isBusy || isLimitExceeded) && styles.starterChipOff,
                ]}>
                <Text style={styles.starterChipText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isGuest ? (
          // 게스트 안내 — 대화가 안 되는 이유와 로그인 진입점을 같이 보여줍니다
          <View style={styles.guestNote}>
            <Text style={styles.guestNoteTitle}>
              샛별이와 대화하려면 로그인이 필요해요
            </Text>
            <Text style={styles.guestNoteText}>
              둘러보기 모드에서는 답변을 만들 수 없어요. 로그인하면 내 혼행
              스타일에 맞춘 코스를 실시간으로 만들어드려요.
            </Text>
            <Pressable
              onPress={logout}
              accessibilityRole="button"
              accessibilityLabel="로그인하고 샛별이와 대화하기"
              style={({ pressed }) => [
                styles.guestNoteButton,
                pressed && styles.guestNoteButtonPressed,
              ]}>
              <Text style={styles.guestNoteButtonText}>
                로그인하고 대화하기
              </Text>
            </Pressable>
          </View>
        ) : (
          /* 취향 반영 안내 — 등록 전이면 등록을 권합니다 */
          <View style={styles.preferenceNote}>
            <Text style={styles.preferenceNoteText}>
              {preferenceSummary
                ? `내 혼행 스타일 반영 중 · ${preferenceSummary}`
                : '홈에서 혼행 스타일을 등록하면 더 정확한 코스를 만들어드려요.'}
            </Text>
          </View>
        )}

        {messages.map(message => (
          <ChatBubble
            key={message.id}
            message={message}
            onSelectPrompt={handleSend}
            disabledPrompt={isBusy || isLimitExceeded}
            onRetry={() => assistantStore.retry()}
            onReport={
              message.role === 'assistant' && message.requestId
                ? () => setReportRequestId(message.requestId)
                : undefined
            }
          />
        ))}
      </ScrollView>

      <ModerationSheet
        visible={reportRequestId !== null}
        contentLabel="AI 답변"
        submitting={isReporting}
        onClose={() => setReportRequestId(null)}
        onReportContent={reportAiResponse}
      />

      <ChatComposer
        disabled={isBusy || isLimitExceeded}
        placeholder={
          isLimitExceeded
            ? '오늘 대화 한도를 모두 사용했어요 (00:00 초기화)'
            : undefined
        }
        onSend={handleSend}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.chatBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mascotGlow,
    opacity: 0.4,
  },
  headerTexts: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.inkText,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.chatOnline,
  },
  statusDotIdle: {
    backgroundColor: colors.chatHeaderSub,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.chatHeaderSub,
  },
  usageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginLeft: 2,
  },
  usageBadgeEmpty: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  usageBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  usageBadgeTextEmpty: {
    color: '#FCA5A5',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chatIconButton,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  starterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  starterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.chatStarterBorder,
    backgroundColor: colors.chatStarterBg,
  },
  starterChipOff: {
    opacity: 0.45,
  },
  starterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.chatStarterText,
  },

  preferenceNote: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.chatQuickBg,
  },
  preferenceNoteText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.chatHeaderSub,
  },
  guestNote: {
    alignSelf: 'stretch',
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.chatStarterBg,
    borderWidth: 1,
    borderColor: colors.chatStarterBorder,
    gap: 6,
  },
  guestNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.chatStarterText,
  },
  guestNoteText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.chatHeaderSub,
  },
  guestNoteButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.mascot,
  },
  guestNoteButtonPressed: {
    backgroundColor: colors.mascotDeep,
  },
  guestNoteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mascotFace,
  },
});

export default AssistantScreen;
