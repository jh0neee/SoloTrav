/**
 * 날짜 선택 시트 — 월 단위 캘린더.
 *
 * 외부 캘린더 라이브러리를 쓰지 않았습니다.
 * @react-native-community/datetimepicker 는 네이티브 모듈이라 붙이는 순간
 * iOS/Android 재빌드가 필요하고, 플랫폼마다 생김새가 달라 앱 톤과도 어긋납니다.
 * 커스텀 탭·바텀시트를 직접 만든 이 프로젝트 방식과도 맞지 않고요.
 *
 * 지도용 BottomSheet 를 쓰지 않은 이유: 그쪽은 지도를 계속 보여줘야 해서
 * 일부러 배경막이 없습니다. 날짜 선택은 잠깐 집중해서 고르는 동작이라
 * 배경을 덮어 주는 편이 낫습니다.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Chevron } from './icons/UiIcons';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  visible: boolean;
  /** 선택된 날짜 YYYY-MM-DD. 비었거나 형식이 아니면 오늘로 엽니다 */
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  /**
   * 미래 날짜를 막을지. 기본값 true —
   * '다녀온 날짜'는 지난 여행을 적는 자리라 내일을 고를 일이 없습니다.
   */
  disableFuture?: boolean;
};

/** Date → 'YYYY-MM-DD' (UTC 로 밀리지 않도록 로컬 값으로 만듭니다) */
function toYmd(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 'YYYY-MM-DD' → Date. 형식이 아니면 null */
function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // 2026-02-31 같은 값은 Date 가 3월로 넘겨버리므로 되돌려 확인합니다.
  return date.getMonth() === month - 1 ? date : null;
}

function DatePickerSheet({
  visible,
  value,
  onSelect,
  onClose,
  disableFuture = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const selected = parseYmd(value);

  /** 지금 펼쳐 보고 있는 달 */
  const [view, setView] = useState(() => selected ?? today);

  // 시트를 다시 열 때는 선택된 날짜가 있는 달부터 보여줍니다.
  useEffect(() => {
    if (visible) {
      setView(parseYmd(value) ?? today);
    }
    // value 는 열리는 순간의 값만 쓰면 되므로 의존성에 넣지 않습니다.
    // (달을 넘기는 중에 부모가 값을 바꿔도 화면이 튀지 않게 하려는 의도)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const year = view.getFullYear();
  const month = view.getMonth();

  /**
   * 달력 칸 배열. 1일이 시작하는 요일만큼 앞을 비우고 날짜를 채웁니다.
   * 뒤는 채우지 않아 마지막 줄이 짧게 끝납니다(빈 칸을 그리는 것보다 깔끔합니다).
   */
  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: dayCount }, (_, index) => index + 1),
    ];
  }, [year, month]);

  /** 다음 달 버튼을 눌러도 되는지 — 미래를 막는 설정이면 이번 달에서 멈춥니다 */
  const canGoNext =
    !disableFuture ||
    year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth());

  const shiftMonth = (delta: number) =>
    setView(new Date(year, month + delta, 1));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropTouch}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="날짜 선택 닫기"
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          {/* 연·월 이동 */}
          <View style={styles.monthRow}>
            <Pressable
              style={styles.monthBtn}
              onPress={() => shiftMonth(-1)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="이전 달">
              <Chevron direction="left" color={colors.textPrimary} size={20} />
            </Pressable>

            <Text style={styles.monthLabel}>
              {year}년 {month + 1}월
            </Text>

            <Pressable
              style={[styles.monthBtn, !canGoNext && styles.monthBtnOff]}
              onPress={() => canGoNext && shiftMonth(1)}
              disabled={!canGoNext}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              accessibilityState={{ disabled: !canGoNext }}>
              <Chevron
                direction="right"
                color={canGoNext ? colors.textPrimary : colors.textTertiary}
                size={20}
              />
            </Pressable>
          </View>

          {/* 요일 */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((label, index) => (
              <Text
                key={label}
                style={[styles.weekday, index === 0 && styles.weekdaySun]}>
                {label}
              </Text>
            ))}
          </View>

          {/* 날짜 */}
          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={styles.cell} />;
              }
              const cellDate = new Date(year, month, day);
              const ymd = toYmd(cellDate);
              const isSelected = selected !== null && toYmd(selected) === ymd;
              const isToday = toYmd(today) === ymd;
              const isFuture = disableFuture && cellDate > today;
              const isSunday = index % 7 === 0;

              return (
                <Pressable
                  key={ymd}
                  style={styles.cell}
                  disabled={isFuture}
                  onPress={() => {
                    onSelect(ymd);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isSelected,
                    disabled: isFuture,
                  }}
                  accessibilityLabel={`${month + 1}월 ${day}일`}>
                  <View
                    style={[styles.dayCircle, isSelected && styles.dayCircleOn]}>
                    <Text
                      style={[
                        styles.dayText,
                        isSunday && styles.dayTextSun,
                        isFuture && styles.dayTextOff,
                        isSelected && styles.dayTextOn,
                      ]}>
                      {day}
                    </Text>
                  </View>
                  {/* 오늘 표시 — 선택된 날에는 겹쳐 그리지 않습니다 */}
                  {isToday && !isSelected ? <View style={styles.todayDot} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.todayBtn}
            onPress={() => {
              onSelect(toYmd(today));
              onClose();
            }}
            accessibilityRole="button">
            <Text style={styles.todayBtnText}>오늘로 설정</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22,24,29,0.45)',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  monthBtnOff: {
    backgroundColor: 'transparent',
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    // 7칸을 정확히 나눠 아래 날짜 칸과 세로줄을 맞춥니다.
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  weekdaySun: {
    color: colors.danger,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleOn: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  dayTextSun: {
    color: colors.danger,
  },
  dayTextOff: {
    color: colors.textTertiary,
  },
  dayTextOn: {
    color: '#ffffff',
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  todayBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  todayBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default DatePickerSheet;
