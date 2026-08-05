import React from 'react';
import { Compass, Github, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border border-[#D9C8A9] bg-[#FDFBF7] py-6 px-6 text-[#47586A] text-xs rounded-2xl shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#0B2B3C] border border-[#C5A059] flex items-center justify-center text-[#C5A059]">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-[#0C1D2D] font-serif text-sm">Play Atlas</span>
          <span className="text-[#8C6D37]">•</span>
          <span className="font-sans font-medium">Personal Gaming Hub</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-[#47586A] font-sans">
          <a
            href="https://github.com/LukieSeven/PlayAtlas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[#0C1D2D] transition-colors"
          >
            <Github className="w-4 h-4 text-[#8C6D37]" />
            <span>LukieSeven/PlayAtlas</span>
          </a>
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Local Cache Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
