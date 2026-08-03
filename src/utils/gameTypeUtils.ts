import { normalizeGameType, GameTypeCategory } from '../services/gameTypePresentationService';

export function normalizeGameTypeCategory(gameType?: string, name?: string): GameTypeCategory {
  if (name && (name.toLowerCase().includes('rom hack') || name.toLowerCase().includes('community mod'))) {
    return 'community_modification';
  }
  return normalizeGameType(gameType);
}
