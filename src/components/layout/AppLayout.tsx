import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex themed-app-shell font-sans selection:bg-[var(--primary-action)] selection:text-white">
      {/* Left Pinned Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Overlay */}
      <MobileNav />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Sticky Top Header Navigation */}
        <Header />

        {/* Scrollable Main Dashboard Canvas Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 flex flex-col justify-between">
          <div className="max-w-7xl mx-auto w-full space-y-8">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};
