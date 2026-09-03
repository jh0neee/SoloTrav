/**
 * 채팅 말풍선.
 *
 *   샛별이 : 왼쪽 흰 말풍선. 결과를 기다리는 동안에는 클로드 스타일 Thinking UI.
 *   사용자 : 오른쪽 골드/블루 말풍선.
 *
 * 코스가 딸린 답변이면 말풍선 아래에 CourseCard 를 붙입니다.
 * 답변 불가 상태(fallback)에는 친절한 안내와 함께 하단에 추천 질문 칩을 배치합니다.
 * 네트워크 실패 답변에는 '다시 시도' 버튼을 답니다.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CourseCard from './CourseCard';
import ThinkingIndicator from './ThinkingIndicator';
import { colors } from '../../theme/colors';
import type { ChatMessage } from '../../types/assistant';

type Props = {
  message: ChatMessage;
  /** 추천 칩 탭 시 질문을 전송하는 콜백 */
  onSelectPrompt?: (prompt: string) => void;
  /** 입력 대기/처리 중 여부 (칩 비활성화) */
  disabledPrompt?: boolean;
  /** 실패한 말풍선에서 누르는 다시 시도. 없으면 버튼을 감춥니다 */
  onRetry?: () => void;
  /** 생성된 AI 답변을 개발자에게 신고합니다. */
  onReport?: () => void;
};

function ChatBubble({
  message,
  onSelectPrompt,
  disabledPrompt = false,
  onRetry,
  onReport,
}: Props) {
  const isUser = message.role === 'user';
  const isPending = message.state === 'pending';
  const isFailed = message.state === 'failed';
  const isFallback = message.isFallback;

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
        // 코스 타임라인이나 추천 칩 영역은 좁으면 읽기 힘들어 넓게 씁니다.
        message.course || (message.suggestedPrompts && message.suggestedPrompts.length > 0)
          ? styles.rowWide
          : null,
      ]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
          isFailed && !isFallback && styles.bubbleFailed,
          isFallback && styles.bubbleFallback,
        ]}>
        {isPending ? (
          <ThinkingIndicator />
        ) : (
          <Text
            style={[
              styles.text,
              isUser ? styles.textUser : styles.textBot,
            ]}>
            {message.text}
          </Text>
        )}
      </View>

      {/* 답변 불가 시 안내 아래에 바로 질문을 바꿀 수 있는 추천 칩 목록 */}
      {message.suggestedPrompts && message.suggestedPrompts.length > 0 ? (
        <View style={styles.suggestedContainer}>
          <Text style={styles.suggestedTitle}>추천 질문으로 바로 물어보세요</Text>
          <View style={styles.suggestedRow}>
            {message.suggestedPrompts.map(item => (
              <Pressable
                key={item.label}
                onPress={() => onSelectPrompt?.(item.prompt)}
                disabled={disabledPrompt}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={[
                  styles.suggestedChip,
                  disabledPrompt && styles.suggestedChipDisabled,
                ]}>
                <Text style={styles.suggestedChipText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* 통신 실패 시 보조 다시 시도 버튼 */}
      {isFailed && onRetry && !isFallback ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={styles.retryButton}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      ) : null}

      {message.course ? (
        <CourseCard course={message.course} requestId={message.requestId} />
      ) : null}

      {!isUser && !isPending && !isFailed && onReport ? (
        <Pressable
          onPress={onReport}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="AI 답변 신고"
          style={styles.reportButton}>
          <Text style={styles.reportText}>이 답변 신고</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 14,
    maxWidth: '86%',
  },
  rowBot: {
    alignSelf: 'flex-start',
  },
  rowWide: {
    maxWidth: '100%',
    width: '100%',
  },
  rowUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleBot: {
    backgroundColor: colors.chatBotBubble,
    borderTopLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: colors.chatUserBubble,
    borderTopRightRadius: 6,
  },
  bubbleFailed: {
    backgroundColor: colors.dangerSoft,
  },
  bubbleFallback: {
    backgroundColor: colors.chatBotBubble,
    borderWidth: 1,
    borderColor: 'rgba(46, 144, 250, 0.3)',
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
  },
  textBot: {
    color: colors.chatBotText,
  },
  textUser: {
    color: colors.chatUserText,
    fontWeight: '500',
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.chatStarterBorder,
    backgroundColor: colors.chatStarterBg,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.chatStarterText,
  },
  suggestedContainer: {
    marginTop: 10,
    alignSelf: 'flex-start',
    width: '100%',
  },
  suggestedTitle: {
    fontSize: 11,
    color: colors.chatHeaderSub,
    fontWeight: '500',
    marginBottom: 7,
    marginLeft: 4,
  },
  suggestedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.chatStarterBorder,
    backgroundColor: colors.chatStarterBg,
  },
  suggestedChipDisabled: {
    opacity: 0.45,
  },
  suggestedChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.chatStarterText,
  },
  reportButton: {
    alignSelf: 'flex-end',
    marginTop: 7,
    paddingVertical: 4,
  },
  reportText: {
    fontSize: 11,
    color: colors.chatHeaderSub,
    textDecorationLine: 'underline',
  },
});

export default ChatBubble;
