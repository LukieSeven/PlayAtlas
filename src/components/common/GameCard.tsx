import React, { useSyncExternalStore } from 'react';
import { GameCardViewModel, mapToGameCardViewModel } from '../../mappers/gameCardViewModelMapper';
import { UniversalActionMenu } from './UniversalActionMenu';
import { Badge } from '../ui/Badge';
import { getGameTypeBadgeVariant } from '../../services/gameTypePresentationService';
import { personalGameStore } from '../../services/personalGameStore';
import { Gamepad2 } from 'lucide-react';

interface GameCardProps {
  game?: unknown; // Raw catalog record or GameCardViewModel
  viewModel?: GameCardViewModel;
  onSelect?: (gameId: number, name: string) => void;
  className?: string;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  viewModel: providedViewModel,
  onSelect,
  className = '',
}) => {
  // Map raw catalog record if viewModel is not directly provided
  const vm: GameCardViewModel = providedViewModel || mapToGameCardViewModel(game);

  // Subscribe to live PersonalGameStore so card indicators update instantly
  useSyncExternalStore(
    cb => personalGameStore.subscribe(cb),
    () => personalGameStore.getRecord(vm.gameId) || personalGameStore.getRecord(`igdb_${vm.numericId}`)
  );

  // Re-calculate VM with live personal store data
  const liveVm = mapToGameCardViewModel(game || vm);

  return (
    <div
      onClick={() => onSelect && onSelect(liveVm.numericId, liveVm.title)}
      className={`themed-card themed-card-hover group relative flex flex-col justify-between overflow-hidden cursor-pointer p-3.5 space-y-3 ${className}`}
    >
      {/* Top Cover Image Area */}
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-900 border border-[var(--panel-border)]">
        {liveVm.coverUrl ? (
          <img
            src={liveVm.coverUrl}
            alt={liveVm.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-900/90 text-slate-400 font-mono text-xs">
            <Gamepad2 className="w-8 h-8 text-[var(--accent-color)] opacity-60 mb-1" />
            <span className="text-[10px] line-clamp-2">{liveVm.title}</span>
          </div>
        )}

        {/* Top-Right Floating Universal Action Menu */}
        <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
          <UniversalActionMenu
            gameId={liveVm.gameId}
            gameTitle={liveVm.title}
            coverUrl={liveVm.coverUrl}
            releaseYear={liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined}
          />
        </div>

        {/* Top-Left Special Game Type Badge (Remake, Remaster, DLC, etc.) */}
        {liveVm.shouldShowGameTypeBadge && liveVm.gameTypeBadgeLabel && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant={getGameTypeBadgeVariant(liveVm.gameType)}>
              {liveVm.gameTypeBadgeLabel}
            </Badge>
          </div>
        )}

        {/* Bottom Personal Status Badges Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 z-10">
          {liveVm.isOwned && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              OWNED
            </span>
          )}
          {liveVm.currentPlayStatus === 'playing' && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              PLAYING
            </span>
          )}
          {liveVm.currentPlayStatus === 'completed' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              COMPLETED
            </span>
          )}
          {liveVm.inBacklog && (
            <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-white font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              BACKLOG
            </span>
          )}
        </div>
      </div>

      {/* Card Info Details */}
      <div className="space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary-action)] transition-colors line-clamp-1 leading-snug">
            {liveVm.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] mt-1">
            <span>{liveVm.releaseYearDisplay}</span>
            {liveVm.primaryPlatforms.length > 0 && (
              <span className="truncate max-w-[120px] text-[var(--text-secondary)] font-semibold">
                {liveVm.primaryPlatforms.join(' • ')}
              </span>
            )}
          </div>
        </div>

        {/* Scores & Genres Row */}
        <div className="pt-2 border-t border-[var(--panel-border)] flex items-center justify-between text-[11px]">
          {/* External / Personal Score */}
          <div className="flex items-center gap-1.5 font-mono">
            {liveVm.personalScore && !liveVm.personalScore.isUnrated ? (
              <span className="font-bold text-[var(--accent-color)] bg-[rgba(212,175,55,0.15)] px-1.5 py-0.5 rounded border border-[var(--accent-color)]">
                {liveVm.personalScore.displayString}
              </span>
            ) : (
              <span className={`font-semibold ${liveVm.externalScore.isUnrated ? 'text-[var(--text-muted)] opacity-70' : 'text-emerald-600 dark:text-emerald-400 font-bold'}`}>
                {liveVm.externalScore.displayString}
              </span>
            )}
          </div>

          {/* Primary Genre */}
          {liveVm.genresDisplay.length > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[80px]">
              {liveVm.genresDisplay[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
