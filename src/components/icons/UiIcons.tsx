/**
 * 공용 UI 아이콘 — Phosphor 라인 아이콘 래퍼.
 *
 * 예전에는 View 를 겹쳐 직접 그렸는데, 선이 2px 로 두껍고 굵기를 조절할 수 없어
 * 화면이 무거워 보였습니다. 이제 phosphor-react-native 를 쓰되 **호출부가 그대로
 * 동작하도록** 기존 이름·프롭(`{ color, size }`)을 유지합니다.
 * (phosphor 는 react-native-svg 위에서 도는 순수 JS 패키지라 네이티브 재빌드가 없습니다)
 *
 * 굵기는 여기 WEIGHT 한 곳에서 관리합니다. 앱 전체 아이콘의 무게가 이 값 하나로
 * 결정되니, 더 얇게/두껍게 하고 싶으면 이 상수만 바꾸세요.
 * (선택지: 'thin' | 'light' | 'regular' | 'bold' — lucide 의 숫자 strokeWidth 와 달리
 *  phosphor 는 미리 그려진 단계값만 받습니다)
 *
 * phosphor v3 는 `Bell` 같은 짧은 이름을 deprecated 로 두고 `BellIcon` 을 권장합니다.
 * 그런데 이 파일이 내보내는 이름과 겹쳐서, 들여올 때 `Ph*` 로 별칭을 붙였습니다.
 */
import React from 'react';
import {
  BankIcon as PhBank,
  BedIcon as PhBed,
  BellIcon as PhBell,
  BookmarkSimpleIcon as PhBookmark,
  CalendarBlankIcon as PhCalendar,
  CaretLeftIcon as PhCaretLeft,
  CaretRightIcon as PhCaretRight,
  ChatCircleIcon as PhChatCircle,
  ClockIcon as PhClock,
  ConfettiIcon as PhConfetti,
  CrosshairIcon as PhCrosshair,
  ForkKnifeIcon as PhForkKnife,
  DotsThreeIcon as PhDotsThree,
  HeartIcon as PhHeart,
  LockIcon as PhLock,
  MagnifyingGlassIcon as PhMagnifyingGlass,
  MapPinIcon as PhMapPin,
  MicrophoneIcon as PhMicrophone,
  MountainsIcon as PhMountains,
  PaperPlaneTiltIcon as PhPaperPlaneTilt,
  PathIcon as PhPath,
  PersonSimpleRunIcon as PhPersonSimpleRun,
  PlusIcon as PhPlus,
  ShieldCheckIcon as PhShieldCheck,
  ShoppingBagIcon as PhShoppingBag,
  SirenIcon as PhSiren,
  SlidersHorizontalIcon as PhSlidersHorizontal,
  SparkleIcon as PhSparkle,
  UserIcon as PhUser,
  type IconWeight,
} from 'phosphor-react-native';

/** 아이콘 선 굵기 — 얇고 가벼운 느낌을 위한 기본값 */
const WEIGHT: IconWeight = 'regular';

type IconProps = { color: string; size?: number };

/** 방향 화살표 (< 또는 >) */
export function Chevron({
  direction = 'left',
  color,
  size = 18,
}: IconProps & { direction?: 'left' | 'right' }) {
  const Arrow = direction === 'left' ? PhCaretLeft : PhCaretRight;
  return <Arrow color={color} size={size} weight={WEIGHT} />;
}

/** 돋보기 */
export function SearchIcon({ color, size = 20 }: IconProps) {
  return <PhMagnifyingGlass color={color} size={size} weight={WEIGHT} />;
}

/** 위치 핀 */
export function PinIcon({ color, size = 20 }: IconProps) {
  return <PhMapPin color={color} size={size} weight={WEIGHT} />;
}

/**
 * 현위치로 이동 — 십자선.
 * 장소를 가리키는 PinIcon 과 구분합니다. 지도 앱들이 공통으로 쓰는 모양이라
 * 별도 설명 없이도 "나를 중심으로 다시 맞춘다" 로 읽힙니다.
 */
export function MyLocationIcon({ color, size = 20 }: IconProps) {
  return <PhCrosshair color={color} size={size} weight={WEIGHT} />;
}

/** 알림 종 */
export function BellIcon({ color, size = 22 }: IconProps) {
  return <PhBell color={color} size={size} weight={WEIGHT} />;
}

/** 안전 방패 (체크 포함) */
export function ShieldIcon({ color, size = 16 }: IconProps) {
  return <PhShieldCheck color={color} size={size} weight={WEIGHT} />;
}

/** 마이크 */
export function MicIcon({ color, size = 18 }: IconProps) {
  return <PhMicrophone color={color} size={size} weight={WEIGHT} />;
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
    <PhHeart color={color} size={size} weight={filled ? 'fill' : WEIGHT} />
  );
}

/** 자물쇠 */
export function LockIcon({ color, size = 18 }: IconProps) {
  return <PhLock color={color} size={size} weight={WEIGHT} />;
}

/** 댓글 말풍선 */
export function CommentIcon({ color, size = 20 }: IconProps) {
  return <PhChatCircle color={color} size={size} weight={WEIGHT} />;
}

/** 보내기 (종이비행기) */
export function SendIcon({ color, size = 20 }: IconProps) {
  return <PhPaperPlaneTilt color={color} size={size} weight={WEIGHT} />;
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
    <PhBookmark color={color} size={size} weight={filled ? 'fill' : WEIGHT} />
  );
}

/** 비상벨 사이렌 */
export function SirenIcon({ color, size = 20 }: IconProps) {
  return <PhSiren color={color} size={size} weight={WEIGHT} />;
}

/** 필터 (슬라이더) */
export function FilterIcon({ color, size = 18 }: IconProps) {
  return <PhSlidersHorizontal color={color} size={size} weight={WEIGHT} />;
}

/** 사람 */
export function PersonIcon({ color, size = 18 }: IconProps) {
  return <PhUser color={color} size={size} weight={WEIGHT} />;
}

/** 반짝임 — AI·추천 표시 */
export function SparkIcon({ color, size = 18 }: IconProps) {
  return <PhSparkle color={color} size={size} weight={WEIGHT} />;
}

/** 더하기 */
export function PlusIcon({ color, size = 20 }: IconProps) {
  return <PhPlus color={color} size={size} weight={WEIGHT} />;
}

/** 더보기 (가로 점 세 개) */
export function DotsIcon({ color, size = 20 }: IconProps) {
  return <PhDotsThree color={color} size={size} weight={WEIGHT} />;
}

/** 달력 */
export function CalendarIcon({ color, size = 18 }: IconProps) {
  return <PhCalendar color={color} size={size} weight={WEIGHT} />;
}

/** 시계 */
export function ClockIcon({ color, size = 14 }: IconProps) {
  return <PhClock color={color} size={size} weight={WEIGHT} />;
}

/* ──────────────────────────────────────────────────────────────
 * 관광 카테고리 아이콘.
 * 지도 필터 칩과 지도 핀이 같은 그림을 씁니다. 핀 쪽은 웹뷰라 컴포넌트를
 * 못 쓰므로 kakaoMapHtml.ts 의 GLYPHS 에 같은 phosphor path 를 넣어 뒀습니다.
 * 한쪽을 바꾸면 다른 쪽도 같이 바꿔야 그림이 어긋나지 않습니다.
 * ────────────────────────────────────────────────────────────── */

/** 관광지 — 산 */
export function MountainIcon({ color, size = 18 }: IconProps) {
  return <PhMountains color={color} size={size} weight={WEIGHT} />;
}

/** 문화시설 — 기둥 건물 */
export function MuseumIcon({ color, size = 18 }: IconProps) {
  return <PhBank color={color} size={size} weight={WEIGHT} />;
}

/** 축제 — 꽃가루 */
export function FestivalIcon({ color, size = 18 }: IconProps) {
  return <PhConfetti color={color} size={size} weight={WEIGHT} />;
}

/** 여행코스 — 경로 */
export function RouteIcon({ color, size = 18 }: IconProps) {
  return <PhPath color={color} size={size} weight={WEIGHT} />;
}

/** 레포츠 — 달리는 사람 */
export function SportsIcon({ color, size = 18 }: IconProps) {
  return <PhPersonSimpleRun color={color} size={size} weight={WEIGHT} />;
}

/** 숙박 — 침대 */
export function BedIcon({ color, size = 18 }: IconProps) {
  return <PhBed color={color} size={size} weight={WEIGHT} />;
}

/** 쇼핑 — 쇼핑백 */
export function ShoppingIcon({ color, size = 18 }: IconProps) {
  return <PhShoppingBag color={color} size={size} weight={WEIGHT} />;
}

/** 음식점 — 포크와 나이프 */
export function FoodIcon({ color, size = 18 }: IconProps) {
  return <PhForkKnife color={color} size={size} weight={WEIGHT} />;
}
