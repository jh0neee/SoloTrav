/**
 * 기존 취향 바탕으로 일부 수정 시 표시되는 '취향 요약 및 수정' 대시보드 화면입니다.
 * 8단계를 일일이 거치지 않고, 한 화면에서 내 전체 취향을 보며 원하는 항목만 즉시 변경할 수 있습니다.
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { City } from '../../data/cities';
import {
  createInitialAnswers,
  getFirstMissingRequiredFieldInSteps,
  PREFERENCE_STEPS,
  type PreferenceAnswers,
  type PreferenceField,
} from '../../data/preferences';
import { colors } from '../../theme/colors';
import Chip from '../../components/Chip';
import OptionCard from '../../components/OptionCard';
import Slider from '../../components/Slider';
import { Chevron } from '../../components/icons/UiIcons';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';

type Props = {
  city: City;
  initialAnswers?: PreferenceAnswers | null;
  isSaving?: boolean;
  saveError?: string | null;
  onBack: () => void;
  onComplete: (
    answers: PreferenceAnswers,
    saveToProfile: boolean,
  ) => void | Promise<void>;
};

const STEP_ICONS: Record<string, string> = {
  basic: '📅',
  move: '🚗',
  tempo: '🏃',
  avoid: '🚫',
  activity: '🎯',
  food: '🍽️',
  stay: '🏠',
  budget: '💰',
};

export function CoursePreferenceEditScreen({
  city,
  initialAnswers,
  isSaving = false,
  saveError,
  onBack,
  onComplete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<PreferenceAnswers>(() => ({
    ...createInitialAnswers(PREFERENCE_STEPS),
    ...(initialAnswers ?? {}),
    freeText:
      typeof initialAnswers?.freeText === 'string'
        ? initialAnswers.freeText
        : '',
  }));

  const setAnswer = (id: string, value: PreferenceAnswers[string]) =>
    setAnswers(prev => ({ ...prev, [id]: value }));

  const toggleMulti = (id: string, option: string) =>
    setAnswers(prev => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return {
        ...prev,
        [id]: current.includes(option)
          ? current.filter(v => v !== option)
          : [...current, option],
      };
    });

  const handleComplete = (saveToProfile: boolean) => {
    const missing = getFirstMissingRequiredFieldInSteps(PREFERENCE_STEPS, answers);
    if (missing) {
      Alert.alert(
        '필수 항목 확인',
        `'${missing.label}' 항목을 선택해주세요.`,
      );
      return;
    }
    onComplete(answers, saveToProfile);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* 상단 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerCity}>{city.name} 여행 코스</Text>
          <Text style={styles.headerTitle}>취향 요약 및 수정</Text>
        </View>
        <View style={styles.headerRightSpace} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* 안내 배너 */}
        <View style={styles.guideBanner}>
          <Text style={styles.guideTitle}>
            💡 저장된 취향을 미리 채워두었어요
          </Text>
          <Text style={styles.guideDesc}>
            이번 여행에서 바꾸고 싶은 항목만 가볍게 터치해 변경해보세요.
          </Text>
        </View>

        {/* 8개 카테고리 섹션 카드 */}
        {PREFERENCE_STEPS.map(step => (
          <View key={step.id} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>
                {STEP_ICONS[step.id] ?? '✦'}
              </Text>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{step.title}</Text>
                {step.subtitle ? (
                  <Text style={styles.sectionSubtitle}>{step.subtitle}</Text>
                ) : null}
              </View>
            </View>

            {step.fields.map(field => (
              <View key={field.id} style={styles.fieldItem}>
                <View style={styles.fieldHead}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  {field.hint ? (
                    <Text style={styles.fieldHint}>{field.hint}</Text>
                  ) : null}
                </View>
                <EditFieldInput
                  field={field}
                  answers={answers}
                  onSet={setAnswer}
                  onToggle={toggleMulti}
                />
              </View>
            ))}
          </View>
        ))}

        {/* 하단 완료 액션 */}
        <View style={styles.actionArea}>
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          <Pressable
            onPress={() => {
              console.log('[CoursePreferenceEditScreen] complete (saveToProfile: false)');
              handleComplete(false);
            }}
            disabled={isSaving}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              isSaving && styles.ctaOff,
              pressed && !isSaving && styles.ctaPressed,
            ]}>
            <Text style={[styles.ctaText, isSaving && styles.ctaTextOff]}>
              {isSaving ? '코스 생성 중...' : '이 취향 조건으로 다시 만들기'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              console.log('[CoursePreferenceEditScreen] complete (saveToProfile: true)');
              handleComplete(true);
            }}
            disabled={isSaving}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaSecondary,
              isSaving && styles.ctaSecondaryOff,
              pressed && !isSaving && styles.ctaSecondaryPressed,
            ]}>
            <Text
              style={[
                styles.ctaSecondaryText,
                isSaving && styles.ctaSecondaryTextOff,
              ]}>
              내 취향에도 저장하고 다시 만들기
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** 항목 타입별 입력 UI */
function EditFieldInput({
  field,
  answers,
  onSet,
  onToggle,
}: {
  field: PreferenceField;
  answers: PreferenceAnswers;
  onSet: (id: string, value: PreferenceAnswers[string]) => void;
  onToggle: (id: string, option: string) => void;
}) {
  const value = answers[field.id];

  switch (field.type) {
    case 'chips-single':
      return (
        <View style={styles.chipWrap}>
          {field.options.map(option => (
            <Chip
              key={option}
              label={option}
              selected={value === option}
              onPress={() => onSet(field.id, option)}
            />
          ))}
        </View>
      );

    case 'chips-multi': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <View style={styles.chipWrap}>
          {field.options.map(option => (
            <Chip
              key={option}
              label={option}
              selected={selected.includes(option)}
              onPress={() => onToggle(field.id, option)}
            />
          ))}
        </View>
      );
    }

    case 'cards-single':
      return (
        <View style={styles.cardWrap}>
          {field.options.map(option => (
            <OptionCard
              key={option.value}
              title={option.value}
              desc={option.desc}
              selected={value === option.value}
              onPress={() => onSet(field.id, option.value)}
            />
          ))}
        </View>
      );

    case 'slider': {
      const current = typeof value === 'number' ? value : field.defaultValue;
      return (
        <View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetValue}>
              {current}
              {field.unit}
              {current === field.max ? '+' : ''}
            </Text>
            <Text style={styles.budgetNote}>숙소 비용 제외</Text>
          </View>
          <Slider
            min={field.min}
            max={field.max}
            step={field.step}
            value={current}
            onChange={v => onSet(field.id, v)}
          />
          <View style={styles.scaleRow}>
            {field.scale.map(label => (
              <Text key={label} style={styles.scaleText}>
                {label}
              </Text>
            ))}
          </View>
        </View>
      );
    }

    case 'text': {
      const text = typeof value === 'string' ? value : '';
      return (
        <View style={styles.textArea}>
          <TextInput
            value={text}
            onChangeText={v => onSet(field.id, v)}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textTertiary}
            maxLength={field.maxLength}
            multiline
            numberOfLines={3}
            style={styles.textInput}
          />
          <View style={styles.textAreaFoot}>
            <Text style={styles.counter}>
              {text.length}/{field.maxLength}
            </Text>
          </View>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerCity: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRightSpace: {
    width: 36,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: TAB_CONTENT_BOTTOM_GAP,
  },
  guideBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryStrong,
  },
  guideDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionEmoji: {
    fontSize: 22,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fieldItem: {
    marginBottom: 16,
  },
  fieldHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardWrap: {
    gap: 8,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  budgetNote: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  scaleText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  textInput: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
    padding: 0,
  },
  textAreaFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  counter: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionArea: {
    marginTop: 20,
    gap: 10,
  },
  error: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 18,
  },
  ctaOff: {
    backgroundColor: colors.ctaDisabled,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  ctaTextOff: {
    color: colors.ctaDisabledText,
  },
  ctaSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 16,
  },
  ctaSecondaryOff: {
    opacity: 0.5,
  },
  ctaSecondaryPressed: {
    backgroundColor: colors.surface,
    transform: [{ scale: 0.98 }],
  },
  ctaSecondaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  ctaSecondaryTextOff: {
    color: colors.textTertiary,
  },
});

export default CoursePreferenceEditScreen;

