import { useState, useCallback } from 'react';
import { CompactGameLookupRecord } from '../types/catalog';
import { executeProgressiveTokenSearch } from '../services/tokenSearchService';

export function useCatalogSearch() {
  const [results, setResults] = useState<CompactGameLookupRecord[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const search = useCallback(async (query: string, maxResults: number = 20) => {
    if (!query.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    setIsSearching(true);
    try {
      const searchRes = await executeProgressiveTokenSearch(query, maxResults);
      setResults(searchRes.results || []);
      setTotalMatches(searchRes.totalMatchingResults || searchRes.results.length);
    } catch (err) {
      console.error('Catalog search error:', err);
      setResults([]);
      setTotalMatches(0);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    results,
    totalMatches,
    isSearching,
    search,
  };
}
