import React, { createContext, useContext, useState } from 'react';
import { NavItem } from '../types/navigation';
import { navigationConfig } from '../config/navigation';

interface SidebarContextType {
  customTabs: NavItem[];
  addTab: (tab: NavItem) => void;
  deleteTab: (tabId: string) => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customTabs, setCustomTabs] = useState<NavItem[]>(() => {
    const saved = localStorage.getItem('playatlas_custom_tabs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default items
      }
    }
    return navigationConfig.flatMap(sec => sec.items);
  });

  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const addTab = (newTab: NavItem) => {
    setCustomTabs(prev => {
      const updated = [...prev, newTab];
      localStorage.setItem('playatlas_custom_tabs', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteTab = (tabId: string) => {
    if (tabId === 'home') return; // Cannot delete home
    setCustomTabs(prev => {
      const updated = prev.filter(t => t.id !== tabId);
      localStorage.setItem('playatlas_custom_tabs', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleMobileOpen = () => setIsMobileOpen(prev => !prev);

  return (
    <SidebarContext.Provider
      value={{
        customTabs,
        addTab,
        deleteTab,
        isMobileOpen,
        setMobileOpen: setIsMobileOpen,
        toggleMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
