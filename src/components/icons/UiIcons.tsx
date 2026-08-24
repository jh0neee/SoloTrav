/**
 * 공용 UI 아이콘 — Lucide 라인 아이콘 래퍼.
 *
 * 예전에는 View 를 겹쳐 직접 그렸는데, 선이 2px 로 두껍고 굵기를 조절할 수 없어
 * 화면이 무거워 보였습니다. 이제 lucide-react-native 를 쓰되 **호출부가 그대로
 * 동작하도록** 기존 이름·프롭(`{ color, size }`)을 유지합니다.
 * (lucide 는 react-native-svg 위에서 도는 순수 JS 패키지라 네이티브 재빌드가 없습니다)
 *
 * 굵기는 여기 STROKE 한 곳에서 관리합니다. 앱 전체 아이콘의 무게가 이 값 하나로
 * 결정되니, 더 얇게/두껍게 하고 싶으면 이 상수만 바꾸세요.
 */
import React from 'react';
import {
  Bell,
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ellipsis,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Mic,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Sparkles,
  User,
} from 'lucide-react-native';

/** 아이콘 선 굵기 — 얇고 가벼운 느낌을 위해 기본 2 에서 낮췄습니다 */
const STROKE = 1.6;

type IconProps = { color: string; size?: number };

/** 방향 화살표 (< 또는 >) */
export function Chevron({
  direction = 'left',
  color,
  size = 18,
}: IconProps & { direction?: 'left' | 'right' }) {
  const Arrow = direction === 'left' ? ChevronLeft : ChevronRight;
  return <Arrow color={color} size={size} strokeWidth={STROKE} />;
}

/** 돋보기 */
export function SearchIcon({ color, size = 20 }: IconProps) {
  return <Search color={color} size={size} strokeWidth={STROKE} />;
}

/** 위치 핀 */
export function PinIcon({ color, size = 20 }: IconProps) {
  return <MapPin color={color} size={size} strokeWidth={STROKE} />;
}

/** 알림 종 */
export function BellIcon({ color, size = 22 }: IconProps) {
  return <Bell color={color} size={size} strokeWidth={STROKE} />;
}

/** 안전 방패 (체크 포함) */
export function ShieldIcon({ color, size = 16 }: IconProps) {
  return <ShieldCheck color={color} size={size} strokeWidth={STROKE} />;
}

/** 마이크 */
export function MicIcon({ color, size = 18 }: IconProps) {
  return <Mic color={color} size={size} strokeWidth={STROKE} />;
}

/**
 * 하트.
 * 기본은 선만 그립니다. 좋아요한 상태는 색으로 구분하고, 꽉 찬 하트가 필요하면
 * filled 를 넘기세요.
 */
export function HeartIcon({
  color,
  size = 20,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <Heart
      color={color}
      size={size}
      strokeWidth={STROKE}
      fill={filled ? color : 'transparent'}
    />
  );
}

/** 자물쇠 */
export function LockIcon({ color, size = 18 }: IconProps) {
  return <Lock color={color} size={size} strokeWidth={STROKE} />;
}

/** 댓글 말풍선 */
export function CommentIcon({ color, size = 20 }: IconProps) {
  return <MessageCircle color={color} size={size} strokeWidth={STROKE} />;
}

/** 보내기 (종이비행기) */
export function SendIcon({ color, size = 20 }: IconProps) {
  return <Send color={color} size={size} strokeWidth={STROKE} />;
}

/**
 * 북마크.
 * notchColor 는 직접 그리던 시절 안쪽 홈을 칠하던 값입니다. 라인 아이콘에는
 * 쓸 자리가 없어 무시하지만, 넘기던 화면이 깨지지 않도록 프롭은 남겨둡니다.
 */
export function BookmarkIcon({
  color,
  size = 20,
  filled = false,
}: IconProps & { notchColor?: string; filled?: boolean }) {
  return (
    <Bookmark
      color={color}
      size={size}
      strokeWidth={STROKE}
      fill={filled ? color : 'transparent'}
    />
  );
}

/** 비상벨 사이렌 */
export function SirenIcon({ color, size = 20 }: IconProps) {
  return <Siren color={color} size={size} strokeWidth={STROKE} />;
}

/** 필터 (슬라이더) */
export function FilterIcon({ color, size = 18 }: IconProps) {
  return <SlidersHorizontal color={color} size={size} strokeWidth={STROKE} />;
}

/** 사람 */
export function PersonIcon({ color, size = 18 }: IconProps) {
  return <User color={color} size={size} strokeWidth={STROKE} />;
}

/** 반짝임 — AI·추천 표시 */
export function SparkIcon({ color, size = 18 }: IconProps) {
  return <Sparkles color={color} size={size} strokeWidth={STROKE} />;
}

/** 더하기 */
export function PlusIcon({ color, size = 20 }: IconProps) {
  return <Plus color={color} size={size} strokeWidth={STROKE} />;
}

/** 더보기 (가로 점 세 개) */
export function DotsIcon({ color, size = 20 }: IconProps) {
  return <Ellipsis color={color} size={size} strokeWidth={STROKE} />;
}

/** 달력 */
export function CalendarIcon({ color, size = 18 }: IconProps) {
  return <Calendar color={color} size={size} strokeWidth={STROKE} />;
}

/** 시계 */
export function ClockIcon({ color, size = 14 }: IconProps) {
  return <Clock color={color} size={size} strokeWidth={STROKE} />;
}
