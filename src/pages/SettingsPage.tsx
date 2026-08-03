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
        <Card glass className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Visual Themes & Styles</h3>
          </div>
          <p className="text-xs text-slate-400">
            Select your preferred visual identity preset. The default is <strong>Watercolor Atlas</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {Object.values(availablePresets).map(preset => {
              const isActive = currentPresetKey === preset.presetKey;

              return (
                <div
                  key={preset.presetKey}
                  onClick={() => setThemePreset(preset.presetKey as ThemePresetKey)}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 border-amber-400/80 shadow-lg shadow-amber-400/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                        {preset.name}
                        {isActive && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{preset.description}</p>
                    </div>
                  </div>

                  {/* Swatch Color Strip */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/80">
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: preset.primaryColor }} title="Primary" />
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: preset.secondaryColor }} title="Secondary" />
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: preset.accentColor }} title="Accent Gold" />
                    <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: preset.backgroundColor }} title="Background" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Accessibility & Display Options */}
        <div className="space-y-6">
          <Card glass className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Accessibility & Display Options</h3>
            </div>
            <p className="text-xs text-slate-400">
              Customize visual rendering, decorative elements, and motion preferences.
            </p>

            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-semibold text-white">Disable Background Textures</span>
                <input
                  type="checkbox"
                  checked={accessibility.disableTextures}
                  onChange={e => updateAccessibility({ disableTextures: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-semibold text-white">Reduce Motion & Transitions</span>
                <input
                  type="checkbox"
                  checked={accessibility.reduceMotion}
                  onChange={e => updateAccessibility({ reduceMotion: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-semibold text-white">High Contrast Text Mode</span>
                <input
                  type="checkbox"
                  checked={accessibility.highContrast}
                  onChange={e => updateAccessibility({ highContrast: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500/20"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-semibold text-white">Plain Minimal Background Mode</span>
                <input
                  type="checkbox"
                  checked={accessibility.plainBackgroundMode}
                  onChange={e => updateAccessibility({ plainBackgroundMode: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500/20"
                />
              </label>
            </div>
          </Card>

          {/* GitHub & Storage Info */}
          <Card glass className="space-y-4">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">GitHub Storage & Sync</h3>
            </div>
            <p className="text-xs text-slate-400">
              Connected Repository for list caching and updates:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300">
              https://github.com/LukieSeven/PlayAtlas.git
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
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
