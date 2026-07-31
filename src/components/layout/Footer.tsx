import React from 'react';
import { Compass, Github, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-slate-800/80 glass-panel py-8 px-6 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-200">Play Atlas</span>
          <span className="text-slate-600">•</span>
          <span>Game Discovery & Ranking Platform</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-slate-400">
          <a
            href="https://github.com/LukieSeven/PlayAtlas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>LukieSeven/PlayAtlas</span>
          </a>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Local Cache Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
