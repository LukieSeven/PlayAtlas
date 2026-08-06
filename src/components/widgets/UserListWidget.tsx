import React from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, Trophy } from 'lucide-react';
import { UserGameList } from '../../types/userList';
import { DEFAULT_TIER_ROWS } from '../../services/userListService';
import { CompactGameLookupRecord } from '../../types/catalog';
import { HomeWidgetDisplaySettings } from '../../types/homeWidget';
import { HomeGameWidgetRenderer } from './HomeGameWidgetRenderer';

interface UserListWidgetProps {
  list: UserGameList;
  title?: string;
  games?: CompactGameLookupRecord[];
  display?: HomeWidgetDisplaySettings;
  isHydrating?: boolean;
  onSelect?: (game: CompactGameLookupRecord) => void;
  yuckedIds?: Set<number>;
  allowCatalogSampling?: boolean;
}

export const UserListWidget: React.FC<UserListWidgetProps> = ({ list, title, games, display, isHydrating, onSelect, yuckedIds, allowCatalogSampling }) => {
  const tiers = list.tiers || DEFAULT_TIER_ROWS;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3 pr-28">
        <div className="flex min-w-0 items-center gap-2">
          {list.kind === 'tier' ? <Trophy className="h-4 w-4 shrink-0 text-[#C5A059]" /> : <ListOrdered className="h-4 w-4 shrink-0 text-[#C5A059]" />}
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-bold text-[#0C1D2D]">{title || list.name}</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D37]">{list.kind === 'tier' ? 'Tier List' : 'Custom List'} · {list.entries.length} games</p>
          </div>
        </div>
        <Link to="/lists" className="shrink-0 text-xs font-bold text-[#0B2B3C] hover:underline">Edit List</Link>
      </div>

      {display && games && onSelect ? (
        <HomeGameWidgetRenderer games={games} display={display} isHydrating={isHydrating} onSelect={onSelect} yuckedIds={yuckedIds} allowCatalogSampling={allowCatalogSampling} />
      ) : list.entries.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[#C8B584] bg-[#EFE8D8]/70 p-5 text-center">
          <ListOrdered className="mb-2 h-7 w-7 text-[#8C6D37]" />
          <p className="text-xs font-bold text-[#0C1D2D]">This list is ready to populate</p>
          <Link to="/lists" className="mt-1 text-[11px] font-semibold text-[#0B2B3C] hover:underline">Add games in Lists</Link>
        </div>
      ) : list.kind === 'regular' ? (
        <ol className="grid min-h-44 grid-cols-1 content-start gap-2 sm:grid-cols-2">
          {list.entries.slice(0, 10).map((entry, index) => (
            <li key={entry.game.id} className="flex items-center gap-2 rounded-xl border border-[#D9C8A9] bg-white/75 p-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0B2B3C] font-mono text-[11px] font-black text-white">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#0C1D2D]">{entry.game.name}</p>
                <p className="text-[10px] text-[#718294]">{entry.game.year || 'TBA'}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="min-h-44 space-y-1.5">
          {tiers.filter(tier => list.entries.some(entry => entry.tier === tier.id)).slice(0, 8).map(tier => (
            <div key={tier.id} className="flex items-center gap-2 rounded-xl border border-[#D9C8A9] bg-white/75 p-1.5">
              <span className="flex min-h-8 w-20 shrink-0 items-center justify-center rounded-lg bg-[#0B2B3C] px-2 text-center text-[11px] font-black text-white">{tier.label}</span>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                {list.entries.filter(entry => entry.tier === tier.id).slice(0, 4).map(entry => (
                  <span key={entry.game.id} className="truncate rounded-lg bg-[#EFE8D8] px-2 py-1 text-[10px] font-bold text-[#0C1D2D]">{entry.game.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {list.entries.length > 10 && <p className="text-right text-[10px] font-semibold text-[#718294]">+{list.entries.length - 10} more games</p>}
    </div>
  );
};
