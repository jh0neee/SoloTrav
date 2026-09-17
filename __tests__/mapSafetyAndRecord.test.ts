import { mapSafetyBadge } from '../src/map/useRegionSafety';
import { safetyOf } from '../src/travel/homeQueries';
import { CITIES } from '../src/data/cities';
import { recordSafetyLabel } from '../src/types/travelRecord';
import { toRegionSafetyList } from '../src/api/travelMappers';
import {
  toTravelRecord,
  toTravelRecordRequest,
} from '../src/api/recordMappers';

jest.mock('../src/api/travelApi', () => ({ travelApi: {} }));

test('record grades retain their API codes and have explicit safety labels', () => {
  expect(['A', 'B', 'C'].map(recordSafetyLabel)).toEqual([
    '안전 양호',
    '안전 보통',
    '안전 주의',
  ]);
});

test('blank and duplicate tags do not render empty hashtag chips', () => {
  expect(
    toTravelRecord({
      id: 1,
      tag: [' ', '뚜벅이여행', ' 뚜벅이여행 ', '혼자사진찍기좋음'],
    })?.tags,
  ).toEqual(['뚜벅이여행', '혼자사진찍기좋음']);
});
jest.mock('../src/config/env', () => ({
  env: { apiOrigin: 'https://example.test' },
}));

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

test.each([false, true])(
  'registration includes the boolean anonymity flag %s',
  isAnonymous => {
    expect(
      toTravelRecordRequest({
        isAnonymous,
        safetyGrade: 'A',
        tags: ['단양', '도담이'],
        description: ' 방가링 ',
        date: '2026-08-04',
      }),
    ).toEqual({
      isAnonymous,
      safetyGrade: 'A',
      tag: ['단양', '도담이'],
      description: '방가링',
      date: '2026-08-04',
    });
  },
);

test('anonymous responses mask nicknames while retaining ownership for editing', () => {
  const record = toTravelRecord({
    id: 1,
    isAnonymous: true,
    user: { id: 3, nickname: '실제 닉네임' },
  });
  expect(record).toMatchObject({
    isAnonymous: true,
    authorName: '익명',
    authorId: '3',
  });
  expect(
    toTravelRecordRequest({ ...record!, isAnonymous: record!.isAnonymous }),
  ).toMatchObject({ isAnonymous: true });
});

test('older responses without the flag keep their existing display name', () => {
  expect(toTravelRecord({ id: 1, user: { nickname: '닉네임' } })).toMatchObject(
    { isAnonymous: false, authorName: '닉네임' },
  );
});
