import React, { useState } from 'react';
import { AtlasPanel } from '../components/theme/AtlasPanel';
import { AtlasHeading } from '../components/theme/AtlasHeading';
import { AtlasDivider } from '../components/theme/AtlasDivider';
import { AtlasButton } from '../components/theme/AtlasButton';
import { AtlasInput } from '../components/theme/AtlasInput';
import { AtlasBadge } from '../components/theme/AtlasBadge';
import { AtlasProgressBar } from '../components/theme/AtlasProgressBar';

export const DevThemeShowcasePage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showComponentCatalog, setShowComponentCatalog] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div
      data-testid="dev-theme-showcase-root"
      className={`min-h-screen w-full flex flex-col font-sans transition-colors relative selection:bg-[#0F4C5C] selection:text-white ${
        darkMode ? 'dark bg-[#0D1B2A] text-[#F8FAFC]' : 'bg-[#F4EFE6] text-[#0C1D2D]'
      }`}
      style={{ backgroundColor: darkMode ? '#0D1B2A' : '#F4EFE6', isolation: 'isolate' }}
    >
      {/* Dev Mode Banner Header */}
      <header className="bg-[#0B2B3C] text-white px-4 py-1.5 flex flex-wrap items-center justify-between text-xs border-b border-[#C5A059] z-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="bg-[#C5A059] text-[#0B2B3C] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
            Dev Preview
          </span>
          <span className="font-semibold text-amber-100">
            Play Atlas Standalone Theme Showcase (Batch 1 Visual Parity)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowComponentCatalog(!showComponentCatalog)}
            className="underline hover:text-amber-200 cursor-pointer font-medium"
          >
            {showComponentCatalog ? 'Show Dashboard Preview' : 'Show Component Catalog'}
          </button>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="underline hover:text-amber-200 cursor-pointer font-medium"
          >
            Toggle {darkMode ? 'Light Parchment' : 'Dark Mode'}
          </button>
          <a href="#/" className="underline hover:text-amber-200 font-semibold">
            ← Return to Live App
          </a>
        </div>
      </header>

      {/* Main Standalone Application Shell Layout */}
      <div className="flex-1 flex flex-col md:flex-row w-full relative min-h-0">
        {/* Mobile Navigation Drawer Toggle */}
        <div className="md:hidden bg-[#F4EFE6] border-b border-[#D9C8A9] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#C5A059] text-xl">✦</span>
            <span className="font-serif font-bold text-xl text-[#0C1D2D]">Play Atlas</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border border-[#C5A059] rounded text-sm font-semibold bg-[#FDFBF7]"
          >
            {mobileMenuOpen ? 'Close Menu' : 'Menu ☰'}
          </button>
        </div>

        {/* 1. STANDALONE PARCHMENT LEFT SIDEBAR (Matching Authoritative Mockup) */}
        <aside
          data-testid="showcase-sidebar"
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 lg:w-72 bg-[#F4EFE6] border-r border-[#D9C8A9] p-5 flex-shrink-0 flex flex-col justify-between space-y-8 z-20 relative overflow-y-auto`}
          style={{ backgroundColor: '#F4EFE6' }}
        >
          <div className="space-y-6">
            {/* Play Atlas Branding Logo */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#D9C8A9]/60">
              <div className="w-11 h-11 rounded-full bg-[#0B2B3C] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] shadow-md font-serif font-bold text-xl select-none flex-shrink-0">
                ✦
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-wide text-[#0C1D2D] leading-none">
                  Play Atlas
                </h1>
                <span className="text-[10px] uppercase font-semibold text-[#8C6D37] tracking-widest block mt-1">
                  Cartographic Hub
                </span>
              </div>
            </div>

            {/* Navigation Menu Items */}
            <nav className="space-y-1 font-sans text-sm font-medium">
              {[
                { id: 'home', label: 'Home', icon: '🏠', active: true },
                { id: 'my-games', label: 'My Games', icon: '📖' },
                { id: 'new-releases', label: 'New Releases', icon: '✦' },
                { id: 'upcoming', label: 'Upcoming', icon: '⌛' },
                { id: 'discounts', label: 'Discounts', icon: '🏷️' },
                { id: 'calendar', label: 'Calendar', icon: '📅' },
                { id: 'ranked-lists', label: 'Ranked Lists', icon: '🏆' },
                { id: 'tier-lists', label: 'Tier Lists', icon: '📊' },
                { id: 'collections', label: 'Collections', icon: '📦' },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#0B2B3C] text-white font-bold border border-[#C5A059] shadow-md'
                        : 'text-[#213547] hover:bg-[#EFE8D8] hover:text-[#0B2B3C]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="text-[#C5A059] text-xs font-serif">✦</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer & Summary Counters */}
          <div className="space-y-4 pt-4 border-t border-[#D9C8A9]/60">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-[#213547] hover:text-[#0B2B3C] font-medium"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>

            {/* Map Route Dotted Line Illustration */}
            <div className="py-1 opacity-50 flex justify-center text-[#8C6D37] text-xs tracking-widest select-none">
              - - - ✕ - - -
            </div>

            {/* Library Counter Widget */}
            <div className="bg-[#EFE8D8] border border-[#D9C8A9] rounded-lg p-3 text-xs space-y-1.5 font-sans">
              <div className="flex justify-between text-[#47586A]">
                <span>Wishlist</span>
                <span className="font-bold text-[#0C1D2D]">128</span>
              </div>
              <div className="flex justify-between text-[#47586A]">
                <span>Backlog</span>
                <span className="font-bold text-[#0C1D2D]">347</span>
              </div>
              <div className="flex justify-between text-[#47586A]">
                <span>Completed</span>
                <span className="font-bold text-[#0C1D2D]">62</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 2. MAIN WORKSPACE CANVAS (Standalone Cartographic Workspace) */}
        <main
          data-testid="showcase-main-workspace"
          className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto space-y-6 bg-[#F4EFE6] w-full min-w-0"
          style={{ backgroundColor: '#F4EFE6' }}
        >
          {showComponentCatalog ? (
            /* Component & Token Reference Section */
            <div className="space-y-8 max-w-full">
              <AtlasHeading level="page" subtitle="Batch 1 Primitives & CSS Custom Properties">
                Theme Tokens & Primitive Catalog
              </AtlasHeading>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AtlasPanel variant="standard">
                  <div className="h-10 bg-[#F4EFE6] border border-[#D9C8A9] rounded mb-2" />
                  <span className="text-xs font-bold">Canvas #F4EFE6</span>
                </AtlasPanel>
                <AtlasPanel variant="standard">
                  <div className="h-10 bg-[#FDFBF7] border border-[#D9C8A9] rounded mb-2" />
                  <span className="text-xs font-bold">Panel #FDFBF7</span>
                </AtlasPanel>
                <AtlasPanel variant="standard">
                  <div className="h-10 bg-[#0B2B3C] rounded mb-2" />
                  <span className="text-xs font-bold text-white">Deep Teal #0B2B3C</span>
                </AtlasPanel>
                <AtlasPanel variant="standard">
                  <div className="h-10 bg-[#C5A059] rounded mb-2" />
                  <span className="text-xs font-bold">Gold #C5A059</span>
                </AtlasPanel>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AtlasPanel variant="standard">
                  <AtlasHeading level="widget">Standard Panel</AtlasHeading>
                  <p className="text-xs text-[#47586A] mt-2">Standard parchment background.</p>
                </AtlasPanel>
                <AtlasPanel variant="raised">
                  <AtlasHeading level="widget">Raised Panel</AtlasHeading>
                  <p className="text-xs text-[#47586A] mt-2">Elevated card with gold outline.</p>
                </AtlasPanel>
                <AtlasPanel variant="featured" cornerOrnaments>
                  <AtlasHeading level="widget">Featured Panel</AtlasHeading>
                  <p className="text-xs text-[#47586A] mt-2">Featured surface with star corners.</p>
                </AtlasPanel>
              </div>

              <AtlasPanel variant="standard" className="space-y-4">
                <AtlasHeading level="section">Buttons & Inputs</AtlasHeading>
                <AtlasDivider />
                <div className="flex flex-wrap gap-3">
                  <AtlasButton variant="primary">Primary Teal</AtlasButton>
                  <AtlasButton variant="secondary">Secondary Parchment</AtlasButton>
                  <AtlasButton variant="gold">Gold Accent</AtlasButton>
                  <AtlasButton variant="ghost">Ghost</AtlasButton>
                </div>
                <div className="max-w-md">
                  <AtlasInput placeholder="Search catalog..." />
                </div>
              </AtlasPanel>
            </div>
          ) : (
            /* Realistic Fantasy Dashboard Mockup Preview (Matching Authoritative Image) */
            <div className="space-y-6 w-full max-w-full">
              {/* Standalone Header Area */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#D9C8A9]/40">
                <div>
                  <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#0C1D2D] flex items-center gap-2">
                    <span>Home</span>
                    <span className="text-[#C5A059] text-xl">✦</span>
                  </h2>
                  <p className="text-sm text-[#47586A] mt-0.5">Your customizable gaming hub</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-64 lg:w-96">
                    <AtlasInput
                      placeholder="Search games, lists, tags..."
                      icon={<span className="text-xs">🔍</span>}
                    />
                  </div>
                  <AtlasButton variant="secondary" size="sm" icon={<span className="text-xs">✦</span>}>
                    Customize
                  </AtlasButton>
                  <div className="flex items-center gap-2 bg-[#FDFBF7] border border-[#D9C8A9] px-3 py-1.5 rounded-lg shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[#0B2B3C] text-white flex items-center justify-center text-xs font-serif font-bold flex-shrink-0">
                      A
                    </div>
                    <span className="text-xs font-semibold text-[#0C1D2D]">Aventurer</span>
                    <span className="text-[10px] text-[#47586A]">▼</span>
                  </div>
                </div>
              </div>

              {/* TOP WIDGET ROW: Featured Game (7 Cols) + Top 10 In Progress (5 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                {/* Featured Upcoming Game (7 Cols) */}
                <div className="lg:col-span-7">
                  <AtlasPanel variant="featured" cornerOrnaments className="h-full flex flex-col justify-between space-y-4 bg-[#FDFBF5] border border-[#C5A059] shadow-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#8C6D37] flex items-center gap-1">
                        <span>✦</span> FEATURED UPCOMING GAME
                      </span>
                      <span className="bg-[#0B2B3C] text-[#C5A059] p-1.5 rounded text-xs shadow-sm">✦</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                      {/* Original Dedicated Fantasy Watercolor Landscape Graphic */}
                      <div className="sm:col-span-5 h-48 rounded-lg bg-gradient-to-br from-[#E2D8C3] via-[#C9BBA0] to-[#A8987B] border border-[#C5A059]/60 flex flex-col items-center justify-center text-[#0C1D2D] p-4 text-center shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-black/10 pointer-events-none" />
                        <span className="text-4xl mb-1 text-[#0B2B3C] z-10">🏰</span>
                        <span className="font-serif text-lg font-bold text-[#0C1D2D] z-10">Wildmoor Citadel</span>
                        <span className="text-[10px] uppercase font-semibold tracking-widest text-[#8C6D37] mt-1 z-10">
                          Cartographic Scenery
                        </span>
                      </div>

                      {/* Info & Countdown */}
                      <div className="sm:col-span-7 space-y-3">
                        <h3 className="font-serif text-2xl lg:text-3xl font-bold text-[#0C1D2D] leading-tight">
                          ECHOES OF THE WILDMOOR
                        </h3>
                        <p className="text-xs text-[#47586A] font-sans">RPG, Open World • PC, PS5, XSX</p>

                        <div className="pt-1">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C6D37] block mb-1.5 font-bold">
                            RELEASES IN
                          </span>
                          <div className="grid grid-cols-4 gap-2 text-center font-sans">
                            <div className="bg-[#EFE8D8] border border-[#D9C8A9] p-1.5 rounded shadow-xs">
                              <div className="font-serif font-bold text-base text-[#0C1D2D]">23</div>
                              <div className="text-[9px] uppercase font-semibold text-[#47586A]">DAYS</div>
                            </div>
                            <div className="bg-[#EFE8D8] border border-[#D9C8A9] p-1.5 rounded shadow-xs">
                              <div className="font-serif font-bold text-base text-[#0C1D2D]">14</div>
                              <div className="text-[9px] uppercase font-semibold text-[#47586A]">HRS</div>
                            </div>
                            <div className="bg-[#EFE8D8] border border-[#D9C8A9] p-1.5 rounded shadow-xs">
                              <div className="font-serif font-bold text-base text-[#0C1D2D]">37</div>
                              <div className="text-[9px] uppercase font-semibold text-[#47586A]">MINS</div>
                            </div>
                            <div className="bg-[#EFE8D8] border border-[#D9C8A9] p-1.5 rounded shadow-xs">
                              <div className="font-serif font-bold text-base text-[#0C1D2D]">52</div>
                              <div className="text-[9px] uppercase font-semibold text-[#47586A]">SECS</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <AtlasButton variant="primary" size="sm">
                            View Details
                          </AtlasButton>
                          <AtlasButton variant="secondary" size="sm">
                            🔖
                          </AtlasButton>
                        </div>
                      </div>
                    </div>
                  </AtlasPanel>
                </div>

                {/* Top 10 In Progress (5 Cols) */}
                <div className="lg:col-span-5">
                  <AtlasPanel variant="raised" className="h-full space-y-4 bg-[#FFFFFF] border border-[#C5A059] shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#D9C8A9]/60">
                      <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#0C1D2D] flex items-center gap-1.5">
                        <span className="text-[#C5A059]">✦</span> TOP 10 IN PROGRESS
                      </span>
                      <span className="text-xs text-[#0F4C5C] font-semibold cursor-pointer hover:underline">View All</span>
                    </div>

                    <div className="space-y-3 font-sans">
                      {[
                        { rank: 1, name: "Baldur's Gate 3", platform: 'PC', pct: 68, icon: '⚔️' },
                        { rank: 2, name: 'The Legend of Zelda: Tears of the Kingdom', platform: 'Switch', icon: '🛡️', pct: 54 },
                        { rank: 3, name: 'Cyberpunk 2077: Phantom Liberty', platform: 'PC', icon: '🏙️', pct: 42 },
                        { rank: 4, name: 'Red Dead Redemption 2', platform: 'PC', icon: '🤠', pct: 31 },
                        { rank: 5, name: 'Horizon Forbidden West', platform: 'PS5', icon: '🏹', pct: 28 },
                      ].map((game) => (
                        <div key={game.rank} className="flex items-center gap-3 text-xs p-1.5 rounded hover:bg-[#FDFBF7] transition-colors">
                          <span className="font-serif font-bold text-sm text-[#8C6D37] w-4 text-center flex-shrink-0">
                            {game.rank}
                          </span>
                          <div className="w-7 h-7 rounded bg-[#EFE8D8] border border-[#D9C8A9] flex items-center justify-center text-xs flex-shrink-0">
                            {game.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1 gap-2">
                              <span className="font-semibold text-[#0C1D2D] truncate">
                                {game.name}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <AtlasBadge variant="default">{game.platform}</AtlasBadge>
                                <span className="font-mono text-[11px] font-bold text-[#0B2B3C] w-7 text-right">
                                  {game.pct}%
                                </span>
                              </div>
                            </div>
                            <AtlasProgressBar value={game.pct} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </AtlasPanel>
                </div>
              </div>

              {/* MIDDLE WIDGET ROW: Currently Playing (7 Cols) + New Releases (5 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                {/* Currently Playing Cards (7 Cols) */}
                <div className="lg:col-span-7">
                  <AtlasPanel variant="standard" className="space-y-4 bg-[#FDFBF7] border border-[#D9C8A9] shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#D9C8A9]/60">
                      <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#0C1D2D] flex items-center gap-1.5">
                        <span className="text-[#C5A059]">✦</span> CURRENTLY PLAYING
                      </span>
                      <span className="text-xs text-[#0F4C5C] font-semibold cursor-pointer hover:underline">View All</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { title: "Baldur's Gate 3", stat: '68% • 82h', tag: 'PC', icon: '⚔️', gradient: 'from-[#D9C8A9] to-[#B8A785]' },
                        { title: 'Zelda: TotK', stat: '54% • 60h', tag: 'Switch', icon: '🗡️', gradient: 'from-[#C5D5C5] to-[#9EB89E]' },
                        { title: 'Cyberpunk 2077', stat: '42% • 34h', tag: 'PC', icon: '🌃', gradient: 'from-[#B5D5E2] to-[#88B5C7]' },
                        { title: 'Stardew Valley', stat: '86% • 120h', tag: 'PC', icon: '🌾', gradient: 'from-[#E2D8B5] to-[#C7B588]' },
                      ].map((item) => (
                        <div key={item.title} className="bg-[#FFFFFF] p-2.5 rounded-lg space-y-2 border border-[#D9C8A9] flex flex-col justify-between shadow-xs">
                          <div className={`h-28 rounded-md bg-gradient-to-br ${item.gradient} border border-[#C5A059]/40 flex flex-col items-center justify-center text-[#0C1D2D] text-xs font-serif font-bold p-2 text-center shadow-inner`}>
                            <span className="text-2xl mb-1">{item.icon}</span>
                            <span className="leading-tight">{item.title}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-xs truncate text-[#0C1D2D]">{item.title}</h4>
                            <div className="flex justify-between items-center text-[10px] text-[#47586A] mt-1 font-sans">
                              <span>{item.stat}</span>
                              <AtlasBadge variant="default">{item.tag}</AtlasBadge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AtlasPanel>
                </div>

                {/* New Releases List (5 Cols) */}
                <div className="lg:col-span-5">
                  <AtlasPanel variant="standard" className="space-y-4 bg-[#FDFBF7] border border-[#D9C8A9] shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#D9C8A9]/60">
                      <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#0C1D2D] flex items-center gap-1.5">
                        <span className="text-[#C5A059]">✦</span> NEW RELEASES
                      </span>
                      <span className="text-xs text-[#0F4C5C] font-semibold cursor-pointer hover:underline">View All</span>
                    </div>

                    <div className="space-y-2.5 font-sans">
                      {[
                        { name: 'Manor Lords', desc: 'Strategy, City Builder', platforms: 'PC', price: '$39.99', icon: '🏰' },
                        { name: 'Animal Well', desc: 'Metroidvania, Puzzle', platforms: 'PC, Switch', price: '$24.99', icon: '🐸' },
                        { name: 'Pacific Drive', desc: 'Survival, Driving', platforms: 'PC, PS5', price: '$29.99', icon: '🚗' },
                        { name: 'The Rogue Prince of Persia', desc: 'Action, Platformer', platforms: 'PC, Switch', price: '$24.99', icon: '🗡️' },
                      ].map((release) => (
                        <div key={release.name} className="flex items-center justify-between p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D9C8A9]/70 text-xs shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded bg-[#EFE8D8] border border-[#D9C8A9] flex items-center justify-center text-sm flex-shrink-0">
                              {release.icon}
                            </div>
                            <div>
                              <h5 className="font-bold text-[#0C1D2D]">{release.name}</h5>
                              <p className="text-[10px] text-[#47586A]">{release.desc} • {release.platforms}</p>
                            </div>
                          </div>
                          <AtlasButton variant="primary" size="sm">
                            {release.price}
                          </AtlasButton>
                        </div>
                      ))}
                    </div>
                  </AtlasPanel>
                </div>
              </div>

              {/* BOTTOM WIDGET ROW: Deals (7 Cols) + Upcoming Events (5 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                {/* PlayStation Store Deals (7 Cols) */}
                <div className="lg:col-span-7">
                  <AtlasPanel variant="standard" className="space-y-4 bg-[#FDFBF7] border border-[#D9C8A9] shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#D9C8A9]/60">
                      <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#0C1D2D] flex items-center gap-1.5">
                        <span className="text-[#C5A059]">✦</span> DEALS • PLAYSTATION STORE
                      </span>
                      <span className="text-xs text-[#0F4C5C] font-semibold cursor-pointer hover:underline">View All</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { name: 'Elden Ring', off: '-40%', price: '$35.99', orig: '$59.99', icon: '💍' },
                        { name: 'God of War', off: '-50%', price: '$19.99', orig: '$39.99', icon: '🪓' },
                        { name: 'Ghost of Tsushima', off: '-33%', price: '$46.89', orig: '$69.99', icon: '🌸' },
                        { name: "Demon's Souls", off: '-60%', price: '$27.99', orig: '$69.99', icon: '👻' },
                      ].map((deal) => (
                        <div key={deal.name} className="bg-[#FFFFFF] p-2.5 rounded-lg space-y-2 border border-[#D9C8A9] flex flex-col justify-between shadow-xs">
                          <div className="h-24 rounded-md bg-gradient-to-br from-[#EFE8D8] to-[#D9C8A9] border border-[#C5A059]/40 text-[#0C1D2D] flex flex-col items-center justify-center text-xs font-serif font-bold p-2 text-center shadow-inner">
                            <span className="text-2xl mb-1">{deal.icon}</span>
                            <span className="leading-tight">{deal.name}</span>
                          </div>
                          <div>
                            <h5 className="font-bold text-xs truncate text-[#0C1D2D]">{deal.name}</h5>
                            <div className="flex items-center justify-between mt-1 font-sans">
                              <AtlasBadge variant="discount">{deal.off}</AtlasBadge>
                              <div className="text-right">
                                <span className="font-serif font-bold text-xs text-[#0F4C5C] block">{deal.price}</span>
                                <span className="line-through text-[9px] text-[#718294] block">{deal.orig}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AtlasPanel>
                </div>

                {/* Upcoming Events Calendar (5 Cols) */}
                <div className="lg:col-span-5">
                  <AtlasPanel variant="featured" cornerOrnaments className="space-y-4 bg-[#FDFBF5] border border-[#C5A059] shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-[#D9C8A9]/60">
                      <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#0C1D2D] flex items-center gap-1.5">
                        <span className="text-[#C5A059]">✦</span> UPCOMING EVENTS
                      </span>
                      <span className="text-xs text-[#0F4C5C] font-semibold cursor-pointer hover:underline">View Calendar</span>
                    </div>

                    <div className="space-y-2.5 font-sans">
                      {[
                        { title: 'PlayStation State of Play', month: 'MAY', day: '24', time: 'May 24, 2024 • 3:00 PM PT' },
                        { title: 'Xbox Games Showcase', month: 'JUN', day: '09', time: 'June 9, 2024 • 10:00 AM PT' },
                        { title: 'Summer Game Fest 2024', month: 'JUN', day: '10', time: 'June 10, 2024 • 2:00 PM PT' },
                      ].map((evt) => (
                        <div key={evt.title} className="flex items-center justify-between p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D9C8A9]/70 text-xs shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="bg-[#0B2B3C] text-white px-2.5 py-1 rounded text-center font-serif font-bold flex-shrink-0 shadow-xs">
                              <div className="text-[9px] uppercase text-[#EBD99F] font-semibold">{evt.month}</div>
                              <div className="text-base leading-none">{evt.day}</div>
                            </div>
                            <div>
                              <h5 className="font-bold text-[#0C1D2D]">{evt.title}</h5>
                              <p className="text-[10px] text-[#47586A]">{evt.time}</p>
                            </div>
                          </div>
                          <span className="text-sm text-[#8C6D37] cursor-pointer hover:text-[#0B2B3C]">🔔</span>
                        </div>
                      ))}
                    </div>
                  </AtlasPanel>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
