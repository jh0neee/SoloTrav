/**
 * 키워드 검색 전용 훅.
 *
 * 결과를 페이지 단위로 **이어 붙여야** 해서 useTravelQuery(단발 조회)를 쓰지 않고
 * 따로 만들었습니다. 검색어·필터가 바뀌면 목록을 처음부터 다시 채웁니다.
 *
 * 늦게 도착한 응답이 최신 결과를 덮어쓰지 않도록 요청마다 번호를 매기고,
 * 번호가 어긋나면 응답을 버립니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { travelApi } from '../api/travelApi';
import { toApiError } from '../api/errors';
import type { TourContent } from '../types/travel';

const PAGE_SIZE = 20;

export type SpotSearchParams = {
  /** 비어 있으면 조회하지 않습니다 */
  keyword: string;
  contentTypeId?: string;
  /** 법정동 시도 코드. 없으면 전국 */
  regionCode?: string;
};

export type SpotSearchResult = {
  items: TourContent[];
  totalCount: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** 다음 페이지를 이어 붙이는 중 */
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export function useSpotSearch({
  keyword,
  contentTypeId,
  regionCode,
}: SpotSearchParams): SpotSearchResult {
  const [items, setItems] = useState<TourContent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState<SpotSearchResult['status']>('idle');
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
        const result = await travelApi.searchSpots({
          keyword,
          contentTypeId,
          regionCode,
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
    [keyword, contentTypeId, regionCode],
  );

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      // 진행 중인 요청 결과가 뒤늦게 들어오지 않도록 번호를 올려 무효화합니다.
      requestIdRef.current += 1;
      setItems([]);
      setTotalCount(0);
      setNextPage(null);
      setStatus('idle');
      setError(null);
      return;
    }
    fetchPage(1, false);
  }, [keyword, contentTypeId, regionCode, fetchPage]);

  const loadMore = useCallback(() => {
    // 첫 페이지를 불러오는 중이거나 이미 이어 붙이는 중이면 무시합니다.
    if (nextPage === null || isLoadingMore || status === 'loading') {
      return;
    }
    fetchPage(nextPage, true);
  }, [nextPage, isLoadingMore, status, fetchPage]);

  const retry = useCallback(() => {
    if (keyword.trim()) {
      fetchPage(1, false);
    }
  }, [keyword, fetchPage]);

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
