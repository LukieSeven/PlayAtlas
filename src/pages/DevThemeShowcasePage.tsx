import React, { useState } from 'react';
import { AtlasPanel } from '../components/theme/AtlasPanel';
import { AtlasHeading } from '../components/theme/AtlasHeading';
import { AtlasDivider } from '../components/theme/AtlasDivider';
import { AtlasButton } from '../components/theme/AtlasButton';
import { AtlasInput } from '../components/theme/AtlasInput';
import { AtlasBadge } from '../components/theme/AtlasBadge';
import { AtlasProgressBar } from '../components/theme/AtlasProgressBar';

export const DevThemeShowcasePage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen p-6 md:p-10 font-sans transition-colors ${darkMode ? 'dark bg-[#0d1b2a] text-slate-100' : 'bg-[var(--atlas-canvas-bg)] text-[var(--atlas-ink-primary)]'}`}>
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Development Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--atlas-border-gold)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-[var(--atlas-teal-dark)] text-white rounded">
                Dev Only
              </span>
              <span className="text-xs font-mono text-[var(--atlas-ink-muted)]">
                Batch 1 Foundation Showcase
              </span>
            </div>
            <h1 className="font-serif text-4xl font-bold mt-1 text-[var(--atlas-ink-primary)]">
              Play Atlas Theme Showcase
            </h1>
            <p className="text-sm text-[var(--atlas-ink-muted)] mt-1">
              Fantasy cartography shell design system primitives, color tokens, and surface primitives.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AtlasButton
              variant="secondary"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              Toggle {darkMode ? 'Light Parchment' : 'Dark Mode'}
            </AtlasButton>
            <a
              href="#/"
              className="text-xs font-semibold text-[var(--atlas-teal-dark)] hover:underline"
            >
              ← Back to Main App
            </a>
          </div>
        </div>

        {/* 1. Color Palette Tokens */}
        <section className="space-y-4">
          <AtlasHeading level="section" subtitle="Semantic CSS custom properties sampled from fantasy map mockup">
            1. Color Tokens & Palette
          </AtlasHeading>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="p-3 atlas-surface-standard text-center rounded-lg space-y-1">
              <div className="h-10 rounded bg-[var(--atlas-canvas-bg)] border border-[var(--atlas-border-subtle)]" />
              <div className="text-xs font-semibold">Canvas</div>
              <div className="text-[10px] font-mono opacity-70">#F4EFE6</div>
            </div>

            <div className="p-3 atlas-surface-standard text-center rounded-lg space-y-1">
              <div className="h-10 rounded bg-[var(--atlas-panel-bg)] border border-[var(--atlas-border-subtle)]" />
              <div className="text-xs font-semibold">Panel Base</div>
              <div className="text-[10px] font-mono opacity-70">#FDFBF7</div>
            </div>

            <div className="p-3 atlas-surface-standard text-center rounded-lg space-y-1">
              <div className="h-10 rounded bg-[var(--atlas-panel-inset-bg)] border border-[var(--atlas-border-subtle)]" />
              <div className="text-xs font-semibold">Inset Paper</div>
              <div className="text-[10px] font-mono opacity-70">#EFE8D8</div>
            </div>

            <div className="p-3 atlas-surface-standard text-center rounded-lg space-y-1">
              <div className="h-10 rounded bg-[var(--atlas-teal-deep)] border border-[var(--atlas-border-gold)]" />
              <div className="text-xs font-semibold text-white">Deep Teal</div>
              <div className="text-[10px] font-mono text-white/80">#0B2B3C</div>
            </div>

            <div className="p-3 atlas-surface-standard text-center rounded-lg space-y-1">
              <div className="h-10 rounded bg-[var(--atlas-gold-antique)] border border-[var(--atlas-border-gold)]" />
              <div className="text-xs font-semibold">Antique Gold</div>
              <div className="text-[10px] font-mono opacity-70">#C5A059</div>
            </div>

            <div className="p-3 atlas-surface-standard text-center rounded-lg space-y-1">
              <div className="h-10 rounded bg-[var(--atlas-ink-primary)]" />
              <div className="text-xs font-semibold text-white">Navy Ink</div>
              <div className="text-[10px] font-mono text-white/80">#0C1D2D</div>
            </div>
          </div>
        </section>

        <AtlasDivider />

        {/* 2. Typography Scale */}
        <section className="space-y-4">
          <AtlasHeading level="section" subtitle="Self-hosted Cormorant Garamond display headings & Source Sans 3 body text">
            2. Typography System
          </AtlasHeading>

          <AtlasPanel variant="standard" className="space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--atlas-gold-dark)] block mb-1">
                Display Header — Cormorant Garamond
              </span>
              <h1 className="font-serif text-4xl font-bold text-[var(--atlas-ink-primary)]">
                Home <span className="text-[var(--atlas-gold-antique)] text-2xl">✦</span>
              </h1>
              <p className="text-sm font-sans text-[var(--atlas-ink-muted)]">Your customizable gaming hub</p>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--atlas-gold-dark)] block mb-1">
                Section Heading — Serif 2XL
              </span>
              <h2 className="font-serif text-2xl font-bold text-[var(--atlas-ink-primary)]">
                FEATURED UPCOMING GAME
              </h2>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--atlas-gold-dark)] block mb-1">
                Body & Interface Text — Source Sans 3
              </span>
              <p className="font-sans text-base leading-relaxed text-[var(--atlas-ink-primary)] max-w-3xl">
                Explore the cartographic expanse of your personal game collection. Track progress across platforms, catalog completed journeys, and discover upcoming releases.
              </p>
            </div>
          </AtlasPanel>
        </section>

        <AtlasDivider />

        {/* 3. Surface Primitives */}
        <section className="space-y-4">
          <AtlasHeading level="section" subtitle="Layered parchment surfaces (standard, raised, inset, featured)">
            3. Surface Primitives (AtlasPanel)
          </AtlasHeading>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AtlasPanel variant="standard">
              <h4 className="font-serif font-bold text-lg mb-2">Standard Surface</h4>
              <p className="text-xs text-[var(--atlas-ink-muted)]">
                Default parchment panel container with subtle gold border.
              </p>
            </AtlasPanel>

            <AtlasPanel variant="raised">
              <h4 className="font-serif font-bold text-lg mb-2">Raised Surface</h4>
              <p className="text-xs text-[var(--atlas-ink-muted)]">
                Elevated parchment surface with gold accent border and medium shadow.
              </p>
            </AtlasPanel>

            <AtlasPanel variant="inset">
              <h4 className="font-serif font-bold text-lg mb-2">Inset Surface</h4>
              <p className="text-xs text-[var(--atlas-ink-muted)]">
                Recessed parchment container for inputs, lists, and secondary content.
              </p>
            </AtlasPanel>

            <AtlasPanel variant="featured" cornerOrnaments>
              <h4 className="font-serif font-bold text-lg mb-2 text-[var(--atlas-teal-dark)]">
                Featured Surface
              </h4>
              <p className="text-xs text-[var(--atlas-ink-muted)]">
                Highlighted parchment surface with corner star ornaments.
              </p>
            </AtlasPanel>
          </div>
        </section>

        <AtlasDivider />

        {/* 4. Controls & Input Primitives */}
        <section className="space-y-4">
          <AtlasHeading level="section" subtitle="Buttons, inputs, badges, progress bars">
            4. Interactive & Control Primitives
          </AtlasHeading>

          <AtlasPanel variant="standard" className="space-y-8">
            {/* Buttons */}
            <div>
              <h4 className="font-serif font-bold text-base mb-3">Button Variants</h4>
              <div className="flex flex-wrap items-center gap-3">
                <AtlasButton variant="primary">Primary Deep Teal</AtlasButton>
                <AtlasButton variant="secondary">Secondary Parchment</AtlasButton>
                <AtlasButton variant="gold">Gold Accent</AtlasButton>
                <AtlasButton variant="ghost">Ghost Action</AtlasButton>
                <AtlasButton variant="primary" disabled>Disabled State</AtlasButton>
              </div>
            </div>

            {/* Inputs */}
            <div>
              <h4 className="font-serif font-bold text-base mb-3">Inputs & Search</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <AtlasInput
                  label="Search Library"
                  placeholder="Search games, lists, tags..."
                  icon={<span className="text-xs">🔍</span>}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <AtlasInput
                  label="Custom Tag"
                  placeholder="Enter tag name..."
                  error="Tag must be under 20 characters"
                />
              </div>
            </div>

            {/* Badges */}
            <div>
              <h4 className="font-serif font-bold text-base mb-3">Badges & Status Tags</h4>
              <div className="flex flex-wrap items-center gap-2">
                <AtlasBadge variant="default">PC</AtlasBadge>
                <AtlasBadge variant="gold">Base Game</AtlasBadge>
                <AtlasBadge variant="teal">PS5</AtlasBadge>
                <AtlasBadge variant="discount">-40%</AtlasBadge>
                <AtlasBadge variant="success">Completed</AtlasBadge>
                <AtlasBadge variant="danger">Backlog</AtlasBadge>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="max-w-md">
              <h4 className="font-serif font-bold text-base mb-3">Progress Indicator</h4>
              <AtlasProgressBar value={68} label="Baldur's Gate 3" valueText="68%" />
            </div>
          </AtlasPanel>
        </section>

        <AtlasDivider />

        {/* 5. Sample Mockup Cards */}
        <section className="space-y-4">
          <AtlasHeading level="section" subtitle="Sample game card layout matching mockup visual aesthetics">
            5. Sample Mockup Game Widgets
          </AtlasHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sample Card 1 */}
            <AtlasPanel variant="raised" className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold uppercase tracking-wider text-[var(--atlas-gold-dark)]">
                  Top 10 In Progress
                </span>
                <span className="text-xs text-[var(--atlas-teal-dark)] font-semibold cursor-pointer">
                  View All
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-serif font-bold text-sm text-[var(--atlas-ink-muted)]">1</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-sm">Baldur's Gate 3</span>
                      <AtlasBadge variant="teal">PC</AtlasBadge>
                    </div>
                    <AtlasProgressBar value={68} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-serif font-bold text-sm text-[var(--atlas-ink-muted)]">2</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-sm">Zelda: TotK</span>
                      <AtlasBadge variant="default">Switch</AtlasBadge>
                    </div>
                    <AtlasProgressBar value={54} />
                  </div>
                </div>
              </div>
            </AtlasPanel>

            {/* Sample Card 2 */}
            <AtlasPanel variant="featured" cornerOrnaments className="space-y-4">
              <div className="flex justify-between items-center">
                <AtlasBadge variant="discount">-40%</AtlasBadge>
                <span className="text-xs text-[var(--atlas-ink-muted)] line-through">$59.99</span>
                <span className="font-serif font-bold text-lg text-[var(--atlas-teal-dark)]">$35.99</span>
              </div>
              <div>
                <h4 className="font-serif font-bold text-xl">Elden Ring</h4>
                <p className="text-xs text-[var(--atlas-ink-muted)]">Action, Open World</p>
              </div>
              <AtlasButton variant="primary" size="sm" className="w-full">
                View Details
              </AtlasButton>
            </AtlasPanel>

            {/* Sample Card 3 */}
            <AtlasPanel variant="standard" className="space-y-4">
              <AtlasHeading level="widget">Upcoming Event</AtlasHeading>
              <div className="flex items-start gap-3">
                <div className="bg-[var(--atlas-teal-deep)] text-white px-2.5 py-1 rounded text-center font-serif font-bold">
                  <div className="text-[10px] uppercase">MAY</div>
                  <div className="text-base leading-none">24</div>
                </div>
                <div>
                  <h5 className="font-bold text-sm">PlayStation State of Play</h5>
                  <p className="text-xs text-[var(--atlas-ink-muted)]">May 24, 2024 • 3:00 PM PT</p>
                </div>
              </div>
            </AtlasPanel>
          </div>
        </section>

      </div>
    </div>
  );
};
