jest.mock('../src/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), head: jest.fn() },
}));
jest.mock('../src/api/mappers', () => ({
  unwrap: (data: { payload: unknown }) => data.payload,
}));
jest.mock('../src/config/env', () => ({
  env: { apiBaseUrl: 'https://example.test/api/v1' },
}));

import { apiClient } from '../src/api/client';
import { mediaApi, mediaIdFromUrl } from '../src/api/mediaApi';

const client = apiClient as jest.Mocked<typeof apiClient>;
const id = 'ce417389-d36a-466f-b911-538496293d52';
beforeEach(() => jest.clearAllMocks());

test('only own-origin UUID media URLs are scanned', () => {
  expect(mediaIdFromUrl(`https://example.test/api/v1/media/${id}`)).toBe(id);
  expect(mediaIdFromUrl(`https://other.test/api/v1/media/${id}`)).toBeNull();
  expect(mediaIdFromUrl('https://example.test/uploads/photo.jpg')).toBeNull();
});

test('status and batch endpoints unwrap the actual payload envelope', async () => {
  client.get.mockResolvedValueOnce({
    data: { payload: { status: 'ERROR', retryable: true } },
  });
  expect(await mediaApi.status(id)).toMatchObject({
    status: 'ERROR',
    retryable: true,
  });
  expect(client.get).toHaveBeenCalledWith(`/media/${id}/status`, {
    signal: undefined,
  });
  client.get.mockResolvedValueOnce({
    data: { payload: [{ id, status: 'CLEAN', retryable: false }] },
  });
  expect(await mediaApi.statuses([id])).toEqual([
    { id, status: 'CLEAN', retryable: false },
  ]);
  expect(client.get).toHaveBeenLastCalledWith('/media/statuses', {
    params: { ids: id },
    signal: undefined,
  });
  await expect(mediaApi.statuses(Array(21).fill(id))).rejects.toThrow('20');
});

test('unknown statuses need a real image response, SVG never counts as clean', async () => {
  client.get.mockResolvedValue({
    data: { payload: { status: 'UNDOCUMENTED', retryable: false } },
  });
  client.head.mockResolvedValueOnce({
    headers: {
      'content-type': 'image/svg+xml',
      'x-image-scan-status': 'SCANNING',
    },
  });
  expect((await mediaApi.status(id)).status).toBe('SCANNING');
  client.head.mockResolvedValueOnce({
    headers: { 'content-type': 'image/webp' },
  });
  expect((await mediaApi.status(id)).status).toBe('CLEAN');
});

test('retry uses POST without uploading any file', async () => {
  client.post.mockResolvedValue({ data: {} });
  await mediaApi.retry(id);
  expect(client.post).toHaveBeenCalledWith(`/media/${id}/retry`);
});
