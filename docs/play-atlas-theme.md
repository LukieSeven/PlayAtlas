# Play Atlas Visual Theme System Documentation

## Overview

The Play Atlas visual theme transforms the gaming hub into a **fantasy cartography** experience inspired by antique maps, warm aged parchment, deep nautical teal navigation, and antique gold detailing—while maintaining modern web application performance and accessibility.

---

## 1. Token System & Custom Properties

All theme values are declared as CSS custom properties on `:root` in `src/index.css`.

### Canvas & Parchment Surfaces
- `--atlas-canvas-bg` (`#F4EFE6`): Main workspace canvas background.
- `--atlas-panel-bg` (`#FDFBF7`): Standard paper panel surface.
- `--atlas-panel-raised-bg` (`#FFFFFF`): Elevated card/panel background.
- `--atlas-panel-inset-bg` (`#EFE8D8`): Recessed paper background for inputs/lists.
- `--atlas-panel-featured-bg` (`#FDFBF5`): Highlighted parchment panel background.

### Ink & Typography Colors
- `--atlas-ink-primary` (`#0C1D2D`): High-contrast dark navy primary text.
- `--atlas-ink-secondary` (`#213547`): Subdued navy section headings and labels.
- `--atlas-ink-muted` (`#47586A`): Readable muted text for secondary metadata.
- `--atlas-ink-subdued` (`#718294`): Subdued text for placeholders and captions.

### Nautical & Deep Teal Palette
- `--atlas-teal-deep` (`#0B2B3C`): Deep navy/teal for active sidebar items and primary buttons.
- `--atlas-teal-dark` (`#0F4C5C`): Dark teal for progress bars and badges.
- `--atlas-teal-medium` (`#145063`): Medium teal for hover states.
- `--atlas-teal-subtle` (`rgba(15, 76, 92, 0.1)`): Light teal background tint.

### Antique Gold Accent Palette
- `--atlas-gold-antique` (`#C5A059`): Primary gold accent for borders and star ornaments.
- `--atlas-gold-light` (`#EBD99F`): Light gold highlight.
- `--atlas-gold-dark` (`#8C6D37`): Dark gold/bronze for labels and boundaries.
- `--atlas-gold-subtle` (`rgba(197, 160, 89, 0.15)`): Subtle gold highlight wash.

### Status Colors
- `--atlas-status-success` (`#2B6E4E`): Success green.
- `--atlas-status-warning` (`#B88928`): Warning amber.
- `--atlas-status-danger` (`#991B1B`): Danger red.

### Borders, Shadows & Radii
- `--atlas-border-gold`: `#C5A059`
- `--atlas-border-panel`: `#D9C8A9`
- `--atlas-border-subtle`: `#E6D7BD`
- `--atlas-shadow-sm`: `0 2px 8px rgba(12, 29, 45, 0.06)`
- `--atlas-shadow-md`: `0 4px 16px rgba(12, 29, 45, 0.09)`
- `--atlas-shadow-lg`: `0 8px 24px rgba(12, 29, 45, 0.12)`
- `--atlas-radius-sm`: `0.5rem`
- `--atlas-radius-md`: `0.75rem`
- `--atlas-radius-lg`: `1rem`
- `--atlas-radius-xl`: `1.25rem`

---

## 2. Typography Roles

- **Display Font**: `Cormorant Garamond` (Self-hosted via `@fontsource/cormorant-garamond`).
  - Used for: Page titles, sidebar branding, section headers, widget titles (`h1`, `h2`, `h3`, `.atlas-heading-display`).
- **Body & Interface Font**: `Source Sans 3` (Self-hosted via `@fontsource/source-sans-3`).
  - Used for: UI buttons, inputs, game metadata, descriptions, progress labels, badges.

---

## 3. Surface Hierarchy (`AtlasPanel`)

- `standard`: Everyday parchment container with subtle panel border.
- `raised`: Elevated card with brighter parchment and gold border.
- `inset`: Recessed parchment container for inputs and list items.
- `featured`: Highlighted parchment card with optional corner star emblems.

---

## 4. CSS Safety Rules

> [!CAUTION]
> **Strict Control Flow Scoping for Visual Classes**:
> Visual surface classes (`.atlas-surface-standard`, `.action-menu-popover`, `.themed-panel`) MUST NOT declare structural CSS properties:
> - `position` (`relative`, `fixed`, `absolute`)
> - `overflow` (`hidden`, `auto`, `scroll`)
> - `transform`
> - `zoom`
> - `display` or layout dimensions (`width`, `height`)

All structural positioning and container scrolling must be explicitly owned by the specific React layout component.

---

## 5. Theme Primitives Reference

```tsx
import { AtlasPanel } from './components/theme/AtlasPanel';
import { AtlasHeading } from './components/theme/AtlasHeading';
import { AtlasDivider } from './components/theme/AtlasDivider';
import { AtlasButton } from './components/theme/AtlasButton';
import { AtlasInput } from './components/theme/AtlasInput';
import { AtlasBadge } from './components/theme/AtlasBadge';
import { AtlasProgressBar } from './components/theme/AtlasProgressBar';

// Example Usage
<AtlasPanel variant="featured" cornerOrnaments>
  <AtlasHeading level="section" subtitle="Cartographic Game Library">
    Featured Releases
  </AtlasHeading>
  <AtlasDivider />
  <AtlasProgressBar value={75} label="Completion Progress" />
  <div className="flex gap-2 mt-4">
    <AtlasButton variant="primary">View Details</AtlasButton>
    <AtlasBadge variant="gold">Base Game</AtlasBadge>
  </div>
</AtlasPanel>
```

---

## 6. Accessing the Theme Showcase

In development mode or when testing locally, open the hash route:
`http://localhost:5173/#/dev-theme-showcase`
