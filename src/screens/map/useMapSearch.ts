import { useCallback, useEffect, useRef, useState } from 'react';
import { travelApi } from '../../api/travelApi';
import {
  isMappableTourContent,
  type MappableTourContent,
} from '../../types/travel';
import { startMapApiLog } from '../../map/mapApiLogger';
import type { SearchPoi, SearchStatus } from './searchTypes';
import { findRegionSearchResult } from './regionSearch';

type Options = {
  visible: boolean;
  onSearch: (
    query: string,
  ) => Promise<{ items: SearchPoi[]; status: SearchStatus }>;
  onSubmit: (items: SearchPoi[], query: string) => void;
  onRegion: (region: SearchPoi, query: string) => void;
};

/** 입력 버전으로 구분하여 같은 검색어로 돌아와도 오래된 응답을 버립니다. */
export function useMapSearch({
  visible,
  onSearch,
  onSubmit,
  onRegion,
}: Options) {
  const [input, setInput] = useState({ text: '', version: 0 });
  const current = useRef(input);
  const [pois, setPois] = useState<SearchPoi[]>([]);
  const [tourHits, setTourHits] = useState<MappableTourContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [tourLoading, setTourLoading] = useState(false);
  const [status, setStatus] = useState<SearchStatus>('OK');
  const pendingSubmit = useRef<number | null>(null);
  const resolved = useRef<{ version: number; items: SearchPoi[] } | null>(null);
  const startRef = useRef<{ version: number; start: () => void } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const callbacks = useRef({ onSubmit, onRegion });
  callbacks.current = { onSubmit, onRegion };

  const invalidate = useCallback(() => {
    current.current = {
      ...current.current,
      version: current.current.version + 1,
    };
    pendingSubmit.current = null;
    resolved.current = null;
    startRef.current = null;
    controllerRef.current?.abort();
  }, []);

  const changeText = useCallback(
    (text: string) => {
      invalidate();
      const next = { text, version: current.current.version };
      current.current = next;
      setInput(next);
      setPois([]);
      setTourHits([]);
      setStatus('OK');
      setLoading(text.trim().length >= 2);
      setTourLoading(text.trim().length >= 2);
    },
    [invalidate],
  );

  useEffect(() => {
    if (!visible) {
      invalidate();
      return;
    }
    changeText('');
    return invalidate;
  }, [visible, changeText, invalidate]);

  useEffect(() => {
    const query = input.text.trim();
    if (
      !visible ||
      query.length < 2 ||
      input.version !== current.current.version
    )
      return;
    const controller = new AbortController();
    controllerRef.current = controller;
    let alive = true;
    let started = false;
    const valid = () =>
      alive &&
      !controller.signal.aborted &&
      current.current.version === input.version;
    const start = () => {
      if (started || !valid()) return;
      started = true;
      const poiLog = startMapApiLog('kakao/keyword-search', { query });
      onSearch(query)
        .then(result => {
          if (!valid()) {
            poiLog.cancelled();
            return;
          }
          poiLog.success({ count: result.items.length, status: result.status });
          resolved.current = { version: input.version, items: result.items };
          setPois(result.items);
          setStatus(result.status);
          setLoading(false);
          if (pendingSubmit.current === input.version) {
            pendingSubmit.current = null;
            if (result.items.length)
              callbacks.current.onSubmit(result.items, query);
          }
        })
        .catch(error => {
          if (!valid()) {
            poiLog.cancelled();
            return;
          }
          poiLog.failure(error);
          setStatus('ERROR');
          setLoading(false);
          pendingSubmit.current = null;
        });
      const tourLog = startMapApiLog('tour/search-keyword', {
        query,
        regionCode: '43',
        size: 8,
      });
      travelApi
        .searchSpots(
          { keyword: query, regionCode: '43', size: 8, arrange: 'O' },
          controller.signal,
        )
        .then(page => {
          if (!valid()) {
            tourLog.cancelled();
            return;
          }
          const items = page.items.filter(isMappableTourContent);
          tourLog.success({ count: items.length });
          setTourHits(items);
          setTourLoading(false);
        })
        .catch(error => {
          if (!valid()) {
            tourLog.cancelled();
            return;
          }
          tourLog.failure(error);
          setTourLoading(false);
        });
    };
    startRef.current = { version: input.version, start };
    const timer = setTimeout(
      start,
      pendingSubmit.current === input.version ? 0 : 350,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
      if (startRef.current?.version === input.version) startRef.current = null;
    };
  }, [visible, input, onSearch]);

  const submit = useCallback(() => {
    const { text, version } = current.current;
    const query = text.trim();
    if (!query) return;
    const region = findRegionSearchResult(query);
    if (region) {
      invalidate();
      callbacks.current.onRegion(region, query);
      return;
    }
    if (query.length < 2) return;
    if (resolved.current?.version === version) {
      if (resolved.current.items.length)
        callbacks.current.onSubmit(resolved.current.items, query);
      return;
    }
    pendingSubmit.current = version;
    if (startRef.current?.version === version) startRef.current.start();
  }, [invalidate]);

  return {
    query: input.text,
    regionResult: findRegionSearchResult(input.text),
    pois,
    tourHits,
    loading,
    tourLoading,
    status,
    changeText,
    submit,
    invalidate,
  };
}
