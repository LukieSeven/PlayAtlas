import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor, Github } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        badge="SETTINGS"
        title="Application Settings & Customization"
        subtitle="Manage appearance themes, local browser caching, and GitHub repository sync defaults."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <Card glass className="space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Appearance & Theme</h3>
          </div>
          <p className="text-xs text-slate-400">
            Select your preferred visual style. Default is Dark Gaming Aesthetics.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold">Dark</span>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-semibold">Light</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-semibold">System</span>
            </button>
          </div>
        </Card>

        {/* GitHub & Storage Cache Info */}
        <Card glass className="space-y-4">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">GitHub Storage & Cache</h3>
          </div>
          <p className="text-xs text-slate-400">
            Connected Repository for list caching and updates:
          </p>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300">
            https://github.com/LukieSeven/PlayAtlas.git
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Local Storage Cache</span>
            <Badge variant="emerald">ACTIVE</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
};
