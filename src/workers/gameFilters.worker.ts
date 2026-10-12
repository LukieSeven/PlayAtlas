import { sortCatalogGames } from '../utils/gameListControls';
import type { CompactGameLookupRecord } from '../types/catalog';
import type { PersonalGameRecord } from '../types/personal';
import { matchesGameFilters, type GameFilters } from '../utils/catalogFacets';
import { normalizeSearchQuery } from '../utils/browserCatalogUtils';

let games: CompactGameLookupRecord[] = [];
let titles: string[][] = [];
self.onmessage = event => {
  const message = event.data;
  if (message.games) {
    games = message.games;
    titles = games.map(game => [game.name, ...(game.alternativeNames ?? [])].map(normalizeSearchQuery));
  }
  if (message.request === -1) return;
  const personal = new Map<number, PersonalGameRecord>(message.personal);
  const tokens = normalizeSearchQuery(message.query ?? '').split(' ').filter(Boolean);
  const filters: GameFilters = message.filters;
  const matches: CompactGameLookupRecord[] = [];
  for (let index = 0; index < games.length; index++) {
    const game = games[index];
    if (tokens.length && !titles[index].some(title => tokens.every(token => title.includes(token)))) continue;
    if (matchesGameFilters(game, filters, personal.get(game.id))) matches.push(game);
  }
  const ids = sortCatalogGames(matches, message.sortBy ?? 'relevance').map(game => game.id);
  self.postMessage({ request: message.request, ids });
};
