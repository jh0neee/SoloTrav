import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildKakaoMapHtml } from '../src/screens/map/kakaoMapHtml';
const { runInNewContext } = require('vm') as {
  runInNewContext: (code: string, context: object) => void;
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../src/config/kakao', () => ({ KAKAO_JS_KEY: 'test' }));

const view = { center: { lat: 36.65, lng: 127.85 }, level: 7 };
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

test('restores the saved center and zoom after a new session', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ regionCode: '43', viewport: view }),
  );
  // resetModules gives the storage module a new in-memory session.
  const storage = require('../src/map/mapViewportStorage').mapViewportStorage;
  const freshAsyncStorage = require('@react-native-async-storage/async-storage');
  freshAsyncStorage.getItem.mockResolvedValue(
    JSON.stringify({ regionCode: '43', viewport: view }),
  );
  expect(await storage.load()).toEqual(view);
});

test.each([
  null,
  '{broken',
  JSON.stringify({ regionCode: '11', viewport: view }),
  JSON.stringify({ regionCode: '43', viewport: { ...view, level: 0 } }),
])('ignores absent, corrupt or invalid saved history: %s', async raw => {
  const storage = require('../src/map/mapViewportStorage').mapViewportStorage;
  require('@react-native-async-storage/async-storage').getItem.mockResolvedValue(
    raw,
  );
  expect(await storage.load()).toBeNull();
});

test('a new selection wins over a delayed storage read', async () => {
  const storage = require('../src/map/mapViewportStorage').mapViewportStorage;
  let finish!: (value: string | null) => void;
  require('@react-native-async-storage/async-storage').getItem.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  const loading = storage.load();
  await storage.save(view);
  finish(null);
  expect(await loading).toEqual(view);
});

test.each([
  ['4311100000', true],
  ['3011000000', false],
])(
  'classifies administrative code %s and reuses the result',
  (code, expected) => {
    const html = buildKakaoMapHtml({
      center: view.center,
      myLocation: view.center,
      initialCategory: 'attraction',
    });
    const start = html.indexOf('  function lookupRegion(');
    const end = html.indexOf('  window.__locateRegion', start);
    const request = jest.fn((_lng, _lat, callback) =>
      callback([{ code, region_2depth_name: '청주시 상당구' }], 'OK'),
    );
    const context = {
      regionService: { coord2RegionCode: request },
      regionCache: {},
      kakao: { maps: { services: { Status: { OK: 'OK' } } } },
      setTimeout,
      clearTimeout,
      lookupRegion: undefined as any,
    };
    runInNewContext(html.slice(start, end), context);
    const callback = jest.fn();
    context.lookupRegion(36.65, 127.85, callback);
    context.lookupRegion(36.65, 127.85, callback);
    expect(callback).toHaveBeenLastCalledWith(
      expected,
      expected ? '청주시 상당구' : null,
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0].slice(0, 2)).toEqual([127.85, 36.65]);
  },
);
