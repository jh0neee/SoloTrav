/**
 * 기록 피드 데이터(임시).
 * 다른 혼행러들이 어디에 다녀왔는지 보여주는 인스타그램형 피드 목업입니다.
 * 사진은 아직 없으므로 tone 값으로 플레이스홀더 색을 정합니다.
 */
import type { PhotoTone } from '../theme/colors';

/** 피드 상단 필터 (전체는 화면에서 따로 붙입니다) */
export const FEED_CATEGORIES = ['야경', '자연', '카페', '혼밥'] as const;

export type FeedCategory = (typeof FEED_CATEGORIES)[number];

export type FeedPost = {
  id: string;
  author: { name: string; initial: string; title: string };
  cityId: string; // data/cities.ts 의 City.id
  spot: string; // 다녀온 장소
  timeAgo: string;
  tone: PhotoTone;
  category: FeedCategory;
  /** 장소 기준 안전 등급 — 사진 위에 작게 표시합니다. */
  safetyGrade: string;
  safetyNote: string;
  caption: string;
  tags: string[];
  likes: number; // likedByMe 포함 수치
  likedByMe: boolean;
  comments: number;
};

export const FEED_POSTS: FeedPost[] = [
  {
    id: 'post-dodam-night',
    author: { name: '별밤', initial: '별', title: '야경 헌터' },
    cityId: 'danyang',
    spot: '도담삼봉',
    timeAgo: '3시간 전',
    tone: 'night',
    category: '야경',
    safetyGrade: 'A',
    safetyNote: '가로등 밝음',
    caption:
      '해 지고 나서도 사람이 꾸준히 있어서 혼자 삼각대 세우기 좋았어요. 강변 산책로 조명이 끝까지 이어져요.',
    tags: ['#야경_명소', '#감성사진'],
    likes: 128,
    likedByMe: false,
    comments: 12,
  },
  {
    id: 'post-cheongpung-lake',
    author: { name: '소소', initial: '소', title: '혼행 12회' },
    cityId: 'jecheon',
    spot: '청풍호 둘레길',
    timeAgo: '어제',
    tone: 'dawn',
    category: '자연',
    safetyGrade: 'A',
    safetyNote: '순찰 잦음',
    caption:
      '아침 7시에 걸었는데 안개 깔린 호수가 진짜 좋았습니다. 화장실이 중간중간 있어서 혼자도 부담 없어요.',
    tags: ['#자연_트레킹', '#아침일찍'],
    likes: 94,
    likedByMe: true,
    comments: 8,
  },
  {
    id: 'post-sanmagi',
    author: { name: '토리', initial: '토', title: '숨은 동네 탐험가' },
    cityId: 'goesan',
    spot: '산막이옛길',
    timeAgo: '2일 전',
    tone: 'dawn',
    category: '자연',
    safetyGrade: 'B',
    safetyNote: '일부 구간 어두움',
    caption:
      '데크길이라 걷기 편한데 후반부는 조명이 없어요. 해 지기 두 시간 전에는 돌아 나오는 걸 추천!',
    tags: ['#자연_트레킹', '#한적한_골목'],
    likes: 61,
    likedByMe: false,
    comments: 5,
  },
  {
    id: 'post-seongan-cafe',
    author: { name: '민지', initial: '민', title: '카페 수집가' },
    cityId: 'cheongju',
    spot: '성안길 골목 카페',
    timeAgo: '3일 전',
    tone: 'dusk',
    category: '카페',
    safetyGrade: 'B',
    safetyNote: 'CCTV 많음',
    caption:
      '1인석이 창가로 쭉 있어서 두 시간 앉아 있었어요. 밤에도 상가 골목이라 사람이 계속 지나다녀요.',
    tags: ['#조용한_카페', '#감성사진'],
    likes: 47,
    likedByMe: false,
    comments: 3,
  },
  {
    id: 'post-yeongdong-wine',
    author: { name: '하루', initial: '하', title: '혼행 5회' },
    cityId: 'yeongdong',
    spot: '와인터널',
    timeAgo: '5일 전',
    tone: 'dusk',
    category: '카페',
    safetyGrade: 'A',
    safetyNote: '실내·직원 상주',
    caption:
      '혼자 와도 시음 잔 하나로 충분히 즐길 수 있어요. 실내라 날씨 상관없는 게 제일 좋았어요.',
    tags: ['#와이너리', '#휴양'],
    likes: 73,
    likedByMe: false,
    comments: 6,
  },
  {
    id: 'post-danyang-solo-meal',
    author: { name: '지원', initial: '지', title: '단양 마스터' },
    cityId: 'danyang',
    spot: '구경시장 마늘약선요리',
    timeAgo: '1주 전',
    tone: 'night',
    category: '혼밥',
    safetyGrade: 'A',
    safetyNote: '시장 안 유동 인구 많음',
    caption:
      '1인분도 눈치 없이 주문 가능. 카운터석이 있어서 혼밥 첫 도전에 딱이었어요.',
    tags: ['#로컬_맛집', '#전통시장'],
    likes: 156,
    likedByMe: true,
    comments: 21,
  },
];
