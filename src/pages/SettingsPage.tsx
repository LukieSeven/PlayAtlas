import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useTheme } from '../context/ThemeContext';
import { ThemePresetKey } from '../types/theme';
import { Palette, Eye, Github, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentPresetKey, setThemePreset, accessibility, updateAccessibility, availablePresets } = useTheme();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="SETTINGS"
        title="Application Settings & Customization"
        subtitle="Manage appearance themes, visual tokens, accessibility options, and local storage caching."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Presets Selection */}
        <Card glass className="space-y-4 themed-card">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--accent-color)]" />
            <h3 className="text-lg font-bold themed-heading">Visual Themes & Style Presets</h3>
          </div>
          <p className="text-xs themed-text-muted">
            Select your preferred visual identity preset. The default is <strong>Watercolor Atlas</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {Object.values(availablePresets).map(preset => {
              const isActive = currentPresetKey === preset.presetKey;

              return (
                <button
                  key={preset.presetKey}
                  type="button"
                  onClick={() => setThemePreset(preset.presetKey as ThemePresetKey)}
                  aria-pressed={isActive}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between text-left transition-all ${
                    isActive
                      ? 'bg-[rgba(212,175,55,0.15)] border-[var(--accent-color)] shadow-lg'
                      : 'bg-[var(--panel-bg)] border-[var(--panel-border)] hover:border-[var(--accent-color)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5 serif-heading">
                        {preset.name}
                        {isActive && <Check className="w-4 h-4 text-[var(--accent-color)] shrink-0" />}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">{preset.description}</p>
                    </div>
                  </div>

                  {/* Swatch Color & Texture Preview Strip */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--panel-border)]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.primaryAction }} title="Primary Action" />
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.accent }} title="Accent Gold" />
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.panelBackground }} title="Panel Surface" />
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.appBackground }} title="Canvas Base" />
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                      {preset.decorativeMotif}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Accessibility & Display Options */}
        <div className="space-y-6">
          <Card glass className="space-y-4 themed-card">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[var(--primary-action)]" />
              <h3 className="text-lg font-bold themed-heading">Accessibility & Display Options</h3>
            </div>
            <p className="text-xs themed-text-muted">
              Customize visual rendering, decorative elements, and motion preferences.
            </p>

            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] cursor-pointer hover:border-[var(--accent-color)] transition-colors">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Disable Background Textures</span>
                <input
                  type="checkbox"
                  checked={accessibility.disableTextures}
                  onChange={e => updateAccessibility({ disableTextures: e.target.checked })}
                  className="rounded border-[var(--input-border)] text-[var(--primary-action)] focus:ring-[var(--focus-ring)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] cursor-pointer hover:border-[var(--accent-color)] transition-colors">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Reduce Decorative Elements</span>
                <input
                  type="checkbox"
                  checked={accessibility.reduceDecorativeElements}
                  onChange={e => updateAccessibility({ reduceDecorativeElements: e.target.checked })}
                  className="rounded border-[var(--input-border)] text-[var(--primary-action)] focus:ring-[var(--focus-ring)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] cursor-pointer hover:border-[var(--accent-color)] transition-colors">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Reduce Motion & Transitions</span>
                <input
                  type="checkbox"
                  checked={accessibility.reduceMotion}
                  onChange={e => updateAccessibility({ reduceMotion: e.target.checked })}
                  className="rounded border-[var(--input-border)] text-[var(--primary-action)] focus:ring-[var(--focus-ring)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] cursor-pointer hover:border-[var(--accent-color)] transition-colors">
                <span className="text-xs font-semibold text-[var(--text-primary)]">High Contrast Text Mode</span>
                <input
                  type="checkbox"
                  checked={accessibility.highContrast}
                  onChange={e => updateAccessibility({ highContrast: e.target.checked })}
                  className="rounded border-[var(--input-border)] text-[var(--primary-action)] focus:ring-[var(--focus-ring)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] cursor-pointer hover:border-[var(--accent-color)] transition-colors">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Plain Minimal Background Mode</span>
                <input
                  type="checkbox"
                  checked={accessibility.plainBackgroundMode}
                  onChange={e => updateAccessibility({ plainBackgroundMode: e.target.checked })}
                  className="rounded border-[var(--input-border)] text-[var(--primary-action)] focus:ring-[var(--focus-ring)]"
                />
              </label>
            </div>
          </Card>

          {/* GitHub & Storage Info */}
          <Card glass className="space-y-4 themed-card">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-[var(--primary-action)]" />
              <h3 className="text-lg font-bold themed-heading">GitHub Storage & Sync</h3>
            </div>
            <p className="text-xs themed-text-muted">
              Connected Repository for list caching and updates:
            </p>
            <div className="p-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] font-mono text-xs text-[var(--primary-action)]">
              https://github.com/LukieSeven/PlayAtlas.git
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--panel-border)]">
              <span>Theme Token Engine</span>
              <Badge variant="amber">WATERCOLOR ATLAS</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
