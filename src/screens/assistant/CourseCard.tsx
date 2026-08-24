/**
 * 샛별이가 만들어 준 여행 코스 카드.
 *
 * `metadata.course` 를 그대로 그립니다. 말풍선(흰색) 아래에 붙는
 * 밤하늘 톤의 유리 카드입니다.
 *
 *   제목 / 요약
 *   1일차 … 시간순 타임라인 (시각 · 장소 · 이동수단 · 비용 · 메모)
 *   총 예상 비용
 *   안전 안내 (safetyNotes)
 *   확인해주세요 (assumptions)
 *
 * safetyNotes 와 assumptions 는 "영업시간·막차·가격은 변할 수 있다" 는 전제를
 * 사용자에게 반드시 보여줘야 해서, 값이 있으면 접지 않고 항상 펼쳐 둡니다.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { CourseDay, CourseStop, TravelCourse } from '../../types/assistant';

/** 12000 → '1.2만원' 처럼 짧게. 만원 미만은 그대로 원 단위로 씁니다. */
function formatCost(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    const text = Number.isInteger(man) ? String(man) : man.toFixed(1);
    return `${text}만원`;
  }
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 'NIGHT_VIEW' → '야경' 처럼 알려진 분류만 한글로 바꿉니다. */
const CATEGORY_LABEL: Record<string, string> = {
  CAFE: '카페',
  FOOD: '식사',
  RESTAURANT: '식사',
  NATURE_WALK: '자연·산책',
  WALK: '산책',
  NIGHT_VIEW: '야경',
  PHOTO_SPOT: '사진',
  STAY: '숙소',
  MOVE: '이동',
  REST: '휴식',
  CULTURE: '문화',
  MARKET: '시장',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category.toUpperCase()] ?? category;
}

/** 타임라인 한 칸 — 왼쪽 시각 열 + 세로선 + 오른쪽 내용 */
function StopRow({ stop, isLast }: { stop: CourseStop; isLast: boolean }) {
  return (
    <View style={styles.stopRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{stop.time ?? '·'}</Text>
      </View>

      <View style={styles.railColumn}>
        <View style={styles.railDot} />
        {isLast ? null : <View style={styles.railLine} />}
      </View>

      <View style={styles.stopBody}>
        <View style={styles.stopHeader}>
          <Text style={styles.stopTitle}>{stop.title}</Text>
          {stop.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {categoryLabel(stop.category)}
              </Text>
            </View>
          ) : null}
        </View>

        {stop.description ? (
          <Text style={styles.stopDescription}>{stop.description}</Text>
        ) : null}

        {stop.transport || stop.estimatedCostKrw !== null ? (
          <View style={styles.metaRow}>
            {stop.transport ? (
              <Text style={styles.metaText}>{stop.transport}</Text>
            ) : null}
            {stop.transport && stop.estimatedCostKrw !== null ? (
              <Text style={styles.metaDot}>·</Text>
            ) : null}
            {stop.estimatedCostKrw !== null ? (
              <Text style={styles.metaText}>
                {formatCost(stop.estimatedCostKrw)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {stop.notes.map((note, index) => (
          <Text key={index} style={styles.stopNote}>
            · {note}
          </Text>
        ))}
      </View>
    </View>
  );
}

function DaySection({ day }: { day: CourseDay }) {
  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{day.day}일차</Text>
        </View>
        {day.title ? <Text style={styles.dayTitle}>{day.title}</Text> : null}
      </View>

      {day.stops.map((stop, index) => (
        <StopRow
          key={`${day.day}-${index}`}
          stop={stop}
          isLast={index === day.stops.length - 1}
        />
      ))}
    </View>
  );
}

/** 안전 안내 / 확인해주세요 처럼 목록 하나를 담는 박스 */
function NoteBox({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'safety' | 'notice';
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View
      style={[
        styles.noteBox,
        tone === 'safety' ? styles.noteBoxSafety : styles.noteBoxNotice,
      ]}>
      <Text
        style={[
          styles.noteTitle,
          tone === 'safety' ? styles.noteTitleSafety : styles.noteTitleNotice,
        ]}>
        {title}
      </Text>
      {items.map((item, index) => (
        <Text key={index} style={styles.noteItem}>
          · {item}
        </Text>
      ))}
    </View>
  );
}

function CourseCard({ course }: { course: TravelCourse }) {
  return (
    <View style={styles.card}>
      {course.title ? <Text style={styles.title}>{course.title}</Text> : null}
      {course.summary ? (
        <Text style={styles.summary}>{course.summary}</Text>
      ) : null}

      {course.days.map(day => (
        <DaySection key={day.day} day={day} />
      ))}

      {course.estimatedTotalCostKrw !== null ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>총 예상 비용</Text>
          <Text style={styles.totalValue}>
            {formatCost(course.estimatedTotalCostKrw)}
          </Text>
        </View>
      ) : null}

      <NoteBox title="안전 안내" items={course.safetyNotes} tone="safety" />
      <NoteBox
        title="확인해주세요"
        items={course.assumptions}
        tone="notice"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.chatCardBg,
    borderWidth: 1,
    borderColor: colors.chatCardBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chatCardText,
  },
  summary: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.chatCardMuted,
  },

  daySection: {
    marginTop: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.chatStarterBg,
    borderWidth: 1,
    borderColor: colors.chatStarterBorder,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.chatStarterText,
  },
  dayTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.chatCardText,
  },

  stopRow: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: 44,
    paddingTop: 1,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.chatStarterText,
  },
  railColumn: {
    width: 18,
    alignItems: 'center',
  },
  railDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    backgroundColor: colors.gold,
  },
  railLine: {
    flex: 1,
    width: 1,
    marginTop: 2,
    backgroundColor: colors.chatCardBorder,
  },
  stopBody: {
    flex: 1,
    paddingBottom: 16,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  stopTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.chatCardText,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.chatBadgeBg,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.chatCardMuted,
  },
  stopDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.chatCardMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  metaText: {
    fontSize: 11,
    color: colors.chatStarterText,
  },
  metaDot: {
    fontSize: 11,
    color: colors.chatCardMuted,
  },
  stopNote: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: colors.chatCardMuted,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.chatCardBorder,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.chatCardMuted,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.chatStarterText,
  },

  noteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  noteBoxSafety: {
    backgroundColor: colors.chatSafetyBg,
  },
  noteBoxNotice: {
    backgroundColor: colors.chatNoticeBg,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  noteTitleSafety: {
    color: colors.chatStarterText,
  },
  noteTitleNotice: {
    color: colors.chatCardText,
  },
  noteItem: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.chatCardMuted,
  },
});

export default CourseCard;
