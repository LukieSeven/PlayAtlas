import React, { useState, useRef, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  CheckCircle2,
  Bookmark,
  Heart,
  Package,
  Trash2,
  X
} from 'lucide-react';
import { personalGameStore } from '../../services/personalGameStore';
import { usePersonalGameRecord } from '../../hooks/usePersonalGameRecord';
import { useAnchoredPopover } from '../../hooks/useAnchoredPopover';
import { actionMenuCoordinator } from '../../services/actionMenuCoordinator';
import { OwnershipType, PhysicalCondition, PlayStatus, PersonalGameRecord } from '../../types/personal';

interface UniversalActionMenuProps {
  gameId: string | number;
  gameTitle: string;
  coverUrl?: string;
  releaseYear?: number;
  className?: string;
  personalRecord?: PersonalGameRecord;
}

export const UniversalActionMenu: React.FC<UniversalActionMenuProps> = ({
  gameId,
  gameTitle,
  coverUrl,
  releaseYear,
  className = '',
  personalRecord: providedPersonalRecord,
}) => {
  const strId = String(gameId);
  const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Subscribe to per-game store updates ONLY if parent did not already supply the record prop
  const hookRecord = usePersonalGameRecord(providedPersonalRecord ? null : gameId);
  const personalRecord = providedPersonalRecord || hookRecord;

  // Single open menu coordination across all cards via useSyncExternalStore
  const instanceIdRef = useRef(`menu_${strId}_${Math.random().toString(36).substring(2, 9)}`);
  const menuId = instanceIdRef.current;

  const activeMenuId = useSyncExternalStore(
    actionMenuCoordinator.subscribe,
    actionMenuCoordinator.getSnapshot,
    actionMenuCoordinator.getSnapshot
  );

  const isOpen = activeMenuId === menuId;

  const handleClose = useCallback(() => {
    actionMenuCoordinator.closeMenu(menuId);
  }, [menuId]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      actionMenuCoordinator.closeMenu(menuId);
    } else {
      actionMenuCoordinator.openMenu(menuId);
    }
  }, [isOpen, menuId]);

  const { position } = useAnchoredPopover(isOpen, handleClose, triggerRef, popoverRef, {
    margin: 12,
    width: 224,
  });

  // Ownership form state
  const [platformId, setPlatformId] = useState<number>(6); // Default PC
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('digital');
  const [condition, setCondition] = useState<PhysicalCondition>('complete_in_box');
  const [storefront, setStorefront] = useState<string>('');

  const catalogSnapshot = { name: gameTitle, coverUrl, releaseYear };

  const isOwned = Boolean(personalRecord && personalRecord.ownerships.length > 0);
  const inBacklog = Boolean(personalRecord?.inBacklogQueue);
  const playStatus = personalRecord?.currentPlayStatus;
  const interestStatus = personalRecord?.interestStatus;
  const userRating = personalRecord?.userRating;

  // Portal target element (document.body in browser environment)
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
    <div className={`relative ${className}`} onClick={e => e.stopPropagation()}>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="p-1.5 rounded-xl bg-[rgba(0,0,0,0.3)] hover:bg-[rgba(0,0,0,0.6)] text-white/80 hover:text-white border border-white/20 backdrop-blur-md transition-all"
        title="Universal Action Menu"
        data-testid="action-menu-trigger"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Action Menu Dropdown - Rendered through portal to document.body */}
      {isOpen && portalTarget && createPortal(
        <div
          ref={popoverRef}
          onClick={e => e.stopPropagation()}
          data-testid="action-menu-dropdown"
          className={`w-56 action-menu-popover rounded-2xl border border-[var(--panel-border)] shadow-2xl p-2 z-[9999] space-y-1 overflow-y-auto${position ? ' animate-in fade-in zoom-in-95 duration-150' : ''}`}
          style={{
            position: 'fixed',
            top: position ? `${position.top}px` : '-9999px',
            left: position ? `${position.left}px` : '-9999px',
            maxHeight: position ? `${position.maxHeight}px` : '340px',
            opacity: position ? 1 : 0,
            visibility: position ? 'visible' : 'hidden',
            pointerEvents: position ? 'auto' : 'none',
          }}
        >
          <div className="px-2 py-1 border-b border-[var(--panel-border)] text-[10px] font-mono text-[var(--text-muted)] uppercase flex justify-between items-center">
            <span className="truncate">{gameTitle}</span>
            <span className="text-[var(--accent-color)] font-bold">Actions</span>
          </div>

          {/* Own It */}
          <button
            onClick={e => {
              e.stopPropagation();
              setIsOwnershipModalOpen(true);
              handleClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isOwned
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
              <span>{isOwned && personalRecord ? `Owned (${personalRecord.ownerships.length})` : 'Own It...'}</span>
            </div>
            {isOwned && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>

          {/* Backlog Toggle */}
          <button
            onClick={async e => {
              e.stopPropagation();
              await personalGameStore.setBacklog(strId, !inBacklog, catalogSnapshot);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              inBacklog
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5" />
              <span>{inBacklog ? 'In Backlog Queue' : 'Add to Backlog'}</span>
            </div>
            {inBacklog && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
          </button>

          {/* Play Status Quick Selection */}
          <div className="pt-1 border-t border-[var(--panel-border)]">
            <span className="px-2 text-[9px] font-mono text-[var(--text-muted)] uppercase">Play Status</span>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['playing', 'completed', 'dropped'] as PlayStatus[]).map(st => (
                <button
                  key={st}
                  onClick={async e => {
                    e.stopPropagation();
                    await personalGameStore.setPlayStatus(strId, playStatus === st ? undefined : st, catalogSnapshot);
                  }}
                  className={`py-1 text-[10px] font-bold rounded-lg capitalize transition-colors ${
                    playStatus === st
                      ? 'bg-[var(--primary-action)] text-white shadow-sm'
                      : 'bg-[rgba(0,0,0,0.05)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {st === 'dropped' ? 'Yuck!' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Interest Status */}
          <div className="pt-1 border-t border-[var(--panel-border)]">
            <span className="px-2 text-[9px] font-mono text-[var(--text-muted)] uppercase">Preference</span>
            <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={async e => {
                    e.stopPropagation();
                    const isLiked = interestStatus === 'wanted' || interestStatus === 'wishlist';
                    await personalGameStore.setInterestStatus(strId, isLiked ? undefined : 'wanted', catalogSnapshot);
                  }}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg capitalize flex items-center justify-center gap-1 transition-colors ${
                    interestStatus === 'wanted' || interestStatus === 'wishlist'
                      ? 'bg-[var(--accent-color)] text-slate-950 font-extrabold shadow-sm'
                      : 'bg-[rgba(0,0,0,0.05)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Heart className="w-3 h-3" />
                  <span>Like</span>
                </button>
            </div>
          </div>

          {/* Rating Slider */}
          <div className="pt-1 border-t border-[var(--panel-border)] px-2" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center text-[9px] font-mono text-[var(--text-muted)]">
              <span>Personal Rating</span>
              <span className="font-bold text-[var(--accent-color)]">{userRating !== undefined ? `${userRating} ★` : 'Not Rated'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={userRating || 0}
              onChange={async e => {
                const val = parseFloat(e.target.value);
                await personalGameStore.setUserRating(strId, val > 0 ? val : undefined, catalogSnapshot);
              }}
              className="w-full h-1.5 mt-1 accent-[var(--accent-color)] cursor-pointer"
            />
          </div>

          {/* Clear Personal Record */}
          {personalRecord && (
            <div className="pt-1 border-t border-[var(--panel-border)]">
              <button
                onClick={async e => {
                  e.stopPropagation();
                  await personalGameStore.removePersonalRecord(strId);
                  handleClose();
                }}
                className="w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Personal Record</span>
              </button>
            </div>
          )}
        </div>,
        portalTarget
      )}

      {/* Add Ownership Modal Dialog */}
      {isOwnershipModalOpen && portalTarget && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0C1D2D]/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={e => e.stopPropagation()}
          data-testid="ownership-modal"
        >
          <div className="relative w-full max-w-sm rounded-3xl p-6 border border-[#C5A059] shadow-2xl space-y-4 bg-[#FDFBF7] text-[#0C1D2D]">
            <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3">
              <h4 className="font-bold font-serif text-[#0C1D2D] text-base">Add Platform Ownership</h4>
              <button
                onClick={() => setIsOwnershipModalOpen(false)}
                className="p-1 text-[#718294] hover:text-[#0C1D2D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-[#8C6D37] uppercase font-bold mb-1">Platform System</label>
                <select
                  value={platformId}
                  onChange={e => setPlatformId(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-xl bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9] font-medium"
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

              <div>
                <label className="block text-[10px] font-mono text-[#8C6D37] uppercase font-bold mb-1">Ownership Format</label>
                <select
                  value={ownershipType}
                  onChange={e => setOwnershipType(e.target.value as OwnershipType)}
                  className="w-full p-2 rounded-xl bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9] font-medium"
                >
                  <option value="digital">Digital Copy</option>
                  <option value="physical">Physical Disc / Cartridge</option>
                  <option value="subscription">Subscription (Game Pass / PS Plus)</option>
                  <option value="borrowed">Borrowed / Shared</option>
                  <option value="previously_owned">Previously Owned</option>
                </select>
              </div>

              {ownershipType === 'physical' && (
                <div>
                  <label className="block text-[10px] font-mono text-[#8C6D37] uppercase font-bold mb-1">Physical Condition</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as PhysicalCondition)}
                    className="w-full p-2 rounded-xl bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9] font-medium"
                  >
                    <option value="sealed">Sealed New</option>
                    <option value="complete_in_box">Complete in Box (CIB)</option>
                    <option value="loose">Loose Cartridge / Disc Only</option>
                    <option value="damaged">Damaged Box / Disc</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-[#8C6D37] uppercase font-bold mb-1">Storefront / Provider (Optional)</label>
                <input
                  type="text"
                  value={storefront}
                  onChange={e => setStorefront(e.target.value)}
                  placeholder="e.g. Steam, GOG, eShop, PlayStation Store"
                  className="w-full p-2 rounded-xl bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9] font-medium"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={async e => {
                  e.stopPropagation();
                  await personalGameStore.addOwnership(
                    strId,
                    {
                      platformId,
                      ownershipType,
                      condition: ownershipType === 'physical' ? condition : undefined,
                      storefrontOrProvider: storefront.trim() || undefined,
                    },
                    catalogSnapshot
                  );
                  setIsOwnershipModalOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#0B2B3C] hover:bg-[#0F4C5C] text-white border border-[#C5A059] text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Ownership Record
              </button>
            </div>
          </div>
        </div>,
        portalTarget
      )}
    </div>
  );
};
