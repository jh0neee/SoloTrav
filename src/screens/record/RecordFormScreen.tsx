/**
 * 여행 기록 작성·수정 화면.
 *   POST  /travel-records                     (등록)
 *   PATCH /travel-records/{recordId}          (수정)
 *   POST  /travel-records/{recordId}/images   (사진)
 *
 * 본문 바디는 스펙대로 `safetyGrade / tag / description / date` 네 개입니다.
 * 사진은 기록이 저장된 뒤 recordId 로 따로 올라가므로, 이 화면은 고른 파일을
 * 모아뒀다가 onSubmit 으로 함께 넘기기만 합니다(업로드는 스토어가 합니다).
 */
import React, { useMemo, useState } from 'react';
import {
  Image,
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
import Chip from '../../components/Chip';
import DatePickerSheet from '../../components/DatePickerSheet';
import { CalendarIcon, Chevron } from '../../components/icons/UiIcons';
import { colors } from '../../theme/colors';
import { MAX_RECORD_IMAGES, pickRecordImages } from '../../media/imagePicker';
import { SAFETY_GRADES, type TravelRecordInput } from '../../types/travelRecord';
import type { UploadImage } from '../../api/recordApi';

type Props = {
  /** 수정 진입이면 기존 값. 없으면 새 기록 작성입니다. */
  initial?: TravelRecordInput | null;
  /**
   * 수정 진입이면 이미 올라간 사진 URL.
   * 서버에 이미지 삭제 API 가 없어 보여주기만 하고 지우지는 못합니다.
   */
  existingImageUrls?: string[];
  isSubmitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: (input: TravelRecordInput, images: UploadImage[]) => void;
};

const DESCRIPTION_MAX = 300;

/** 오늘 날짜를 'YYYY-MM-DD' 로 (기기 시간 기준) */
/** '2026-08-21' → '2026년 8월 21일 (목)' — 입력칸에 그대로 보여줄 문구 */
function formatDateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** 쉼표·공백·해시 구분으로 태그를 나눕니다. ('#단양, 도담이' → ['단양','도담이']) */
function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[,\s]+/)
    .map(tag => tag.replace(/^#/, '').trim())
    .filter(tag => {
      if (!tag || seen.has(tag)) {
        return false;
      }
      seen.add(tag);
      return true;
    });
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function RecordFormScreen({
  initial,
  existingImageUrls = [],
  isSubmitting,
  submitError,
  onBack,
  onSubmit,
}: Props) {
  // 상태바가 투명(translucent)이라 상단 여백은 화면이 직접 만들어 줍니다.
  const insets = useSafeAreaInsets();
  const isEditing = !!initial;
  const [date, setDate] = useState(() => initial?.date || today());
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [safetyGrade, setSafetyGrade] = useState<string>(
    initial?.safetyGrade || SAFETY_GRADES[0],
  );
  const [tagText, setTagText] = useState(() =>
    (initial?.tags ?? []).join(', '),
  );
  const [description, setDescription] = useState(initial?.description ?? '');

  /** 이번에 새로 고른 사진. 저장 후 업로드됩니다. */
  const [images, setImages] = useState<UploadImage[]>([]);
  /** 사진 고르기 실패(권한 거부 등). 저장 자체와는 별개라 따로 보여줍니다. */
  const [imagePickError, setImagePickError] = useState<string | null>(null);

  const tags = useMemo(() => parseTags(tagText), [tagText]);
  const isDateValid = DATE_PATTERN.test(date);
  const canSubmit =
    isDateValid && description.trim().length > 0 && !isSubmitting;

  // 이미 올라간 사진도 정원에 포함시켜 셉니다.
  const remainingSlots =
    MAX_RECORD_IMAGES - existingImageUrls.length - images.length;

  const addImages = async () => {
    try {
      const picked = await pickRecordImages(remainingSlots);
      setImagePickError(null);
      if (picked.length > 0) {
        setImages(current => [...current, ...picked]);
      }
    } catch (caught) {
      setImagePickError(
        caught instanceof Error ? caught.message : '사진을 불러오지 못했습니다.',
      );
    }
  };

  const removeImage = (uri: string) => {
    setImages(current => current.filter(image => image.uri !== uri));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <Chevron direction="left" color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topTitle}>
          {isEditing ? '기록 수정' : '여행 기록'}
        </Text>
        {/* 좌우 균형을 맞추기 위한 빈 칸 */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>다녀온 날짜</Text>
        <Pressable
          style={[styles.input, styles.dateField]}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`다녀온 날짜 ${date || '선택 안 됨'}, 눌러서 달력 열기`}
        >
          <Text style={[styles.dateText, !date && styles.datePlaceholder]}>
            {date ? formatDateLabel(date) : '날짜를 선택해주세요'}
          </Text>
          <CalendarIcon color={colors.textSecondary} size={18} />
        </Pressable>

        <Text style={[styles.label, styles.labelSpaced]}>안전 등급</Text>
        <Text style={styles.hint}>
          그곳이 혼자 다니기에 얼마나 안전했는지 남겨주세요.
        </Text>
        <View style={styles.chipWrap}>
          {SAFETY_GRADES.map(grade => (
            <Chip
              key={grade}
              label={grade}
              selected={safetyGrade === grade}
              onPress={() => setSafetyGrade(grade)}
            />
          ))}
        </View>

        <Text style={[styles.label, styles.labelSpaced]}>태그</Text>
        <TextInput
          style={styles.input}
          value={tagText}
          onChangeText={setTagText}
          placeholder="단양, 도담이"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        {tags.length > 0 ? (
          <View style={styles.chipWrap}>
            {tags.map(tag => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}># {tag}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>쉼표나 띄어쓰기로 구분해주세요.</Text>
        )}

        <Text style={[styles.label, styles.labelSpaced]}>기록</Text>
        <View style={styles.textArea}>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={text =>
              setDescription(text.slice(0, DESCRIPTION_MAX))
            }
            multiline
            placeholder="어디를 다녀왔고 어땠는지 적어주세요"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.counter}>
            {description.length}/{DESCRIPTION_MAX}
          </Text>
        </View>

        <Text style={[styles.label, styles.labelSpaced]}>사진</Text>
        <Text style={styles.hint}>
          {isEditing
            ? `사진은 기존에 올린 것 뒤로 더해집니다. 최대 ${MAX_RECORD_IMAGES}장.`
            : `다녀온 곳을 남겨보세요. 최대 ${MAX_RECORD_IMAGES}장.`}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
        >
          {/* 이미 올라간 사진 — 서버에 삭제 API 가 없어 지우지 못합니다. */}
          {existingImageUrls.map(url => (
            <ExistingThumb key={url} url={url} />
          ))}

          {/* 이번에 고른 사진 — 올리기 전이라 뺄 수 있습니다. */}
          {images.map(image => (
            <View key={image.uri} style={styles.thumb}>
              <Image
                source={{ uri: image.uri }}
                style={styles.thumbImage}
                accessibilityIgnoresInvertColors
              />
              <Pressable
                style={styles.thumbRemove}
                onPress={() => removeImage(image.uri)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="사진 빼기"
              >
                <Text style={styles.thumbRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}

          {remainingSlots > 0 ? (
            <Pressable
              style={styles.addPhoto}
              onPress={addImages}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="사진 고르기"
            >
              <Text style={styles.addPhotoPlus}>+</Text>
              <Text style={styles.addPhotoText}>사진</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {remainingSlots <= 0 ? (
          <Text style={styles.hint}>
            사진은 {MAX_RECORD_IMAGES}장까지만 올릴 수 있어요.
          </Text>
        ) : null}
        {imagePickError ? (
          <Text style={styles.photoError}>{imagePickError}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        <Pressable
          onPress={() =>
            onSubmit({ safetyGrade, tags, description, date }, images)
          }
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.cta, !canSubmit && styles.ctaOff]}
        >
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
            {isSubmitting
              ? '올리는 중...'
              : isEditing
              ? '수정 완료'
              : '기록 남기기'}
          </Text>
        </Pressable>
      </View>

      <DatePickerSheet
        visible={isPickerOpen}
        value={date}
        onSelect={setDate}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * 이미 올라간 사진 한 장.
 *
 * 못 불러오면 빈 칸으로 두지 않고 이유를 표시합니다. 그냥 비워두면 "사진이
 * 안 올라갔다" 와 "올라갔는데 주소를 못 연다" 가 똑같아 보여서, 어디를 봐야
 * 하는지 알 수 없습니다.
 */
function ExistingThumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.thumb}>
      {failed ? (
        <View style={styles.thumbFailed}>
          <Text style={styles.thumbFailedText}>불러오지{'\n'}못했어요</Text>
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={styles.thumbImage}
          onError={({ nativeEvent }) => {
            if (__DEV__) {
              console.log('[record] 사진 열기 실패:', url, nativeEvent?.error);
            }
            setFailed(true);
          }}
          accessibilityIgnoresInvertColors
        />
      )}
      <View style={styles.thumbBadge}>
        <Text style={styles.thumbBadgeText}>올라간 사진</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
    // paddingTop 은 상태바 높이(insets.top)를 더해 인라인으로 지정합니다.
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  labelSpaced: {
    marginTop: 26,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.goldSoft,
  },
  tagPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.goldDeep,
  },

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
    minHeight: 110,
    textAlignVertical: 'top',
    padding: 0,
  },
  counter: {
    marginTop: 10,
    textAlign: 'right',
    fontSize: 12,
    color: colors.textSecondary,
  },

  // 사진
  photoRow: {
    gap: 10,
    paddingVertical: 4,
    paddingRight: 20,
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFailed: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  thumbFailedText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  thumbBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  thumbBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  thumbRemoveText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    color: '#ffffff',
  },
  addPhoto: {
    width: 92,
    height: 92,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // TextInput 과 높이를 맞춥니다(입력칸처럼 보여야 하므로).
    paddingVertical: 14,
  },
  dateText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  datePlaceholder: {
    color: colors.textSecondary,
  },
  addPhotoPlus: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
    color: colors.goldDeep,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  photoError: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.danger,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
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
});

export default RecordFormScreen;
