import AsyncStorage from '@react-native-async-storage/async-storage';
import { travelApi } from '../src/api/travelApi';
import { travelPublicGet } from '../src/api/travelPublicClient';
import { cachedPublicData } from '../src/storage/publicDataCache';
import { ApiError } from '../src/api/errors';
import { parseRegion } from '../src/api/safetyApi';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('../src/api/client', () => ({ apiClient: {} }));
jest.mock('../src/api/travelPublicClient', () => ({
  travelPublicGet: jest.fn(),
}));
jest.mock('../src/config/userAgent', () => ({ APP_NAME: 'test' }));

const get = jest.mocked(travelPublicGet);
const storage = jest.mocked(AsyncStorage);
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-17T12:00:00Z'));
  get.mockReset();
  storage.getItem.mockReset().mockResolvedValue(null);
  storage.setItem.mockReset().mockResolvedValue();
});
afterEach(() => jest.useRealTimers());

test('stops date discovery at the first available week', async () => {
  get
    .mockResolvedValueOnce({ data: { payload: { totalCount: 0 } } })
    .mockResolvedValueOnce({ data: { payload: { totalCount: 1 } } });
  expect(await travelApi.findLatestVisitorDate()).toBe('20260905');
  expect(get).toHaveBeenCalledTimes(2);
  expect(storage.setItem).toHaveBeenCalled();
});

test('a stored recent date skips network discovery on a new app session', async () => {
  storage.getItem.mockResolvedValue(
    JSON.stringify({ savedAt: Date.now() - 1000, value: '20260815' }),
  );
  expect(await travelApi.findLatestVisitorDate()).toBe('20260815');
  expect(get).not.toHaveBeenCalled();
});

test('checks the previously successful date first when refreshing', async () => {
  storage.getItem.mockResolvedValue(
    JSON.stringify({
      savedAt: Date.now() - 25 * 60 * 60_000,
      value: '20260815',
    }),
  );
  get.mockResolvedValue({ data: { payload: { totalCount: 1 } } });
  expect(await travelApi.findLatestVisitorDate()).toBe('20260912');
  expect(get.mock.calls[0][0]).toContain('startYmd=20260815');
  expect(get.mock.calls[1][0]).toContain('startYmd=20260912');
});

test('a rate limit does not trigger probes for all remaining dates or cache an empty result', async () => {
  get.mockRejectedValue(new ApiError('limited', { status: 429 }));
  await expect(travelApi.findLatestVisitorDate()).rejects.toMatchObject({
    status: 429,
  });
  expect(get).toHaveBeenCalledTimes(1);
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('statistics use the stored payload rather than repeating the download', async () => {
  storage.getItem.mockResolvedValue(
    JSON.stringify({
      savedAt: Date.now(),
      value: { data: { payload: { items: [] } } },
    }),
  );
  expect(await travelApi.getVisitorTotals('20260815')).toEqual(new Map());
  expect(get).not.toHaveBeenCalled();
});

test('persistent cache shares concurrent loads and tolerates storage failure', async () => {
  storage.getItem.mockRejectedValue(new Error('storage unavailable'));
  storage.setItem.mockRejectedValue(new Error('storage unavailable'));
  const loader = jest.fn(async () => ({ value: 42 }));
  const results = await Promise.all([
    cachedPublicData('test-shared', 1000, loader),
    cachedPublicData('test-shared', 1000, loader),
  ]);
  expect(results).toEqual([{ value: 42 }, { value: 42 }]);
  expect(loader).toHaveBeenCalledTimes(1);
});

test('safety requests use the same province for abbreviated and omitted addresses', () => {
  expect(parseRegion('청주시 상당구 수동로')).toEqual({
    sido: '충청북도',
    sigungu: '청주시',
  });
  expect(parseRegion('충북 청주시 상당구')).toEqual({
    sido: '충청북도',
    sigungu: '청주시',
  });
});
