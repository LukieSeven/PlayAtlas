import { useSyncExternalStore, useCallback } from 'react';
import { personalGameStore, normalizePersonalGameId } from '../services/personalGameStore';
import { PersonalGameRecord } from '../types/personal';

/**
 * Custom React hook that subscribes ONLY to changes for a specific game ID.
 * Uses useSyncExternalStore with per-game subscriptions to prevent full-grid rerenders.
 */
export function usePersonalGameRecord(gameId: string | number | undefined | null): PersonalGameRecord | undefined {
  const canonicalId = normalizePersonalGameId(gameId);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (gameId === undefined || gameId === null) return () => {};
      return personalGameStore.subscribeToGame(canonicalId, onStoreChange);
    },
    [canonicalId, gameId]
  );

  const getSnapshot = useCallback(() => {
    if (gameId === undefined || gameId === null) return undefined;
    return personalGameStore.getRecord(canonicalId);
  }, [canonicalId, gameId]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
