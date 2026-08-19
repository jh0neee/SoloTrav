/**
 * 취향 프롬프트 화면.
 * 여행 기간/페이스(단일선택), 무드(다중선택), 하루 예산(슬라이더),
 * 자유 프롬프트(텍스트) + 안전 우선 큐레이션(토글)로 AI 코스 조건을 설정합니다.
 */
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { City } from '../../data/cities';
import { colors } from '../../theme/colors';
import Chip from '../../components/Chip';
import Slider from '../../components/Slider';
import {
  Chevron,
  MicIcon,
  ShieldIcon,
  SparkIcon,
} from '../../components/icons/UiIcons';

type Props = {
  city: City;
  onBack: () => void;
  onGenerate: () => void;
};

const PERIODS = ['당일', '1박 2일', '2박 3일', '자유'];
const PACES = ['느긋하게', '균형있게', '알차게'];
const MOODS = [
  '#감성사진',
  '#조용한_카페',
  '#야경_명소',
  '#로컬_맛집',
  '#박물관',
  '#책방',
  '#자연_트레킹',
  '#아침일찍',
  '#야시장',
  '#액티비티',
  '#한적한_골목',
  '#전통시장',
  '#와이너리',
  '#휴양',
];
const MAX_TEXT = 300;

function PreferencePromptScreen({ city, onBack, onGenerate }: Props) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('1박 2일');
  const [pace, setPace] = useState('느긋하게');
  const [moods, setMoods] = useState<string[]>(['#감성사진', '#조용한_카페']);
  const [budget, setBudget] = useState(15);
  const [freeText, setFreeText] = useState(
    '아침은 늦게 일어나고 싶고, 야경 사진 찍을 수 있는 곳을 좋아해요. 사람 적은 골목 카페 좋아요.',
  );
  const [safetyFirst, setSafetyFirst] = useState(true);

  const toggleMood = (mood: string) =>
    setMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood],
    );

  return (
    <View style={styles.container}>
      {/* 헤더 — 상태바 아래까지 화면이 올라오므로 인셋만큼 내려줍니다 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기">
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>취향 프롬프트</Text>
          <Text style={styles.headerSub}>{city.name} 맞춤 코스 설정</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* 여행 기간 */}
        <Section title="여행 기간">
          <View style={styles.chipWrap}>
            {PERIODS.map(p => (
              <Chip
                key={p}
                label={p}
                selected={period === p}
                onPress={() => setPeriod(p)}
              />
            ))}
          </View>
        </Section>

        {/* 여행 페이스 */}
        <Section title="여행 페이스">
          <View style={styles.chipWrap}>
            {PACES.map(p => (
              <Chip
                key={p}
                label={p}
                selected={pace === p}
                onPress={() => setPace(p)}
              />
            ))}
          </View>
        </Section>

        {/* 좋아하는 무드 */}
        <Section title="좋아하는 무드" hint="여러 개 선택">
          <View style={styles.chipWrap}>
            {MOODS.map(m => (
              <Chip
                key={m}
                label={m}
                selected={moods.includes(m)}
                onPress={() => toggleMood(m)}
              />
            ))}
          </View>
        </Section>

        {/* 하루 예산 */}
        <Section title="하루 예산" hint={`${budget}만원`}>
          <Slider min={5} max={40} step={5} value={budget} onChange={setBudget} />
          <View style={styles.scaleRow}>
            <Text style={styles.scaleText}>5만</Text>
            <Text style={styles.scaleText}>15만</Text>
            <Text style={styles.scaleText}>25만</Text>
            <Text style={styles.scaleText}>40만+</Text>
          </View>
        </Section>

        {/* 자유 프롬프트 */}
        <Section title="자유 프롬프트" hint="자연어로 자세히 적을수록 좋아요">
          <View style={styles.textArea}>
            <TextInput
              style={styles.textInput}
              value={freeText}
              onChangeText={t => setFreeText(t.slice(0, MAX_TEXT))}
              multiline
              placeholder="가고 싶은 분위기나 하고 싶은 것을 적어주세요"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.textAreaFoot}>
              <View style={styles.textActions}>
                <Pressable style={styles.smallBtn}>
                  <SparkIcon color={colors.goldDeep} size={16} />
                  <Text style={styles.smallBtnText}>예시 받기</Text>
                </Pressable>
                <Pressable style={styles.smallBtn}>
                  <MicIcon color={colors.textPrimary} size={16} />
                  <Text style={styles.smallBtnText}>음성</Text>
                </Pressable>
              </View>
              <Text style={styles.counter}>
                {freeText.length}/{MAX_TEXT}
              </Text>
            </View>
          </View>
        </Section>

        {/* 생성 버튼 */}
        <Pressable
          style={styles.cta}
          onPress={onGenerate}
          accessibilityRole="button">
          <Text style={styles.ctaText}>AI 코스 생성하기</Text>
          <Chevron direction="right" color="#ffffff" size={18} />
        </Pressable>

        {/* 안전 우선 큐레이션 */}
        <View style={styles.safetyRow}>
          <View style={styles.safetyIcon}>
            <ShieldIcon color={colors.goldDeep} size={18} />
          </View>
          <View style={styles.safetyTexts}>
            <Text style={styles.safetyTitle}>안전 우선 큐레이션</Text>
            <Text style={styles.safetySub}>
              CCTV·가로등 밀집 지역, 안전등급 A 숙소 우선
            </Text>
          </View>
          <Switch
            value={safetyFirst}
            onValueChange={setSafetyFirst}
            trackColor={{ false: colors.track, true: colors.ink }}
            thumbColor="#ffffff"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
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
    paddingVertical: 8,
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // 예산 눈금
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
    justifyContent: 'space-between',
    marginTop: 12,
  },
  textActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  smallBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  counter: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 14,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  // 안전 우선
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  safetyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyTexts: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  safetySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
});

export default PreferencePromptScreen;
