import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header Navigation */}
      <Header />

      {/* Main Container Layout */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Mobile Overlay Nav */}
        <MobileNav />

        {/* Dynamic Route View Content Area */}
        <main className="flex-1 min-w-0 p-4 md:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};
