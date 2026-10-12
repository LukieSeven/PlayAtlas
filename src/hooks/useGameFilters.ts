import type { CatalogSortMode } from '../utils/gameListControls';
import { useEffect, useMemo, useState, useRef } from 'react';
import type { CompactGameLookupRecord } from '../types/catalog';
import { loadCatalogFacets } from '../services/catalogFacetService';
import { emptyGameFilters, hasGameFilters, matchesGameFilters, matchesCatalogQuery } from '../utils/catalogFacets';
import { usePersonalGameLibrary } from './usePersonalGameLibrary';

export function useGameFilters(games: CompactGameLookupRecord[], eager = false, query = '', acrossCatalog = false, sortBy: CatalogSortMode = 'relevance') {
  const [filters, setFilters] = useState({ ...emptyGameFilters });
  const [expanded, setExpanded] = useState(eager);
  const [metadata, setMetadata] = useState<Map<number, CompactGameLookupRecord>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const records = usePersonalGameLibrary();
  const personal = useMemo(() => new Map(records.map(record => [record.numericId, record])), [records]);
  useEffect(() => {
    if (!expanded && !eager) return;
    let active = true;
    setLoading(true);
    setError('');
    loadCatalogFacets().then(data => { if (active) setMetadata(data); })
      .catch(() => { if (active) setError('Filter details could not be loaded. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [expanded, eager, retry]);
  const enriched = useMemo(() => metadata.size ? games.map(game => metadata.get(game.id) ?? game) : games, [games, metadata]);
  const active = hasGameFilters(filters);
  const candidates = useMemo(() => acrossCatalog && active && metadata.size ? Array.from(metadata.values()) : enriched, [acrossCatalog, active, metadata, enriched]);
  const needsFiltering = active || Boolean(query.trim()) || sortBy !== 'relevance';
  const [workerIds, setWorkerIds] = useState<number[]>([]);
  const [filtering, setFiltering] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  useEffect(() => {
    if (candidates.length < 2000 || !needsFiltering) { setFiltering(false); return; }
    const worker = new Worker(new URL('../workers/gameFilters.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onerror = () => { setError('Game filtering failed. Please retry.'); setWorkerIds([]); setFiltering(false); };
    worker.postMessage({ games: candidates, personal: [], query: '', filters: emptyGameFilters, request: -1 });
    return () => { worker.terminate(); workerRef.current = null; };
  }, [candidates, needsFiltering, retry]);
  useEffect(() => {
    if (candidates.length < 2000 || !needsFiltering || !workerRef.current) return;
    const request = ++requestRef.current;
    setFiltering(true);
    workerRef.current.onmessage = event => { if (event.data.request === requestRef.current) { setWorkerIds(event.data.ids); setFiltering(false); } };
    const timer = window.setTimeout(() => workerRef.current?.postMessage({ request, query, filters, sortBy, personal: Array.from(personal) }), 180);
    return () => window.clearTimeout(timer);
  }, [candidates, filters, personal, query, sortBy, needsFiltering, retry]);
  const candidateMap = useMemo(() => new Map((needsFiltering ? candidates : []).map(game => [game.id, game])), [candidates, needsFiltering]);
  const filtered = useMemo(() => !needsFiltering ? candidates : candidates.length >= 2000 ? workerIds.map(id => candidateMap.get(id)).filter((game): game is CompactGameLookupRecord => Boolean(game)) : candidates.filter(game => matchesCatalogQuery(game, query) && matchesGameFilters(game, filters, personal.get(game.id))), [candidates, candidateMap, workerIds, filters, personal, query, needsFiltering]);
  return { filters, setFilters, expanded, setExpanded, metadata, enriched: candidates, filtered, personal, loading, filtering, sortedByWorker: needsFiltering && candidates.length >= 2000, error,
    active: hasGameFilters(filters), reset: () => setFilters({ ...emptyGameFilters }), retry: () => setRetry(value => value + 1) };
}
