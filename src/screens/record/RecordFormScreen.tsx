/**
 * 여행 기록 작성·수정 화면.
 *   POST  /travel-records                     (등록)
 *   PATCH /travel-records/{recordId}          (수정)
 *   POST  /travel-records/{recordId}/images   (사진)
 *
 * 본문 바디는 `isAnonymous / safetyGrade / tag / description / date`입니다.
 * 사진은 기록이 저장된 뒤 recordId 로 따로 올라가므로, 이 화면은 고른 파일을
 * 모아뒀다가 onSubmit 으로 함께 넘기기만 합니다(업로드는 스토어가 합니다).
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import {
  SAFETY_GRADES,
  recordSafetyLabel,
  type TravelRecordInput,
} from '../../types/travelRecord';
import type { UploadImage } from '../../api/recordApi';
import RecordImage from '../../components/RecordImage';
import {
  recordStore,
  type RecordSubmitResult,
  type SubmitStep,
} from '../../records/recordStore';
import { mediaScanStore } from '../../media/mediaScanStore';

export type ModalStatus =
  | 'idle'
  | 'progress'
  | 'success'
  | 'warning'
  | 'retryable'
  | 'error';

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

export type SubmitModalState = {
  visible: boolean;
  status: ModalStatus;
  stepStatuses: [StepStatus, StepStatus, StepStatus];
  title: string;
  message: string;
  subMessage?: string;
  retryableMediaId?: string;
  isRetrying?: boolean;
};

type Props = {
  /** 수정 진입이면 기존 값. 없으면 새 기록 작성입니다. */
  initial?: TravelRecordInput | null;
  /**
   * 수정 진입이면 이미 올라간 사진 URL.
   * 서버에 이미지 삭제 API 가 없어 보여주기만 하고 지우지는 못합니다.
   */
  existingImageUrls?: string[];
  isSubmitting: boolean;
  submitStep?: SubmitStep;
  submitMessage?: string | null;
  submitError: string | null;
  onBack: () => void;
  onComplete: () => void;
  onSubmit: (
    input: TravelRecordInput,
    images: UploadImage[],
  ) => Promise<RecordSubmitResult | void>;
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

/** 혼행 후기에서 자주 쓰는 태그. 공백으로 나뉘지 않게 붙여 씁니다. */
const SUGGESTED_TAGS = [
  '혼자다녀왔어요',
  '뚜벅이여행',
  '낮방문추천',
  '야간이동주의',
  '혼자사진찍기좋음',
  '혼밥성공',
];

const STEP_LABELS = ['기록 저장', '사진 전송', '안전 검사'];

function StepIndicator({
  statuses,
}: {
  statuses: [StepStatus, StepStatus, StepStatus];
}) {
  return (
    <View style={styles.stepIndicatorContainer}>
      {STEP_LABELS.map((label, idx) => {
        const status = statuses[idx];
        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const isFailed = status === 'failed';
        const isPending = status === 'pending';

        return (
          <React.Fragment key={label}>
            {idx > 0 ? (
              <View
                style={[
                  styles.stepConnectorLine,
                  statuses[idx - 1] === 'completed' &&
                    (isActive || isCompleted || isFailed) &&
                    styles.stepConnectorLineActive,
                  status === 'failed' && styles.stepConnectorLineFailed,
                ]}
              />
            ) : null}

            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isActive && styles.stepCircleActive,
                  isFailed && styles.stepCircleFailed,
                  isPending && styles.stepCirclePending,
                ]}
              >
                <Text
                  style={[
                    styles.stepCircleText,
                    isCompleted && styles.stepCircleTextCompleted,
                    isActive && styles.stepCircleTextActive,
                    isFailed && styles.stepCircleTextFailed,
                    isPending && styles.stepCircleTextPending,
                  ]}
                >
                  {isCompleted ? '✓' : isFailed ? '!' : idx + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isCompleted && styles.stepLabelCompleted,
                  isFailed && styles.stepLabelFailed,
                ]}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function RecordFormScreen({
  initial,
  existingImageUrls = [],
  isSubmitting,
  submitStep = 'idle',
  submitMessage,
  submitError,
  onBack,
  onComplete,
  onSubmit,
}: Props) {
  // 상태바가 투명(translucent)이라 상단 여백은 화면이 직접 만들어 줍니다.
  const insets = useSafeAreaInsets();
  const isEditing = !!initial;
  const [isAnonymous, setIsAnonymous] = useState(initial?.isAnonymous ?? false);
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

  /** 결과 및 안내 모달 통합 상태 (토스 스타일 3단계 스텝 바) */
  const [modalState, setModalState] = useState<SubmitModalState>({
    visible: false,
    status: 'idle',
    stepStatuses: ['pending', 'pending', 'pending'],
    title: '',
    message: '',
  });

  const tags = useMemo(() => parseTags(tagText), [tagText]);
  const isDateValid = DATE_PATTERN.test(date);
  const canSubmit =
    isDateValid && description.trim().length > 0 && !isSubmitting;

  /** 실제 서버 저장 시 스텝 상태 실시간 계산 */
  const currentStepStatuses: [StepStatus, StepStatus, StepStatus] = useMemo(() => {
    if (modalState.status !== 'progress') {
      return modalState.stepStatuses;
    }
    if (submitStep === 'scanning') {
      return ['completed', 'completed', 'active'];
    }
    if (submitStep === 'uploading') {
      return ['completed', 'active', 'pending'];
    }
    return ['active', 'pending', 'pending'];
  }, [modalState.status, modalState.stepStatuses, submitStep]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setModalState({
      visible: true,
      status: 'progress',
      stepStatuses: ['active', 'pending', 'pending'],
      title: isEditing ? '기록을 수정하고 있어요' : '기록을 저장하고 있어요',
      message: '여행 기록 본문 내용을 저장하고 있습니다.',
      subMessage: '잠시만 기다려주시면 바로 등록됩니다.',
    });

    try {
      const result = await onSubmit(
        { isAnonymous, safetyGrade, tags, description, date },
        images,
      );

      if (result && result.imageError) {
        if (result.retryableMediaId) {
          setModalState({
            visible: true,
            status: 'retryable',
            stepStatuses: ['completed', 'completed', 'failed'],
            title: '사진 검사 일시 지연',
            message: result.imageError,
            subMessage: '기록 본문은 안전하게 저장되었습니다.',
            retryableMediaId: result.retryableMediaId,
          });
        } else {
          const isUploadFail = result.imageError.includes('업로드');
          setModalState({
            visible: true,
            status: 'warning',
            stepStatuses: isUploadFail
              ? ['completed', 'failed', 'pending']
              : ['completed', 'completed', 'failed'],
            title: isUploadFail ? '사진 전송 실패 안내' : '사진 안전성 검사 안내',
            message: result.imageError,
            subMessage: '기록 본문은 안전하게 저장되었습니다.',
          });
        }
      } else {
        setModalState({
          visible: true,
          status: 'success',
          stepStatuses: ['completed', 'completed', 'completed'],
          title: isEditing ? '기록 수정이 완료되었어요' : '기록 등록이 완료되었어요',
          message: '안전성 검사를 모두 마치고 피드에 등록되었습니다.',
          subMessage: '아래 확인 버튼을 누르면 목록으로 이동합니다.',
        });
      }
    } catch (caught: any) {
      setModalState({
        visible: true,
        status: 'error',
        stepStatuses: ['failed', 'pending', 'pending'],
        title: '기록 저장에 실패했어요',
        message:
          caught?.message || '일시적인 오류로 저장하지 못했습니다. 다시 시도해 주세요.',
        subMessage:
          '작성하신 내용과 선택한 사진은 안전하게 유지되어 있습니다.',
      });
    }
  };

  const handleRetry = async () => {
    if (!modalState.retryableMediaId) {
      return;
    }

    try {
      setModalState(prev => ({
        ...prev,
        isRetrying: true,
        stepStatuses: ['completed', 'completed', 'active'],
        title: '사진 재검사 요청 중',
        message: '사진 검사를 다시 요청하고 있습니다.',
      }));
      await mediaScanStore.retry(modalState.retryableMediaId);
      await recordStore.reload('mine');
      setModalState({
        visible: true,
        status: 'success',
        stepStatuses: ['completed', 'completed', 'completed'],
        title: '재검사 요청 완료',
        message: '사진 검사를 다시 요청했습니다.\n잠시 후 내 기록에서 확인해주세요.',
        subMessage: '검사가 완료되면 사진이 자동으로 표시됩니다.',
      });
    } catch {
      setModalState(prev => ({
        ...prev,
        isRetrying: false,
        stepStatuses: ['completed', 'completed', 'failed'],
        title: '재시도 요청 실패',
        message: '재시도 요청에 실패했습니다.\n네트워크 상태를 확인하고 다시 시도해주세요.',
      }));
    }
  };

  const handleModalAcknowledge = () => {
    const { status } = modalState;
    setModalState(prev => ({ ...prev, visible: false }));

    if (status === 'error') {
      return;
    }

    onComplete();
  };

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
        caught instanceof Error
          ? caught.message
          : '사진을 불러오지 못했습니다.',
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
          {isEditing ? '혼행 기록 수정' : '혼행 기록'}
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
          accessibilityLabel={`다녀온 날짜 ${
            date || '선택 안 됨'
          }, 눌러서 달력 열기`}
        >
          <Text style={[styles.dateText, !date && styles.datePlaceholder]}>
            {date ? formatDateLabel(date) : '날짜를 선택해주세요'}
          </Text>
          <CalendarIcon color={colors.textSecondary} size={18} />
        </Pressable>

        <View style={styles.anonymousRow}>
          <View>
            <Text style={styles.label}>익명으로 작성</Text>
            <Text style={styles.hint}>닉네임 대신 익명으로 표시해요.</Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            disabled={isSubmitting}
            accessibilityLabel="익명으로 작성"
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Text style={[styles.label, styles.labelSpaced]}>안전 등급</Text>
        <Text style={styles.hint}>
          그곳이 혼자 다니기에 얼마나 안전했는지 남겨주세요.
        </Text>
        <View style={styles.chipWrap}>
          {SAFETY_GRADES.map(grade => (
            <Chip
              key={grade}
              label={recordSafetyLabel(grade)}
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
        {/* 혼행 관점 추천 태그 — 누르면 입력칸에 더해집니다 (작성자가 직접 고르는 태그라 데이터 단정이 아닙니다) */}
        <View style={styles.suggestWrap}>
          {SUGGESTED_TAGS.filter(tag => !tags.includes(tag)).map(tag => (
            <Pressable
              key={tag}
              style={styles.suggestChip}
              onPress={() =>
                setTagText(prev =>
                  prev.trim() ? `${prev.trim()}, ${tag}` : tag,
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`${tag} 태그 추가`}
            >
              <Text style={styles.suggestChipText}>+ #{tag}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, styles.labelSpaced]}>기록</Text>
        <View style={styles.textArea}>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={text =>
              setDescription(text.slice(0, DESCRIPTION_MAX))
            }
            multiline
            placeholder="혼자 다녀온 곳, 어땠는지 적어주세요"
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
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.cta, !canSubmit && styles.ctaOff]}
        >
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextOff]}>
            {isSubmitting
              ? '처리 중...'
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

      {/* 결합형 스텝 인디케이터 모달 (토스 스타일) */}
      <Modal
        visible={modalState.visible || (isSubmitting && submitStep !== 'idle')}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (modalState.status !== 'progress' && !modalState.isRetrying) {
            handleModalAcknowledge();
          }
        }}
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalCard}>
            {/* 토스 스타일 3단계 스텝 바 */}
            <StepIndicator statuses={currentStepStatuses} />

            {/* 진행 중 미니멀 스피너 */}
            {modalState.status === 'progress' ||
            modalState.status === 'idle' ||
            modalState.isRetrying ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.stepProgressSpinner}
              />
            ) : null}

            {/* 모달 타이틀 */}
            <Text style={styles.stepModalTitle}>
              {modalState.status === 'progress' || modalState.status === 'idle'
                ? submitStep === 'scanning'
                  ? '안전성 검사를 진행하고 있어요'
                  : submitStep === 'uploading'
                  ? '사진을 전송하고 있어요'
                  : '기록을 저장하고 있어요'
                : modalState.title}
            </Text>

            {/* 모달 메시지 */}
            <Text style={styles.stepModalMessage}>
              {modalState.status === 'progress' || modalState.status === 'idle'
                ? submitMessage || modalState.message || '잠시만 기다려주세요.'
                : modalState.message}
            </Text>

            {/* 보조 설명 문구 */}
            {modalState.subMessage ? (
              <Text style={styles.stepModalSub}>{modalState.subMessage}</Text>
            ) : null}

            {/* 상태별 커스텀 액션 버튼 */}
            {modalState.status === 'retryable' ? (
              <View style={styles.modalBtnRow}>
                <Pressable
                  style={[styles.modalBtnHalf, styles.modalBtnSecondary]}
                  onPress={handleModalAcknowledge}
                  disabled={modalState.isRetrying}
                >
                  <Text style={styles.modalBtnSecondaryText}>나중에 확인</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtnHalf, styles.modalBtnPrimary]}
                  onPress={handleRetry}
                  disabled={modalState.isRetrying}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    {modalState.isRetrying ? '요청 중...' : '검사 재시도'}
                  </Text>
                </Pressable>
              </View>
            ) : modalState.status !== 'progress' &&
              modalState.status !== 'idle' ? (
              <View style={styles.modalBtnSingle}>
                <Pressable
                  style={[
                    styles.modalBtnSingleBtn,
                    styles.modalBtnPrimary,
                    modalState.status === 'error' && styles.modalBtnDanger,
                  ]}
                  onPress={handleModalAcknowledge}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    {modalState.status === 'success'
                      ? '확인'
                      : modalState.status === 'error'
                      ? '돌아가기'
                      : '확인'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
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
  return (
    <View style={styles.thumb}>
      <RecordImage uri={url} showNotice style={styles.thumbImage} />
      <View style={styles.thumbBadge}>
        <Text style={styles.thumbBadgeText}>올라간 사진</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anonymousRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
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
  suggestWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  suggestChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  suggestChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
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
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
    width: 68,
  },
  stepConnectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 13,
    marginHorizontal: -4,
  },
  stepConnectorLineActive: {
    backgroundColor: colors.primary,
  },
  stepConnectorLineFailed: {
    backgroundColor: colors.danger,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primarySoft,
  },
  stepCircleFailed: {
    backgroundColor: colors.danger,
  },
  stepCirclePending: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepCircleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepCircleTextCompleted: {
    color: '#ffffff',
    fontSize: 13,
  },
  stepCircleTextActive: {
    color: '#ffffff',
  },
  stepCircleTextFailed: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  stepCircleTextPending: {
    color: colors.textTertiary,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primaryStrong,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stepLabelFailed: {
    color: colors.danger,
    fontWeight: '700',
  },
  stepProgressSpinner: {
    marginBottom: 10,
  },
  stepModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepModalMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  stepModalSub: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 15,
  },

  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    width: '100%',
  },
  modalBtnHalf: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSingle: {
    marginTop: 20,
    width: '100%',
  },
  modalBtnSingleBtn: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: colors.ink,
  },
  modalBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBtnDanger: {
    backgroundColor: colors.danger,
  },
});

export default RecordFormScreen;
