jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('../src/api/mediaApi', () => ({
  mediaApi: {
    status: jest.fn(),
    statuses: jest.fn(),
    retry: jest.fn(),
  },
}));
jest.mock('../src/user/userStore', () => ({
  userStore: { get: () => ({ id: 'owner' }) },
}));
jest.mock('../src/storage/tokenStorage', () => ({
  tokenStorage: { get: () => ({ accessToken: 'test' }) },
}));
jest.mock('../src/api/errors', () => ({ toApiError: (error: Error) => error }));

import { mediaApi } from '../src/api/mediaApi';
import { mediaScanStore } from '../src/media/mediaScanStore';

const api = mediaApi as jest.Mocked<typeof mediaApi>;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
});

test('polls a single image until clean and then stops', async () => {
  api.status
    .mockResolvedValueOnce({ status: 'PENDING', retryable: false })
    .mockResolvedValue({ status: 'CLEAN', retryable: false });
  const unsubscribe = mediaScanStore.subscribe('single', jest.fn());
  await jest.advanceTimersByTimeAsync(100);
  expect(mediaScanStore.get('single').status).toBe('PENDING');
  await jest.advanceTimersByTimeAsync(3000);
  expect(mediaScanStore.get('single').status).toBe('CLEAN');
  await jest.advanceTimersByTimeAsync(10000);
  expect(api.status).toHaveBeenCalledTimes(2);
  unsubscribe();
});

test('only the uploader retries retryable errors, with a bounded retry count', async () => {
  api.status.mockResolvedValue({ status: 'ERROR', retryable: true });
  api.retry.mockResolvedValue();
  const unsubscribe = mediaScanStore.subscribe('owned', jest.fn(), 'owner');
  await jest.advanceTimersByTimeAsync(10000);
  expect(api.retry).toHaveBeenCalledTimes(2);
  expect(mediaScanStore.get('owned').status).toBe('ERROR');
  mediaScanStore.recheck('owned');
  await jest.advanceTimersByTimeAsync(100);
  expect(api.retry).toHaveBeenCalledTimes(2);
  unsubscribe();
  const other = mediaScanStore.subscribe('other', jest.fn(), 'someone-else');
  await jest.advanceTimersByTimeAsync(100);
  expect(api.retry).toHaveBeenCalledTimes(2);
  other();
});

test('batches at most 20 images and cancels polling after unsubscribe', async () => {
  api.statuses.mockImplementation(async ids =>
    ids.map(id => ({ id, status: 'PENDING', retryable: false })),
  );
  api.status.mockResolvedValue({ status: 'PENDING', retryable: false });
  const subscriptions = Array.from({ length: 21 }, (_, i) =>
    mediaScanStore.subscribe(`batch-${i}`, jest.fn()),
  );
  await jest.advanceTimersByTimeAsync(100);
  expect(api.statuses.mock.calls[0][0]).toHaveLength(20);
  expect(api.status).toHaveBeenCalledTimes(1);
  subscriptions.forEach(unsubscribe => unsubscribe());
  await jest.advanceTimersByTimeAsync(10000);
  expect(api.statuses).toHaveBeenCalledTimes(1);
});

test('retry rejection is shown and does not cause a request loop', async () => {
  api.status.mockResolvedValue({ status: 'ERROR', retryable: true });
  api.retry.mockRejectedValue(new Error('재시도 횟수를 초과했습니다.'));
  const unsubscribe = mediaScanStore.subscribe('limit', jest.fn(), 'owner');
  await jest.advanceTimersByTimeAsync(10000);
  expect(api.retry).toHaveBeenCalledTimes(1);
  expect(mediaScanStore.get('limit').message).toBe(
    '재시도 횟수를 초과했습니다.',
  );
  unsubscribe();
});
