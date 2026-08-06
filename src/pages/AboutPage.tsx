import React from 'react';
import { Compass, Database, Heart, MessageCircle, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => (
  <div className="mx-auto max-w-5xl space-y-5 animate-in fade-in duration-300">
    <section className="atlas-dashboard-panel relative overflow-hidden p-6 md:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-[#C5A059] bg-[#0B2B3C] shadow-lg"><Compass className="h-10 w-10 text-[#C5A059]" /></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8C6D37]">Discover · Track · Play</p><h1 className="mt-1 font-serif text-4xl font-bold text-[#0C1D2D]">About Play Atlas</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#47586A]">Play Atlas is a customizable, local-first game discovery and organization tool. Explore the catalog, follow releases and events, build lists and tier lists, and shape a personal gaming dashboard without sending your private library data to a Play Atlas account.</p></div>
      </div>
    </section>

    <div className="grid gap-5 md:grid-cols-2">
      <section className="atlas-dashboard-panel p-5 md:p-6"><div className="flex items-center gap-3"><Database className="h-5 w-5 text-[#8C6D37]" /><h2 className="font-serif text-2xl font-bold text-[#0C1D2D]">Catalog & privacy</h2></div><p className="mt-3 text-sm leading-relaxed text-[#47586A]">Public game and event information is sourced from the IGDB API. Personal ratings, notes, ownership, buckets, lists, completions, and calendar items remain in this browser’s local storage unless you explicitly export or share them.</p></section>
      <section className="atlas-dashboard-panel p-5 md:p-6"><div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-[#8C6D37]" /><h2 className="font-serif text-2xl font-bold text-[#0C1D2D]">Join the community</h2></div><p className="mt-3 text-sm leading-relaxed text-[#47586A]">Share feedback, report catalog oddities, suggest features, or just talk games with the Play Atlas community.</p><a href="https://discord.gg/9vGY6kQTd" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#C5A059] bg-[#0B2B3C] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"><MessageCircle className="h-4 w-4 text-[#C5A059]" /> Join the Play Atlas Discord</a></section>
    </div>

    <section className="atlas-dashboard-panel p-5 md:p-6"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#8C6D37]" /><h2 className="font-serif text-2xl font-bold text-[#0C1D2D]">Credits & trademarks</h2></div><div className="mt-3 space-y-3 text-xs leading-relaxed text-[#47586A]"><p>Game metadata and event data are provided through the IGDB API. IGDB is operated by Twitch. Play Atlas is an independent project and is not endorsed by, affiliated with, or sponsored by IGDB, Twitch, game publishers, platform holders, or storefront operators.</p><p>All game titles, artwork, logos, platform names, company names, and related trademarks are the property of their respective owners. Their appearance is for identification and informational purposes.</p><p>Play Atlas names, interface artwork, and original branding are © {new Date().getFullYear()} Play Atlas.</p></div></section>

    <section className="atlas-dashboard-panel flex flex-col items-center p-6 text-center"><Heart className="h-6 w-6 text-rose-600" /><p className="mt-3 max-w-2xl font-serif text-xl font-semibold italic text-[#0C1D2D]">Built as the gaming organizer I wanted to use—and shaped one good idea at a time.</p><p className="mt-3 text-sm font-bold text-[#8C6D37]">— LukieSeven</p></section>
  </div>
);

export default AboutPage;
