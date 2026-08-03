import React from 'react';
import { Compass, Github, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-[var(--panel-border)] themed-panel py-8 px-6 text-[var(--text-muted)] text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[rgba(212,175,55,0.15)] border border-[var(--panel-border)] flex items-center justify-center text-[var(--accent-color)]">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-[var(--text-primary)] serif-heading">Play Atlas</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span>Personal Gaming Hub</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-[var(--text-muted)]">
          <a
            href="https://github.com/LukieSeven/PlayAtlas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--accent-color)] transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>LukieSeven/PlayAtlas</span>
          </a>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Local Cache Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
