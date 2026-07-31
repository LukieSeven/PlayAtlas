import React, { useState } from 'react';
import {
  Grid,
  List as ListIcon,
  LayoutGrid,
  ArrowUpDown,
  Star,
  Share2,
  Calendar,
  BookmarkPlus
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { GameItem } from '../../types/game';

interface GameListGridProps {
  title?: string;
  description?: string;
  badge?: string;
  games?: GameItem[];
  showControls?: boolean;
  onShareClick?: () => void;
}

const mockGames: GameItem[] = [
  {
    id: 'game-1',
    title: 'Elden Ring: Shadow of the Erdtree',
    coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop',
    rating: 9.7,
    releaseDate: '2024-06-21',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Action RPG', 'Open World'],
    developer: 'FromSoftware',
    summary: 'Explore the Land of Shadow in this monumental dark fantasy expansion.',
  },
  {
    id: 'game-2',
    title: 'It Takes Two',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop',
    rating: 9.5,
    releaseDate: '2021-03-26',
    platforms: ['PC', 'PS5', 'Xbox', 'Switch'],
    genres: ['Co-Op', 'Platformer', 'Adventure'],
    developer: 'Hazelight Studios',
    summary: 'The ultimate co-op adventure built purely for two players.',
  },
  {
    id: 'game-3',
    title: 'Baldur’s Gate 3',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    rating: 9.8,
    releaseDate: '2023-08-03',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Turn-Based RPG', 'Fantasy'],
    developer: 'Larian Studios',
    summary: 'Gather your party and return to the Forgotten Realms.',
  },
  {
    id: 'game-4',
    title: 'Cyberpunk 2077: Phantom Liberty',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
    rating: 9.2,
    releaseDate: '2023-09-26',
    platforms: ['PC', 'PS5', 'Xbox'],
    genres: ['Sci-Fi RPG', 'Action'],
    developer: 'CD Projekt Red',
    summary: 'A high-stakes spy thriller set in a new district of Night City.',
  },
];

export const GameListGrid: React.FC<GameListGridProps> = ({
  title = 'Games My Wife & I Enjoy (Co-Op GOTY)',
  description = 'Curated list of our favorite couch & online co-op adventures.',
  badge = 'CUSTOM LIST',
  games = mockGames,
  showControls = true,
  onShareClick,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'cards' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'title' | 'date'>('rating');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = games
    .filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'date') return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* List Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="indigo">{badge}</Badge>
            <span className="text-xs text-slate-400 font-mono">{filteredGames.length} Games Total</span>
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        </div>

        {showControls && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="w-full sm:w-48">
              <Input
                placeholder="Filter games..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-slate-900 text-slate-200 border border-slate-800 text-xs font-medium rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="rating">Sort by Rating</option>
                <option value="title">Sort by Title</option>
                <option value="date">Sort by Release Date</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Layout Toggles */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Large Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Compact List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            {onShareClick && (
              <Button variant="outline" size="sm" icon={<Share2 className="w-3.5 h-3.5" />} onClick={onShareClick}>
                Share List
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Rendered Games Container */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredGames.map((game, index) => (
            <Card key={game.id} interactive glass className="group flex flex-col justify-between">
              <div>
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                  <img
                    src={game.coverUrl}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-amber-400">
                    #{index + 1}
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-xs font-bold text-emerald-400">
                    <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                    <span>{game.rating}</span>
                  </div>
                </div>

                <h4 className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {game.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{game.summary}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {game.genres.slice(0, 2).map((g, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {g}
                    </span>
                  ))}
                </div>
                <button className="text-slate-400 hover:text-indigo-400 transition-colors">
                  <BookmarkPlus className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGames.map((game, index) => (
            <Card key={game.id} interactive glass className="flex flex-col sm:flex-row gap-4 p-4">
              <div className="shrink-0 relative w-full sm:w-36 aspect-[3/4] rounded-xl overflow-hidden">
                <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-amber-400">
                  #{index + 1}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{game.developer}</span>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                      <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                      <span>{game.rating}</span>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-1">{game.title}</h4>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{game.summary}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {game.releaseDate}
                  </span>
                  <Button variant="ghost" size="sm">Details</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredGames.map((game, index) => (
            <div
              key={game.id}
              className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between hover:border-indigo-500/40 transition-colors gap-4"
            >
              <div className="flex items-center gap-4">
                <span className="w-6 font-mono font-bold text-indigo-400 text-sm">#{index + 1}</span>
                <img src={game.coverUrl} alt={game.title} className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <h4 className="font-bold text-white text-sm">{game.title}</h4>
                  <p className="text-xs text-slate-400">{game.developer} • {game.platforms.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                  <Star className="w-3.5 h-3.5 fill-emerald-400" />
                  <span>{game.rating}</span>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
