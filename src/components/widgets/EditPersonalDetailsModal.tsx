import React, { useState, useEffect } from 'react';
import { Edit3, X, Tag, Star, ListOrdered, MessageSquare } from 'lucide-react';
import { personalGameStore } from '../../services/personalGameStore';
import { PersonalGameRecord } from '../../types/personal';

interface EditPersonalDetailsModalProps {
  gameId: string | number | null;
  gameTitle: string;
  coverUrl?: string;
  releaseYear?: number;
  existingRecord?: PersonalGameRecord;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPersonalDetailsModal: React.FC<EditPersonalDetailsModalProps> = ({
  gameId,
  gameTitle,
  coverUrl,
  releaseYear,
  existingRecord,
  isOpen,
  onClose,
}) => {
  const [rating, setRating] = useState<string>('');
  const [backlogPriority, setBacklogPriority] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingRecord) {
      setRating(existingRecord.userRating !== undefined ? String(existingRecord.userRating) : '');
      setBacklogPriority(existingRecord.backlogPriority !== undefined ? String(existingRecord.backlogPriority) : '');
      setTagsInput(existingRecord.customTags ? existingRecord.customTags.join(', ') : '');
      setNotes(existingRecord.userNotes || '');
    } else {
      setRating('');
      setBacklogPriority('');
      setTagsInput('');
      setNotes('');
    }
  }, [existingRecord, isOpen]);

  if (!isOpen || !gameId) return null;

  const catalogSnapshot = { name: gameTitle, coverUrl, releaseYear };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const ratingNum = parseFloat(rating);
      const priorityNum = parseInt(backlogPriority, 10);
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Save user rating
      await personalGameStore.setUserRating(
        gameId,
        !isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 10 ? ratingNum : undefined,
        catalogSnapshot
      );

      // Save notes
      await personalGameStore.setNotes(gameId, notes.trim() || undefined, catalogSnapshot);

      // Save tags & backlog priority atomically via store API
      await personalGameStore.setTagsAndPriority(
        gameId,
        parsedTags,
        !isNaN(priorityNum) && priorityNum >= 1 ? priorityNum : undefined,
        catalogSnapshot
      );

      onClose();
    } catch (err) {
      console.error('Failed to update personal details:', err);
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
            <Edit3 className="w-5 h-5 text-[var(--primary-action)]" />
            <h3 className="font-extrabold text-base themed-heading text-[#0c1e36]">Edit Personal Details</h3>
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
          {/* Rating & Backlog Priority Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" /> Rating (0-10)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={rating}
                onChange={e => setRating(e.target.value)}
                placeholder="e.g. 9.0"
                className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold placeholder:text-[#94a3b8]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
                <ListOrdered className="w-3 h-3 text-indigo-600" /> Backlog Priority
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="100"
                value={backlogPriority}
                onChange={e => setBacklogPriority(e.target.value)}
                placeholder="1 (Highest) - 99"
                className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          {/* Custom Tags */}
          <div>
            <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-purple-600" /> Custom Tags (Comma Separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. Favorite, Cozy, Must Replay, GOTY Candidate"
              className="w-full p-2.5 rounded-xl bg-white text-[#0f2b48] border border-[#c8b584] font-semibold placeholder:text-[#94a3b8]"
            />
          </div>

          {/* User Notes */}
          <div>
            <label className="block text-[10px] font-mono text-[#475569] uppercase font-bold mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-emerald-600" /> Personal Notes & Thoughts
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write play notes, favorite moments, or wishlist details..."
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
              <Edit3 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Personal Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
