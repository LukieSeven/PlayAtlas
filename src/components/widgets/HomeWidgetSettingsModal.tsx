import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { HomeWidgetConfiguration, HomeWidgetPresentation } from '../../types/homeWidget';
import { Button } from '../ui/Button';

interface Props {
  configuration: HomeWidgetConfiguration;
  sourceOptions?: Array<{ value: string; label: string }>;
  onSave: (configuration: HomeWidgetConfiguration) => void;
  onClose: () => void;
}

const modes: Array<{ value: HomeWidgetPresentation; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'detail', label: 'Detail' },
  { value: 'grid', label: 'Cards' },
  { value: 'randomizer', label: 'Randomizer' },
];

export const HomeWidgetSettingsModal: React.FC<Props> = ({ configuration, sourceOptions = [], onSave, onClose }) => {
  const [draft, setDraft] = useState(configuration);
  useEffect(() => setDraft(configuration), [configuration]);

  const updateDisplay = <K extends keyof HomeWidgetConfiguration['display']>(key: K, value: HomeWidgetConfiguration['display'][K]) => {
    setDraft(current => ({ ...current, display: { ...current.display, [key]: value } }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0C1D2D]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="widget-settings-title">
      <form className="atlas-dashboard-panel w-full max-w-xl p-5 shadow-2xl" onSubmit={event => { event.preventDefault(); onSave(draft); }}>
        <div className="flex items-start justify-between border-b border-[#D9C8A9] pb-4">
          <div>
            <h2 id="widget-settings-title" className="font-serif text-2xl font-bold text-[#0C1D2D]">Widget Settings</h2>
            <p className="mt-1 text-xs text-[#47586A]">Content stays the same while you choose how it is presented.</p>
          </div>
          <button type="button" className="atlas-widget-control" onClick={onClose} aria-label="Close widget settings"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 space-y-5">
          <label className="block text-xs font-bold text-[#0C1D2D]">Widget title
            <input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} maxLength={60} className="mt-2 w-full rounded-xl border border-[#C8B584] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#0B6777]" />
          </label>

          <label className="block text-xs font-bold text-[#0C1D2D]">Game source
            <select value={draft.source || ''} onChange={event => setDraft(current => ({ ...current, source: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#C8B584] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#0B6777]">
              <option value="">Entire catalog</option>
              {draft.source && !sourceOptions.some(option => option.value === draft.source) && <option value={draft.source}>Current widget feed</option>}
              {sourceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <span className="mt-1 block text-[10px] font-normal text-[#718294]">Leaving this blank lets Randomizer sample the full catalog.</span>
          </label>

          <fieldset>
            <legend className="text-xs font-bold text-[#0C1D2D]">Presentation</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {modes.map(mode => <button key={mode.value} type="button" onClick={() => updateDisplay('presentation', mode.value)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${draft.display.presentation === mode.value ? 'border-[#0B2B3C] bg-[#0B2B3C] text-white' : 'border-[#D9C8A9] bg-white/70 text-[#0C1D2D]'}`}>{mode.label}</button>)}
            </div>
          </fieldset>

          <label className="block text-xs font-bold text-[#0C1D2D]">Games shown: {draft.display.itemLimit}
            <input type="range" min="1" max="12" value={draft.display.itemLimit} onChange={event => updateDisplay('itemLimit', Number(event.target.value))} className="mt-2 w-full accent-[#0B6777]" />
          </label>

          <div className="grid grid-cols-2 gap-3 text-xs text-[#0C1D2D]">
            {([['showArtwork', 'Artwork'], ['showRating', 'Ratings'], ['showPlatforms', 'Platforms']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-[#D9C8A9] bg-white/60 p-3"><input type="checkbox" checked={draft.display[key]} onChange={event => updateDisplay(key, event.target.checked)} className="accent-[#0B6777]" />{label}</label>)}
            {draft.display.presentation === 'carousel' && <label className="flex items-center gap-2 rounded-xl border border-[#D9C8A9] bg-white/60 p-3"><input type="checkbox" checked={draft.display.autoRotate} onChange={event => updateDisplay('autoRotate', event.target.checked)} className="accent-[#0B6777]" />Auto rotate</label>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Save Widget</Button></div>
      </form>
    </div>
  );
};
