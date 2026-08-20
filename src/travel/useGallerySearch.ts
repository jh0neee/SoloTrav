/**
 * 관광사진 갤러리 페이지 조회 훅.
 *
 * useSpotSearch 와 같은 구조입니다 — 페이지를 이어 붙여야 해서 단발 조회용
 * useTravelQuery 를 쓰지 않고, 늦게 온 응답이 최신 목록을 덮지 않도록 요청마다
 * 번호를 매깁니다. 키워드가 바뀌면 목록을 처음부터 다시 채웁니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { travelApi } from '../api/travelApi';
import { toApiError } from '../api/errors';
import type { GalleryPhoto } from '../types/travel';

const PAGE_SIZE = 24;

export type GallerySearchResult = {
  items: GalleryPhoto[];
  totalCount: number;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useGallerySearch(keyword: string): GallerySearchResult {
  const [items, setItems] = useState<GalleryPhoto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState<GallerySearchResult['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      const requestId = ++requestIdRef.current;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setStatus('loading');
        setError(null);
      }

      try {
        const result = await travelApi.listGalleryPhotos({
          keyword,
          page,
          size: PAGE_SIZE,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setItems(prev => (append ? [...prev, ...result.items] : result.items));
        setTotalCount(result.totalCount);
        setNextPage(result.nextPage);
        setStatus('ready');
      } catch (caught) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setError(toApiError(caught).message);
        setStatus('error');
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoadingMore(false);
        }
      }
    },
    [keyword],
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (nextPage === null || isLoadingMore || status === 'loading') {
      return;
    }
    fetchPage(nextPage, true);
  }, [nextPage, isLoadingMore, status, fetchPage]);

  const retry = useCallback(() => fetchPage(1, false), [fetchPage]);

  return {
    items,
    totalCount,
    status,
    error,
    isLoadingMore,
    hasMore: nextPage !== null,
    loadMore,
    retry,
  };
}
