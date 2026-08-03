import { useSyncExternalStore, useCallback } from 'react';
import { personalGameStore } from '../services/personalGameStore';
import { PersonalGameRecord } from '../types/personal';

/**
 * Custom React hook that subscribes ONCE to the PersonalGameStore global listener.
 * Returns a stable snapshot array of all meaningful personal game records.
 * Used by MyGamesPage, HomePage, and App layout counters.
 */
export function usePersonalGameLibrary(): PersonalGameRecord[] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    return personalGameStore.subscribe(onStoreChange);
  }, []);

  const getSnapshot = useCallback(() => {
    return personalGameStore.getAllRecords();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
