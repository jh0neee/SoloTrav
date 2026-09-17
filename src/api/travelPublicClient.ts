import { apiClient } from './client';
import { PublicRequestQueue } from './publicRequestQueue';
import { logMapDiagnostic } from '../map/mapApiLogger';

export const travelRequestQueue = new PublicRequestQueue();
travelRequestQueue.subscribe(() => {
  logMapDiagnostic('travel.cooldown', {
    until: travelRequestQueue.getCooldownUntil(),
    remainingMs: Math.max(
      0,
      travelRequestQueue.getCooldownUntil() - Date.now(),
    ),
  });
});

/** 토큰·사용자 데이터가 아닌 공개 여행 GET 결과만 공유합니다. */
export function travelPublicGet(
  url: string,
  options: { signal?: AbortSignal } = {},
) {
  return travelRequestQueue.get(
    url,
    async signal => {
      const response = await apiClient.get(url, { signal });
      return { data: response.data };
    },
    options.signal,
    url.startsWith('/travel/regional-safety/') ? 24 * 60 * 60_000 : 10 * 60_000,
  );
}
