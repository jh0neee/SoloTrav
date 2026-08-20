/**
 * 관광사진갤러리 API (한국관광공사).
 *
 * ⚠️ 이 API 에는 좌표 파라미터가 없습니다. 검색 축은 키워드/제목뿐이라
 * "지도 위 포토스팟 레이어" 같은 좌표 기반 기능은 만들 수 없습니다.
 * 대신 장소 이름이나 지역 이름으로 찾아 **사진을 덧붙이는 용도**로 씁니다.
 *
 * 이미지 주소(galWebImageUrl)는 이미 https 로 내려옵니다.
 */
import { Platform } from 'react-native';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { toApiError } from './errors';
import { APP_NAME } from '../config/userAgent';

const COMMON_PARAMS = {
  MobileOS: Platform.OS === 'ios' ? 'IOS' : 'AND',
  MobileApp: APP_NAME,
} as const;

/** 갤러리 사진 한 장 */
export type GalleryPhoto = {
  id: string;
  title: string;
  imageUrl: string;
  /** 촬영지 텍스트. 예: '충청북도 단양군' */
  location: string;
  /** 촬영자 이름 — 저작권 표기에 씁니다. */
  photographer: string;
  /** 'YYYYMM' */
  photographyMonth: string;
};

type Raw = Record<string, unknown>;

function str(raw: Raw, key: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalize(raw: Raw): GalleryPhoto | null {
  const id = str(raw, 'galContentId');
  const imageUrl = str(raw, 'galWebImageUrl');
  if (!id || !imageUrl) {
    return null;
  }
  return {
    id,
    title: str(raw, 'galTitle'),
    // 관광사진 서버도 http 로 줄 때가 있어 스킴을 올려 둡니다(iOS ATS).
    imageUrl: imageUrl.replace(/^http:\/\//i, 'https://'),
    location: str(raw, 'galPhotographyLocation'),
    photographer: str(raw, 'galPhotographer'),
    photographyMonth: str(raw, 'galPhotographyMonth'),
  };
}

function extract(data: unknown): GalleryPhoto[] {
  const envelope = (data ?? {}) as Raw;
  const payload = (envelope.payload ?? envelope.data ?? envelope) as Raw;
  const items = payload.items;
  if (!Array.isArray(items)) {
    return [];
  }
  return (items as Raw[])
    .map(normalize)
    .filter((photo): photo is GalleryPhoto => photo !== null);
}

export const galleryApi = {
  /**
   * 키워드로 관광사진을 찾습니다.
   *
   * arrange 와 rows 기본값은 실제 응답을 보고 정했습니다. '단양군' 기준으로
   *   A(촬영일순) 12장 → 제목 2종   (같은 촬영분이 연달아 나옴)
   *   A(촬영일순) 60장 → 제목 7종
   *   C(수정일순) 60장 → 제목 12종  ← 장소가 가장 다양합니다
   * 갤러리는 한 장소를 여러 장 연속으로 담고 있어서, 적게 받으면 한두 곳만
   * 나옵니다. 넉넉히 받아 화면에서 제목별로 추려 쓰는 편이 낫습니다.
   */
  search: async (
    keyword: string,
    { rows = 60 }: { rows?: number } = {},
    signal?: AbortSignal,
  ): Promise<GalleryPhoto[]> => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const { data } = await apiClient.get(
        ENDPOINTS.gallerySearch({
          ...COMMON_PARAMS,
          keyword: trimmed,
          numOfRows: String(rows),
          pageNo: '1',
          arrange: 'C', // 수정일순 — 장소가 가장 골고루 섞여 나옵니다.
        }),
        { signal },
      );
      return extract(data);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
