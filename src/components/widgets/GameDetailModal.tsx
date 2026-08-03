import React, { useState, useEffect } from 'react';
import { X, Calendar, Layers, Loader2, Database } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { fetchAndDecompressJson } from '../../utils/decompression';
import { getBasePathAwareUrl } from '../../services/catalogDataSource';
import { openIndexedDB } from '../../services/indexDbStorage';

export interface GameDetailModalProps {
  gameId: number | string;
  chunkNumber?: number;
  initialTitle?: string;
  onClose: () => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  gameId,
  chunkNumber,
  initialTitle,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fullDetailRecord, setFullDetailRecord] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const numericId = typeof gameId === 'number' ? gameId : parseInt(String(gameId).replace(/\D/g, ''), 10);

    async function loadChunk() {
      try {
        let chunkFile = chunkNumber ? `chunks/game_index_${String(chunkNumber).padStart(4, '0')}.json.gz` : null;

        // Check token_manifest if chunkNumber not directly supplied
        if (!chunkFile) {
          try {
            const manifestUrl = getBasePathAwareUrl('data/search/token_manifest.json');
            const manifestRes = await fetch(manifestUrl);
            if (manifestRes.ok) {
              const manifest = await manifestRes.json();
              const lookupFile = manifest.lookupFiles?.find(
                (l: any) => numericId >= l.firstId && numericId <= l.lastId
              );
              if (lookupFile) {
                // Fetch lookup file to get chunk ID
                const lookupUrl = getBasePathAwareUrl(`data/${lookupFile.file}`);
                const lookupRecords = await fetchAndDecompressJson<any[]>(lookupUrl);
                const rec = lookupRecords.find((r: any) => r.id === numericId);
                if (rec && rec.chunk) {
                  chunkFile = `chunks/game_index_${String(rec.chunk).padStart(4, '0')}.json.gz`;
                }
              }
            }
          } catch {
            // Fallback
          }
        }

        if (!chunkFile) chunkFile = 'chunks/game_index_0001.json.gz';

        // Check IndexedDB cache
        try {
          const db = await openIndexedDB();
          const cachedChunk: any = await new Promise((resolve, reject) => {
            const tx = db.transaction('full_chunks', 'readonly');
            const store = tx.objectStore('full_chunks');
            const req = store.get(chunkFile);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          if (cachedChunk && Array.isArray(cachedChunk.records)) {
            const foundRec = cachedChunk.records.find((r: any) => r.sourceId === numericId || r.id === String(gameId));
            if (foundRec && isMounted) {
              setFullDetailRecord(foundRec);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Continue to network fetch
        }

        // Fetch compressed detail chunk (.json.gz)
        const chunkUrl = getBasePathAwareUrl(`data/${chunkFile}`);
        const chunkRecords = await fetchAndDecompressJson<any[]>(chunkUrl);

        const targetRecord = chunkRecords.find(
          r => r.sourceId === numericId || r.id === String(gameId)
        ) || chunkRecords[0];

        if (isMounted) {
          setFullDetailRecord(targetRecord);
          setLoading(false);
        }

        // Cache in IndexedDB asynchronously
        try {
          const db = await openIndexedDB();
          const tx = db.transaction('full_chunks', 'readwrite');
          tx.objectStore('full_chunks').put({
            chunkFile,
            downloadedAt: new Date().toISOString(),
            records: chunkRecords,
          });
        } catch {
          // Non-critical cache write error
        }
      } catch (err: any) {
        console.error('Failed to load full detail chunk:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to load game detail record.');
          setLoading(false);
        }
      }
    }

    loadChunk();

    return () => {
      isMounted = false;
    };
  }, [gameId, chunkNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-tight">
              {fullDetailRecord?.name || initialTitle || 'Game Details'}
            </h3>
            <Badge variant="indigo" className="gap-1 font-mono text-[10px] py-0.5 px-2">
              <Database className="w-3 h-3 text-cyan-400" />
              IGDB Record
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-xs font-mono text-slate-400">
                Fetching & decompressing detail chunk (.json.gz)...
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              ❌ {error}
            </div>
          )}

          {!loading && fullDetailRecord && (
            <div className="space-y-6">
              {/* Top Summary Banner */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {fullDetailRecord.coverUrl && (
                  <img
                    src={fullDetailRecord.coverUrl}
                    alt={fullDetailRecord.name}
                    className="w-32 h-44 object-cover rounded-2xl border border-slate-800 shadow-lg flex-shrink-0"
                  />
                )}
                <div className="space-y-3 flex-1">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">{fullDetailRecord.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="purple">
                        {fullDetailRecord.gameTypeLabel || fullDetailRecord.gameType || 'Main Game'}
                      </Badge>
                      {fullDetailRecord.firstReleaseDate && (
                        <Badge variant="cyan" className="gap-1">
                          <Calendar className="w-3 h-3" />
                          {fullDetailRecord.firstReleaseDate}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {fullDetailRecord.summary || 'No summary available for this catalog record.'}
                  </p>
                </div>
              </div>

              {/* Supported Platforms */}
              {Array.isArray(fullDetailRecord.platforms) && fullDetailRecord.platforms.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Platforms
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {fullDetailRecord.platforms.map((p: any) => (
                      <span
                        key={p.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/50"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Details */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>IGDB Source ID:</span>
                  <span className="text-indigo-400 font-bold">{fullDetailRecord.sourceId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Date Precision:</span>
                  <span className="text-slate-200">{fullDetailRecord.datePrecision || 'day'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Default Search Visibility:</span>
                  <span className={fullDetailRecord.defaultVisible ? 'text-emerald-400' : 'text-amber-400'}>
                    {fullDetailRecord.defaultVisible ? 'Visible (Main Game)' : 'Default Hidden (DLC / Add-on)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
