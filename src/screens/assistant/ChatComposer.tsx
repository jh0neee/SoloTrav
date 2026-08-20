/**
 * 샛별이 입력 영역.
 *
 *   위 : 가로로 넘기는 빠른 질문 칩
 *   아래: + 버튼 · 입력창 · 마이크(입력 없음) / 보내기(입력 있음)
 *
 * 앞 요청의 답을 기다리는 동안에는 입력을 잠급니다. 결과가 어느 질문의
 * 답인지 뒤섞이지 않게 하기 위해서입니다.
 */
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MicIcon, PlusIcon, SendIcon } from '../../components/icons/UiIcons';
import { QUICK_PROMPTS } from '../../assistant/suggestions';
import { colors } from '../../theme/colors';

type Props = {
  /** 답을 기다리는 중 — 입력창과 칩을 모두 잠급니다 */
  disabled: boolean;
  onSend: (text: string) => void;
};

function ChatComposer({ disabled, onSend }: Props) {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) {
      return;
    }
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <View style={styles.container}>
      {/* 빠른 질문 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
        keyboardShouldPersistTaps="handled">
        {QUICK_PROMPTS.map(item => (
          <Pressable
            key={item.label}
            onPress={() => onSend(item.prompt)}
            disabled={disabled}
            accessibilityRole="button"
            style={[styles.quickChip, disabled && styles.quickChipDisabled]}>
            <Text style={styles.quickChipText}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 입력창 */}
      <View style={styles.inputBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="첨부"
          // 사진·위치 첨부는 아직 서버 스펙이 없어 자리만 잡아둡니다.
          disabled
          style={styles.plusButton}>
          <PlusIcon color={colors.textSecondary} size={20} />
        </Pressable>

        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="샛별이에게 무엇이든 물어보세요"
          placeholderTextColor={colors.chatInputPlaceholder}
          editable={!disabled}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={submit}
        />

        {canSend ? (
          <Pressable
            onPress={submit}
            accessibilityRole="button"
            accessibilityLabel="보내기"
            style={styles.sendButton}>
            <SendIcon color={colors.textOnPrimary} size={18} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="음성 입력"
            // 음성 입력은 다음 단계 — 지금은 시안의 자리만 지킵니다.
            disabled
            style={styles.micButton}>
            <MicIcon color={colors.textSecondary} size={18} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
  },
  quickRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.chatQuickBorder,
    backgroundColor: colors.chatQuickBg,
  },
  quickChipDisabled: {
    opacity: 0.45,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.chatQuickText,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 28,
    backgroundColor: colors.chatInputBg,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
    // 여러 줄이어도 입력창이 화면을 다 먹지 않게 상한을 둡니다.
    maxHeight: 96,
    fontSize: 14,
    color: colors.chatBotText,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
});

export default ChatComposer;
