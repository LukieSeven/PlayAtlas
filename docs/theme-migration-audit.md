# Play Atlas Visual Theme Migration Audit

**Author**: Antigravity Agent  
**Date**: August 2026  
**Branch**: `theme/atlas-foundation`  
**Starting Commit**: `4cb0e5c`

---

## 1. Existing Theme Architecture

Play Atlas currently uses a hybrid theme architecture built on:
- **Tailwind CSS v4** (`@import "tailwindcss";` in `src/index.css` via `@tailwindcss/vite`).
- **CSS Custom Properties** declared on `:root` in `src/index.css` (`--app-bg`, `--panel-bg`, `--text-primary`, etc.).
- **React ThemeContext** (`src/context/ThemeContext.tsx`) managing light/dark visual theme states and preset switching (`config/themePresets.ts`).
- **Google Fonts** dynamically imported via `@import url('https://fonts.googleapis.com/...');` in CSS.

### Key CSS Utilities Currently Defined
- `.themed-app-shell`: Top-level flex app container with cartographic pseudo-element background overlays (`cartographic-bg-overlay`).
- `.themed-sidebar`: Left navigation panel.
- `.themed-header`: Top navigation header.
- `.themed-panel` & `.themed-card`: Standard component surface containers with paper texture background images.
- `.action-menu-popover`: Isolated fixed popover surface styling for `UniversalActionMenu`.

---

## 2. Major Hardcoded Styling Areas

A codebase inspection reveals several areas with scattered ad-hoc styling that should be standardized into unified theme primitives:
1. **Ad-hoc Tailwind Colors**: Heavy reliance on raw Tailwind palette utilities (`bg-slate-900`, `text-slate-400`, `bg-emerald-600`, `border-amber-500/30`) mixed with custom arbitrary values (`bg-[#0d1b2a]`, `text-[#0f2b48]`).
2. **Hardcoded Borders & Shadows**: Individual card components specify ad-hoc `border border-[var(--panel-border)] shadow-xl hover:shadow-2xl hover:scale-[1.02]` inline rules.
3. **Inconsistent Component Radii**: Mix of `rounded-xl`, `rounded-2xl`, `rounded-lg`, and `rounded-full` across cards, badges, and modals.
4. **Third-Party CDN Fonts**: Dependency on remote Google Fonts CDN in CSS instead of self-hosted font bundles.

---

## 3. Reusable Components Currently Available

- `UniversalActionMenu`: Portal-based 3-dot action dropdown with single-source store (`actionMenuCoordinator`).
- `OwnershipModal`: Modal for tracking owned platforms, physical/digital status, and purchase details.
- `RatingStars`: Rating selector and display.
- `CardBadge`: Status/game-type badge renderer.
- `Header` & `Sidebar`: Core app shell layout navigation.
- `AppLayout`: Shell container binding sidebar, header, main scrollable area, and footer.

---

## 4. Potential Style Conflicts & CSS Safety Rules

> [!CAUTION]
> **CSS Safety Rule**: Visual theme classes must NEVER introduce structural positioning or layout properties (`position: relative`, `position: fixed`, `overflow: hidden`, `transform`, `zoom`, `display`, `width`, `height`, or new stacking contexts).

### Identified Conflicts to Avoid:
1. **Action Menu Portal Override**: Previous regressions were caused when `.themed-panel` or visual wrapper classes declared `position: relative` or `overflow: hidden`, clipping portal menus or overriding fixed positioning coordinates. Visual surface classes (`.atlas-panel`, `.action-menu-popover`) must strictly govern background, border, shadow, text color, and texture ONLY.
2. **Main Canvas Scroll Container**: The primary scrollable area is `<main className="flex-1 overflow-y-auto...">` inside `AppLayout.tsx`. Global layout adjustments must preserve `<main>` as the single scroll container.

---

## 5. Known Global Layout Rules to Preserve

1. **Root Zoom**: `html { font-size: 90%; zoom: 0.9; }` in `src/index.css` MUST be preserved.
2. **UniversalActionMenu Fixed Positioning**: `useAnchoredPopover` visual-to-CSS fixed coordinate scaling math must remain untouched.
3. **Action Menu Popover Opacity**: `.action-menu-popover` background must remain 100% opaque (`#fefcf6` in light, `#162a40` in dark).
4. **Data Contract Isolation**: Catalog resolution, IGDB storage, IndexedDB personal data initialization, and search Bucket indices must remain unchanged.

---

## 6. Suggested Later Migration Plan (Post-Foundation)

- **Batch 1 (Current)**: Baseline audit, CSS token foundation, self-hosted fonts, theme primitives (`AtlasPanel`, `AtlasHeading`, `AtlasDivider`, `AtlasButton`, `AtlasInput`, `AtlasBadge`, `AtlasProgressBar`), decorative SVG assets, dev showcase (`#/dev-theme-showcase`), and documentation.
- **Batch 2**: App Shell & Navigation (Sidebar cartographic parchment, Header, MobileNav).
- **Batch 3**: Home Dashboard & Widgets (Featured Game, In Progress, Deals, Events widgets).
- **Batch 4**: My Games Library, Personal Dashboard & Modals.
- **Batch 5**: Catalog Discovery, New Releases, Upcoming, Search & Detail Views.
