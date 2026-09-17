import { REGION_PAGE_SIZE, travelApi } from '../api/travelApi';
import { ApiError } from '../api/errors';
import type { City } from '../data/cities';
import {
  isMappableTourContent,
  type MappableTourContent,
} from '../types/travel';
import { logMapDiagnostic, startMapApiLog } from './mapApiLogger';

const districts = new Map<
  string,
  { items: MappableTourContent[]; expiresAt: number }
>();
const TTL_MS = 10 * 60_000;

/** 구별 성공 결과는 유지하고, 누락·만료된 구만 순서대로 보충합니다. */
export async function loadRegionTourism(
  city: Pick<City, 'regionCode' | 'sigungu'>,
  districtCodes: string[],
  signal: AbortSignal,
  onProgress: (items: MappableTourContent[]) => void,
  actionId: string,
) {
  const keyFor = (code: string) => `${city.regionCode}:${code}`;
  const current = new Map<string, MappableTourContent[]>();
  for (const code of districtCodes) {
    const cached = districts.get(keyFor(code));
    if (cached) current.set(code, cached.items);
  }
  const merged = () =>
    Array.from(
      new Map(
        [...current.values()].flat().map(item => [item.contentId, item]),
      ).values(),
    );
  onProgress(merged());
  const failedDistrictCodes: string[] = [];
  let lastError: unknown;
  for (const [index, districtCode] of districtCodes.entries()) {
    if (signal.aborted) throw new Error('조회가 취소되었습니다.');
    const cacheKey = keyFor(districtCode);
    const cached = districts.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logMapDiagnostic(
        'region.cache-hit',
        { cacheKey, districtCode, count: cached.items.length },
        actionId,
      );
      continue;
    }
    logMapDiagnostic(
      'region.cache-miss',
      { cacheKey, districtCode, reason: cached ? 'expired' : 'missing' },
      actionId,
    );
    try {
      const items: MappableTourContent[] = [];
      let pageNo = 1;
      let totalPages = 1;
      do {
        if (signal.aborted) throw new Error('조회가 취소되었습니다.');
        const params = {
          regionCode: city.regionCode,
          districtCode,
          page: pageNo,
          size: REGION_PAGE_SIZE,
          arrange: 'A',
        } as const;
        const request = startMapApiLog(
          'tour/area-based-list',
          { city: city.sigungu, ...params },
          actionId,
        );
        try {
          const page = await travelApi.listSpotsByRegion(params, signal);
          if (signal.aborted) throw new Error('조회가 취소되었습니다.');
          request.success({
            count: page.items.length,
            totalCount: page.totalCount,
          });
          items.push(...page.items.filter(isMappableTourContent));
          totalPages = Math.max(
            1,
            Math.ceil(page.totalCount / REGION_PAGE_SIZE),
          );
          pageNo++;
        } catch (error) {
          if (signal.aborted) request.cancelled();
          else request.failure(error);
          throw error;
        }
      } while (pageNo <= totalPages);
      districts.set(cacheKey, { items, expiresAt: Date.now() + TTL_MS });
      current.set(districtCode, items);
      onProgress(merged());
      logMapDiagnostic(
        'district.complete',
        { districtCode, count: items.length },
        actionId,
      );
      logMapDiagnostic(
        'region.cache-store',
        { cacheKey, count: items.length, partial: false },
        actionId,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
      failedDistrictCodes.push(districtCode);
      logMapDiagnostic(
        'district.failed',
        {
          districtCode,
          error: error instanceof Error ? error.message : String(error),
        },
        actionId,
      );
      if (error instanceof ApiError && error.status === 429) {
        // 공통 대기열의 자동 재시도까지 실패했다면 구마다 재시도를 반복하지 않습니다.
        failedDistrictCodes.push(
          ...districtCodes.slice(index + 1).filter(code => {
            const entry = districts.get(keyFor(code));
            return !entry || entry.expiresAt <= Date.now();
          }),
        );
        break;
      }
    }
  }
  return { items: merged(), failedDistrictCodes, error: lastError };
}
