# Catalog search and filters

Search Catalog is available in the sidebar. Pressing Enter in the header search, or choosing “All results and game filters,” opens the complete catalog search instead of the eight-result preview.

The shared game filter panel is used by catalog search, New Releases, Upcoming Games, list creation, the personal library, and Discounts. It supports genre, exact named platform, developer, publisher, franchise/series, game type, and personal ownership. Different fields combine with AND; games can match any of their multiple developers, genres, platforms, or franchises. Text matching ignores capitalization and accents and accepts partial names. Unknown metadata does not satisfy an active metadata filter. Ownership is local to the user's library, not an inference from storefront availability.

IGDB series collections are included alongside franchises because some series are represented as collections. Company roles remain separate: a publisher does not automatically match the developer field.

Suggestions are alphabetical and limited to 50 displayed matches per field. Active filter chips can be removed individually; “Clear game filters” resets the shared fields. Existing date-window, storefront, price, play-status, and personal-rating controls keep their respective scopes. The list-builder and New Releases full-catalog searches apply active game filters to the entire catalog rather than only the first 60 search results.

Popularity and highest-rating sorts are available on shared catalog grids. Missing dates sort last in either direction; equal dates use alphabetical order. Discounts retain the existing popularity-weighted deal ranking and price/discount sorts. Filtering runs before pagination.

## Data and performance

`scripts/build-catalog-facets.ts` creates `catalog-facets.json.gz` from existing verified catalog chunks. The full catalog builder includes it in the archive; the website-only workflow regenerates it from the published archive without calling IGDB or ITAD. It contains compact display and filter metadata, not summaries, screenshots, or complete game details. Rank signals are reduced to a precomputed importance score.

The browser caches one shared index per session and loads it when advanced metadata is requested, or when Search Catalog is opened. Download decompression and JSON parsing use a worker. Matching and sorting datasets of 2,000 or more games also run in a worker, with a 180 ms typing delay and stale-result rejection. No matching worker is created while no search, game filters, or explicit sort are active. Catalog grids initially mount 40 cards; Discounts mount 48. Missing index downloads display an error and a retry control rather than fabricated metadata.

Browser regression coverage includes combined fields, reset, personal ownership, a 380,882-record catalog fixture with a match beyond the initial page, a 126,511-deal fixture, and desktop/mobile layouts. Fixture timings are measurements of the test computer, not guarantees for every device or connection.

Useful next improvements: saved filter presets, multi-select values within a field, and counts beside suggestions. A server-backed index would be appropriate if low-memory mobile devices become a primary target or the catalog grows substantially; it would reduce the initial client download and memory use.
