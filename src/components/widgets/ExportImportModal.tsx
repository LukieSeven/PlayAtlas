import React, { useState } from 'react';
import { Download, Upload, X, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';
import { personalGameStore, normalizePersonalGameId } from '../../services/personalGameStore';
import { PersonalGameRecord } from '../../types/personal';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface PlayAtlasPersonalExport {
  exportVersion: number;
  exportedAt: string;
  personalGames: PersonalGameRecord[];
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedExportData, setParsedExportData] = useState<PlayAtlasPersonalExport | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Handle JSON Download Export
  const handleExportData = () => {
    const allRecords = personalGameStore.getAllRecords();
    const exportObject: PlayAtlasPersonalExport = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      personalGames: allRecords,
    };

    const jsonString = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const a = document.createElement('a');
    a.href = url;
    a.download = `play_atlas_personal_data_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle JSON File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportStatus(null);
    setImportError(null);
    setParsedExportData(null);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.personalGames)) {
          setImportError('Invalid JSON file format. Expected a Play Atlas export with a personalGames array.');
          return;
        }

        setParsedExportData({
          exportVersion: parsed.exportVersion || 1,
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          personalGames: parsed.personalGames,
        });

        setImportStatus(`Successfully parsed ${parsed.personalGames.length} personal game records.`);
      } catch (err: any) {
        setImportError(`JSON Parse Error: ${err?.message || 'Failed to read file.'}`);
      }
    };
    reader.readAsText(file);
  };

  // Execute Merge Strategy
  const handleExecuteMerge = async () => {
    if (!parsedExportData) return;
    setIsProcessing(true);
    setImportError(null);

    try {
      let mergedCount = 0;
      for (const incomingRec of parsedExportData.personalGames) {
        if (!incomingRec.gameId) continue;
        const canonicalId = normalizePersonalGameId(incomingRec.gameId);
        const existing = personalGameStore.getRecord(canonicalId);

        if (!existing) {
          await personalGameStore.setInterestStatus(canonicalId, incomingRec.interestStatus, incomingRec.catalogSnapshot);
          const newRec = personalGameStore.getRecord(canonicalId);
          if (newRec) {
            newRec.ownerships = incomingRec.ownerships || [];
            newRec.currentPlayStatus = incomingRec.currentPlayStatus;
            newRec.inBacklogQueue = Boolean(incomingRec.inBacklogQueue);
            newRec.userRating = incomingRec.userRating;
            newRec.userNotes = incomingRec.userNotes;
            newRec.customTags = incomingRec.customTags || [];
            newRec.completionHistory = incomingRec.completionHistory || [];
            newRec.playSessions = incomingRec.playSessions || [];
            await personalGameStore.setBacklog(canonicalId, newRec.inBacklogQueue, incomingRec.catalogSnapshot);
          }
          mergedCount++;
        } else {
          // Merge: preserve newest updatedAt fields
          const isIncomingNewer = incomingRec.updatedAt && existing.updatedAt
            ? new Date(incomingRec.updatedAt) > new Date(existing.updatedAt)
            : true;

          const mergedSnapshot = isIncomingNewer
            ? incomingRec.catalogSnapshot || existing.catalogSnapshot
            : existing.catalogSnapshot;

          // Merge ownerships by platformId & type
          const mergedOwnerships = [...existing.ownerships];
          if (Array.isArray(incomingRec.ownerships)) {
            for (const inOwn of incomingRec.ownerships) {
              const idx = mergedOwnerships.findIndex(o => o.platformId === inOwn.platformId && o.ownershipType === inOwn.ownershipType);
              if (idx < 0) {
                mergedOwnerships.push(inOwn);
              }
            }
          }

          // Merge completion history by completionId
          const mergedCompletions = [...existing.completionHistory];
          if (Array.isArray(incomingRec.completionHistory)) {
            for (const inComp of incomingRec.completionHistory) {
              const idx = mergedCompletions.findIndex(c => c.completionId === inComp.completionId);
              if (idx < 0) {
                mergedCompletions.push(inComp);
              }
            }
          }

          existing.catalogSnapshot = mergedSnapshot;
          existing.ownerships = mergedOwnerships;
          existing.completionHistory = mergedCompletions;
          if (isIncomingNewer && incomingRec.currentPlayStatus) existing.currentPlayStatus = incomingRec.currentPlayStatus;
          if (isIncomingNewer && incomingRec.interestStatus) existing.interestStatus = incomingRec.interestStatus;
          if (isIncomingNewer && incomingRec.userRating !== undefined) existing.userRating = incomingRec.userRating;
          if (isIncomingNewer && incomingRec.userNotes) existing.userNotes = incomingRec.userNotes;
          if (isIncomingNewer && incomingRec.inBacklogQueue !== undefined) existing.inBacklogQueue = incomingRec.inBacklogQueue;

          await personalGameStore.setBacklog(canonicalId, existing.inBacklogQueue, mergedSnapshot);
          mergedCount++;
        }
      }

      setImportStatus(`Successfully merged ${mergedCount} personal game records into your library.`);
      setParsedExportData(null);
    } catch (err: any) {
      setImportError(`Merge error: ${err?.message || 'Failed to merge records.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Replace Strategy
  const handleExecuteReplace = async () => {
    if (!parsedExportData || !confirmReplace) return;
    setIsProcessing(true);
    setImportError(null);

    try {
      const currentRecords = personalGameStore.getAllRecords();
      for (const rec of currentRecords) {
        await personalGameStore.removePersonalRecord(rec.gameId);
      }

      let importedCount = 0;
      for (const incomingRec of parsedExportData.personalGames) {
        if (!incomingRec.gameId) continue;
        const canonicalId = normalizePersonalGameId(incomingRec.gameId);
        await personalGameStore.setInterestStatus(canonicalId, incomingRec.interestStatus, incomingRec.catalogSnapshot);
        const newRec = personalGameStore.getRecord(canonicalId);
        if (newRec) {
          newRec.ownerships = incomingRec.ownerships || [];
          newRec.currentPlayStatus = incomingRec.currentPlayStatus;
          newRec.inBacklogQueue = Boolean(incomingRec.inBacklogQueue);
          newRec.userRating = incomingRec.userRating;
          newRec.userNotes = incomingRec.userNotes;
          newRec.customTags = incomingRec.customTags || [];
          newRec.completionHistory = incomingRec.completionHistory || [];
          newRec.playSessions = incomingRec.playSessions || [];
          await personalGameStore.setBacklog(canonicalId, newRec.inBacklogQueue, incomingRec.catalogSnapshot);
        }
        importedCount++;
      }

      setImportStatus(`Successfully replaced library with ${importedCount} imported records.`);
      setParsedExportData(null);
      setConfirmReplace(false);
    } catch (err: any) {
      setImportError(`Replace error: ${err?.message || 'Failed to replace records.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0C1D2D]/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative w-full max-w-lg rounded-3xl p-6 border border-[#C5A059] shadow-2xl space-y-5 bg-[#FDFBF7] text-[#0C1D2D]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3">
          <h3 className="font-bold text-base font-serif text-[#0C1D2D]">
            Personal Data Backup & Restore
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-[#EFE8D8] text-[#0C1D2D] hover:bg-[#D9C8A9] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Mode Selector */}
        <div className="flex bg-[#EFE8D8] p-1 rounded-2xl border border-[#D9C8A9]">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'export' ? 'bg-[#0B2B3C] text-white shadow-xs border border-[#C5A059]' : 'text-[#0C1D2D] hover:bg-white/50'
            }`}
          >
            <Download className="w-4 h-4 text-[#C5A059]" />
            <span>Export Backup (JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import' ? 'bg-[#0B2B3C] text-white shadow-xs border border-[#C5A059]' : 'text-[#0C1D2D] hover:bg-white/50'
            }`}
          >
            <Upload className="w-4 h-4 text-[#C5A059]" />
            <span>Import / Restore Data</span>
          </button>
        </div>

        {/* Export Tab Content */}
        {activeTab === 'export' && (
          <div className="space-y-4 text-xs font-sans">
            <p className="text-[#47586A] leading-relaxed font-medium">
              Download your complete Play Atlas personal game library as a portable JSON backup file. Includes all platform ownerships, play statuses, ratings, review notes, custom tags, backlog entries, and completion histories.
            </p>
            <div className="p-4 rounded-2xl bg-[#EFE8D8] border border-[#D9C8A9] flex items-center justify-between font-sans">
              <div>
                <span className="block font-bold text-[#0C1D2D]">Personal Games Count</span>
                <span className="text-[11px] text-[#47586A]">{personalGameStore.getAllRecords().length} tracked records</span>
              </div>
              <FileText className="w-8 h-8 text-[#0B2B3C] opacity-80" />
            </div>
            <button
              onClick={handleExportData}
              className="w-full py-3 rounded-2xl bg-[var(--primary-action)] hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Personal Data (JSON)</span>
            </button>
          </div>
        )}

        {/* Import Tab Content */}
        {activeTab === 'import' && (
          <div className="space-y-4 text-xs">
            <p className="text-[#475569] leading-relaxed font-medium">
              Select a Play Atlas JSON export file to restore or merge your personal library data.
            </p>

            <div className="p-3 bg-white rounded-2xl border border-[#c8b584]">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="block w-full text-xs text-[#0f2b48] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--primary-action)] file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>

            {importStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-950 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {parsedExportData && (
              <div className="space-y-3 pt-2 border-t border-[#c8b584]">
                <div className="flex gap-3">
                  <button
                    onClick={handleExecuteMerge}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                  >
                    {isProcessing ? 'Merging...' : 'Merge Records'}
                  </button>
                </div>

                {/* Replace Option with Confirmation */}
                <div className="pt-2 border-t border-dashed border-[#c8b584] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-800">
                    <input
                      type="checkbox"
                      checked={confirmReplace}
                      onChange={e => setConfirmReplace(e.target.checked)}
                      className="rounded accent-rose-600"
                    />
                    <span>I understand Replace will overwrite existing personal records.</span>
                  </label>
                  {confirmReplace && (
                    <button
                      onClick={handleExecuteReplace}
                      disabled={isProcessing}
                      className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all"
                    >
                      {isProcessing ? 'Replacing...' : 'Confirm & Replace All Personal Data'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
