import React from 'react';
import { Compass } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, description, icon }) => (
  <div className="flex min-h-[58vh] items-center justify-center animate-in fade-in duration-300">
    <section className="atlas-dashboard-panel relative w-full max-w-2xl overflow-hidden px-6 py-14 text-center sm:px-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#C5A059] bg-[#0B2B3C] text-[#F2D27C] shadow-lg">
        {icon || <Compass className="h-8 w-8" />}
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-[#8C6D37]">Next destination</p>
      <h2 className="mt-2 font-serif text-4xl font-bold text-[#0C1D2D]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#47586A]">{description}</p>
      <div className="mx-auto mt-7 flex max-w-xs items-center gap-3 text-[#C5A059]" aria-hidden="true">
        <span className="h-px flex-1 bg-current opacity-50" />
        <span className="text-lg">✦</span>
        <span className="h-px flex-1 bg-current opacity-50" />
      </div>
    </section>
  </div>
);
