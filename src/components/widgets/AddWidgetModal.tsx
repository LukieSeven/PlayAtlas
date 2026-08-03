import React from 'react';
import { X, Plus, Clock, Trophy, Flame, Gamepad2, Tag, CalendarDays } from 'lucide-react';
import { Button } from '../ui/Button';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWidget: (type: string, title: string) => void;
}

const availableWidgets = [
  { id: 'spotlight_countdown', title: 'Upcoming Release Countdown Spotlight', desc: 'Featured hero spotlight card with live release clock.', icon: <Clock className="w-5 h-5 text-amber-400" /> },
  { id: 'top_ten_list', title: 'Top 10 Game of the Year List', desc: 'Ranked top 10 list card container.', icon: <Trophy className="w-5 h-5 text-indigo-400" /> },
  { id: 'custom_list', title: 'Custom List Showcase', desc: 'Custom curated game list (e.g. Co-Op, Favorites).', icon: <Flame className="w-5 h-5 text-rose-400" /> },
  { id: 'backlog_tracker', title: 'Backlog & Playing Tracker', desc: 'Active play session and completion logger.', icon: <Gamepad2 className="w-5 h-5 text-cyan-400" /> },
  { id: 'games_calendar', title: 'Games Release Calendar', desc: 'Monthly release calendar overview.', icon: <CalendarDays className="w-5 h-5 text-emerald-400" /> },
  { id: 'discounts', title: 'Games on Sale & Discounts', desc: 'Discounted game tracker widget.', icon: <Tag className="w-5 h-5 text-purple-400" /> },
];

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  isOpen,
  onClose,
  onSelectWidget,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 border border-indigo-500/30 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold text-white">Add Widget to Canvas</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {availableWidgets.map(w => (
            <div
              key={w.id}
              onClick={() => {
                onSelectWidget(w.id, w.title);
                onClose();
              }}
              className="p-4 rounded-2xl glass-card border border-slate-800 hover:border-indigo-500/40 flex items-center justify-between gap-4 cursor-pointer transition-all hover:translate-x-1 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">{w.icon}</div>
                <div>
                  <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">{w.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{w.desc}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                Add
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
