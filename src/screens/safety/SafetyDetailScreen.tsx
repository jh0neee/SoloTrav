import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_CONTENT_BOTTOM_GAP } from '../../navigation/layout';
import {
  Chevron,
  IdCardIcon,
  SirenIcon,
} from '../../components/icons/UiIcons';
import {
  EMPTY_EMERGENCY_CARD,
  safetyStorage,
  type EmergencyCard,
} from '../../safety/safetyStorage';
import { colors } from '../../theme/colors';

export type SafetyDetailKey = 'deviceSos' | 'emergencyCard';

type Props = {
  type: SafetyDetailKey;
  userId: string;
  onBack: () => void;
};

export default function SafetyDetailScreen({ type, userId, onBack }: Props) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack]);

  if (type === 'emergencyCard') {
    return <EmergencyCardScreen userId={userId} onBack={onBack} />;
  }
  return <DeviceSosScreen onBack={onBack} />;
}

function ScreenFrame({
  title,
  onBack,
  children,
  compact = false,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          compact ? styles.contentCompact : null,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EmergencyCardScreen({
  userId,
  onBack,
}: {
  userId: string;
  onBack: () => void;
}) {
  const [card, setCard] = useState<EmergencyCard>(EMPTY_EMERGENCY_CARD);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    safetyStorage.getCard(userId).then(setCard);
  }, [userId]);

  const update = (key: keyof EmergencyCard, value: string) =>
    setCard(current => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await safetyStorage.saveCard(userId, card);
      Alert.alert('저장했어요', '긴급 정보를 이 기기에 저장했습니다.');
    } catch {
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenFrame title="긴급 정보 카드" onBack={onBack}>
      <FeatureIntro
        icon={<IdCardIcon color={colors.danger} size={30} />}
        title="구조에 도움이 될 정보"
        description="필요한 정보만 작성하세요. 입력한 내용은 서버로 보내지 않고 현재 기기에만 저장합니다."
      />
      <Field
        label="혈액형"
        value={card.bloodType}
        placeholder="예: A+"
        onChangeText={value => update('bloodType', value)}
      />
      <Field
        label="알레르기"
        value={card.allergies}
        placeholder="없으면 비워두세요"
        onChangeText={value => update('allergies', value)}
      />
      <Field
        label="복용 중인 약"
        value={card.medications}
        placeholder="없으면 비워두세요"
        onChangeText={value => update('medications', value)}
      />
      <Field
        label="기타 참고사항"
        value={card.note}
        placeholder="구조자에게 알릴 내용을 입력하세요"
        multiline
        onChangeText={value => update('note', value)}
      />
      <PrimaryButton
        label={saving ? '저장 중...' : '저장하기'}
        onPress={save}
        disabled={saving}
      />
    </ScreenFrame>
  );
}

function DeviceSosScreen({ onBack }: { onBack: () => void }) {
  const openSafetySettings = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        '설정에서 직접 열어주세요',
        '설정 > 긴급 구조 요청에서 긴급 연락처와 호출 방법을 설정할 수 있어요.',
      );
      return;
    }

    try {
      await Linking.sendIntent('android.settings.SAFETY_CENTER');
    } catch {
      try {
        await Linking.sendIntent('android.settings.APP_SEARCH_SETTINGS');
      } catch {
        try {
          await Linking.sendIntent('android.settings.SETTINGS');
        } catch {
          Alert.alert(
            '설정을 열 수 없어요',
            '휴대폰 설정에서 ‘안전 및 긴급’을 검색해주세요.',
          );
        }
      }
    }
  };

  return (
    <ScreenFrame title="긴급 SOS 설정" onBack={onBack} compact>
      <FeatureIntro
        icon={<SirenIcon color={colors.danger} size={30} />}
        danger
        title="잠금 상태에서도 빠르게 도움 요청"
        description="이 기능은 휴대폰에 내장된 긴급 SOS를 사용합니다."
      />
      <View style={styles.guideCard}>
        <GuideStep
          number="1"
          text="아래 버튼을 눌러 설정 화면으로 진입하세요."
        />
        <GuideStep
          number="2"
          text="설정 검색 화면이 열리면 ‘안전 및 긴급’을 검색해주세요."
        />
        <GuideStep
          number="3"
          text="긴급 SOS와 긴급 연락처를 직접 설정하세요."
        />
        <GuideStep
          number="4"
          text="측면 버튼을 빠르게 5번 누르고 통화 버튼을 옆으로 밀면 실행됩니다."
          last
        />
      </View>
      <Text style={styles.notice}>
        기종과 소프트웨어 버전에 따라 메뉴 이름, 버튼 횟수, 전화 연결 방식이
        다를 수 있습니다.
      </Text>
      <PrimaryButton
        label="휴대폰 설정 열기"
        onPress={openSafetySettings}
      />
    </ScreenFrame>
  );
}

function FeatureIntro({
  icon,
  title,
  description,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <View style={[styles.introCard, danger ? styles.introCardDanger : null]}>
      <View style={[styles.introIcon, danger ? styles.introIconDanger : null]}>
        {icon}
      </View>
      <Text style={styles.introTitle}>{title}</Text>
      <Text style={styles.introDescription}>{description}</Text>
    </View>
  );
}

function Field({
  label,
  multiline = false,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
      />
    </View>
  );
}

function GuideStep({
  number,
  text,
  last = false,
}: {
  number: string;
  text: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.guideStep, last ? styles.guideStepLast : null]}>
      <View style={styles.guideNumber}>
        <Text style={styles.guideNumberText}>{number}</Text>
      </View>
      <Text style={styles.guideText}>{text}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryButton,
        pressed ? styles.primaryButtonPressed : null,
        disabled ? styles.primaryButtonDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    height: 56,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSpacer: { width: 48, height: 56 },
  content: { padding: 20, paddingBottom: TAB_CONTENT_BOTTOM_GAP },
  contentCompact: { paddingBottom: 24 },
  introCard: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    marginBottom: 28,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  introCardDanger: { backgroundColor: colors.dangerSoft },
  introIcon: {
    width: 58,
    height: 58,
    marginBottom: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  introIconDanger: { backgroundColor: '#ffffff' },
  introTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  introDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  field: { marginBottom: 18 },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.background,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputMultiline: { minHeight: 112, textAlignVertical: 'top' },
  primaryButton: {
    minHeight: 54,
    marginTop: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryStrong },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  guideCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 20,
  },
  guideStepLast: { paddingBottom: 0 },
  guideNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  guideNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  guideText: {
    flex: 1,
    paddingTop: 2,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  notice: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
