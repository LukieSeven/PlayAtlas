import React from 'react';
import { Compass, Github, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-8 border-t border-[#D9C8A9]/60 pt-4 pb-2 px-2 text-[#47586A] text-xs">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#0B2B3C] border border-[#C5A059] flex items-center justify-center text-[#C5A059] shrink-0">
            <Compass className="w-3 h-3" />
          </div>
          <span className="font-bold text-[#0C1D2D] font-serif text-sm tracking-wide">Play Atlas</span>
          <span className="text-[#8C6D37]">•</span>
          <span className="font-medium text-[11px] text-[#718294]">Personal Gaming Hub</span>
        </div>

        <div className="flex items-center gap-5 text-[11px]">
          <a
            href="https://github.com/LukieSeven/PlayAtlas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#47586A] hover:text-[#0C1D2D] transition-colors"
          >
            <Github className="w-3.5 h-3.5 text-[#8C6D37]" />
            <span>LukieSeven/PlayAtlas</span>
          </a>
          <div className="flex items-center gap-1 text-emerald-800 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Local Cache Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
