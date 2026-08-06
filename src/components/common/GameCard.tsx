import React from 'react';
import { GameCardViewModel, mapToGameCardViewModel } from '../../mappers/gameCardViewModelMapper';
import { UniversalActionMenu } from './UniversalActionMenu';
import { Badge } from '../ui/Badge';
import { getGameTypeBadgeVariant } from '../../services/gameTypePresentationService';
import { personalGameStore } from '../../services/personalGameStore';
import { usePersonalGameRecord } from '../../hooks/usePersonalGameRecord';
import { CompactGameLookupRecord } from '../../types/catalog';
import { Gamepad2, Heart, Star } from 'lucide-react';
import { SplatIcon } from '../ui/SplatIcon';

interface GameCardProps {
  game?: unknown; // Raw catalog record or GameCardViewModel
  viewModel?: GameCardViewModel;
  onSelect?: (record: CompactGameLookupRecord) => void;
  onLikeChange?: (liked: boolean) => void;
  className?: string;
  variant?: 'card' | 'list';
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  viewModel: providedViewModel,
  onSelect,
  onLikeChange,
  className = '',
  variant = 'card',
}) => {
  // Map raw catalog record if viewModel is not directly provided
  const vm: GameCardViewModel = providedViewModel || mapToGameCardViewModel(game);

  // Subscribe to live PersonalGameStore ONLY for this specific game ID
  const personalRecord = usePersonalGameRecord(vm.gameId);

  // Re-calculate VM with live personal store data
  const liveVm = mapToGameCardViewModel(game || vm);

  const isWanted = personalRecord?.interestStatus === 'wanted' || personalRecord?.interestStatus === 'wishlist';
  const isYucked = personalRecord?.currentPlayStatus === 'dropped';

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await personalGameStore.setInterestStatus(
      liveVm.gameId,
      isWanted ? undefined : 'wanted',
      { name: liveVm.title, coverUrl: liveVm.coverUrl, releaseYear: liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined }
    );
    onLikeChange?.(!isWanted);
  };

  const handleYuckToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await personalGameStore.setPlayStatus(
      liveVm.gameId,
      isYucked ? undefined : 'dropped',
      { name: liveVm.title, coverUrl: liveVm.coverUrl, releaseYear: liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined }
    );
  };

  const handleCardClick = () => {
    if (!onSelect) return;

    if (game && typeof game === 'object' && 'name' in game && 'id' in game) {
      onSelect(game as CompactGameLookupRecord);
    } else {
      const compactRecord: CompactGameLookupRecord = {
        id: liveVm.numericId,
        name: liveVm.title,
        year: liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined,
        gameType: liveVm.gameType,
        coverUrl: liveVm.coverUrl,
      };
      onSelect(compactRecord);
    }
  };

  if (variant === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className={`themed-card themed-card-hover group flex min-h-24 cursor-pointer items-center gap-3 overflow-hidden p-3 sm:gap-4 ${className}`}
      >
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--panel-border)] bg-slate-900 shadow-sm">
          {liveVm.coverUrl ? (
            <img src={liveVm.coverUrl} alt={liveVm.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Gamepad2 className="h-5 w-5 text-[var(--accent-color)] opacity-60" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-action)]">
              {liveVm.title}
            </h3>
            {liveVm.shouldShowGameTypeBadge && liveVm.gameTypeBadgeLabel && (
              <Badge variant={getGameTypeBadgeVariant(liveVm.gameType)}>{liveVm.gameTypeBadgeLabel}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
            <span className="font-mono font-semibold">{liveVm.releaseYearDisplay}</span>
            {liveVm.primaryPlatforms.length > 0 && <span>{liveVm.primaryPlatforms.join(' • ')}</span>}
            {liveVm.genresDisplay.length > 0 && <span>{liveVm.genresDisplay.slice(0, 2).join(' • ')}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide">
            {liveVm.isOwned && <span className="rounded bg-emerald-600 px-2 py-0.5 text-white">Owned</span>}
            {liveVm.currentPlayStatus === 'playing' && <span className="rounded bg-indigo-600 px-2 py-0.5 text-white">Playing</span>}
            {liveVm.currentPlayStatus === 'completed' && <span className="rounded bg-amber-500 px-2 py-0.5 text-slate-950">Completed</span>}
            {liveVm.inBacklog && <span className="rounded bg-purple-600 px-2 py-0.5 text-white">Backlog</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5" onClick={event => event.stopPropagation()}>
          <div className="hidden min-w-16 text-right sm:block">
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              {liveVm.personalScore && !liveVm.personalScore.isUnrated
                ? liveVm.personalScore.displayString
                : !liveVm.externalScore.isUnrated
                  ? liveVm.externalScore.displayString
                  : 'Not rated'}
            </span>
          </div>
          <button
            onClick={handleLikeToggle}
            className={`rounded-lg border p-2 transition-colors ${isWanted ? 'border-rose-400 bg-rose-600 text-white' : 'border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:text-rose-600'}`}
            title={isWanted ? 'Remove Like' : 'Like this game'}
            aria-label={isWanted ? 'Remove Like' : 'Like this game'}
          >
            <Heart className={`h-3.5 w-3.5 ${isWanted ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleYuckToggle}
            className={`rounded-lg border p-2 transition-colors ${isYucked ? 'border-[#8FD39A] bg-[#2B6E4E] text-[#D7F4C8]' : 'border-[var(--panel-border)] bg-[var(--panel-bg)] text-[#2B6E4E] hover:bg-[#2B6E4E] hover:text-white'}`}
            title={isYucked ? 'Remove from Yuck!' : 'Yuck! Hide this game'}
            aria-label={isYucked ? 'Remove from Yuck!' : 'Add to Yuck! and hide this game'}
          >
            <SplatIcon className="h-3.5 w-3.5" />
          </button>
          <UniversalActionMenu
            gameId={liveVm.gameId}
            gameTitle={liveVm.title}
            coverUrl={liveVm.coverUrl}
            releaseYear={liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined}
            personalRecord={personalRecord}
            onLikeChange={onLikeChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
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

        {/* Top-Right Quick Like, Yuck, and Universal Action Menu */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleLikeToggle}
            className={`p-1.5 rounded-xl backdrop-blur-md transition-all border ${
              isWanted
                ? 'bg-rose-600 text-white border-rose-400 shadow-md font-bold'
                : 'bg-[rgba(0,0,0,0.4)] text-white/80 hover:text-white border-white/20 hover:bg-[rgba(0,0,0,0.6)]'
            }`}
            title={isWanted ? 'Remove Like' : 'Like this game'}
            aria-label={isWanted ? 'Remove Like' : 'Like this game'}
          >
            <Heart className={`w-3.5 h-3.5 ${isWanted ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleYuckToggle}
            className={`p-1.5 rounded-xl backdrop-blur-md transition-all border ${
              isYucked
                ? 'bg-[#2B6E4E] text-[#D7F4C8] border-[#8FD39A] shadow-md'
                : 'bg-[rgba(0,0,0,0.4)] text-[#BDE9A8] hover:text-white border-white/20 hover:bg-[#2B6E4E]'
            }`}
            title={isYucked ? 'Remove from Yuck!' : 'Yuck! Hide this game'}
            aria-label={isYucked ? 'Remove from Yuck!' : 'Add to Yuck! and hide this game'}
          >
            <SplatIcon className="w-3.5 h-3.5" />
          </button>

          <UniversalActionMenu
            gameId={liveVm.gameId}
            gameTitle={liveVm.title}
            coverUrl={liveVm.coverUrl}
            releaseYear={liveVm.releaseYearDisplay !== 'TBA' ? parseInt(liveVm.releaseYearDisplay, 10) : undefined}
            personalRecord={personalRecord}
            onLikeChange={onLikeChange}
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
