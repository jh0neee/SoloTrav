/**
 * 여행 기록 도메인 모델.
 *
 * 등록 바디(safetyGrade/tag/description/date)만 스펙에서 확인됐고, 조회 응답에
 * 좋아요·댓글 수가 어떤 이름으로 오는지는 못 봤습니다. mapper 가 여러 이름을
 * 받아보고 없으면 0/false 로 둡니다.
 */
import type { PhotoTone } from '../theme/colors';

/** 안전 등급 선택지 (작성 화면의 칩) */
export const SAFETY_GRADES = ['A', 'B', 'C'] as const;

export type TravelRecord = {
  id: string;
  /** 'A' | 'B' | 'C' 를 기대하지만 서버 값을 그대로 담습니다. */
  safetyGrade: string;
  tags: string[];
  description: string;
  /** 'YYYY-MM-DD' */
  date: string;

  /** 작성자. 내 글인지 판단(수정·삭제 노출)에 씁니다. 서버가 안 주면 null */
  authorId: string | null;
  authorName: string | null;

  likeCount: number;
  likedByMe: boolean;
  commentCount: number;

  /** 업로드된 이미지 URL. 없으면 색 플레이스홀더를 그립니다. */
  imageUrls: string[];
  /** 이미지가 없을 때 쓰는 플레이스홀더 색. 기록 id 로 정합니다. */
  tone: PhotoTone;
};

/** 기록 작성·수정 입력값 */
export type TravelRecordInput = {
  safetyGrade: string;
  tags: string[];
  description: string;
  date: string;
};

/** 여행 기록에 달린 댓글 */
export type RecordComment = {
  id: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  /** 표시용 문자열. 서버가 준 값을 날짜만 잘라 씁니다. */
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
};
