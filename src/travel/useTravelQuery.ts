/**
 * 여행 정보 조회용 공용 훅.
 *
 * 취향·기록처럼 사용자가 바꾸는 값은 외부 스토어(preferenceStore 등)로 다루지만,
 * 관광정보는 읽기 전용 공개 데이터라 화면이 뜰 때 한 번 불러오면 그만입니다.
 * 그래서 스토어를 하나씩 만드는 대신 이 훅으로 통일합니다.
 *
 * - key 가 null 이면 조회하지 않습니다(검색어가 비었을 때 등).
 * - 같은 key 로 이미 받아온 값이 있으면 캐시를 먼저 보여주고 요청을 건너뜁니다.
 *   탭을 옮길 때마다 홈이 다시 마운트되어도 목록이 깜빡이지 않게 하기 위함입니다.
 * - 응답이 도착했을 때 key 가 이미 바뀌었으면 버립니다(늦게 온 응답이 최신 결과를
 *   덮어쓰는 것 방지).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError } from '../api/errors';

export type QueryState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | null;
  error: string | null;
};

export type QueryResult<T> = QueryState<T> & {
  /** 캐시를 버리고 다시 조회합니다 (당겨서 새로고침·재시도 버튼용) */
  reload: () => void;
};

/** 앱이 살아있는 동안 유지되는 아주 단순한 캐시. 관광정보는 자주 바뀌지 않습니다. */
const cache = new Map<string, unknown>();

/** 로그아웃처럼 화면을 처음부터 다시 그려야 할 때 씁니다. */
export function clearTravelCache(): void {
  cache.clear();
}

const IDLE: QueryState<never> = { status: 'idle', data: null, error: null };

export function useTravelQuery<T>(
  key: string | null,
  loader: () => Promise<T>,
): QueryResult<T> {
  const [state, setState] = useState<QueryState<T>>(() =>
    key !== null && cache.has(key)
      ? { status: 'ready', data: cache.get(key) as T, error: null }
      : IDLE,
  );

  // loader 는 매 렌더 새로 만들어지는 화살표 함수라 의존성에 넣으면 무한 루프가
  // 됩니다. 최신 함수만 ref 로 들고 있고, 실제 트리거는 key 로만 겁니다.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  /** 이 값이 바뀌면 진행 중이던 응답은 버려집니다 */
  const requestIdRef = useRef(0);

  const run = useCallback(
    async (targetKey: string) => {
      const requestId = ++requestIdRef.current;
      setState(prev => ({ ...prev, status: 'loading', error: null }));
      try {
        const data = await loaderRef.current();
        if (requestId !== requestIdRef.current) {
          return;
        }
        cache.set(targetKey, data);
        setState({ status: 'ready', data, error: null });
      } catch (caught) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setState({
          status: 'error',
          data: null,
          error: toApiError(caught).message,
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (key === null) {
      // 진행 중인 요청이 있으면 결과를 버리고 초기 상태로 돌아갑니다.
      requestIdRef.current += 1;
      setState(IDLE);
      return;
    }
    if (cache.has(key)) {
      setState({ status: 'ready', data: cache.get(key) as T, error: null });
      return;
    }
    run(key);
  }, [key, run]);

  const reload = useCallback(() => {
    if (key === null) {
      return;
    }
    cache.delete(key);
    run(key);
  }, [key, run]);

  return { ...state, reload };
}
