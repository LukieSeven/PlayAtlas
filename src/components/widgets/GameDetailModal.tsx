import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { X, Calendar, Gamepad2, Package, MessageSquare } from 'lucide-react';
import { getGameDetail } from '../../services/catalogDetailService';
import { GameDetailRecord } from '../../types/catalogDetail';
import { UniversalActionMenu } from '../common/UniversalActionMenu';
import { personalGameStore } from '../../services/personalGameStore';
import { normalizeExternalGameScore } from '../../services/scoreNormalizationService';
import { getPlatformDisplayName } from '../../services/platformTaxonomyService';
import { Badge } from '../ui/Badge';

interface GameDetailModalProps {
  gameId: number | null;
  onClose: () => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({ gameId, onClose }) => {
  const [detail, setDetail] = useState<GameDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const strId = gameId ? String(gameId) : '';

  // Subscribe to live PersonalGameStore updates
  const personalRecord = useSyncExternalStore(
    cb => personalGameStore.subscribe(cb),
    () => (strId ? personalGameStore.getRecord(strId) || personalGameStore.getRecord(`igdb_${strId}`) : undefined)
  );

  useEffect(() => {
    if (!gameId) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getGameDetail(gameId)
      .then((res: GameDetailRecord | null) => {
        if (isMounted) {
          setDetail(res);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load game details:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  useEffect(() => {
    if (personalRecord?.userNotes) {
      setNotes(personalRecord.userNotes);
    } else {
      setNotes('');
    }
  }, [personalRecord]);

  if (!gameId) return null;

  const catalogSnapshot = detail ? { name: detail.name, coverUrl: detail.coverUrl, releaseYear: detail.releaseYear } : undefined;
  const externalScore = detail ? normalizeExternalGameScore(detail) : { ratingValue: null, displayString: 'Not Rated', isUnrated: true };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto themed-panel rounded-3xl p-6 border border-[var(--panel-border)] shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Controls */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-border)] pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold themed-heading">{detail?.name || 'Loading Game...'}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--text-muted)]">
              {detail?.releaseYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  {detail.releaseYear}
                </span>
              )}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {externalScore.displayString}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detail && (
              <UniversalActionMenu
                gameId={detail.id}
                gameTitle={detail.name}
                coverUrl={detail.coverUrl}
                releaseYear={detail.releaseYear}
              />
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">
            Fetching game details and media...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Media & Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Cover Image */}
              <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-900 border border-[var(--panel-border)] shadow-md">
                {detail?.coverUrl ? (
                  <img src={detail.coverUrl} alt={detail.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 font-mono text-xs">
                    <Gamepad2 className="w-10 h-10 text-[var(--accent-color)] opacity-60 mb-2" />
                    <span>No Cover Image</span>
                  </div>
                )}
              </div>

              {/* Summary Description & Personal Status Widget */}
              <div className="sm:col-span-2 space-y-4">
                {/* Personal Status Dashboard Box */}
                <div className="p-4 rounded-2xl bg-[rgba(0,0,0,0.05)] border border-[var(--panel-border)] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--accent-color)]">
                    <span>PERSONAL GAME TRACKING</span>
                    {personalRecord && <Badge variant="emerald">RECORD ACTIVE</Badge>}
                  </div>

                  {/* Ownership Summary */}
                  {personalRecord && personalRecord.ownerships.length > 0 ? (
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Ownership</span>
                      <div className="flex flex-wrap gap-1.5">
                        {personalRecord.ownerships.map((o, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1"
                          >
                            <Package className="w-3 h-3 text-emerald-500" />
                            {getPlatformDisplayName(o.platformId)} ({o.ownershipType})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">Not in collection yet. Use Action Menu to add ownership.</p>
                  )}

                  {/* Play & Backlog Status Indicators */}
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {personalRecord?.currentPlayStatus && (
                      <span className="px-2.5 py-1 rounded-xl bg-[var(--primary-action)] text-white font-bold capitalize">
                        Status: {personalRecord.currentPlayStatus}
                      </span>
                    )}
                    {personalRecord?.inBacklogQueue && (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                        In Backlog
                      </span>
                    )}
                  </div>
                </div>

                {/* Game Description */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-[var(--text-muted)] mb-1">Overview</h4>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed line-clamp-6">
                    {detail?.summary || 'No overview summary available for this title.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Review Notes Field */}
            <div className="space-y-2 pt-2 border-t border-[var(--panel-border)]">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  Personal Game Notes & Journal
                </span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={async () => {
                  if (strId) {
                    await personalGameStore.setNotes(strId, notes.trim() || undefined, catalogSnapshot);
                  }
                }}
                placeholder="Write personal thoughts, play notes, or completion logs..."
                rows={3}
                className="w-full p-3 rounded-2xl themed-input text-xs leading-relaxed font-medium"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
