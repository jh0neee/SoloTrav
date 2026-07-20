/**
 * 샛별이 화면 — AI 여행 도우미와 대화합니다. (가운데 탭)
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { Mascot } from '../components/icons/TabIcons';
import { colors } from '../theme/colors';

function AssistantScreen() {
  return (
    <ScreenContainer title="샛별이" subtitle="무엇이든 물어보세요">
      <View style={styles.hero}>
        <Mascot size={72} />
        <Text style={styles.hello}>안녕하세요, 샛별이예요 ✦</Text>
        <Text style={styles.helloSub}>여행 계획부터 안전 정보까지 도와드릴게요.</Text>
      </View>

      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>“이번 주말 혼자 갈 만한 조용한 여행지 추천해줘”</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  hello: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helloSub: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  bubbleText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default AssistantScreen;
