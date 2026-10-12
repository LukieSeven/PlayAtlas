import { useGameFilters } from '../hooks/useGameFilters';
import { GameFacetFilters } from '../components/common/GameFacetFilters';
import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Search, Star, ExternalLink, Gift, Sparkles, RefreshCw, ShoppingBag } from 'lucide-react';
import { GameDeal, DealsFilterOptions } from '../types/deals';
import { getAllDeals, loadDealsDataset } from '../services/dealsService';
import { Button } from '../components/ui/Button';

const DEALS_PER_PAGE = 48;

export const DiscountsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'freebies'>('all');
  const [deals, setDeals] = useState<GameDeal[]>([]);
  const [allDeals, setAllDeals] = useState<GameDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [historicalLowOnly, setHistoricalLowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'discount' | 'price_low' | 'price_high'>('popular');

  // Summary Metrics
  const [stats, setStats] = useState({ totalDeals: 0, freebiesCount: 0, historicalLowsCount: 0 });

  const fetchDeals = () => {
    setIsLoading(true);
    const filterOpts: DealsFilterOptions = {
      query: searchQuery,
      minDiscount,
      maxPrice,
      storeId: storeFilter,
      historicalLowOnly,
      freebiesOnly: activeTab === 'freebies',
      sortBy,
    };

    getAllDeals(filterOpts)
      .then(res => {
        setDeals(res);
        setIsLoading(false);
      })
      .catch(err => {
        console.warn('DiscountsPage load error:', err);
        setDeals([]);
        setIsLoading(false);
      });
  };

  // Load summary metrics on mount
  useEffect(() => {
    loadDealsDataset().then(ds => {
      setAllDeals(ds.deals);
      const freebies = ds.deals.filter(d => d.currentPrice.amount === 0 || d.cut === 100).length;
      const historicalLows = ds.deals.filter(d => d.isHistoricalLow).length;
      setStats({
        totalDeals: ds.totalDeals,
        freebiesCount: freebies,
        historicalLowsCount: historicalLows,
      });
    });
  }, []);

  useEffect(() => {
    setPage(1);
    fetchDeals();
  }, [searchQuery, minDiscount, maxPrice, storeFilter, historicalLowOnly, sortBy, activeTab]);

  const uniqueStores = useMemo(() => {
    const stores = new Map<string, string>();
    allDeals.forEach(d => {
      if (d.storeName) stores.set(d.storeId, d.storeName);
    });
    return Array.from(stores, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allDeals]);

  const facetGames = useMemo(() => Array.from(new Map(allDeals.map(deal => [deal.gameId, { id: deal.gameId, name: deal.gameTitle ?? `Game ${deal.gameId}` }])).values()), [allDeals]);
  const facets = useGameFilters(facetGames);
  const matchingIds = useMemo(() => new Set(facets.active ? facets.filtered.map(game => game.id) : []), [facets.active, facets.filtered]);
  const filteredDeals = useMemo(() => facets.active ? deals.filter(deal => matchingIds.has(deal.gameId)) : deals, [deals, facets.active, matchingIds]);
  useEffect(() => setPage(1), [facets.filters]);
  const pageCount = Math.max(1, Math.ceil(filteredDeals.length / DEALS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * DEALS_PER_PAGE;
  const visibleDeals = filteredDeals.slice(pageStart, pageStart + DEALS_PER_PAGE);

  const clearFilters = () => {
    facets.reset();
    setSearchQuery('');
    setMinDiscount(0);
    setMaxPrice(undefined);
    setStoreFilter('all');
    setHistoricalLowOnly(false);
    setSortBy('popular');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      {/* Top Header Summary & Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Total Active Deals */}
        <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B2B3C] text-[#C5A059] flex items-center justify-center font-bold shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-serif font-extrabold text-[#0C1D2D]">
              {stats.totalDeals.toLocaleString()}
            </div>
            <div className="text-xs font-sans font-semibold text-[#8C6D37]">
              Active Storefront Deals
            </div>
          </div>
        </div>

        {/* Metric 2: Freebies & Giveaways */}
        <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-100 flex items-center justify-center font-bold shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-serif font-extrabold text-[#0C1D2D]">
              {stats.freebiesCount.toLocaleString()}
            </div>
            <div className="text-xs font-sans font-semibold text-[#8C6D37]">
              100% Freebies & Claims
            </div>
          </div>
        </div>

        {/* Metric 3: Historical Lows */}
        <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059] text-white flex items-center justify-center font-bold shrink-0">
            <Star className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="text-xl font-serif font-extrabold text-[#0C1D2D]">
              {stats.historicalLowsCount.toLocaleString()}
            </div>
            <div className="text-xs font-sans font-semibold text-[#8C6D37]">
              Historical Low Price Drops
            </div>
          </div>
        </div>
      </div>

      {/* Main Control Panel: Segmented Navigation & Unified Filter Bar */}
      <div className="p-4 md:p-6 rounded-3xl border border-[#C5A059] bg-[#FDFBF7] shadow-lg space-y-4">
        {/* Segmented Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9C8A9] pb-4">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#EFE8D8] border border-[#D9C8A9]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-[#0B2B3C] text-white shadow-xs'
                  : 'text-[#0C1D2D] hover:bg-[#FDFBF7]/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>All Deals ({stats.totalDeals})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('freebies')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'freebies'
                  ? 'bg-[#0B2B3C] text-white shadow-xs'
                  : 'text-[#0C1D2D] hover:bg-[#FDFBF7]/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                <span>Freebies & Giveaways ({stats.freebiesCount})</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#8C6D37]">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Updated via ITAD API</span>
          </div>
        </div>

        {/* Unified Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6D37]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search game title or store name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold bg-[#FDFBF7] text-[#0C1D2D] border border-[#C5A059] placeholder:text-[#718294] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
            />
          </div>

          {/* Min Discount Select */}
          <div className="lg:col-span-2">
            <select
              value={minDiscount}
              onChange={e => setMinDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-[#FDFBF7] text-[#0C1D2D] border border-[#D9C8A9] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
            >
              <option value={0}>All Discounts</option>
              <option value={20}>20%+ Off</option>
              <option value={50}>50%+ Off</option>
              <option value={75}>75%+ Off</option>
            </select>
          </div>

          {/* Max Price Select */}
          <div className="lg:col-span-2">
            <select
              value={maxPrice === undefined ? '' : maxPrice}
              onChange={e => setMaxPrice(e.target.value === '' ? undefined : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-[#FDFBF7] text-[#0C1D2D] border border-[#D9C8A9] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
            >
              <option value="">Any Price</option>
              <option value={10}>Under $10</option>
              <option value={20}>Under $20</option>
              <option value={30}>Under $30</option>
              <option value={50}>Under $50</option>
            </select>
          </div>

          {/* Storefront Filter */}
          <div className="lg:col-span-2">
            <select
              value={storeFilter}
              onChange={e => setStoreFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-[#FDFBF7] text-[#0C1D2D] border border-[#D9C8A9] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
            >
              <option value="all">All Stores</option>
              {uniqueStores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Select */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-[#FDFBF7] text-[#0C1D2D] border border-[#D9C8A9] focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
            >
              <option value="popular">Popular Deals</option>
              <option value="discount">Highest Discount</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Bottom Toggle Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#D9C8A9]/60 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-[#0C1D2D] font-bold">
            <input
              type="checkbox"
              checked={historicalLowOnly}
              onChange={e => setHistoricalLowOnly(e.target.checked)}
              className="rounded border-[#C5A059] text-[#0B2B3C] focus:ring-[#C5A059]"
            />
            <span>Historical Lows Only</span>
          </label>

          {(searchQuery || minDiscount > 0 || maxPrice !== undefined || storeFilter !== 'all' || historicalLowOnly) && (
            <button
              onClick={clearFilters}
              className="text-[#8C6D37] hover:underline font-semibold"
            >
              Clear Active Filters
            </button>
          )}
        </div>
      </div>

      <GameFacetFilters filters={facets.filters} onChange={facets.setFilters} games={facets.enriched} expanded={facets.expanded} onExpand={facets.setExpanded} loading={facets.loading} error={facets.error} onRetry={facets.retry} />

      {/* Results Grid */}
      {isLoading || facets.filtering || (facets.active && facets.loading) ? (
        <div className="p-12 text-center rounded-3xl bg-[#FDFBF7] border border-[#D9C8A9] space-y-3 font-mono text-xs text-[#718294]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0B2B3C] mx-auto" />
          <span>Loading deals dataset...</span>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#FDFBF7] border border-[#D9C8A9] space-y-4">
          <ShoppingBag className="w-10 h-10 text-[#0B2B3C] mx-auto opacity-60" />
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-[#0C1D2D]">No Deals Currently Found</h3>
            <p className="text-xs text-[#718294] max-w-sm mx-auto">
              {stats.totalDeals === 0
                ? 'Prices are unavailable right now. Please check back later.'
                : 'No active storefront deals match your selected filters.'}
            </p>
          </div>
          {stats.totalDeals > 0 && (
            <Button variant="secondary" onClick={clearFilters}>
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="atlas-catalog-card-grid items-start">
          {visibleDeals.map(deal => {
            const isFree = deal.currentPrice.amount === 0 || deal.cut === 100;

            return (
              <div
                key={`${deal.gameId}-${deal.storeId}-${deal.itadId}`}
                data-testid="deal-card"
                className="atlas-compact-deal-card group overflow-hidden rounded-2xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs flex flex-col hover:border-[#C5A059] transition-all"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EFE8D8] border-b border-[#D9C8A9]">
                  {deal.coverUrl ? (
                    <img src={deal.coverUrl.replace('t_cover_small', 't_cover_big')} alt={deal.gameTitle || 'Game cover'} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-[var(--text-secondary)]"><ShoppingBag className="h-16 w-16 opacity-50" aria-label="Cover unavailable" /></div>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex w-full items-center gap-4 min-w-0">
                      <h4 className="font-bold text-xl text-[#0C1D2D] leading-tight break-words">
                        {deal.gameTitle || `Game ID: #${deal.gameId}`}
                      </h4>
                    </div>

                    {deal.isHistoricalLow && (
                      <span className="px-2 py-1 rounded text-xs font-extrabold bg-[#C5A059]/20 text-[var(--text-primary)] border border-[#C5A059] flex items-center gap-1 shrink-0">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>Historical Low</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-baseline justify-between gap-2 pt-0">
                    <div className="atlas-deal-price-group flex items-baseline gap-2">
                      <span className="font-extrabold text-2xl text-[#0C1D2D]">
                        {isFree ? 'FREE' : deal.currentPrice.amountFormatted}
                      </span>
                      {deal.regularPrice.amount > deal.currentPrice.amount && (
                        <span className="line-through text-xs text-[#718294] font-mono">
                          {deal.regularPrice.amountFormatted}
                        </span>
                      )}
                    </div>

                    {deal.cut > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-emerald-700 text-white shadow-xs">
                        -{deal.cut}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#D9C8A9]/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--text-secondary)] break-words min-w-0">
                    {deal.storeName}
                    {deal.voucher && <span className="block text-xs font-mono text-[#718294]">Code: {deal.voucher}</span>}
                  </div>

                  {deal.url && (
                    <a
                      href={deal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#0B2B3C] text-white hover:bg-[#0C1D2D] font-bold text-sm transition-all shadow-xs shrink-0"
                    >
                      <span>Get Deal</span>
                      <ExternalLink className="w-4 h-4 text-[#C5A059]" />
                    </a>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && deals.length > 0 && (
        <nav aria-label="Deals pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span role="status">
            Showing {pageStart + 1}–{Math.min(pageStart + DEALS_PER_PAGE, filteredDeals.length)} of {filteredDeals.length.toLocaleString()} results
          </span>
          <div className="flex items-center gap-3">
            <Button variant="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
            <span>Page {currentPage} of {pageCount.toLocaleString()}</span>
            <Button variant="secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default DiscountsPage;
