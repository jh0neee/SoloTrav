import { CITIES } from '../../data/cities';
import type { SearchPoi } from './searchTypes';

export function findRegionSearchResult(query: string): SearchPoi | null {
  const normalized = query.replace(/\s/g, '').replace(/^(충청북도|충북)/, '');
  const city = CITIES.find(item =>
    [item.name, item.sigungu].some(
      name => normalized === name || normalized === name.replace(/[시군]$/, ''),
    ),
  );
  if (!city) return null;
  return {
    id: `region:${city.id}`,
    name: city.sigungu,
    address: `${city.sido} ${city.sigungu}`,
    roadAddress: '',
    category: '지역 둘러보기',
    phone: '',
    url: '',
    distance: null,
    lat: city.center.lat,
    lng: city.center.lng,
  };
}
