/**
 * 취향 프로필과 코스 조건을 모드에 따라 나눠 보여주는 위저드입니다.
 * 상단 진행바 → 질문 카드 → 하단 '다음'/'건너뛰기' 구조로,
 * 질문과 옵션은 data/preferences.ts 스키마를 그대로 렌더링합니다.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
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
  getPreferenceSteps,
  isStepComplete,
  type PreferenceAnswers,
  type PreferenceField,
  type PreferencePromptMode,
} from '../../data/preferences';
import { colors } from '../../theme/colors';
import Chip from '../../components/Chip';
import OptionCard from '../../components/OptionCard';
import Slider from '../../components/Slider';
import { Chevron, SparkIcon } from '../../components/icons/UiIcons';

type Props = {
  /** 코스 생성 진입 시 이미 선택된 도시를 문맥으로 보여줍니다. */
  city?: City;
  mode?: PreferencePromptMode;
  /** 이미 등록한 취향(편집 진입). 없으면 새로 작성합니다. */
  initialAnswers?: PreferenceAnswers | null;
  /** 저장 중이면 완료 버튼을 잠급니다. */
  isSaving?: boolean;
  /** 저장 실패 메시지. 있으면 하단에 띄우고 화면은 그대로 둡니다. */
  saveError?: string | null;
  onBack: () => void;
  onComplete: (answers: PreferenceAnswers) => void;
};

function PreferencePromptScreen({
  city,
  mode = 'profile',
  initialAnswers,
  isSaving = false,
  saveError,
  onBack,
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const steps = useMemo(() => getPreferenceSteps(mode), [mode]);
  const total = steps.length;
  const [answers, setAnswers] = useState<PreferenceAnswers>(() => {
    const visibleFieldIds = new Set(
      steps.flatMap(visibleStep =>
        visibleStep.fields.map(field => field.id),
      ),
    );
    const visibleInitialAnswers = Object.fromEntries(
      Object.entries(initialAnswers ?? {}).filter(([id]) =>
        visibleFieldIds.has(id),
      ),
    );
    return {
      ...createInitialAnswers(steps),
      ...visibleInitialAnswers,
    };
  });

  const step = steps[index];
  const isLast = index === total - 1;
  const canNext = useMemo(() => isStepComplete(step, answers), [step, answers]);

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

  // 안드로이드 뒤로가기: 첫 단계가 아니면 이전 단계로 (첫 단계면 HomeStack 이 처리)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) {
        return false;
      }
      setIndex(i => i - 1);
      return true;
    });
    return () => sub.remove();
  }, [index]);

  const goPrev = () => (index === 0 ? onBack() : setIndex(i => i - 1));
  const goNext = () =>
    isLast ? onComplete(answers) : setIndex(i => Math.min(total - 1, i + 1));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* 진행바 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={goPrev}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="이전 단계">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / total) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.stepCount}>
          {index + 1}/{total}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {mode === 'course' && city ? (
          <Text style={styles.cityContext}>{city.name} 여행 코스</Text>
        ) : null}
        {/* 질문 */}
        <View style={styles.titleRow}>
          <View style={styles.mascot}>
            <SparkIcon color={colors.goldDeep} size={20} />
          </View>
          <View style={styles.titleTexts}>
            <Text style={styles.title}>{step.title}</Text>
            {step.subtitle ? (
              <Text style={styles.subtitle}>{step.subtitle}</Text>
            ) : null}
          </View>
        </View>

        {/* 항목 */}
        {step.fields.map(field => (
          <View key={field.id} style={styles.field}>
            <View style={styles.fieldHead}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              {field.hint ? (
                <Text style={styles.fieldHint}>{field.hint}</Text>
              ) : null}
            </View>
            <FieldInput
              field={field}
              answers={answers}
              onSet={setAnswer}
              onToggle={toggleMulti}
            />
          </View>
        ))}
      </ScrollView>

      {/* 하단 액션 */}
      <View style={styles.footer}>
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <Pressable
          onPress={goNext}
          disabled={!canNext || isSaving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canNext || isSaving }}
          style={[styles.cta, (!canNext || isSaving) && styles.ctaOff]}>
          <Text
            style={[
              styles.ctaText,
              (!canNext || isSaving) && styles.ctaTextOff,
            ]}>
            {isSaving ? '저장 중...' : isLast ? '완료' : '다음'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => (isLast ? onComplete(answers) : setIndex(i => i + 1))}
          disabled={isSaving}
          accessibilityRole="button"
          style={styles.skipBtn}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** 항목 타입별 입력 UI */
function FieldInput({
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
        <View>
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
            style={styles.textInput}
            value={text}
            onChangeText={t => onSet(field.id, t.slice(0, field.maxLength))}
            multiline
            placeholder={field.placeholder}
            placeholderTextColor={colors.textSecondary}
          />
          <View style={styles.textAreaFoot}>
            <Text style={styles.counter}>
              {text.length}/{field.maxLength}
            </Text>
          </View>
        </View>
      );
    }

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  // 진행바
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
    paddingRight: 20,
    // paddingTop 은 상태바 높이(insets.top)를 더해 인라인으로 지정합니다.
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  stepCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  cityContext: {
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },

  // 질문 헤더
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 26,
  },
  mascot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTexts: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 29,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 19,
  },

  // 항목
  field: {
    marginBottom: 26,
  },
  fieldHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // 예산
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 22,
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
    fontSize: 12,
    color: colors.textSecondary,
  },

  // 자유 프롬프트
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    minHeight: 88,
    textAlignVertical: 'top',
    padding: 0,
  },
  textAreaFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  counter: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // 하단 액션
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  error: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
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
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  ctaTextOff: {
    color: colors.ctaDisabledText,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default PreferencePromptScreen;
