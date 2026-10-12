export interface StartupStep { label: string; state: 'pending' | 'ready' }
export interface StartupTask { label: string; load: () => Promise<unknown>; optional?: boolean }

/** Load the first page's working set. Full game details stay on demand. */
export function startupTasks(pathname: string): StartupTask[] {
  const tasks: StartupTask[] = [{ label: 'Opening your library', load: async () => {
    const { personalGameStore } = await import('./personalGameStore');
    await personalGameStore.init();
  } }];
  if (pathname === '/search') tasks.push({ label: 'Preparing catalog search', load: async () => (await import('./catalogFacetService')).loadCatalogFacets() });
  else if (pathname === '/discounts' || pathname === '/deals') tasks.push({ label: 'Loading current deals', load: async () => {
    const deals = await import('./dealsService');
    await deals.loadDealsDataset();
    if (!deals.isDealsDatasetLoaded()) throw new Error('The deals download failed.');
  } });
  else if (pathname === '/new-releases') tasks.push({ label: 'Discovering new releases', load: async () => (await import('./releaseCatalogService')).queryReleaseCatalog({ timeframe: 'day', viewType: 'first_release' }) });
  else if (pathname === '/upcoming') tasks.push({ label: 'Discovering upcoming games', load: async () => (await import('./releaseCatalogService')).getUpcomingGames() });
  else if (pathname === '/lists' || pathname === '/tier-lists') tasks.push({ label: 'Preparing catalog search', load: async () => (await import('./tokenSearchService')).fetchTokenManifest() });
  else if (pathname === '/calendar') {
    tasks.push({ label: 'Preparing your calendar', load: async () => {
      const today = new Date();
      return (await import('./releaseCatalogService')).getReleaseRecordsForMonth(today.getFullYear(), today.getMonth() + 1);
    } });
    tasks.push({ label: 'Loading events', optional: true, load: async () => (await import('./eventCatalogService')).getEventsCatalog() });
  } else if (pathname.startsWith('/events')) tasks.push({ label: 'Loading events', load: async () => (await import('./eventCatalogService')).getEventsCatalog() });
  else if (pathname === '/') {
    let visible = ['featured', 'upcoming', 'releases', 'deals', 'events'];
    try {
      const preferences = JSON.parse(localStorage.getItem('playatlas_home_widgets_v1') ?? 'null');
      if (preferences?.schemaVersion === 2 && Array.isArray(preferences.visible)) visible = preferences.visible;
    } catch { /* Default Home layout when preferences are unavailable. */ }
    if (visible.some(id => ['featured', 'upcoming', 'releases'].includes(id))) tasks.push({ label: 'Discovering games', optional: true, load: async () => {
      const catalog = await import('./releaseCatalogService');
      return Promise.all([catalog.getNewReleases(10), catalog.getUpcomingGames(10)]);
    } });
    if (visible.includes('deals')) tasks.push({ label: 'Loading deal highlights', optional: true, load: async () => (await import('./dealsService')).getTopDeals() });
    if (visible.includes('events')) tasks.push({ label: 'Loading events', optional: true, load: async () => (await import('./eventCatalogService')).getEventsCatalog() });
  }
  return tasks;
}

export async function prepareStartup(tasks: StartupTask[], onReady: (index: number) => void): Promise<void> {
  const results = await Promise.allSettled(tasks.map(async (task, index) => {
    try { await task.load(); }
    catch (error) { if (!task.optional) throw error; }
    onReady(index);
  }));
  if (results.some(result => result.status === 'rejected')) throw new Error('The initial page could not finish loading.');
}
