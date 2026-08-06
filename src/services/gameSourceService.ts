import { CompactGameLookupRecord } from '../types/catalog';
import { PersonalGameBucketId } from '../types/gameSource';
import { PersonalGameRecord } from '../types/personal';
import { UserGameList } from '../types/userList';
import { convertPersonalRecordToCompact } from './catalogDetailService';
import { addGameToUserList } from './userListService';
import { personalGameStore } from './personalGameStore';

export function recordsForBucket(records: PersonalGameRecord[], bucket: PersonalGameBucketId): PersonalGameRecord[] {
  return records.filter(record => {
    if (bucket !== 'yuck' && record.currentPlayStatus === 'dropped') return false;
    if (bucket === 'playing') return record.currentPlayStatus === 'playing';
    if (bucket === 'backlog') return record.inBacklogQueue;
    if (bucket === 'completed') return record.currentPlayStatus === 'completed' || record.completionHistory.length > 0;
    if (bucket === 'liked') return record.interestStatus === 'wanted' || record.interestStatus === 'wishlist';
    return record.currentPlayStatus === 'dropped';
  });
}
export function compactGamesForBucket(records: PersonalGameRecord[], bucket: PersonalGameBucketId): CompactGameLookupRecord[] {
  return recordsForBucket(records, bucket).map(convertPersonalRecordToCompact).filter(game => game.id !== 0);
}

export function importGamesIntoList(list: UserGameList, games: CompactGameLookupRecord[], tier?: string): UserGameList {
  return games.reduce((current, game) => addGameToUserList(current, game, tier), list);
}

export async function exportListToBucket(list: UserGameList, bucket: PersonalGameBucketId): Promise<number> {
  let changed = 0;
  for (const { game } of list.entries) {
    const snapshot = { name: game.name, coverUrl: game.coverUrl || undefined, releaseYear: game.year || undefined };
    if (bucket === 'playing') await personalGameStore.setPlayStatus(game.id, 'playing', snapshot);
    if (bucket === 'backlog') await personalGameStore.setBacklog(game.id, true, snapshot);
    if (bucket === 'completed') await personalGameStore.setPlayStatus(game.id, 'completed', snapshot);
    if (bucket === 'liked') await personalGameStore.setInterestStatus(game.id, 'wanted', snapshot);
    if (bucket === 'yuck') await personalGameStore.setPlayStatus(game.id, 'dropped', snapshot);
    changed++;
  }
  return changed;
}

export function pickRandomGame(games: CompactGameLookupRecord[], excludedIds: Set<number> = new Set(), random: () => number = Math.random): CompactGameLookupRecord | null {
  const available = games.filter(game => !excludedIds.has(game.id));
  if (available.length === 0) return null;
  return available[Math.floor(random() * available.length)] || available[0];
}
