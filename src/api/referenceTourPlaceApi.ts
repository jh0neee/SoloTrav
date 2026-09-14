import { apiClient } from './client';
import { ENDPOINTS, type ReferencePlaceResource } from './endpoints';
import { toApiError } from './errors';
import type { ViewportBounds } from '../map/useNearbyPlaces';
import {
  CATEGORY_TO_CONTENT_TYPE,
  type TourCategory,
} from '../types/tourPlace';
import type { MappableTourContent } from '../types/travel';

export type ReferenceTourCategory = Extract<TourCategory, 'food' | 'stay'>;

const RESOURCE_BY_CATEGORY: Record<
  ReferenceTourCategory,
  ReferencePlaceResource
> = {
  food: 'restaurants',
  stay: 'lodgings',
};

type Raw = Record<string, unknown>;

function value(raw: Raw, keys: string[]) {
  for (const key of keys) {
    const found = raw[key];
    if (found !== undefined && found !== null && found !== '') return found;
  }
}

function text(input: unknown): string | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const result = String(input).trim();
  return result || null;
}

function number(input: unknown): number | null {
  const result = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(result) ? result : null;
}

function features(payload: unknown): Raw[] {
  if (!payload || typeof payload !== 'object') return [];
  const raw = payload as Raw;
  if (Array.isArray(raw.features)) return raw.features as Raw[];
  for (const key of ['payload', 'data']) {
    const nested = features(raw[key]);
    if (nested.length) return nested;
  }
  return [];
}

function normalize(
  feature: Raw,
  category: ReferenceTourCategory,
  index: number,
): MappableTourContent | null {
  const properties =
    feature.properties && typeof feature.properties === 'object'
      ? (feature.properties as Raw)
      : {};
  const geometry =
    feature.geometry && typeof feature.geometry === 'object'
      ? (feature.geometry as Raw)
      : {};
  const coordinates = Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : [];
  const lat = number(coordinates[1] ?? value(properties, ['latitude', 'lat']));
  const lng = number(
    coordinates[0] ?? value(properties, ['longitude', 'lng', 'lon']),
  );
  if (
    lat === null ||
    lng === null ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  const resource = RESOURCE_BY_CATEGORY[category];
  const sourceId =
    text(feature.id) ??
    text(
      value(properties, [
        'id',
        'management_number',
        'managementNumber',
        'local_government_code',
      ]),
    ) ??
    String(index);
  const title =
    text(value(properties, ['name', 'title', 'business_name'])) ??
    (category === 'food' ? '음식점' : '숙박업소');
  const roadAddress = text(value(properties, ['road_address', 'roadAddress']));
  const parcelAddress = text(
    value(properties, ['parcel_address', 'parcelAddress', 'address']),
  );

  return {
    contentId: `reference:${resource}:${sourceId}`,
    contentTypeId: CATEGORY_TO_CONTENT_TYPE[category],
    typeLabel: category === 'food' ? '음식점' : '숙박',
    category,
    title,
    address: roadAddress ?? parcelAddress ?? '',
    tel: text(value(properties, ['telephone', 'phone', 'tel'])),
    imageUrl: null,
    thumbnailUrl: null,
    lat,
    lng,
    regionCode: null,
    districtCode: null,
    distance: null,
    eventStartDate: null,
    eventEndDate: null,
  };
}

export const referenceTourPlaceApi = {
  map: async (
    category: ReferenceTourCategory,
    bounds: ViewportBounds,
    signal?: AbortSignal,
  ): Promise<MappableTourContent[]> => {
    try {
      const { data } = await apiClient.get(
        ENDPOINTS.referencePlacesMap(RESOURCE_BY_CATEGORY[category], {
          ...bounds,
          page: 1,
          limit: 200,
        }),
        { signal },
      );
      return features(data)
        .map((feature, index) => normalize(feature, category, index))
        .filter((item): item is MappableTourContent => item !== null);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
