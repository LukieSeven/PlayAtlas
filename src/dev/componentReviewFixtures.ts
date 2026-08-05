/**
 * Development Component Review Fixtures
 * Safe, static in-memory fixture data for reviewing real production components
 * at route /#/dev-component-review without contacting IGDB or modifying local DB storage.
 */
import { CompactGameLookupRecord } from '../types/catalog';
import { PersonalGameRecord } from '../types/personal';

export interface DevFixtureItem {
  compactGame: CompactGameLookupRecord;
  personalRecord?: PersonalGameRecord;
}

export const devComponentReviewFixtures: DevFixtureItem[] = [
  {
    compactGame: {
      id: 990101,
      name: 'Echoes of the Wildmoor',
      year: 2026,
      platforms: ['PC', 'PS5', 'Xbox Series X'],
      genres: ['RPG', 'Open World'],
      rating: 8.9,
      gameType: 'main', // Main Game
    },
  },
  {
    compactGame: {
      id: 990102,
      name: 'Chrono Horizon',
      year: 2025,
      platforms: ['Switch', 'PC'],
      genres: ['JRPG', 'Adventure'],
      rating: 9.2,
      gameType: 'main',
    },
    personalRecord: {
      schemaVersion: 1,
      gameId: '990102',
      numericId: 990102,
      ownerships: [
        {
          platformId: 130, // Switch
          ownershipType: 'digital',
        },
      ],
      customTags: [],
      playSessions: [],
      completionHistory: [],
      inBacklogQueue: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    compactGame: {
      id: 990103,
      name: 'Astral Frontier',
      year: 2026,
      platforms: ['PC', 'PS5'],
      genres: ['Action RPG', 'Sci-Fi'],
      rating: 8.5,
      gameType: 'main',
    },
    personalRecord: {
      schemaVersion: 1,
      gameId: '990103',
      numericId: 990103,
      currentPlayStatus: 'playing',
      ownerships: [
        {
          platformId: 6, // PC
          ownershipType: 'digital',
          storefrontOrProvider: 'Steam',
        },
      ],
      customTags: [],
      playSessions: [],
      completionHistory: [],
      inBacklogQueue: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    compactGame: {
      id: 990104,
      name: 'Subterranean',
      year: 2024,
      platforms: ['PC', 'PS5'],
      genres: ['Survival', 'Crafting'],
      rating: 8.1,
      gameType: 'main',
    },
    personalRecord: {
      schemaVersion: 1,
      gameId: '990104',
      numericId: 990104,
      ownerships: [],
      customTags: [],
      playSessions: [],
      completionHistory: [],
      inBacklogQueue: true,
      backlogPriority: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    compactGame: {
      id: 990105,
      name: 'Valkyrie Legacy',
      year: 2023,
      platforms: ['PS5', 'Xbox Series X'],
      genres: ['Tactical RPG'],
      rating: 9.5,
      gameType: 'main',
    },
    personalRecord: {
      schemaVersion: 1,
      gameId: '990105',
      numericId: 990105,
      currentPlayStatus: 'completed',
      userRating: 9.5,
      ownerships: [],
      customTags: [],
      playSessions: [],
      inBacklogQueue: false,
      completionHistory: [
        {
          completionId: 'comp_1',
          completedDate: '2025-11-15',
          completionType: 'completionist_100',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    compactGame: {
      id: 990106,
      name: 'Mythic Vanguard',
      year: 2026,
      platforms: ['PC', 'Switch'],
      genres: ['Action', 'Platformer'],
      rating: 8.4,
      gameType: 'main',
    },
    personalRecord: {
      schemaVersion: 1,
      gameId: '990106',
      numericId: 990106,
      interestStatus: 'wanted',
      ownerships: [],
      customTags: [],
      playSessions: [],
      completionHistory: [],
      inBacklogQueue: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];
