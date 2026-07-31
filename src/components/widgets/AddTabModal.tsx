import React, { useState } from 'react';
import { X, Plus, FolderPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { NavItem } from '../../types/navigation';

interface AddTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTab: (tab: NavItem) => void;
}

export const AddTabModal: React.FC<AddTabModalProps> = ({
  isOpen,
  onClose,
  onAddTab,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'ranked' | 'custom' | 'backlog'>('custom');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const id = `custom-${Date.now()}`;
    const newTab: NavItem = {
      id,
      label: title.trim(),
      path: category === 'ranked' ? '/lists' : category === 'backlog' ? '/backlog' : '/collections',
      iconName: category === 'ranked' ? 'Trophy' : category === 'backlog' ? 'Gamepad2' : 'Bookmark',
      badge: 'CUSTOM',
      badgeColor: 'cyan',
    };

    onAddTab(newTab);
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 border border-indigo-500/30 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold text-white">Add Custom Taskbar Tab</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Tab / List Title
            </label>
            <Input
              placeholder="e.g. Games My Brother & I Played..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Tab Preset Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'custom', label: 'Custom List' },
                { id: 'ranked', label: 'Ranked Top 10' },
                { id: 'backlog', label: 'Backlog Tracker' },
              ].map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCategory(item.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    category === item.id
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="glow" size="md" icon={<Plus className="w-4 h-4" />}>
              Create Tab
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
