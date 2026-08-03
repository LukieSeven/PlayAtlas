import React, { useSyncExternalStore } from 'react';
import { GameCardViewModel, mapToGameCardViewModel } from '../../mappers/gameCardViewModelMapper';
import { UniversalActionMenu } from './UniversalActionMenu';
import { Badge } from '../ui/Badge';
import { getGameTypeBadgeVariant } from '../../services/gameTypePresentationService';
import { personalGameStore } from '../../services/personalGameStore';
import { Gamepad2, Bookmark, Star } from 'lucide-react';

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
  const personalRecord = useSyncExternalStore(
    cb => personalGameStore.subscribe(cb),
    () => personalGameStore.getRecord(vm.gameId) || personalGameStore.getRecord(`igdb_${vm.numericId}`)
  );

  // Re-calculate VM with live personal store data
  const liveVm = mapToGameCardViewModel(game || vm);

  const isWanted = personalRecord?.interestStatus === 'wanted';

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await personalGameStore.setInterestStatus(
      liveVm.gameId,
      isWanted ? undefined : 'wanted',
      { name: liveVm.title, coverUrl: liveVm.coverUrl, releaseYear: liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined }
    );
  };

  return (
    <div
      onClick={() => onSelect && onSelect(liveVm.numericId, liveVm.title)}
      className={`themed-card themed-card-hover group relative flex flex-col justify-between overflow-hidden cursor-pointer p-3 space-y-2.5 ${className}`}
    >
      {/* Top Cover Image Area */}
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-900 border border-[var(--panel-border)] shadow-sm">
        {liveVm.coverUrl ? (
          <img
            src={liveVm.coverUrl}
            alt={liveVm.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-900 text-slate-400 font-mono text-xs">
            <Gamepad2 className="w-8 h-8 text-[var(--accent-color)] opacity-60 mb-1" />
            <span className="text-[10px] line-clamp-2">{liveVm.title}</span>
          </div>
        )}

        {/* Top-Right Quick Bookmark (Wanted) & Universal Action Menu */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {/* Quick Bookmark Toggle Button */}
          <button
            onClick={handleBookmarkToggle}
            className={`p-1.5 rounded-xl backdrop-blur-md transition-all border ${
              isWanted
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                : 'bg-[rgba(0,0,0,0.4)] text-white/80 hover:text-white border-white/20 hover:bg-[rgba(0,0,0,0.6)]'
            }`}
            title={isWanted ? 'Remove from Wanted' : 'Add to Wanted'}
            aria-label={isWanted ? 'Remove from Wanted' : 'Add to Wanted'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isWanted ? 'fill-current' : ''}`} />
          </button>

          <UniversalActionMenu
            gameId={liveVm.gameId}
            gameTitle={liveVm.title}
            coverUrl={liveVm.coverUrl}
            releaseYear={liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined}
          />
        </div>

        {/* Top-Left Special Game Type Badge (ONLY for Remake, Remaster, DLC, Mod - NO BASE GAME BADGE!) */}
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
            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              OWNED
            </span>
          )}
          {liveVm.currentPlayStatus === 'playing' && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              PLAYING
            </span>
          )}
          {liveVm.currentPlayStatus === 'completed' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              COMPLETED
            </span>
          )}
          {liveVm.inBacklog && (
            <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-extrabold text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md">
              BACKLOG
            </span>
          )}
        </div>
      </div>

      {/* Card Details */}
      <div className="space-y-1 flex-1 flex flex-col justify-between pt-1">
        <div>
          <h3 className="font-bold text-xs text-[var(--surface-light-text,#0f2b48)] group-hover:text-[var(--primary-action)] transition-colors line-clamp-1 leading-snug">
            {liveVm.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--surface-light-muted,#475569)] mt-0.5">
            <span className="font-medium">{liveVm.releaseYearDisplay}</span>
            {liveVm.primaryPlatforms.length > 0 && (
              <span className="truncate max-w-[110px] text-[var(--surface-light-text,#0f2b48)] font-semibold">
                {liveVm.primaryPlatforms.join(' • ')}
              </span>
            )}
          </div>
        </div>

        {/* Scores & Primary Genre Row */}
        <div className="pt-1.5 border-t border-[var(--panel-border)] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1 font-mono">
            {liveVm.personalScore && !liveVm.personalScore.isUnrated ? (
              <span className="font-bold text-[var(--accent-color)] bg-[rgba(184,146,40,0.15)] px-1.5 py-0.5 rounded border border-[var(--accent-color)] flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-current" />
                {liveVm.personalScore.displayString}
              </span>
            ) : !liveVm.externalScore.isUnrated ? (
              <span className="font-bold text-emerald-800 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-600/30 flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-current" />
                {liveVm.externalScore.displayString}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-[var(--surface-light-muted,#475569)] opacity-90">
                Not Rated
              </span>
            )}
          </div>

          {liveVm.genresDisplay.length > 0 && (
            <span className="text-[10px] font-medium text-[var(--surface-light-muted,#475569)] truncate max-w-[80px]">
              {liveVm.genresDisplay[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
