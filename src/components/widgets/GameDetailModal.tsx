import React, { useState, useEffect } from 'react';
import { X, Calendar, Gamepad2, Package, MessageSquare, Heart, Bookmark, Star, AlertTriangle, RefreshCw } from 'lucide-react';
import { getGameDetailForCompactRecord, mapRawCatalogRecordToGameDetail } from '../../services/catalogDetailService';
import { GameDetailRecord } from '../../types/catalogDetail';
import { CompactGameLookupRecord } from '../../types/catalog';
import { UniversalActionMenu } from '../common/UniversalActionMenu';
import { personalGameStore } from '../../services/personalGameStore';
import { usePersonalGameRecord } from '../../hooks/usePersonalGameRecord';
import { normalizeExternalGameScore } from '../../services/scoreNormalizationService';
import { getPlatformDisplayName } from '../../services/platformTaxonomyService';
import { Badge } from '../ui/Badge';

interface GameDetailModalProps {
  selectedGame: CompactGameLookupRecord | null;
  onClose: () => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({ selectedGame, onClose }) => {
  const [detail, setDetail] = useState<GameDetailRecord | null>(null);
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [notes, setNotes] = useState('');

  const targetGameId = selectedGame?.id;
  const strId = targetGameId !== undefined ? String(targetGameId) : '';

  // Scoped per-game store subscription for this game ID only
  const personalRecord = usePersonalGameRecord(targetGameId);

  const fetchFullDetails = (gameRecord: CompactGameLookupRecord) => {
    setDetailStatus('loading');
    getGameDetailForCompactRecord(gameRecord)
      .then(res => {
        if (res) {
          setDetail(res);
          setDetailStatus('loaded');
        } else {
          setDetailStatus('error');
        }
      })
      .catch(err => {
        console.warn('Failed to load full detail chunk:', err);
        setDetailStatus('error');
      });
  };

  useEffect(() => {
    if (!selectedGame) {
      setDetail(null);
      setDetailStatus('idle');
      return;
    }

    // Immediately render compact snapshot so user never sees blank "Loading Game..." placeholder
    const initialSnapshot = mapRawCatalogRecordToGameDetail(null, selectedGame);
    setDetail(initialSnapshot);
    fetchFullDetails(selectedGame);
  }, [selectedGame]);

  useEffect(() => {
    if (personalRecord?.userNotes) {
      setNotes(personalRecord.userNotes);
    } else {
      setNotes('');
    }
  }, [personalRecord]);

  if (!selectedGame || !detail) return null;

  const catalogSnapshot = { name: detail.name, coverUrl: detail.coverUrl, releaseYear: detail.releaseYear };
  const externalScore = normalizeExternalGameScore(detail);
  const isWanted = personalRecord?.interestStatus === 'wanted';
  const inBacklog = Boolean(personalRecord?.inBacklogQueue);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto themed-panel rounded-3xl p-6 border border-[#c8b584] shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 bg-[#fefcf6] text-[#0f2b48]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Controls */}
        <div className="flex items-start justify-between gap-4 border-b border-[#c8b584] pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-extrabold themed-heading text-[#0c1e36]">
              {detail.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#475569]">
              {detail.releaseYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  {detail.releaseYear}
                </span>
              )}
              {!externalScore.isUnrated ? (
                <span className="font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {externalScore.displayString}
                </span>
              ) : (
                <span className="font-semibold text-[#475569]">Not Rated</span>
              )}
              {detailStatus === 'loading' && (
                <span className="text-[10px] text-amber-700 font-bold animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Loading full details...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UniversalActionMenu
              gameId={detail.id}
              gameTitle={detail.name}
              coverUrl={detail.coverUrl}
              releaseYear={detail.releaseYear}
              personalRecord={personalRecord}
            />
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-[#ece4d0] hover:bg-[#e4d8bc] text-[#0f2b48] transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-6">
          {/* Top Media & Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Cover Image */}
            <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-900 border border-[#c8b584] shadow-md">
              {detail.coverUrl ? (
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
              <div className="p-4 rounded-2xl bg-[#f5f0e1] border border-[#c8b584] space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[#0f2b48]">
                  <span>PERSONAL GAME TRACKING</span>
                  {personalRecord && <Badge variant="emerald">RECORD ACTIVE</Badge>}
                </div>

                {/* Quick Action Bar (Wanted & Backlog) */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={async () => {
                      await personalGameStore.setInterestStatus(
                        strId,
                        isWanted ? undefined : 'wanted',
                        catalogSnapshot
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                      isWanted
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-white text-[#0f2b48] border border-[#c8b584] hover:bg-[#ece4d0]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isWanted ? 'fill-current' : ''}`} />
                    <span>{isWanted ? 'Wanted' : 'Add to Wanted'}</span>
                  </button>

                  <button
                    onClick={async () => {
                      await personalGameStore.setBacklog(strId, !inBacklog, catalogSnapshot);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                      inBacklog
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-[#0f2b48] border border-[#c8b584] hover:bg-[#ece4d0]'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${inBacklog ? 'fill-current' : ''}`} />
                    <span>{inBacklog ? 'In Backlog' : 'Add to Backlog'}</span>
                  </button>
                </div>

                {/* Ownership Summary */}
                {personalRecord && personalRecord.ownerships.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-mono text-[#475569] uppercase font-bold">Ownership</span>
                    <div className="flex flex-wrap gap-1.5">
                      {personalRecord.ownerships.map((o, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                        >
                          <Package className="w-3 h-3" />
                          {getPlatformDisplayName(o.platformId)} ({o.ownershipType})
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#475569] italic">Not in collection yet. Use Action Menu to add platform ownership.</p>
                )}

                {/* Play Status Badges */}
                {personalRecord?.currentPlayStatus && (
                  <div className="pt-1">
                    <span className="px-2.5 py-1 rounded-xl bg-[#1b5e75] text-white font-bold text-xs capitalize">
                      Status: {personalRecord.currentPlayStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Game Description */}
              <div>
                <h4 className="text-xs font-mono uppercase text-[#475569] font-bold mb-1">Overview</h4>
                <p className="text-xs text-[#0f2b48] leading-relaxed line-clamp-6 font-medium">
                  {detail.summary || (detailStatus === 'loading' ? 'Loading full catalog summary...' : 'No overview summary available for this title.')}
                </p>
              </div>

              {/* Non-blocking detail load error notice */}
              {detailStatus === 'error' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Additional catalog details are currently unavailable for this title.
                  </span>
                  <button
                    onClick={() => fetchFullDetails(selectedGame)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Personal Review Notes Field */}
          <div className="space-y-2 pt-2 border-t border-[#c8b584]">
            <div className="flex items-center justify-between text-xs font-mono text-[#0f2b48] font-bold">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[var(--accent-color)]" />
                Personal Game Journal & Play Notes
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
              className="w-full p-3 rounded-2xl bg-white text-[#0f2b48] border border-[#c8b584] text-xs leading-relaxed font-semibold focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
