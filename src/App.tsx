import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { AppLayout } from './components/layout/AppLayout';
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const NewReleasesPage = lazy(() => import('./pages/NewReleasesPage').then(module => ({ default: module.NewReleasesPage })));
const UpcomingGamesPage = lazy(() => import('./pages/UpcomingGamesPage').then(module => ({ default: module.UpcomingGamesPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(module => ({ default: module.CalendarPage })));
const DiscountsPage = lazy(() => import('./pages/DiscountsPage').then(module => ({ default: module.DiscountsPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(module => ({ default: module.EventsPage })));
const RankedListsPage = lazy(() => import('./pages/RankedListsPage').then(module => ({ default: module.RankedListsPage })));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage').then(module => ({ default: module.CollectionsPage })));
const BacklogPage = lazy(() => import('./pages/BacklogPage').then(module => ({ default: module.BacklogPage })));
const SharedListPage = lazy(() => import('./pages/SharedListPage').then(module => ({ default: module.SharedListPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const MyGamesPage = lazy(() => import('./pages/MyGamesPage').then(module => ({ default: module.MyGamesPage })));
const DevThemeShowcasePage = lazy(() => import('./pages/DevThemeShowcasePage').then(module => ({ default: module.DevThemeShowcasePage })));
const DevComponentReviewPage = lazy(() => import('./pages/DevComponentReviewPage').then(module => ({ default: module.DevComponentReviewPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <HashRouter>
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center font-serif text-lg font-bold text-[#0B2B3C]">Opening atlas page…</div>}>
          <Routes>
            {/* Standalone Isolated Theme Showcase Route (Dev-Only Preview) */}
            <Route path="dev-theme-showcase" element={<DevThemeShowcasePage />} />

            {/* Standalone Development Component Review Route (Dev-Only) */}
            <Route path="dev-component-review" element={<DevComponentReviewPage />} />

            {/* Standard Production Application Shell Routes */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="new-releases" element={<NewReleasesPage />} />
              <Route path="upcoming" element={<UpcomingGamesPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="discounts" element={<DiscountsPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="deals" element={<Navigate to="/discounts" replace />} />
              <Route path="lists" element={<RankedListsPage />} />
              <Route path="tier-lists" element={<Navigate to="/lists" replace />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="backlog" element={<BacklogPage />} />
              <Route path="my-games" element={<MyGamesPage />} />
              <Route path="share/:listId" element={<SharedListPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
          </Suspense>
        </HashRouter>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default App;
