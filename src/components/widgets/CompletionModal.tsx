import React, { useState } from 'react';
import { Trophy, X, Calendar, Clock, Star, MessageSquare } from 'lucide-react';
import { personalGameStore } from '../../services/personalGameStore';
import { CompletionRecord } from '../../types/personal';

type CompletionType = CompletionRecord['completionType'];

interface CompletionModalProps {
  gameId: string | number | null;
  gameTitle: string;
  coverUrl?: string;
  releaseYear?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  gameId,
  gameTitle,
  coverUrl,
  releaseYear,
  isOpen,
  onClose,
}) => {
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [platformId, setPlatformId] = useState<number>(6); // Default PC
  const [completionType, setCompletionType] = useState<CompletionType>('main_story');
  const [playtimeHours, setPlaytimeHours] = useState<string>('');
  const [rating, setRating] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !gameId) return null;

  const catalogSnapshot = { name: gameTitle, coverUrl, releaseYear };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const hoursNum = parseFloat(playtimeHours);
      const ratingNum = parseFloat(rating);

      const completionRecord: CompletionRecord = {
        completionId: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        completedDate: completionDate || new Date().toISOString().slice(0, 10),
        platformId,
        completionType,
        playtimeHours: !isNaN(hoursNum) && hoursNum > 0 ? hoursNum : undefined,
        reviewNotes: notes.trim() || undefined,
      };

      await personalGameStore.addCompletion(gameId, completionRecord, catalogSnapshot);

      if (!isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 10) {
        await personalGameStore.setUserRating(gameId, ratingNum, catalogSnapshot);
      }

      if (notes.trim()) {
        await personalGameStore.setNotes(gameId, notes.trim(), catalogSnapshot);
      }

      onClose();
    } catch (err) {
      console.error('Failed to record completion:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => e.stopPropagation()}
    >
      <div className="relative w-full max-w-md themed-panel rounded-3xl p-6 border border-[#c8b584] shadow-2xl space-y-4 bg-[#fefcf6] text-[#0f2b48]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8b584] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base themed-heading text-[#0c1e36]">Record Game Completion</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-[#ece4d0] text-[#0f2b48] hover:bg-[#e4d8bc]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Game Title Snapshot */}
        <div className="text-xs font-mono text-[#475569] font-semibold flex items-center gap-2 bg-[#f5f0e1] p-2.5 rounded-xl border border-[#c8b584]">
          <span className="truncate">Game: <strong className="text-[#0f2b48]">{gameTitle}</strong></span>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Completion Type Selector */}
          <div>
            <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1">
              Completion Type
            </label>
            <select
              value={completionType}
              onChange={e => setCompletionType(e.target.value as CompletionType)}
              className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold"
            >
              <option value="main_story">Main Story Completed</option>
              <option value="main_plus_extra">Main Story + Extras / Side Quests</option>
              <option value="completionist_100">Completionist / 100% Trophies</option>
              <option value="speedrun">Speedrun / Challenge Run</option>
            </select>
          </div>

          {/* Date & Platform Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[var(--primary-action)]" /> Date Completed
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={e => setCompletionDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1">
                Completed On Platform
              </label>
              <select
                value={platformId}
                onChange={e => setPlatformId(parseInt(e.target.value, 10))}
                className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold"
              >
                <option value={6}>PC (Windows)</option>
                <option value={167}>PlayStation 5</option>
                <option value={48}>PlayStation 4</option>
                <option value={169}>Xbox Series X|S</option>
                <option value={49}>Xbox One</option>
                <option value={130}>Nintendo Switch</option>
                <option value={14}>Mac</option>
                <option value={39}>iOS</option>
                <option value={34}>Android</option>
              </select>
            </div>
          </div>

          {/* Optional Playtime Hours & Personal Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-600" /> Playtime Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={playtimeHours}
                onChange={e => setPlaytimeHours(e.target.value)}
                placeholder="e.g. 45.5"
                className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold placeholder:text-[#94a3b8]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" /> Personal Rating (0-10)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={rating}
                onChange={e => setRating(e.target.value)}
                placeholder="e.g. 9.5"
                className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          {/* Review Notes */}
          <div>
            <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-purple-600" /> Completion Notes / Verdict
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write thoughts about the ending, difficulty, or final verdict..."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold placeholder:text-[#94a3b8]"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-[var(--primary-action)] hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Completion Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
