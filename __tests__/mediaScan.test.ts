jest.mock('../src/api/mediaApi', () => ({
  mediaApi: {
    status: jest.fn(),
    statuses: jest.fn(),
    retry: jest.fn(),
  },
  mediaIdFromUrl: (url: string) => {
    const match = url.match(/\/media\/([^/?#]+)/);
    return match ? match[1] : null;
  },
}));
jest.mock('../src/api/errors', () => ({
  toApiError: (error: Error) => error,
}));

import { mediaApi } from '../src/api/mediaApi';
import { isCleanMediaUrl, isScanReady, mediaScanStore } from '../src/media/mediaScanStore';

const api = mediaApi as jest.Mocked<typeof mediaApi>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

test('게시물 조회는 1회 상태만 확인하며 절대 자동 재검사(api.retry)를 호출하지 않는다', async () => {
  api.status.mockResolvedValue({ id: 'err-1', status: 'ERROR', retryable: true });

  const listener = jest.fn();
  const unsubscribe = mediaScanStore.subscribe('err-1', listener);

  await jest.advanceTimersByTimeAsync(100);

  expect(api.status).toHaveBeenCalledTimes(1);
  expect(mediaScanStore.get('err-1').status).toBe('ERROR');
  expect(isScanReady(mediaScanStore.get('err-1').status)).toBe(false);
  expect(isCleanMediaUrl('https://example.com/media/err-1')).toBe(false);

  // 자동 재시도가 절대 발생하지 않아야 함
  expect(api.retry).not.toHaveBeenCalled();

  // 시간이 지나도 자동 반복 폴링하지 않음
  await jest.advanceTimersByTimeAsync(10000);
  expect(api.status).toHaveBeenCalledTimes(1);
  expect(api.retry).not.toHaveBeenCalled();

  unsubscribe();
});

test('게시물 조회 시 최대 20개 단위로 묶어서 조회한다', async () => {
  api.statuses.mockImplementation(async ids =>
    ids.map(id => ({ id, status: 'CLEAN', retryable: false })),
  );
  api.status.mockResolvedValue({ id: 'batch-20', status: 'CLEAN', retryable: false });

  const subscriptions = Array.from({ length: 21 }, (_, i) =>
    mediaScanStore.subscribe(`batch-${i}`, jest.fn()),
  );

  await jest.advanceTimersByTimeAsync(100);

  expect(api.statuses).toHaveBeenCalledTimes(1);
  expect(api.statuses.mock.calls[0][0]).toHaveLength(20);
  expect(api.status).toHaveBeenCalledTimes(1);

  subscriptions.forEach(unsub => unsub());
});

test('업로드 직후: waitForScan은 모든 이미지가 CLEAN이 될 때까지 폴링 후 성공을 반환한다', async () => {
  api.status
    .mockResolvedValueOnce({ id: 'upload-1', status: 'PROCESSING', retryable: false })
    .mockResolvedValueOnce({ id: 'upload-1', status: 'CLEAN', retryable: false });

  const waitPromise = mediaScanStore.waitForScan(['upload-1'], {
    timeoutMs: 5000,
    intervalMs: 500,
  });

  // 1회차: PROCESSING
  await jest.advanceTimersByTimeAsync(10);
  // 2회차: 500ms 후 CLEAN
  await jest.advanceTimersByTimeAsync(500);

  const result = await waitPromise;
  expect(result.success).toBe(true);
  expect(result.cleanIds).toEqual(['upload-1']);
  expect(mediaScanStore.get('upload-1').status).toBe('CLEAN');
});

test('업로드 직후: 검사 실패 시 retryable 정보를 포함한 실패 결과를 반환하며 자동 재검사하지 않는다', async () => {
  api.status.mockResolvedValue({ id: 'upload-fail', status: 'ERROR', retryable: true });

  const waitPromise = mediaScanStore.waitForScan(['upload-fail'], {
    timeoutMs: 3000,
    intervalMs: 500,
  });

  await jest.advanceTimersByTimeAsync(10);

  const result = await waitPromise;
  expect(result.success).toBe(false);
  expect(result.failedIds).toEqual(['upload-fail']);
  expect(result.retryableId).toBe('upload-fail');
  expect(api.retry).not.toHaveBeenCalled();
});

test('수동 재검사(retry)는 사용자가 명시적으로 호출할 때만 api.retry를 호출한다', async () => {
  api.retry.mockResolvedValue();

  await mediaScanStore.retry('retry-target');

  expect(api.retry).toHaveBeenCalledWith('retry-target');
  expect(mediaScanStore.get('retry-target').status).toBe('PENDING');
});
