import { useEffect, useSyncExternalStore } from 'react';
import { favoriteApi } from '../api/favoriteApi';
import { toApiError } from '../api/errors';
import type { AiRouteFavorite } from '../types/favorite';

export type FavoriteState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  favorites: AiRouteFavorite[];
  error: string | null;
};

const INITIAL: FavoriteState = { status: 'idle', favorites: [], error: null };
let state = INITIAL;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<FavoriteState>): void {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

export const favoriteStore = {
  get: (): FavoriteState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  ensureLoaded(): Promise<void> {
    return state.status === 'ready' || inFlight
      ? inFlight ?? Promise.resolve()
      : favoriteStore.reload();
  },
  reload(): Promise<void> {
    setState({ status: 'loading', error: null });
    inFlight = favoriteApi
      .list()
      .then(favorites => setState({ status: 'ready', favorites }))
      .catch(error => setState({ status: 'error', error: toApiError(error).message }))
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },
  async register(requestId: string): Promise<void> {
    await favoriteApi.register(requestId);
    await favoriteStore.reload();
  },
  detail(id: string): Promise<AiRouteFavorite> {
    return favoriteApi.detail(id);
  },
  async remove(id: string): Promise<void> {
    await favoriteApi.remove(id);
    setState({ favorites: state.favorites.filter(item => item.id !== id) });
  },
  reset(): void {
    inFlight = null;
    setState(INITIAL);
  },
};

export function useFavorites(): FavoriteState {
  const snapshot = useSyncExternalStore(favoriteStore.subscribe, favoriteStore.get);
  useEffect(() => {
    favoriteStore.ensureLoaded();
  }, []);
  return snapshot;
}
