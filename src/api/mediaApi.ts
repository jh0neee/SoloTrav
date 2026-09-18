import { apiClient } from './client';
import { unwrap } from './mappers';
import { env } from '../config/env';

export type MediaStatus = {
  id?: string;
  status: string;
  url?: string;
  statusUrl?: string;
  retryable: boolean;
};

async function normalizeStatus(
  id: string,
  value: MediaStatus,
  signal?: AbortSignal,
): Promise<MediaStatus> {
  const status =
    typeof value.status === 'string' ? value.status.toUpperCase() : 'UNKNOWN';
  if (
    [
      'CLEAN',
      'ERROR',
      'PENDING',
      'QUEUED',
      'SCANNING',
      'PROCESSING',
      'INFECTED',
      'BLOCKED',
      'REJECTED',
    ].includes(status)
  ) {
    return { ...value, status };
  }
  // The media endpoint serves raster images only after a successful scan.
  // Unknown enum values must never be assumed to mean a successful scan.
  const response = await apiClient.head(`/media/${encodeURIComponent(id)}`, {
    signal,
  });
  const type = String(response.headers['content-type'] ?? '').split(';')[0];
  const ready = /^image\/(jpeg|png|webp|gif|avif|bmp)$/i.test(type);
  const headerStatus = String(
    response.headers['x-image-scan-status'] ?? '',
  ).toUpperCase();
  return { ...value, status: ready ? 'CLEAN' : headerStatus || status };
}

/** Only our media URLs participate in scanning; legacy uploads remain direct images. */
export function mediaIdFromUrl(url: string): string | null {
  const prefix = `${env.apiBaseUrl}/media/`;
  if (!url.startsWith(prefix)) return null;
  const id = url.slice(prefix.length).split(/[?#]/)[0];
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  )
    ? id
    : null;
}

export const mediaApi = {
  async status(id: string, signal?: AbortSignal): Promise<MediaStatus> {
    const { data } = await apiClient.get(
      `/media/${encodeURIComponent(id)}/status`,
      { signal },
    );
    return normalizeStatus(id, unwrap<MediaStatus>(data), signal);
  },
  async statuses(ids: string[], signal?: AbortSignal): Promise<MediaStatus[]> {
    if (ids.length === 0) return [];
    if (ids.length > 20)
      throw new Error('한 번에 최대 20개 사진을 조회할 수 있습니다.');
    const { data } = await apiClient.get('/media/statuses', {
      params: { ids: ids.join(',') },
      signal,
    });
    const result = unwrap<MediaStatus[]>(data);
    if (!Array.isArray(result))
      throw new Error('사진 검사 상태 응답을 확인할 수 없습니다.');
    return Promise.all(
      result.map(item =>
        item.id && ids.includes(item.id)
          ? normalizeStatus(item.id, item, signal)
          : item,
      ),
    );
  },
  async retry(id: string): Promise<void> {
    await apiClient.post(`/media/${encodeURIComponent(id)}/retry`);
  },
};
