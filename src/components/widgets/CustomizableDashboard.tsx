import React, { useState } from 'react';
import { SlidersHorizontal, Eye, EyeOff, GripVertical, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { HomeWidgetConfig } from '../../types/game';

interface CustomizableDashboardProps {
  onSettingsChange?: (widgets: HomeWidgetConfig[]) => void;
}

const defaultWidgets: HomeWidgetConfig[] = [
  { id: 'spotlight', title: 'Upcoming Game Release Countdown Spotlight', type: 'spotlight_countdown', enabled: true, order: 1 },
  { id: 'goty-list', title: 'Top 10 Game of the Year 2026 List', type: 'top_ten_list', enabled: true, order: 2 },
  { id: 'wife-coop', title: 'Games My Wife & I Enjoy (Co-Op)', type: 'custom_list', enabled: true, order: 3 },
  { id: 'sortable-all', title: 'Sortable & Filterable All Games Library', type: 'sortable_grid', enabled: true, order: 4 },
];

export const CustomizableDashboard: React.FC<CustomizableDashboardProps> = () => {
  const [widgets, setWidgets] = useState<HomeWidgetConfig[]>(defaultWidgets);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const toggleWidget = (id: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const resetLayout = () => {
    setWidgets(defaultWidgets);
  };

  return (
    <div className="glass-panel p-4 md:p-6 rounded-2xl border border-indigo-500/20 mb-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan">CUSTOMIZABLE DASHBOARD</Badge>
            <span className="text-xs text-slate-400 font-mono">Local Storage Cache Ready</span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">Configure Your Home Widgets</h3>
          <p className="text-xs text-slate-400">
            Personalize your layout with release countdowns, top 10 ranked lists, or co-op collection widgets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isEditing ? 'primary' : 'outline'}
            size="sm"
            icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Done Customizing' : 'Customize Layout'}
          </Button>
          {isEditing && (
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={resetLayout}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Editing Controls Panel */}
      {isEditing && (
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
          {widgets.map(w => (
            <div
              key={w.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                w.enabled
                  ? 'bg-slate-900/90 border-indigo-500/40 text-white'
                  : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
                <span className="text-xs font-semibold">{w.title}</span>
              </div>
              <button
                onClick={() => toggleWidget(w.id)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  w.enabled
                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 hover:bg-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {w.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
