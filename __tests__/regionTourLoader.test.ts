import { loadRegionTourism } from '../src/map/regionTourLoader';
import { travelApi } from '../src/api/travelApi';
import { ApiError } from '../src/api/errors';

jest.mock('../src/api/travelApi', () => ({
  REGION_PAGE_SIZE: 100,
  travelApi: { listSpotsByRegion: jest.fn() },
}));
jest.mock('../src/map/mapApiLogger', () => ({
  logMapDiagnostic: jest.fn(),
  startMapApiLog: () => ({
    success: jest.fn(),
    failure: jest.fn(),
    cancelled: jest.fn(),
  }),
}));

const list = jest.mocked(travelApi.listSpotsByRegion);
beforeEach(() => list.mockReset());

test('publishes successful districts and retries only the missing district', async () => {
  const item = { contentId: 'one', category: 'attraction', lat: 36, lng: 127 };
  list
    .mockResolvedValueOnce({ items: [item], totalCount: 1 } as never)
    .mockRejectedValueOnce(new Error('temporary'));
  const progress = jest.fn();
  const city = { regionCode: 'test-partial', sigungu: 'test' };
  const first = await loadRegionTourism(
    city,
    ['111', '112'],
    new AbortController().signal,
    progress,
    'first',
  );
  expect(first.failedDistrictCodes).toEqual(['112']);
  expect(first.items).toEqual([item]);
  expect(progress).toHaveBeenCalledWith([item]);
  list.mockClear();
  list.mockResolvedValueOnce({ items: [], totalCount: 0 } as never);
  const second = await loadRegionTourism(
    city,
    ['111', '112'],
    new AbortController().signal,
    progress,
    'second',
  );
  expect(second.failedDistrictCodes).toEqual([]);
  expect(second.items).toEqual([item]);
  expect(list).toHaveBeenCalledTimes(1);
  expect(list.mock.calls[0][0].districtCode).toBe('112');
  list.mockClear();
  await loadRegionTourism(
    city,
    ['111', '112'],
    new AbortController().signal,
    progress,
    'third',
  );
  expect(list).not.toHaveBeenCalled();
});

test('does not request all remaining districts after the shared 429 retry fails', async () => {
  list.mockRejectedValue(new ApiError('limited', { status: 429 }));
  const result = await loadRegionTourism(
    { regionCode: 'test-429', sigungu: 'test' },
    ['111', '112', '113', '114'],
    new AbortController().signal,
    jest.fn(),
    'limited',
  );
  expect(list).toHaveBeenCalledTimes(1);
  expect(result.failedDistrictCodes).toEqual(['111', '112', '113', '114']);
});

test('an aborted response is not cached or published', async () => {
  const controller = new AbortController();
  list.mockImplementationOnce(async () => {
    controller.abort();
    return { items: [], totalCount: 0, nextPage: null };
  });
  const city = { regionCode: 'test-abort', sigungu: 'test' };
  await expect(
    loadRegionTourism(city, ['111'], controller.signal, jest.fn(), 'abort'),
  ).rejects.toThrow();
  list.mockResolvedValueOnce({ items: [], totalCount: 0, nextPage: null });
  await loadRegionTourism(
    city,
    ['111'],
    new AbortController().signal,
    jest.fn(),
    'retry',
  );
  expect(list).toHaveBeenCalledTimes(2);
});
