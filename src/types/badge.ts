/**
 * 여행 배지 도메인 모델.
 *
 * 원래 data/profile.ts 의 목업 상수 옆에 있었지만, GET /users/me/travel-badges
 * 로 서버에서 받는 값이 되면서 목업 파일에서 분리했습니다.
 */

/** 화면에서 실제 아이콘 컴포넌트로 매핑되는 키 */
export type BadgeIcon = 'pin' | 'spark' | 'shield' | 'heart';

/** 유효한 아이콘 키 목록 (응답 검증·기본값 선택에 씁니다) */
export const BADGE_ICON_KEYS: readonly BadgeIcon[] = [
  'pin',
  'spark',
  'shield',
  'heart',
];

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: BadgeIcon;
  /** false 면 잠금(자물쇠)으로 표시합니다. */
  earned: boolean;
};
