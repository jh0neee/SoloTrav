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
import React, { useCallback, useEffect, useRef } from 'react';
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
import { Mascot } from '../../components/icons/TabIcons';
import { DotsIcon } from '../../components/icons/UiIcons';
import { assistantStore, useAssistant } from '../../assistant/assistantStore';
import { STARTER_PROMPTS, detectRegionName } from '../../assistant/suggestions';
import { usePreferences } from '../../preferences/preferenceStore';
import { summarizePreferences } from '../../data/preferences';
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
    text: '안녕하세요, 샛별이예요 ✦ 어떤 여행을 도와드릴까요?',
    course: null,
    state: 'done',
    createdAt: 0,
  },
  {
    id: 'welcome-guide',
    role: 'assistant',
    text: '취향을 알려주시면 안전 데이터까지 함께 살펴서 가장 마음 편한 코스를 만들어드릴게요.',
    course: null,
    state: 'done',
    createdAt: 0,
  },
];

function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { messages, isSending, pending } = useAssistant();
  const preferences = usePreferences();
  const scrollRef = useRef<ScrollView>(null);

  // 답을 기다리는 동안에는 새 질문을 받지 않습니다.
  const isBusy = isSending || pending !== null;

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

  const handleSend = useCallback(
    (text: string) => {
      // 문장에 도시 이름이 있으면 그 지역을, 없으면 저장된 취향의 지역을 함께 보냅니다.
      const regionName = detectRegionName(text, preferences.answers);
      assistantStore.send(text, regionName);
    },
    [preferences.answers],
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

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StarField />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerAvatar}>
          <View style={styles.headerGlow} />
          <Mascot size={34} />
        </View>

        <View style={styles.headerTexts}>
          <Text style={styles.headerTitle}>샛별이</Text>
          <View style={styles.headerStatusRow}>
            <View
              style={[styles.statusDot, !isBusy && styles.statusDotIdle]}
            />
            <Text style={styles.headerSubtitle}>
              24시 동행 가이드 · {isBusy ? '응답 중' : '대기 중'}
            </Text>
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
                disabled={isBusy}
                accessibilityRole="button"
                style={[styles.starterChip, isBusy && styles.starterChipOff]}>
                <Text style={styles.starterChipText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* 취향 반영 안내 — 등록 전이면 등록을 권합니다 */}
        <View style={styles.preferenceNote}>
          <Text style={styles.preferenceNoteText}>
            {preferenceSummary
              ? `내 취향 반영 중 · ${preferenceSummary}`
              : '홈에서 여행 취향을 등록하면 더 정확한 코스를 만들어드려요.'}
          </Text>
        </View>

        {messages.map(message => (
          <ChatBubble
            key={message.id}
            message={message}
            onRetry={() => assistantStore.retry()}
          />
        ))}
      </ScrollView>

      <ChatComposer disabled={isBusy} onSend={handleSend} />
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
    fontWeight: '700',
    color: colors.inkText,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});

export default AssistantScreen;
