import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useMapSearch } from '../src/screens/map/useMapSearch';
import { findRegionSearchResult } from '../src/screens/map/regionSearch';
import { travelApi } from '../src/api/travelApi';
import type { SearchPoi } from '../src/screens/map/searchTypes';

jest.mock('../src/api/travelApi', () => ({
  travelApi: { searchSpots: jest.fn() },
}));
jest.mock('../src/map/mapApiLogger', () => ({
  startMapApiLog: () => ({
    success: jest.fn(),
    failure: jest.fn(),
    cancelled: jest.fn(),
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: Renderer.ReactTestRenderer;
beforeEach(() => {
  jest.useFakeTimers();
  jest
    .mocked(travelApi.searchSpots)
    .mockReset()
    .mockResolvedValue({ items: [], totalCount: 0, nextPage: null });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  jest.useRealTimers();
});

function poi(id: string): SearchPoi {
  return {
    id,
    name: id,
    address: '',
    roadAddress: '',
    category: '',
    phone: '',
    url: '',
    distance: null,
    lat: 36,
    lng: 127,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
async function setup(
  onSearch: (
    query: string,
  ) => Promise<{ items: SearchPoi[]; status: 'OK' }> = jest.fn(
    async (_query: string) => ({
      items: [poi('result')],
      status: 'OK' as const,
    }),
  ),
) {
  const onSubmit = jest.fn();
  const onRegion = jest.fn();
  let state!: ReturnType<typeof useMapSearch>;
  function Probe() {
    state = useMapSearch({ visible: true, onSearch, onSubmit, onRegion });
    return null;
  }
  await act(async () => {
    renderer = Renderer.create(React.createElement(Probe));
  });
  return {
    get state() {
      return state;
    },
    onSearch,
    onSubmit,
    onRegion,
  };
}

test.each(['청주', '청주시', '충북 청주', '충청북도 청주시', ' 청 주 '])(
  'recognizes %s locally',
  query => {
    expect(findRegionSearchResult(query)?.name).toBe('청주시');
  },
);

test('does not treat a place name containing a city as a region', () => {
  expect(findRegionSearchResult('고구마캠프 청주바베큐')).toBeNull();
  expect(findRegionSearchResult('서울')).toBeNull();
});

test('region appears before debounce and remains available when both APIs fail', async () => {
  const onSearch = jest.fn().mockRejectedValue(new Error('offline'));
  jest.mocked(travelApi.searchSpots).mockRejectedValue(new Error('limited'));
  const screen = await setup(onSearch);
  await act(async () => screen.state.changeText('청주'));
  expect(screen.state.regionResult?.name).toBe('청주시');
  expect(onSearch).not.toHaveBeenCalled();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });
  expect(screen.state.regionResult?.name).toBe('청주시');
  expect(screen.state.status).toBe('ERROR');
});

test('submitting a region before debounce moves immediately without external requests', async () => {
  const screen = await setup();
  await act(async () => {
    screen.state.changeText('충북 청주');
    screen.state.submit();
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });
  expect(screen.onRegion).toHaveBeenCalledWith(
    expect.objectContaining({ name: '청주시' }),
    '충북 청주',
  );
  expect(screen.onSearch).not.toHaveBeenCalled();
  expect(screen.onSubmit).not.toHaveBeenCalled();
});

test('fast submit waits for the new query and never submits the previous results', async () => {
  const next = deferred<{ items: SearchPoi[]; status: 'OK' }>();
  const onSearch = jest.fn(async (query: string) =>
    query === '새카페'
      ? next.promise
      : { items: [poi('old')], status: 'OK' as const },
  );
  const screen = await setup(onSearch);
  await act(async () => screen.state.changeText('이전카페'));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });
  await act(async () => {
    screen.state.changeText('새카페');
    screen.state.submit();
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  expect(screen.onSubmit).not.toHaveBeenCalled();
  await act(async () => next.resolve({ items: [poi('new')], status: 'OK' }));
  expect(screen.onSubmit).toHaveBeenCalledWith([poi('new')], '새카페');
});

test('submitting an in-flight query reuses it and editing cancels its pending submission', async () => {
  const result = deferred<{ items: SearchPoi[]; status: 'OK' }>();
  const onSearch = jest.fn(() => result.promise);
  const screen = await setup(onSearch);
  await act(async () => screen.state.changeText('카페검색'));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });
  await act(async () => screen.state.submit());
  expect(onSearch).toHaveBeenCalledTimes(1);
  await act(async () => screen.state.changeText('새로운카페'));
  await act(async () => result.resolve({ items: [poi('old')], status: 'OK' }));
  expect(screen.onSubmit).not.toHaveBeenCalled();
  expect(screen.state.pois).toEqual([]);
});

test('an old response cannot overwrite the same query typed again', async () => {
  const old = deferred<{ items: SearchPoi[]; status: 'OK' }>();
  const onSearch = jest
    .fn()
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue({ items: [poi('new')], status: 'OK' });
  const screen = await setup(onSearch);
  await act(async () => screen.state.changeText('카페A'));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });
  await act(async () => {
    screen.state.changeText('카페B');
    screen.state.changeText('카페A');
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });
  await act(async () => old.resolve({ items: [poi('old')], status: 'OK' }));
  expect(screen.state.pois).toEqual([poi('new')]);
});

test('invalidating a closing overlay cancels its pending submission', async () => {
  const response = deferred<{ items: SearchPoi[]; status: 'OK' }>();
  const screen = await setup(jest.fn(() => response.promise));
  await act(async () => {
    screen.state.changeText('카페');
    screen.state.submit();
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
  await act(async () => screen.state.invalidate());
  await act(async () =>
    response.resolve({ items: [poi('late')], status: 'OK' }),
  );
  expect(screen.onSubmit).not.toHaveBeenCalled();
});
