export type PersonalGameBucketId = 'playing' | 'backlog' | 'completed' | 'liked' | 'yuck';

export const PERSONAL_GAME_BUCKETS: Array<{ id: PersonalGameBucketId; label: string }> = [
  { id: 'playing', label: 'Currently Playing' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'completed', label: 'Completed' },
  { id: 'liked', label: 'Like' },
  { id: 'yuck', label: 'Yuck!' },
];

export type GameSourceSelection =
  | { kind: 'bucket'; id: PersonalGameBucketId }
  | { kind: 'list'; id: string }
  | { kind: 'catalog' };
