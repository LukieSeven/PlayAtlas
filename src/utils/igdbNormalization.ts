export type DatePrecision = 'day' | 'month' | 'quarter' | 'year' | 'tbd' | 'unknown';

export const GAME_TYPE_BY_ID: Record<number, { key: string; label: string }> = {
  0: { key: 'main_game', label: 'Main Game' },
  1: { key: 'dlc_addon', label: 'DLC / Add-on' },
  2: { key: 'expansion', label: 'Expansion' },
  3: { key: 'bundle', label: 'Bundle' },
  4: { key: 'standalone_expansion', label: 'Standalone Expansion' },
  5: { key: 'mod', label: 'Mod' },
  6: { key: 'episode', label: 'Episode' },
  7: { key: 'season', label: 'Season' },
  8: { key: 'remake', label: 'Remake' },
  9: { key: 'remaster', label: 'Remaster' },
  10: { key: 'expanded_game', label: 'Expanded Game' },
  11: { key: 'port', label: 'Port' },
  12: { key: 'fork', label: 'Fork' },
  13: { key: 'pack', label: 'Pack / Add-on' },
  14: { key: 'update', label: 'Update' },
};

export const GAME_TYPE_ALIASES: Record<string, string> = {
  'main game': 'main_game',
  'main_game': 'main_game',

  dlc: 'dlc_addon',
  'dlc / add-on': 'dlc_addon',
  'dlc / addon': 'dlc_addon',
  dlc_addon: 'dlc_addon',

  pack: 'pack',
  'pack / addon': 'pack',
  'pack / add-on': 'pack',

  'standalone expansion': 'standalone_expansion',
  'expanded game': 'expanded_game',
  expansion: 'expansion',
  bundle: 'bundle',
  mod: 'mod',
  episode: 'episode',
  season: 'season',
  remake: 'remake',
  remaster: 'remaster',
  port: 'port',
  fork: 'fork',
  update: 'update',
};

export const DEFAULT_VISIBLE_GAME_TYPES = new Set([
  'main_game',
  'standalone_expansion',
  'remake',
  'remaster',
  'expanded_game',
  'port',
]);

export function parseGameTypeInfo(gameTypeVal: any): { key: string; label: string; defaultVisible: boolean } {
  let id: number | null = null;
  let rawStr: string | null = null;

  if (gameTypeVal !== null && gameTypeVal !== undefined) {
    if (typeof gameTypeVal === 'number') {
      id = gameTypeVal;
    } else if (typeof gameTypeVal === 'object') {
      if (gameTypeVal.id !== null && gameTypeVal.id !== undefined && typeof gameTypeVal.id === 'number') {
        id = gameTypeVal.id;
      }
      if (gameTypeVal.type !== undefined && gameTypeVal.type !== null) {
        rawStr = String(gameTypeVal.type);
      }
    } else if (typeof gameTypeVal === 'string') {
      rawStr = gameTypeVal;
    }
  }

  // 1. Primary lookup by numeric ID (checking ID !== null && ID !== undefined)
  if (id !== null && id !== undefined && GAME_TYPE_BY_ID[id]) {
    const entry = GAME_TYPE_BY_ID[id];
    return {
      key: entry.key,
      label: entry.label,
      defaultVisible: DEFAULT_VISIBLE_GAME_TYPES.has(entry.key),
    };
  }

  // 2. Secondary fallback lookup by normalized string alias
  if (rawStr) {
    const cleanStr = rawStr.trim().toLowerCase();
    const aliasKey = GAME_TYPE_ALIASES[cleanStr] || cleanStr.replace(/[\s-]+/g, '_');
    const match = Object.values(GAME_TYPE_BY_ID).find(e => e.key === aliasKey);
    if (match) {
      return {
        key: match.key,
        label: match.label,
        defaultVisible: DEFAULT_VISIBLE_GAME_TYPES.has(match.key),
      };
    }
  }

  return {
    key: 'unknown',
    label: 'Unknown',
    defaultVisible: false,
  };
}

export function normalizeDatePrecision(rawFormat: string | null | undefined): DatePrecision {
  if (!rawFormat || typeof rawFormat !== 'string') return 'unknown';
  switch (rawFormat.trim().toUpperCase()) {
    case 'YYYYMMDD':
    case 'YYYYMMMMDD':
      return 'day';
    case 'YYYYMM':
    case 'YYYYMMMM':
      return 'month';
    case 'YYYY':
      return 'year';
    case 'YYYYQ1':
    case 'YYYYQ2':
    case 'YYYYQ3':
    case 'YYYYQ4':
      return 'quarter';
    case 'TBD':
      return 'tbd';
    default:
      return 'unknown';
  }
}
