import { CITIES } from '../data/cities';
import {
  safetyStatusOf,
  useRegionSafety as useRankingSafety,
  type SafetyMap,
} from '../travel/homeQueries';

export function mapSafetyBadge(sigungu: string | null, data: SafetyMap | null) {
  if (!sigungu || !data) return null;
  const city = CITIES.find(
    item => sigungu === item.sigungu || sigungu.startsWith(item.sigungu + ' '),
  );
  if (!city) return null;
  const safety = data[city.sigungu];
  if (!safety) return null;
  return { regionName: city.sigungu, status: safetyStatusOf(safety.soloScore) };
}

export function useRegionSafety(sigungu: string | null) {
  const { data } = useRankingSafety();
  return mapSafetyBadge(sigungu, data);
}
