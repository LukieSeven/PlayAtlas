import React, { useState } from 'react';
import { IndexDiagnostics, IndexManifest } from '../../types/indexSchema';
import { Activity, ChevronDown, ChevronUp, Database, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface IndexDiagnosticsPanelProps {
  manifest: IndexManifest | null;
  diagnostics: IndexDiagnostics | null;
  userTimezone: string;
}

export const IndexDiagnosticsPanel: React.FC<IndexDiagnosticsPanelProps> = ({
  manifest,
  diagnostics,
  userTimezone,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!diagnostics || !manifest) return null;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-indigo-500/20 bg-slate-950/60 shadow-lg space-y-3">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-extrabold text-white tracking-wide">
            IndexedDB Index Diagnostics
          </span>
          <Badge variant="indigo" className="font-mono text-[10px]">
            Catalog Version {manifest.version}
          </Badge>
          <span className="text-[10px] text-slate-400 font-mono">
            ({manifest.recordCount} Indexed Records)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            User Timezone: {userTimezone}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="pt-3 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Bucket Files Processed</span>
              <span className="font-bold text-cyan-400 text-sm">{diagnostics.bucketFilesProcessed} / 26</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Bucket Entries Extracted</span>
              <span className="font-bold text-indigo-400 text-sm">{diagnostics.bucketEntriesProcessed}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Unique Game IDs</span>
              <span className="font-bold text-emerald-400 text-sm">{diagnostics.uniqueGameIdsFound}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Duplicates Removed</span>
              <span className="font-bold text-purple-400 text-sm">{diagnostics.duplicateEntriesRemoved}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Records Loaded</span>
              <span className="font-bold text-white text-sm">{diagnostics.gameRecordsLoaded}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Valid Release Dates</span>
              <span className="font-bold text-emerald-400 text-sm">{diagnostics.validReleaseDatesCount}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Missing Date Records (Null)</span>
              <span className="font-bold text-amber-400 text-sm">{diagnostics.recordsWithoutReleaseDates}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">First Releases Today</span>
              <span className="font-bold text-cyan-400 text-sm">{diagnostics.firstReleaseTodayCount}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              Index Compiled: {new Date(manifest.generatedAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-400" />
              Storage: IndexedDB Catalog Cache
            </span>
          </div>

          {diagnostics.failedRecordRequests.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Failed Record Requests ({diagnostics.failedRecordRequests.length})</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-rose-300">
                {diagnostics.failedRecordRequests.map((f, i) => (
                  <div key={i} className="truncate">
                    ID {f.id}: {f.reason} ({f.path})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
