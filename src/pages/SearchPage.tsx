import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadCatalogFacets } from '../services/catalogFacetService';
import type { CompactGameLookupRecord } from '../types/catalog';
import { GameListGrid } from '../components/widgets/GameListGrid';
import { GameDetailModal } from '../components/widgets/GameDetailModal';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [games, setGames] = useState<CompactGameLookupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<CompactGameLookupRecord | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    loadCatalogFacets().then(data => { if (active) setGames(Array.from(data.values())); })
      .catch(() => { if (active) setError('Catalog search could not load.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const input = useMemo(() => <label className="block font-bold text-sm">Search the catalog
    <input aria-label="Search the catalog" value={query} onChange={event => setParams({ q: event.target.value }, { replace: true })} placeholder="Game title or alternative title" className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 py-2" />
  </label>, [query, setParams]);
  return <div className="space-y-6">
    {error && <p role="alert">{error} <button className="underline" onClick={() => setAttempt(value => value + 1)}>Retry</button></p>}
    <GameListGrid title="Search Catalog" games={games} catalogQuery={query} filterQuery collectionKey={query} searchContent={input} isLoading={loading} onSelectGame={setSelected} />
    <GameDetailModal selectedGame={selected} onClose={() => setSelected(null)} />
  </div>;
}
