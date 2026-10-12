# Initial loading splash

The first application page is held behind `StartupGate` until its initial data has settled. The gate follows the entry route and remains open during subsequent navigation. Cached services are reused, and there is no minimum display time or artificial progress.

Search prepares the compact catalog filter index; Discounts prepares and validates the existing deals feed; release pages prepare their respective release windows; list creation prepares the search manifest; calendar and event pages prepare their relevant feeds. Personal library initialization is shared by all application entry pages. Home waits for the enabled discovery, deal, and event widgets; optional Home feed failures do not prevent entry. Full game details and images continue to load on demand.

The progress bar counts completed loading tasks, rather than estimating download percentages. Required data failures show retry and an option to enter the site. After 12 seconds, a slow download offers entry while the shared request continues. Failed page-module downloads are caught by a themed error boundary and can be recovered with a reload. The HTML entry point also contains the branded initial screen and a JavaScript-disabled message before React starts, with a reload control if the application script cannot download.

The artwork is reused from `public/branding`: the watercolor compass, supplied light/dark wordmarks, and the existing parchment/map background layers. Colors and fonts follow the selected theme. Both the system reduced-motion preference and the application's motion setting apply. No new generated artwork is required.

Browser checks cover held downloads, cached single-request entry, desktop/mobile layouts, the midnight theme, reduced motion, mobile navigation, network retry, slow-load escape, and failed page-bundle recovery. The Home highlights share a cached preview request so startup does not download the preview twice.
