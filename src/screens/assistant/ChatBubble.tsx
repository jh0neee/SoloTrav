/**
 * 채팅 말풍선.
 *
 *   샛별이 : 왼쪽 흰 말풍선. 결과를 기다리는 동안에는 문구 + 타이핑 점 3개.
 *   사용자 : 오른쪽 골드 말풍선.
 *
 * 코스가 딸린 답변이면 말풍선 아래에 CourseCard 를 붙입니다.
 * 실패한 답변에는 '다시 시도' 버튼을 답니다.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import CourseCard from './CourseCard';
import { colors } from '../../theme/colors';
import type { ChatMessage } from '../../types/assistant';

/** 응답을 기다리는 동안 순서대로 깜빡이는 점 3개 */
function TypingDots() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 3,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View style={styles.dots}>
      {[0, 1, 2].map(index => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              // 자기 차례(index ~ index+1)에만 진하게 보이도록 구간을 나눕니다.
              opacity: progress.interpolate({
                inputRange: [index, index + 0.5, index + 1, 3],
                outputRange: [0.25, 1, 0.25, 0.25],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

type Props = {
  message: ChatMessage;
  /** 실패한 말풍선에서 누르는 다시 시도. 없으면 버튼을 감춥니다 */
  onRetry?: () => void;
};

function ChatBubble({ message, onRetry }: Props) {
  const isUser = message.role === 'user';
  const isPending = message.state === 'pending';
  const isFailed = message.state === 'failed';

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
        // 코스 타임라인은 좁으면 읽기 힘들어 말풍선보다 넓게 씁니다.
        message.course ? styles.rowWide : null,
      ]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot,
          isFailed && styles.bubbleFailed,
        ]}>
        <Text
          style={[
            styles.text,
            isUser ? styles.textUser : styles.textBot,
            isPending && styles.textPending,
          ]}>
          {message.text}
        </Text>
        {isPending ? <TypingDots /> : null}
      </View>

      {isFailed && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={styles.retryButton}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      ) : null}

      {message.course ? <CourseCard course={message.course} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
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
  textPending: {
    color: colors.chatBubbleMuted,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.chatBubbleMuted,
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
    fontWeight: '700',
    color: colors.chatStarterText,
  },
});

export default ChatBubble;
