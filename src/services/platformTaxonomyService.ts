import { PlatformFamilyKey } from '../types/personal';

export interface PlatformSystemInfo {
  id: number;
  name: string;
  abbreviation: string;
  family: PlatformFamilyKey;
}

const platformDatabase: Record<number, PlatformSystemInfo> = {
  // PC Family
  6: { id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC', family: 'pc' },
  14: { id: 14, name: 'Mac', abbreviation: 'Mac', family: 'pc' },
  3: { id: 3, name: 'Linux', abbreviation: 'Linux', family: 'pc' },

  // PlayStation Family
  167: { id: 167, name: 'PlayStation 5', abbreviation: 'PS5', family: 'playstation' },
  48: { id: 48, name: 'PlayStation 4', abbreviation: 'PS4', family: 'playstation' },
  9: { id: 9, name: 'PlayStation 3', abbreviation: 'PS3', family: 'playstation' },
  15: { id: 15, name: 'PlayStation 2', abbreviation: 'PS2', family: 'playstation' },
  7: { id: 7, name: 'PlayStation', abbreviation: 'PS1', family: 'playstation' },
  38: { id: 38, name: 'PlayStation Portable', abbreviation: 'PSP', family: 'playstation' },
  46: { id: 46, name: 'PlayStation Vita', abbreviation: 'Vita', family: 'playstation' },

  // Xbox Family
  169: { id: 169, name: 'Xbox Series X|S', abbreviation: 'XSX', family: 'xbox' },
  49: { id: 49, name: 'Xbox One', abbreviation: 'XONE', family: 'xbox' },
  12: { id: 12, name: 'Xbox 360', abbreviation: 'X360', family: 'xbox' },
  11: { id: 11, name: 'Xbox', abbreviation: 'XBOX', family: 'xbox' },

  // Nintendo Family
  130: { id: 130, name: 'Nintendo Switch', abbreviation: 'Switch', family: 'nintendo' },
  500: { id: 500, name: 'Nintendo Switch 2', abbreviation: 'Switch 2', family: 'nintendo' },
  41: { id: 41, name: 'Wii U', abbreviation: 'Wii U', family: 'nintendo' },
  5: { id: 5, name: 'Wii', abbreviation: 'Wii', family: 'nintendo' },
  21: { id: 21, name: 'Nintendo GameCube', abbreviation: 'NGC', family: 'nintendo' },
  4: { id: 4, name: 'Nintendo 64', abbreviation: 'N64', family: 'nintendo' },
  19: { id: 19, name: 'Super Nintendo Entertainment System', abbreviation: 'SNES', family: 'nintendo' },
  18: { id: 18, name: 'Nintendo Entertainment System', abbreviation: 'NES', family: 'nintendo' },
  37: { id: 37, name: 'Nintendo 3DS', abbreviation: '3DS', family: 'nintendo' },
  20: { id: 20, name: 'Nintendo DS', abbreviation: 'NDS', family: 'nintendo' },
  24: { id: 24, name: 'Game Boy Advance', abbreviation: 'GBA', family: 'nintendo' },
  22: { id: 22, name: 'Game Boy Color', abbreviation: 'GBC', family: 'nintendo' },
  33: { id: 33, name: 'Game Boy', abbreviation: 'GB', family: 'nintendo' },

  // Mobile Family
  39: { id: 39, name: 'iOS', abbreviation: 'iOS', family: 'mobile' },
  34: { id: 34, name: 'Android', abbreviation: 'Android', family: 'mobile' },

  // VR Family
  162: { id: 162, name: 'Oculus Rift', abbreviation: 'Rift', family: 'vr' },
  163: { id: 163, name: 'Oculus Quest', abbreviation: 'Quest', family: 'vr' },
  165: { id: 165, name: 'PlayStation VR', abbreviation: 'PSVR', family: 'vr' },
  390: { id: 390, name: 'PlayStation VR2', abbreviation: 'PSVR2', family: 'vr' },

  // Arcade Family
  52: { id: 52, name: 'Arcade', abbreviation: 'Arcade', family: 'arcade' },

  // Legacy Family
  29: { id: 29, name: 'Sega Mega Drive / Genesis', abbreviation: 'GEN', family: 'legacy' },
  32: { id: 32, name: 'Sega Saturn', abbreviation: 'SAT', family: 'legacy' },
  23: { id: 23, name: 'Sega Dreamcast', abbreviation: 'DC', family: 'legacy' },
  86: { id: 86, name: 'TurboGrafx-16 / PC Engine', abbreviation: 'PCE', family: 'legacy' },
};

export function getPlatformSystem(platformId: number): PlatformSystemInfo | null {
  return platformDatabase[platformId] || null;
}

export function getPlatformFamily(platformId: number): PlatformFamilyKey {
  const info = platformDatabase[platformId];
  return info ? info.family : 'legacy';
}

export function getPlatformFamilyForCatalogValue(platform: number | string): PlatformFamilyKey {
  if (typeof platform === 'number') return getPlatformFamily(platform);

  const normalized = platform.toLowerCase().trim();
  const exact = Object.values(platformDatabase).find(info =>
    info.name.toLowerCase() === normalized || info.abbreviation.toLowerCase() === normalized
  );
  if (exact) return exact.family;

  if (/windows|\bpc\b|linux|mac\b|steam deck/.test(normalized)) return 'pc';
  if (/playstation|\bps[1-5]?\b|psp|vita/.test(normalized)) return 'playstation';
  if (/xbox|xone|xsx/.test(normalized)) return 'xbox';
  if (/nintendo|switch|game boy|\b3?ds\b|wii|gamecube|\bnes\b|snes|n64/.test(normalized)) return 'nintendo';
  if (/android|\bios\b|mobile/.test(normalized)) return 'mobile';
  if (/oculus|quest|virtual reality|\bvr\b/.test(normalized)) return 'vr';
  if (/arcade/.test(normalized)) return 'arcade';
  if (/handheld/.test(normalized)) return 'handheld';
  return 'legacy';
}

export function groupPlatformsByFamily(platformIds: number[]): Record<PlatformFamilyKey, number[]> {
  const result: Record<PlatformFamilyKey, number[]> = {
    pc: [],
    playstation: [],
    xbox: [],
    nintendo: [],
    mobile: [],
    vr: [],
    handheld: [],
    arcade: [],
    legacy: [],
  };

  for (const id of platformIds) {
    const family = getPlatformFamily(id);
    result[family].push(id);
  }

  return result;
}

export function getPlatformDisplayName(platformIdOrName: number | string): string {
  if (typeof platformIdOrName === 'number') {
    const info = platformDatabase[platformIdOrName];
    if (info) return info.name;
    return `Platform #${platformIdOrName}`;
  }
  return String(platformIdOrName);
}

export function getPlatformAbbreviation(platformIdOrName: number | string): string {
  if (typeof platformIdOrName === 'number') {
    const info = platformDatabase[platformIdOrName];
    if (info) return info.abbreviation;
    return `#${platformIdOrName}`;
  }
  
  const nameStr = String(platformIdOrName).toLowerCase();
  if (nameStr.includes('playstation 5') || nameStr.includes('ps5')) return 'PS5';
  if (nameStr.includes('playstation 4') || nameStr.includes('ps4')) return 'PS4';
  if (nameStr.includes('xbox series') || nameStr.includes('series x')) return 'XSX';
  if (nameStr.includes('xbox one')) return 'XONE';
  if (nameStr.includes('switch')) return 'Switch';
  if (nameStr.includes('windows') || nameStr.includes('pc')) return 'PC';
  if (nameStr.includes('mac')) return 'Mac';
  if (nameStr.includes('linux')) return 'Linux';

  return String(platformIdOrName).slice(0, 8);
}

export function getAllFamilies(): { key: PlatformFamilyKey; label: string }[] {
  return [
    { key: 'pc', label: 'PC (Windows / Mac / Linux)' },
    { key: 'playstation', label: 'PlayStation' },
    { key: 'xbox', label: 'Xbox' },
    { key: 'nintendo', label: 'Nintendo' },
    { key: 'mobile', label: 'Mobile (iOS / Android)' },
    { key: 'vr', label: 'Virtual Reality (VR)' },
    { key: 'handheld', label: 'Handheld Consoles' },
    { key: 'arcade', label: 'Arcade' },
    { key: 'legacy', label: 'Legacy / Retro Consoles' },
  ];
}

export function getSystemsForFamily(family: PlatformFamilyKey): PlatformSystemInfo[] {
  return Object.values(platformDatabase).filter(p => p.family === family);
}

export function normalizeCatalogPlatform(rawPlatform: unknown): string {
  if (typeof rawPlatform === 'string') return rawPlatform;
  if (typeof rawPlatform === 'number') return getPlatformAbbreviation(rawPlatform);
  if (typeof rawPlatform === 'object' && rawPlatform !== null && 'name' in rawPlatform) {
    return String((rawPlatform as { name: unknown }).name);
  }
  return 'Unknown Platform';
}
