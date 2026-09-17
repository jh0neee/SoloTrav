import { PublicRequestQueue } from '../src/api/publicRequestQueue';
import { ApiError, parseRetryAfter, toApiError } from '../src/api/errors';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test('shares an in-flight request and caches its successful result', async () => {
  const queue = new PublicRequestQueue(0);
  const loader = jest.fn(async () => ({ count: 3 }));
  const a = queue.get('same', loader);
  const b = queue.get('same', loader);
  await expect(a).resolves.toEqual({ count: 3 });
  await expect(b).resolves.toEqual({ count: 3 });
  await queue.get('same', loader);
  expect(loader).toHaveBeenCalledTimes(1);
});

test('spaces requests and retries 429 only after Retry-After', async () => {
  const queue = new PublicRequestQueue(350);
  const limited = jest
    .fn()
    .mockRejectedValueOnce(
      new ApiError('limited', { status: 429, retryAfterMs: 5000 }),
    )
    .mockResolvedValue('ok');
  const next = jest.fn(async () => 'next');
  const first = queue.get('first', limited);
  const second = queue.get('second', next);
  await jest.advanceTimersByTimeAsync(4999);
  expect(limited).toHaveBeenCalledTimes(1);
  expect(next).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  await expect(first).resolves.toBe('ok');
  expect(next).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(350);
  await expect(second).resolves.toBe('next');
});

test('stops after one automatic retry and keeps the shared cooldown', async () => {
  const queue = new PublicRequestQueue(0, 60_000);
  const loader = jest
    .fn()
    .mockRejectedValue(new ApiError('limited', { status: 429 }));
  const result = queue.get('limited', loader).catch(error => error);
  await jest.advanceTimersByTimeAsync(60_000);
  expect(await result).toBeInstanceOf(ApiError);
  expect(loader).toHaveBeenCalledTimes(2);
  expect(queue.getCooldownUntil()).toBeGreaterThan(Date.now());
});

test('cancelled old filter is removed during cooldown; latest filter resumes', async () => {
  const queue = new PublicRequestQueue(0, 1000);
  const controller = new AbortController();
  const oldLoader = jest
    .fn()
    .mockRejectedValue(new ApiError('limited', { status: 429 }));
  const oldResult = queue
    .get('old', oldLoader, controller.signal)
    .catch(error => error);
  await jest.advanceTimersByTimeAsync(0);
  controller.abort();
  const latestLoader = jest.fn(async () => 'latest');
  const latest = queue.get('latest', latestLoader);
  await jest.advanceTimersByTimeAsync(999);
  expect(latestLoader).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(await oldResult).toMatchObject({ name: 'AbortError' });
  await expect(latest).resolves.toBe('latest');
  expect(oldLoader).toHaveBeenCalledTimes(1);
});

test('cancelling one subscriber does not cancel another subscriber', async () => {
  const queue = new PublicRequestQueue(0);
  const controller = new AbortController();
  let complete!: (value: string) => void;
  let requestSignal!: AbortSignal;
  const loader = jest.fn((signal: AbortSignal) => {
    requestSignal = signal;
    return new Promise<string>(resolve => {
      complete = resolve;
    });
  });
  const cancelled = queue
    .get('shared', loader, controller.signal)
    .catch(error => error);
  const retained = queue.get('shared', loader);
  await jest.advanceTimersByTimeAsync(0);
  controller.abort();
  expect(requestSignal.aborted).toBe(false);
  complete('value');
  expect(await cancelled).toMatchObject({ name: 'AbortError' });
  await expect(retained).resolves.toBe('value');
});

test('expired cache reloads and failed responses are not cached', async () => {
  const queue = new PublicRequestQueue(0);
  const loader = jest
    .fn()
    .mockResolvedValueOnce(1)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(2);
  await queue.get('key', loader, undefined, 1000);
  await jest.advanceTimersByTimeAsync(1001);
  await expect(queue.get('key', loader)).rejects.toThrow('offline');
  await expect(queue.get('key', loader)).resolves.toBe(2);
});

test('preserves Retry-After seconds and HTTP date in normalized errors', () => {
  expect(parseRetryAfter('12')).toBe(12_000);
  expect(
    parseRetryAfter(new Date(Date.now() + 30_000).toUTCString()),
  ).toBeGreaterThanOrEqual(29_000);
  expect(parseRetryAfter('invalid')).toBeUndefined();
  const result = toApiError({
    isAxiosError: true,
    response: {
      status: 429,
      headers: { 'retry-after': '5' },
      data: { message: 'limited' },
    },
  });
  expect(result.retryAfterMs).toBe(5000);
});
