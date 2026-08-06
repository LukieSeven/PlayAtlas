import { CompactGameLookupRecord } from '../types/catalog';
import { PersonalGameRecord } from '../types/personal';

export const isYucked = (record: PersonalGameRecord | undefined): boolean =>
  record?.currentPlayStatus === 'dropped';

export const getYuckedNumericIds = (records: PersonalGameRecord[]): Set<number> =>
  new Set(records.filter(isYucked).map(record => record.numericId));

export const excludeYuckedCatalogRecords = (
  games: CompactGameLookupRecord[],
  personalRecords: PersonalGameRecord[],
): CompactGameLookupRecord[] => {
  const yuckedIds = getYuckedNumericIds(personalRecords);
  return games.filter(game => !yuckedIds.has(game.id));
};
