/**
 * 공용 UI 아이콘 (라인 스타일).
 * 외부 아이콘 라이브러리 없이 순수 View로 그려 네이티브 재빌드가 필요 없습니다.
 * size·color 에 따라 치수를 계산하므로 동적 inline style이 필수라
 * 이 파일에 한해 no-inline-styles 규칙을 끕니다.
 */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';

type IconProps = { color: string; size?: number };

/** 방향 화살표 (< 또는 >) */
export function Chevron({
  direction = 'left',
  color,
  size = 18,
}: IconProps & { direction?: 'left' | 'right' }) {
  const s = size * 0.5;
  const rotate = direction === 'left' ? '-135deg' : '45deg';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: s,
          height: s,
          borderTopWidth: 2,
          borderRightWidth: 2,
          borderColor: color,
          transform: [{ rotate }],
        }}
      />
    </View>
  );
}

/** 돋보기 */
export function SearchIcon({ color, size = 20 }: IconProps) {
  const r = size * 0.42;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: r, height: r, borderRadius: r / 2, borderWidth: 2, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          right: 1,
          bottom: 1,
          width: size * 0.34,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** 위치 핀 */
export function PinIcon({ color, size = 20 }: IconProps) {
  const c = size * 0.5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: c, height: c, borderRadius: c / 2, borderWidth: 2, borderColor: color }} />
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -2,
          borderLeftWidth: c * 0.32,
          borderRightWidth: c * 0.32,
          borderTopWidth: c * 0.5,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: c * 0.28,
          width: c * 0.34,
          height: c * 0.34,
          borderRadius: c * 0.17,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** 알림 벨 */
export function BellIcon({ color, size = 22 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View
        style={{
          width: size * 0.6,
          height: size * 0.48,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
          borderBottomWidth: 0,
        }}
      />
      <View style={{ width: size * 0.78, height: 2, borderRadius: 1, backgroundColor: color, marginTop: -1 }} />
      <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 2, borderColor: color, marginTop: 1 }} />
    </View>
  );
}

/** 방패 (안전 등급) */
export function ShieldIcon({ color, size = 16 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.82,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: size * 0.36,
          borderBottomRightRadius: size * 0.36,
        }}
      />
    </View>
  );
}

/** 마이크 (음성 입력) */
export function MicIcon({ color, size = 18 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ width: size * 0.34, height: size * 0.5, borderRadius: size * 0.17, borderWidth: 2, borderColor: color }} />
      <View
        style={{
          width: size * 0.5,
          height: size * 0.26,
          borderWidth: 2,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.25,
          borderBottomRightRadius: size * 0.25,
          marginTop: -2,
        }}
      />
      <View style={{ width: 2, height: size * 0.12, backgroundColor: color }} />
    </View>
  );
}

/** 하트 (찜하기) — 채움 스타일 */
export function HeartIcon({ color, size = 20 }: IconProps) {
  const lobe = size * 0.52;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 0, top: size * 0.06, width: lobe, height: lobe, borderRadius: lobe / 2, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 0, top: size * 0.06, width: lobe, height: lobe, borderRadius: lobe / 2, backgroundColor: color }} />
      <View
        style={{
          position: 'absolute',
          left: size * 0.19,
          top: size * 0.16,
          width: size * 0.62,
          height: size * 0.62,
          backgroundColor: color,
          borderBottomLeftRadius: 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** 자물쇠 (미획득 배지) */
export function LockIcon({ color, size = 18 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.46,
          height: size * 0.3,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.23,
          borderTopRightRadius: size * 0.23,
        }}
      />
      <View style={{ width: size * 0.66, height: size * 0.44, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

/** 말풍선 (댓글) */
export function CommentIcon({ color, size = 20 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.86,
          height: size * 0.68,
          marginBottom: size * 0.12,
          borderWidth: 2,
          borderColor: color,
          borderRadius: size * 0.22,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.26,
          bottom: size * 0.06,
          width: size * 0.2,
          height: size * 0.2,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/** 종이비행기 (공유) */
export function SendIcon({ color, size = 20 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.3,
          borderRightWidth: size * 0.3,
          borderBottomWidth: size * 0.62,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '90deg' }],
        }}
      />
    </View>
  );
}

/**
 * 북마크 (저장) — 채움 스타일.
 * 아래쪽 V홈은 카드 배경색으로 덮어 그리므로 흰 카드가 아니면 notchColor 를 넘겨주세요.
 */
export function BookmarkIcon({
  color,
  size = 20,
  notchColor = '#ffffff',
}: IconProps & { notchColor?: string }) {
  const w = size * 0.62;
  const h = size * 0.8;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: w,
          height: h,
          backgroundColor: color,
          borderRadius: 3,
          overflow: 'hidden',
          justifyContent: 'flex-end',
        }}>
        <View
          style={{
            alignSelf: 'center',
            width: 0,
            height: 0,
            borderLeftWidth: w / 2,
            borderRightWidth: w / 2,
            borderBottomWidth: h * 0.36,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: notchColor,
          }}
        />
      </View>
    </View>
  );
}

/** 경광등 (SOS 단축 버튼) */
export function SirenIcon({ color, size = 20 }: IconProps) {
  const ray = {
    position: 'absolute' as const,
    width: size * 0.2,
    height: 2,
    borderRadius: 1,
    backgroundColor: color,
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: size * 0.16 }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.36,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
        }}
      />
      <View style={{ width: size * 0.74, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View style={[ray, { left: 0, top: size * 0.3, transform: [{ rotate: '-30deg' }] }]} />
      <View style={[ray, { right: 0, top: size * 0.3, transform: [{ rotate: '30deg' }] }]} />
    </View>
  );
}

/** 필터 (가로 슬라이더 3줄 + 손잡이) */
export function FilterIcon({ color, size = 18 }: IconProps) {
  const row = {
    width: size,
    height: 2,
    borderRadius: 1,
    backgroundColor: color,
  };
  const knob = {
    position: 'absolute' as const,
    width: size * 0.28,
    height: size * 0.28,
    borderRadius: size * 0.14,
    borderWidth: 2,
    borderColor: color,
    backgroundColor: '#ffffff',
  };
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-between', paddingVertical: size * 0.14 }}>
      <View>
        <View style={row} />
        <View style={[knob, { left: size * 0.58, top: -size * 0.13 }]} />
      </View>
      <View>
        <View style={row} />
        <View style={[knob, { left: size * 0.14, top: -size * 0.13 }]} />
      </View>
      <View>
        <View style={row} />
        <View style={[knob, { left: size * 0.44, top: -size * 0.13 }]} />
      </View>
    </View>
  );
}

/** 사람 (혼행 인프라) */
export function PersonIcon({ color, size = 18 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.36,
          height: size * 0.36,
          borderRadius: size * 0.18,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          marginTop: 2,
          width: size * 0.66,
          height: size * 0.34,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.33,
          borderTopRightRadius: size * 0.33,
        }}
      />
    </View>
  );
}

/** 반짝임 ✦ (AI/샛별이) */
export function SparkIcon({ color, size = 18 }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 2, height: size, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: size, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 1.5, height: size * 0.6, borderRadius: 1, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.6, height: 1.5, borderRadius: 1, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

/** 더하기 (첨부·추가) */
export function PlusIcon({ color, size = 20 }: IconProps) {
  const bar = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: bar, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 2, height: bar, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

/** 점 세 개 (더보기 메뉴) */
export function DotsIcon({ color, size = 20 }: IconProps) {
  const dot = Math.max(3, size * 0.18);
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color, marginHorizontal: dot * 0.35 }} />
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color, marginHorizontal: dot * 0.35 }} />
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color, marginHorizontal: dot * 0.35 }} />
    </View>
  );
}

/** 시계 (일정 시각) */
export function ClockIcon({ color, size = 14 }: IconProps) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 1.5, height: size * 0.3, borderRadius: 1, backgroundColor: color, top: size * 0.18 }} />
      <View style={{ position: 'absolute', width: size * 0.24, height: 1.5, borderRadius: 1, backgroundColor: color, left: size * 0.46, top: size * 0.44 }} />
    </View>
  );
}
