export type GameTypeCategory =
  | 'main_game'
  | 'remake'
  | 'remaster'
  | 'expanded_game'
  | 'standalone_expansion'
  | 'port'
  | 'expansion'
  | 'dlc_addon'
  | 'bundle'
  | 'pack'
  | 'mod'
  | 'community_modification'
  | 'unknown';

export function normalizeGameType(value: unknown): GameTypeCategory {
  if (!value) return 'main_game';

  const str = String(value).toLowerCase().trim().replace(/[\s\-_]+/g, '_');

  if (str.includes('main') || str === '0' || str === 'main_game') return 'main_game';
  if (str.includes('remake')) return 'remake';
  if (str.includes('remaster')) return 'remaster';
  if (str.includes('standalone')) return 'standalone_expansion';
  if (str.includes('port')) return 'port';
  if (str.includes('dlc') || str === '1' || str.includes('addon')) return 'dlc_addon';
  if (str.includes('expansion') || str === '2') return 'expansion';
  if (str.includes('bundle') || str === '3') return 'bundle';
  if (str.includes('pack') || str === '13') return 'pack';
  if (str.includes('community') || str.includes('romhack') || str.includes('hack')) return 'community_modification';
  if (str.includes('mod')) return 'mod';

  return 'unknown';
}

export function getGameTypeLabel(type: GameTypeCategory): string {
  switch (type) {
    case 'main_game':
      return 'Main Game';
    case 'remake':
      return 'Remake';
    case 'remaster':
      return 'Remaster';
    case 'expanded_game':
      return 'Expanded Edition';
    case 'standalone_expansion':
      return 'Standalone Expansion';
    case 'port':
      return 'Console Port';
    case 'expansion':
      return 'Expansion';
    case 'dlc_addon':
      return 'DLC / Addon';
    case 'bundle':
      return 'Game Bundle';
    case 'pack':
      return 'Content Pack';
    case 'mod':
      return 'Game Mod';
    case 'community_modification':
      return 'Community Mod / ROM Hack';
    default:
      return 'Game';
  }
}

export function shouldShowGameTypeBadge(type: GameTypeCategory): boolean {
  // Main games do not require special badges; secondary content shows badges
  return type !== 'main_game' && type !== 'unknown';
}

export function getGameTypeBadgeVariant(type: GameTypeCategory): 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple' {
  switch (type) {
    case 'dlc_addon':
    case 'expansion':
    case 'pack':
      return 'cyan';
    case 'remake':
    case 'remaster':
      return 'amber';
    case 'bundle':
      return 'purple';
    case 'mod':
    case 'community_modification':
      return 'rose';
    default:
      return 'indigo';
  }
}
