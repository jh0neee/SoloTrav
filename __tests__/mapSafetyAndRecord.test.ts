import { mapSafetyBadge } from '../src/map/useRegionSafety';
import { safetyOf } from '../src/travel/homeQueries';
import { CITIES } from '../src/data/cities';
import { toRegionSafetyList } from '../src/api/travelMappers';

jest.mock('../src/api/travelApi', () => ({ travelApi: {} }));

test.each([1, 3, 5])(
  'map and ranking use the same status for grade %s',
  grade => {
    const city = CITIES.find(item => item.id === 'cheongju')!;
    const [safety] = toRegionSafetyList([
      {
        sido: '충청북도',
        sigungu: city.sigungu,
        crime_grade: grade,
        traffic_accident_grade: grade,
        life_safety_grade: grade,
      },
    ]);
    const data = { [city.sigungu]: safety };
    expect(mapSafetyBadge('청주시 상당구', data)).toEqual({
      regionName: city.sigungu,
      status: safetyOf(city, data).status,
    });
    expect(mapSafetyBadge(null, data)).toBeNull();
    expect(mapSafetyBadge('대전광역시', data)).toBeNull();
  },
);

test('map does not substitute static safety grades when data is missing', () => {
  expect(mapSafetyBadge('청주시', null)).toBeNull();
  expect(mapSafetyBadge('청주시', {})).toBeNull();
});
