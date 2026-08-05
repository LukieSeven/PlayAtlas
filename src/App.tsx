import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { NewReleasesPage } from './pages/NewReleasesPage';
import { UpcomingGamesPage } from './pages/UpcomingGamesPage';
import { CalendarPage } from './pages/CalendarPage';
import { DiscountsPage } from './pages/DiscountsPage';
import { RankedListsPage } from './pages/RankedListsPage';
import { TierListsPage } from './pages/TierListsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { BacklogPage } from './pages/BacklogPage';
import { SharedListPage } from './pages/SharedListPage';
import { SettingsPage } from './pages/SettingsPage';
import { MyGamesPage } from './pages/MyGamesPage';
import { DevThemeShowcasePage } from './pages/DevThemeShowcasePage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="new-releases" element={<NewReleasesPage />} />
              <Route path="upcoming" element={<UpcomingGamesPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="discounts" element={<DiscountsPage />} />
              <Route path="deals" element={<Navigate to="/discounts" replace />} />
              <Route path="lists" element={<RankedListsPage />} />
              <Route path="tier-lists" element={<TierListsPage />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="backlog" element={<BacklogPage />} />
              <Route path="my-games" element={<MyGamesPage />} />
              <Route path="share/:listId" element={<SharedListPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="dev-theme-showcase" element={<DevThemeShowcasePage />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default App;
