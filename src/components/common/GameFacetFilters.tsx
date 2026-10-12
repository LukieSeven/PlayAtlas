import { useId, useMemo } from 'react';
import type { CompactGameLookupRecord } from '../../types/catalog';
import type { GameFilters } from '../../utils/catalogFacets';
import { emptyGameFilters } from '../../utils/catalogFacets';

interface Props {
  filters: GameFilters; onChange: (filters: GameFilters) => void; games: CompactGameLookupRecord[];
  expanded: boolean; onExpand: (expanded: boolean) => void; loading?: boolean; error?: string; onRetry?: () => void;
}
export function GameFacetFilters({ filters, onChange, games, expanded, onExpand, loading, error, onRetry }: Props) {
  const id = useId();
  const fields = [['genre', 'Genre', 'genres'], ['platform', 'Platform', 'platforms'], ['developer', 'Developer', 'developers'], ['publisher', 'Publisher', 'publishers'], ['franchise', 'Franchise', 'franchises']] as const;
  const options = useMemo(() => Object.fromEntries(fields.map(([key, , source]) => [key,
    [...new Set((expanded ? games : []).flatMap(game => game[source] ?? (key === 'developer' && game.developer ? [game.developer] : [])))].sort((a, b) => a.localeCompare(b)),
  ])), [games, expanded]);
  const count = Object.values(filters).filter(Boolean).length;
  const control = 'w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs text-[var(--text-primary)]';
  return <section className="space-y-3 border-t border-[var(--panel-border)] pt-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" aria-expanded={expanded} onClick={() => onExpand(!expanded)} className="text-sm font-bold text-[var(--primary-action)]">{expanded ? 'Hide game filters' : 'More game filters'}{count > 0 ? ` (${count})` : ''}</button>
      {count > 0 && <button type="button" onClick={() => onChange({ ...emptyGameFilters })} className="text-xs underline">Clear game filters</button>}
    </div>
    {count > 0 && <div className="flex flex-wrap gap-2" aria-label="Active game filters">{Object.entries(filters).filter(([, value]) => value).map(([key, value]) => <button type="button" key={key} className="rounded-lg border border-[var(--panel-border)] px-2 py-1 text-xs" aria-label={`Remove ${key} filter`} onClick={() => onChange({ ...filters, [key]: '' })}>{key === 'gameType' ? 'Game type' : key}: {value.replace(/_/g, ' ')} ×</button>)}</div>}
    {expanded && <>
      {loading && <p role="status" className="text-xs">Loading filter details...</p>}
      {error && <p role="alert" className="text-xs">{error} <button type="button" className="underline" onClick={onRetry}>Retry</button></p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {fields.map(([key, label]) => <label key={key} className="space-y-1 text-xs font-semibold">{label}
          <input aria-label={label} list={`${id}-${key}`} value={filters[key]} onChange={event => onChange({ ...filters, [key]: event.target.value })} placeholder={`Any ${label.toLowerCase()}`} className={control} />
          <datalist id={`${id}-${key}`}>{options[key].filter(value => value.toLowerCase().includes(filters[key].toLowerCase())).slice(0, 50).map(value => <option key={value} value={value} />)}</datalist>
        </label>)}
        <label className="space-y-1 text-xs font-semibold">Game type<select aria-label="Game type" className={control} value={filters.gameType} onChange={event => onChange({ ...filters, gameType: event.target.value })}>
          <option value="">All game types</option>{['main_game', 'remake', 'remaster', 'expanded_game', 'port', 'standalone_expansion', 'expansion', 'dlc_addon', 'bundle', 'pack', 'mod', 'episode', 'season', 'community_modification', 'unknown'].map(value => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
        </select></label>
        <label className="space-y-1 text-xs font-semibold">Ownership<select aria-label="Ownership" className={control} value={filters.ownership} onChange={event => onChange({ ...filters, ownership: event.target.value })}>
          <option value="">Any ownership</option>{[['owned', 'Owned'], ['unowned', 'Not owned'], ['digital', 'Digital'], ['physical', 'Physical'], ['subscription', 'Subscription'], ['borrowed', 'Borrowed'], ['previously_owned', 'Previously owned']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div><p className="text-xs text-[var(--text-muted)]">Filters combine. Type part of a name or choose a suggestion. Ownership comes from your personal library.</p>
    </>}
  </section>;
}
