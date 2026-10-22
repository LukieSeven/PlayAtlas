# Pricing freshness

ITAD's `current` field is a snapshot of the best store offer, not a promise
that the price will remain available until the next import. The importer
preserves the offer's `timestamp` as `sourceUpdatedAt` and `expiry` as
`expiresAt`, and records `updatedAt` when each price batch is received.
`generatedAt` records completion of the feed, not the start of a long import.

Only discounted offers that have not expired are published and displayed.
The browser checks validity again every 30 seconds and on returning to a tab.
It revalidates the feed with HTTP cache validation every five minutes. Prices
older than 26 hours are hidden if the nightly refresh fails or is delayed.
The Home preview carries 50 candidates and displays the best ten still active.

An offer with no source expiration date can still change between daily
imports. A static GitHub Pages feed cannot detect that change in real time;
browser revalidation only obtains the latest published snapshot. The 26-hour
limit is a safety bound, not live store verification. Do not claim a successful
workflow or a recent feed timestamp proves every store price is current.

For source diagnostics, run **Check Live Pricing (No Catalog Import)**.
It compares ITAD's best offer, ITAD's Steam offer, Steam's own US price,
and the published Home entry, without exposing credentials or deploying.

To regenerate pricing immediately, run **IGDB Database Pipeline Importer &
Pages Deployment** with `deploy_existing`. This reuses the existing catalog,
fetches current prices, and publishes both pricing feeds and the website.
**Deploy Website Only (Reuse Existing Data)** does not fetch new prices and
cannot reconstruct expiration dates discarded by an older import.

Diagnostic on October 22, 2026: ITAD and Steam both reported Steam's Red Dead
Redemption 2 price as $59.99. ITAD's $14.99 offer was at Epic, expiring November
2. The published feed still contained $14.99 labeled Steam. The source had
changed since the snapshot, while the old importer had discarded expiration
metadata and the browser had no expiry checks.
