import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import { ApiError, toApiError } from './errors';
import { toTravelCourse } from './assistantMappers';
import type { TravelCourseDto } from './assistantDto';
import type { AiRouteFavorite } from '../types/favorite';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

function unwrap(value: unknown): unknown {
  const source = record(value);
  return source?.payload ?? source?.data ?? value;
}

function mapFavorite(value: unknown): AiRouteFavorite | null {
  const source = record(unwrap(value));
  if (!source) return null;
  const id = text(source.id ?? source.favoriteId);
  if (!id) return null;
  const result = record(source.result ?? source.aiResult ?? source.response);
  const metadata = record(source.metadata ?? result?.metadata);
  const course = toTravelCourse(
    (source.course ?? metadata?.course) as TravelCourseDto | null | undefined,
  );
  return {
    id,
    requestId: text(source.requestId ?? source.aiRequestId),
    title: text(source.title ?? course?.title),
    summary: text(source.summary ?? course?.summary),
    createdAt: text(source.createdAt ?? source.created_at),
    course,
  };
}

function listFrom(value: unknown): unknown[] {
  const data = unwrap(value);
  if (Array.isArray(data)) return data;
  const source = record(data);
  const candidates = [source?.items, source?.favorites, source?.content, source?.results];
  return candidates.find(Array.isArray) ?? [];
}

export const favoriteApi = {
  async register(requestId: string): Promise<AiRouteFavorite | null> {
    try {
      const { data } = await apiClient.post(ENDPOINTS.aiFavorites(), { requestId });
      return mapFavorite(data);
    } catch (error) {
      throw toApiError(error);
    }
  },
  async list(): Promise<AiRouteFavorite[]> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.aiFavorites());
      return listFrom(data).map(mapFavorite).filter((item): item is AiRouteFavorite => item !== null);
    } catch (error) {
      throw toApiError(error);
    }
  },
  async detail(id: string): Promise<AiRouteFavorite> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.aiFavorite(id));
      const favorite = mapFavorite(data);
      if (!favorite) throw new ApiError('저장된 코스 상세 정보를 읽을 수 없습니다.', { payload: data });
      return favorite;
    } catch (error) {
      throw toApiError(error);
    }
  },
  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(ENDPOINTS.aiFavorite(id));
    } catch (error) {
      throw toApiError(error);
    }
  },
};
