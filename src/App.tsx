/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Archive, Compass, Home, Layers, LogIn, LogOut, Play, Users } from 'lucide-react';
import { ASSETS } from './tokens';
import { ArchiveDoc } from './data/toxicologyData';
import { useToxicologyAuth } from './hooks/useToxicologyAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CrownIcon } from './components/ui/CrownIcon';
import { ActionButton } from './components/ui/ActionButton';
import { DocumentReaderModal } from './components/DocumentReaderModal';
import { NavigationGuideModal } from './components/NavigationGuideModal';
import { AppRoute, HomePage } from './pages/HomePage';
import { ArchivePage } from './pages/ArchivePage';
import { ThreeStepPage } from './pages/ThreeStepPage';
import { DiagnosticLabPage } from './pages/DiagnosticLabPage';
import { PartnersPage } from './pages/PartnersPage';

const DESKTOP_NAV: { id: AppRoute; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'archive', label: 'Archive' },
  { id: 'three-step', label: '3-Step' },
  { id: 'lab', label: 'Lab' },
  { id: 'partners', label: 'Partners' },
];

const MOBILE_TABS: {
  id: AppRoute;
  label: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'archive', label: 'Archive', Icon: Archive },
  { id: 'three-step', label: '3-Step', Icon: Layers },
  { id: 'partners', label: 'Partners', Icon: Users },
];

const GUIDE_SEEN_KEY = 'toxicology_nav_guide_seen_v1';

function ToxicologyShell() {
  const [route, setRoute] = useState<AppRoute>('home');
  const [selectedDoc, setSelectedDoc] = useState<ArchiveDoc | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const {
    user,
    bookmarkedIds,
    audits,
    authError,
    signingIn,
    syncLoading,
    signIn,
    logout,
    toggleBookmark,
    saveAudit,
    deleteAudit,
  } = useToxicologyAuth();

  useEffect(() => {
    try {
      if (localStorage.getItem(GUIDE_SEEN_KEY) !== '1') {
        setGuideOpen(true);
      }
    } catch {
      setGuideOpen(true);
    }
  }, []);

  const handleCloseGuide = (dontShowAgain: boolean) => {
    setGuideOpen(false);
    try {
      if (dontShowAgain) {
        localStorage.setItem(GUIDE_SEEN_KEY, '1');
      }
    } catch {
      // Ignore storage quota errors
    }
  };

  const navigate = (next: AppRoute) => {
    setRoute(next);
    setAccountMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Top Bar: Crown + TOXICOLOGY wordmark, Desktop Nav, Watch Breakdown CTA, Avatar/Auth */}
      <header className="sticky top-0 z-40 h-[64px] bg-[#050505]/95 border-b border-[#2A2A2A]">
        <div className="max-w-6xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6">
          {/* Brand Mark */}
          <button
            type="button"
            onClick={() => navigate('home')}
            aria-label="Toxicology Archive Home"
            className="min-h-[44px] flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded-lg px-1"
          >
            <CrownIcon className="w-5 h-5 sm:w-6 sm:h-6" glow />
            <span className="font-heading font-bold text-xs sm:text-base tracking-tight text-white">
              TOXICOLOGY
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
            {DESKTOP_NAV.map((item) => {
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`min-h-[44px] px-1 text-sm font-heading font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                    active
                      ? 'text-[#FF554A] border-[#E10000]'
                      : 'text-[#A3A3A3] border-transparent hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Zone: Guide button (sm+), Watch Breakdown CTA, Visible Sign In / Account */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              aria-label="Open app navigation guide"
              className="hidden sm:inline-flex min-h-[44px] px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-[#D4D4D4] hover:text-white items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
            >
              <Compass className="w-3.5 h-3.5 text-[#FF554A]" />
              <span>Guide</span>
            </button>

            <ActionButton
              variant="primary"
              size="compact"
              onClick={() => navigate('lab')}
              className="px-2.5 sm:px-4"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch Breakdown</span>
            </ActionButton>

            {user ? (
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-label="Open researcher account menu"
                aria-expanded={accountMenuOpen}
                className="min-h-[44px] px-1.5 sm:pr-3 flex items-center gap-2 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
              >
                <span className="w-8 h-8 rounded-full p-[2px] bg-[#050505] ring-2 ring-[#E10000] overflow-hidden block shrink-0">
                  <img
                    src={user.photoURL || ASSETS.mascotAvatar}
                    alt={`${user.displayName || 'Researcher'} avatar`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover"
                  />
                </span>
                <span className="hidden sm:inline text-xs font-heading font-bold text-white max-w-[90px] truncate">
                  {user.displayName?.split(' ')[0] || 'Account'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signIn}
                disabled={signingIn}
                aria-label="Sign in with Google"
                className="min-h-[44px] px-2.5 sm:px-3.5 rounded-full bg-[#161616] border-[1.5px] border-[#E10000]/80 hover:border-[#E10000] hover:bg-[#1E1E1E] text-xs sm:text-sm font-heading font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5 text-[#FF554A] shrink-0" />
                <span>{signingIn ? 'Signing in...' : 'Sign in'}</span>
              </button>
            )}

            {accountMenuOpen && user && (
              <div
                role="menu"
                className="absolute right-0 top-[56px] w-64 clay-card p-4 space-y-3 z-50"
              >
                <div className="border-b border-[#2A2A2A] pb-3">
                  <p className="font-heading font-bold text-sm text-white truncate">
                    {user.displayName || 'Researcher'}
                  </p>
                  <p className="font-mono-handle text-xs text-[#A3A3A3] truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
                <div className="text-xs text-[#A3A3A3] flex justify-between">
                  <span>Saved Briefs</span>
                  <span className="font-heading font-bold text-white tabular-nums">
                    {bookmarkedIds.size}
                  </span>
                </div>
                <div className="text-xs text-[#A3A3A3] flex justify-between">
                  <span>Saved Audits</span>
                  <span className="font-heading font-bold text-white tabular-nums">
                    {audits.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full min-h-[44px] rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000] text-xs font-heading font-bold text-white flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                >
                  <LogOut className="w-4 h-4 text-[#FF554A]" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {authError && (
        <div
          role="alert"
          className="max-w-6xl w-full mx-auto px-4 pt-3 text-xs text-[#FF554A]"
        >
          {authError}
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-[88px] md:pb-12">
        {route === 'home' && (
          <HomePage
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={toggleBookmark}
            onOpenDoc={setSelectedDoc}
            onNavigate={navigate}
            onOpenGuide={() => setGuideOpen(true)}
          />
        )}
        {route === 'archive' && (
          <ArchivePage
            bookmarkedIds={bookmarkedIds}
            syncLoading={syncLoading}
            onToggleBookmark={toggleBookmark}
            onOpenDoc={setSelectedDoc}
            onOpenLab={() => navigate('lab')}
          />
        )}
        {route === 'three-step' && (
          <ThreeStepPage
            audits={audits}
            isSignedIn={Boolean(user)}
            onSaveAudit={saveAudit}
            onDeleteAudit={deleteAudit}
            onSignIn={signIn}
          />
        )}
        {route === 'lab' && <DiagnosticLabPage onOpenGuide={() => setGuideOpen(true)} />}
        {route === 'partners' && <PartnersPage />}
      </main>

      {/* Sticky Mobile Bottom Nav (4 tabs, active in red with crown-dot indicator, 56px + safe area) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E0E0E]/95 border-t border-[#2A2A2A] pb-safe"
      >
        <div className="h-[56px] max-w-md mx-auto grid grid-cols-4 items-center">
          {MOBILE_TABS.map((tab) => {
            const active =
              route === tab.id || (route === 'lab' && tab.id === 'three-step');
            const TabIcon = tab.Icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.id)}
                aria-current={active ? 'page' : undefined}
                className="min-h-[48px] h-full flex flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF554A]"
              >
                {active ? (
                  <CrownIcon className="w-5 h-5" glow />
                ) : (
                  <TabIcon className="w-5 h-5 text-[#A3A3A3]" />
                )}
                <span
                  className={`text-[11px] font-heading font-bold leading-none ${
                    active ? 'text-[#FF554A]' : 'text-[#A3A3A3]'
                  }`}
                >
                  {tab.label}
                </span>
                {active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#E10000] mt-0.5"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Document Reader Modal */}
      <DocumentReaderModal
        doc={selectedDoc}
        isBookmarked={selectedDoc ? bookmarkedIds.has(selectedDoc.id) : false}
        onToggleBookmark={toggleBookmark}
        onClose={() => setSelectedDoc(null)}
        onOpenLab={() => navigate('lab')}
      />

      {/* Interactive 3D & App Navigation Guide Popup */}
      <NavigationGuideModal
        open={guideOpen}
        isSignedIn={Boolean(user)}
        signingIn={signingIn}
        userEmail={user?.email}
        onClose={handleCloseGuide}
        onNavigate={navigate}
        onSignIn={signIn}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToxicologyShell />
    </ErrorBoundary>
  );
}
