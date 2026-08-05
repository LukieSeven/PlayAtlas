import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Compass,
  Palette,
  Gamepad2,
  Package,
  Clock,
  Bookmark,
  Trophy,
  Heart,
  XCircle,
  Search,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Loader2,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { GameCard } from '../components/common/GameCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Footer } from '../components/layout/Footer';
import { AddTabModal } from '../components/widgets/AddTabModal';
import { ExportImportModal } from '../components/widgets/ExportImportModal';
import { devComponentReviewFixtures, DevFixtureItem } from '../dev/componentReviewFixtures';

export const DevComponentReviewPage: React.FC = () => {
  const { activeTokens, setThemePreset, availablePresets } = useTheme();

  // Temporary In-Memory React state for fixture game cards (zero DB writes)
  const [fixtures] = useState<DevFixtureItem[]>(devComponentReviewFixtures);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchVal, setSearchVal] = useState<string>('');
  const [selectedGameModal, setSelectedGameModal] = useState<string | null>(null);

  // In-memory modal states
  const [isAddTabOpen, setIsAddTabOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isThemePopoverOpen, setIsThemePopoverOpen] = useState(false);

  const presetList = Object.values(availablePresets);

  return (
    <div
      data-testid="dev-component-review-root"
      className="min-h-screen bg-[#F4EFE6] text-[#0C1D2D] font-sans relative selection:bg-[#0B2B3C] selection:text-white"
    >
      {/* Dev Navigation Bar Header */}
      <header className="sticky top-0 z-40 bg-[#0B2B3C] text-white px-4 py-2.5 shadow-md flex items-center justify-between border-b border-[#C5A059]">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C5A059] text-[#0B2B3C] uppercase tracking-wider">
            DEV REVIEW
          </span>
          <h1 className="font-serif text-lg font-bold tracking-wide">
            Play Atlas Production Component Visual Inspection
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <NavLink
            to="/"
            className="flex items-center gap-1 text-[#C5A059] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Live App</span>
          </NavLink>
          <span className="text-[#C5A059]/40">•</span>
          <NavLink
            to="/dev-theme-showcase"
            className="text-white/80 hover:text-white hover:underline"
          >
            Batch 1 Theme Showcase
          </NavLink>

          {/* Theme Preset Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsThemePopoverOpen(!isThemePopoverOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FDFBF7] text-[#0C1D2D] border border-[#C5A059] hover:bg-[#EFE8D8] text-xs font-bold transition-all"
            >
              <Palette className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{activeTokens.name.split(' ')[0]}</span>
            </button>

            {isThemePopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#FDFBF7] text-[#0C1D2D] rounded-2xl border border-[#C5A059] shadow-2xl p-3 z-50 space-y-1">
                <span className="text-xs font-serif font-bold block border-b border-[#D9C8A9] pb-1.5 mb-1">
                  Switch Theme
                </span>
                {presetList.map(preset => (
                  <button
                    key={preset.presetKey}
                    onClick={() => {
                      setThemePreset(preset.presetKey);
                      setIsThemePopoverOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold ${
                      preset.presetKey === activeTokens.presetKey
                        ? 'bg-[#0B2B3C] text-white'
                        : 'hover:bg-[#EFE8D8]'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <div
                      className="w-3 h-3 rounded-full border border-white/40"
                      style={{ backgroundColor: preset.primaryAction }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Review Workspace */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
        {/* Banner Instructions */}
        <section className="p-6 rounded-3xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C6D37]">
            <Compass className="w-4 h-4 text-[#C5A059]" />
            <span>Interactive Production Component Review</span>
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#0C1D2D]">
            Production Component Verification Surface
          </h2>
          <p className="text-xs text-[#47586A] max-w-3xl leading-relaxed">
            This development page mounts actual production components (<code className="bg-[#EFE8D8] px-1 py-0.5 rounded text-[#0B2B3C] font-mono">GameCard</code>, <code className="bg-[#EFE8D8] px-1 py-0.5 rounded text-[#0B2B3C] font-mono">UniversalActionMenu</code>, <code className="bg-[#EFE8D8] px-1 py-0.5 rounded text-[#0B2B3C] font-mono">AddTabModal</code>, <code className="bg-[#EFE8D8] px-1 py-0.5 rounded text-[#0B2B3C] font-mono">Button</code>, <code className="bg-[#EFE8D8] px-1 py-0.5 rounded text-[#0B2B3C] font-mono">Input</code>, <code className="bg-[#EFE8D8] px-1 py-0.5 rounded text-[#0B2B3C] font-mono">Footer</code>) using temporary in-memory React state fixtures. All user actions operate strictly in local component memory without contacting IGDB or altering personal storage.
          </p>
        </section>

        {/* Section 1: Real Production GameCards (6 Representative States) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#D9C8A9] pb-3">
            <div>
              <h3 className="text-xl font-bold font-serif text-[#0C1D2D]">
                1. Production Game Cards (6 Representative States)
              </h3>
              <p className="text-xs text-[#47586A]">
                Click card triggers, action menus, and bookmark badges to verify hover effects and portaled action dropdowns.
              </p>
            </div>
            <span className="text-xs font-mono text-[#8C6D37] font-bold">
              6 In-Memory Fixtures
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {fixtures.map(item => (
              <div key={item.compactGame.id} className="space-y-1">
                <GameCard
                  game={item.compactGame}
                  onSelect={rec => setSelectedGameModal(rec.name)}
                />
                <span className="block text-[10px] text-center font-mono text-[#718294]">
                  {item.personalRecord?.currentPlayStatus
                    ? `State: ${item.personalRecord.currentPlayStatus}`
                    : item.personalRecord?.ownerships?.length
                    ? 'State: Owned'
                    : item.personalRecord?.inBacklogQueue
                    ? 'State: Backlog'
                    : item.personalRecord?.interestStatus === 'wanted'
                    ? 'State: Wanted'
                    : 'State: Unowned'}
                </span>
              </div>
            ))}
          </div>

          {selectedGameModal && (
            <div className="p-3 rounded-xl bg-[#EFE8D8] border border-[#C5A059] text-xs font-semibold flex items-center justify-between">
              <span>Card Click Event Triggered for: <strong>{selectedGameModal}</strong></span>
              <button
                onClick={() => setSelectedGameModal(null)}
                className="text-[11px] font-bold text-[#0B2B3C] hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>

        {/* Section 2: Shared Buttons & Typography */}
        <section className="space-y-4">
          <div className="border-b border-[#D9C8A9] pb-3">
            <h3 className="text-xl font-bold font-serif text-[#0C1D2D]">
              2. Shared Production Buttons & Badges
            </h3>
            <p className="text-xs text-[#47586A]">
              Verifies primary deep-teal, secondary parchment, outline, ghost, and danger button variants.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs space-y-6">
            {/* Buttons Row */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#8C6D37] uppercase tracking-wider block">
                Button Variants
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Deep Teal</Button>
                <Button variant="secondary">Secondary Parchment</Button>
                <Button variant="outline">Outline Border</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="danger">Danger Red</Button>
                <Button variant="glow">Glow Highlight</Button>
              </div>
            </div>

            {/* Badges Row */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#8C6D37] uppercase tracking-wider block">
                Badge Variants
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="indigo">PRIMARY</Badge>
                <Badge variant="cyan">DLC</Badge>
                <Badge variant="emerald">OWNED</Badge>
                <Badge variant="amber">COMPLETED</Badge>
                <Badge variant="rose">HOT</Badge>
                <Badge variant="purple">BACKLOG</Badge>
                <Badge variant="slate">SYSTEM</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Inputs, Selects, & My Games Tabs */}
        <section className="space-y-4">
          <div className="border-b border-[#D9C8A9] pb-3">
            <h3 className="text-xl font-bold font-serif text-[#0C1D2D]">
              3. Production Inputs, Filters, & Status Tabs
            </h3>
            <p className="text-xs text-[#47586A]">
              Verifies search input focus, filter select dropdowns, and My Games tab selection.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs space-y-6">
            {/* Inputs & Selects Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                icon={<Search className="w-4 h-4 text-[#8C6D37]" />}
                placeholder="Search catalog or library..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />

              <select
                value="all"
                onChange={() => {}}
                className="px-3 py-2 rounded-xl bg-[#FFFFFF] text-[#0C1D2D] border border-[#D9C8A9] text-xs font-bold"
              >
                <option value="all">All Platform Families</option>
                <option value="pc">PC (Windows)</option>
                <option value="playstation">PlayStation</option>
                <option value="xbox">Xbox</option>
                <option value="nintendo">Nintendo</option>
              </select>

              {/* View Mode Toggle Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#8C6D37]">View Mode:</span>
                <div className="flex items-center bg-[#EFE8D8] p-0.5 rounded-xl border border-[#D9C8A9]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-[#0B2B3C] text-white shadow-xs' : 'text-[#0C1D2D]'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-[#0B2B3C] text-white shadow-xs' : 'text-[#0C1D2D]'
                    }`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Segmented Status Tabs */}
            <div className="p-1.5 rounded-2xl border border-[#D9C8A9] bg-[#FDFBF7] overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max">
                {[
                  { key: 'all', label: 'All Games', count: 6, icon: Gamepad2 },
                  { key: 'owned', label: 'Owned', count: 2, icon: Package },
                  { key: 'playing', label: 'Playing', count: 1, icon: Clock },
                  { key: 'backlog', label: 'Backlog', count: 1, icon: Bookmark },
                  { key: 'completed', label: 'Completed', count: 1, icon: Trophy },
                  { key: 'wanted', label: 'Wanted', count: 1, icon: Heart },
                  { key: 'dropped', label: 'Dropped', count: 0, icon: XCircle },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-[#0B2B3C] text-white border border-[#C5A059] shadow-xs'
                          : 'text-[#0C1D2D] hover:bg-[#EFE8D8]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-[#8C6D37]'}`} />
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#EFE8D8] text-[#0C1D2D]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Production Modal Review Triggers */}
        <section className="space-y-4">
          <div className="border-b border-[#D9C8A9] pb-3">
            <h3 className="text-xl font-bold font-serif text-[#0C1D2D]">
              4. Production Modals Review
            </h3>
            <p className="text-xs text-[#47586A]">
              Test opening and closing real modal dialogs using temporary in-memory React state.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FDFBF7] border border-[#D9C8A9] shadow-xs flex flex-wrap gap-4">
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4 text-[#C5A059]" />}
              onClick={() => setIsAddTabOpen(true)}
            >
              Open AddTabModal
            </Button>

            <Button
              variant="secondary"
              icon={<Package className="w-4 h-4 text-[#8C6D37]" />}
              onClick={() => setIsExportOpen(true)}
            >
              Open ExportImportModal
            </Button>
          </div>
        </section>

        {/* Section 5: Empty, Loading, & Error States */}
        <section className="space-y-4">
          <div className="border-b border-[#D9C8A9] pb-3">
            <h3 className="text-xl font-bold font-serif text-[#0C1D2D]">
              5. Empty, Loading, & Error States
            </h3>
            <p className="text-xs text-[#47586A]">
              Verifies empty personal library cards, loading spinners, and error notification styling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Empty Library Panel */}
            <div className="p-8 text-center rounded-3xl space-y-3 border border-[#D9C8A9] bg-[#FDFBF7] shadow-xs">
              <Gamepad2 className="w-10 h-10 mx-auto text-[#0B2B3C] opacity-80" />
              <h4 className="text-base font-bold font-serif text-[#0C1D2D]">Your Personal Library is Empty</h4>
              <p className="text-xs text-[#47586A] max-w-xs mx-auto">
                Games you bookmark or update via the Universal Action Menu will automatically appear in your personal library.
              </p>
            </div>

            {/* Loading State & Error State */}
            <div className="space-y-4">
              <div className="p-6 text-center rounded-3xl border border-[#D9C8A9] bg-[#FDFBF7] flex items-center justify-center gap-3 text-xs font-bold text-[#0C1D2D]">
                <Loader2 className="w-5 h-5 animate-spin text-[#0B2B3C]" />
                <span>Searching Play Atlas catalog...</span>
              </div>

              <div className="p-4 rounded-2xl border border-rose-600/30 bg-rose-500/10 text-rose-900 flex items-center gap-3 text-xs font-semibold">
                <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0" />
                <span>Non-critical warning: Catalog chunk 35 hydration retry limit reached.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Shared Footer */}
        <section className="space-y-2">
          <span className="text-xs font-bold text-[#8C6D37] uppercase tracking-wider block">
            6. Shared Production Footer
          </span>
          <Footer />
        </section>
      </main>

      {/* Production Modals Rendered in Temporary In-Memory State */}
      <AddTabModal
        isOpen={isAddTabOpen}
        onClose={() => setIsAddTabOpen(false)}
        onAddTab={newTab => {
          console.log('[DevReview] In-Memory AddTab:', newTab);
          setIsAddTabOpen(false);
        }}
      />

      <ExportImportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
