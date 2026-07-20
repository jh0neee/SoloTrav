/**
 * 모든 화면의 공통 레이아웃 래퍼.
 * 상단 제목/부제목을 받아 일관된 화면 헤더를 렌더링합니다.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

function ScreenContainer({ title, subtitle, children }: Props) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: colors.textSecondary,
  },
  body: {
    flex: 1,
  },
});

export default ScreenContainer;
