/**
 * 여행 배지 도메인 모델.
 *
 * 원래 data/profile.ts 의 목업 상수 옆에 있었지만, GET /users/me/travel-badges
 * 로 서버에서 받는 값이 되면서 목업 파일에서 분리했습니다.
 */

/** 화면에서 실제 아이콘 컴포넌트로 매핑되는 키 */
export type BadgeIcon = 'pin' | 'spark' | 'shield' | 'heart';
export type BadgeImageKey =
  | '00'
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | 'cb_1'
  | 'cb_2'
  | 'cb_3'
  | 'cb_4'
  | 'cb_5'
  | 'cb_6'
  | 'cb_7'
  | 'cb_8'
  | 'cb_9'
  | 'cb_10'
  | 'cb_11';

export type BadgeCategory =
  | 'region'
  | 'exploration'
  | 'safety'
  | 'record'
  | 'streak';

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
  /** 로컬 배지 이미지 키. 없으면 기존 아이콘으로 대체합니다. */
  imageKey: BadgeImageKey | null;
  /** false면 미획득 상태로 이미지를 흑백 표시합니다. */
  earned: boolean;
  category: BadgeCategory;
  /** 진행형 배지는 현재값/목표값을 함께 표시합니다. */
  progress: number;
  target: number;
  earnedAt: string | null;
};

export type VisitCheckInInput = {
  contentId: string;
  contentTypeId: string;
  /** 좌표 대신 기기에서 계산한 정수 거리만 전송합니다. */
  distanceMeters: number;
  verifiedAt: string;
};

export type VisitCheckInResult = {
  checkedIn: boolean;
  alreadyCheckedIn: boolean;
  newlyEarnedBadges: Badge[];
};
