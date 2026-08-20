import React, { useState, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search, X, ChevronDown } from 'lucide-react';
import CartIcon from '@/components/cart/CartIcon';
import { AnimatePresence, motion } from 'framer-motion';
import Footer from '@/components/shared/Footer';
import AnnouncementBar from '@/components/shared/AnnouncementBar';
import GoogleMapsInitializer from '@/components/shared/GoogleMapsInitializer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import MobileSearchOverlay from '@/components/layout/MobileSearchOverlay';
import MobileMenuDrawer from '@/components/layout/MobileMenuDrawer';
import SearchResultsGrid from '@/components/layout/SearchResultsGrid';
import ErrorBoundary from '@/components/system/errorBoundary';
import UserMenu from '@/components/layout/UserMenu';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { SEARCH_STALE_TIME_MS } from '@/components/utils/queryDefaults';
import { getLaunchModeConfig } from '@/components/system/launchConfig';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { useTabKeepAlive } from '@/hooks/useTabKeepAlive';
import HijinxLogo from '@/components/shared/HijinxLogo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import Home from '@/pages/Home';
import OutletHome from '@/pages/OutletHome';
import ApparelHome from '@/pages/ApparelHome';
import MarketplaceHome from '@/pages/MarketplaceHome';

const navItems = [
  { name: 'Home', page: 'Home' },
  { name: 'The Outlet', page: 'OutletHome', sub: [
    { name: 'Stories', page: 'OutletHome' },
    { name: 'Submit a Story', page: 'OutletSubmit' },
  ]},
  { name: 'INDEX46', page: 'MotorsportsHome', sub: [
    { name: '— Directory —', page: null, disabled: true },
    { name: 'All Records', href: '/Directory' },
    { name: 'Racers', href: '/Directory?cat=drivers' },
    { name: 'Teams', href: '/Directory?cat=teams' },
    { name: 'Tracks', href: '/Directory?cat=tracks' },
    { name: 'Series', href: '/Directory?cat=series' },
    { name: 'Vehicles', href: '/Directory?cat=vehicles' },
    { name: 'Sponsors', href: '/Directory?cat=sponsors' },
    { name: '— Events —', page: null, disabled: true },
    { name: 'Events', href: '/Directory?cat=events' },
    { name: '— Registration —', page: null, disabled: true },
    { name: 'Register for Event', page: 'Registration' },
    { name: '— Media —', page: null, disabled: true },
    { name: 'Media Home', page: 'MediaHome' },
    { name: 'Creator Directory', href: '/Directory?cat=creators' },
    { name: 'Media Outlets', href: '/Directory?cat=outlets' },
    { name: 'Media Portal', page: 'MediaPortal' },
  ]},
  { name: 'Apparel', page: 'ApparelHome' },
  { name: 'Marketplace', page: 'MarketplaceHome' },
];

// Native-style tab keep-alive: these four destinations stay mounted and
// hidden when switching between them so their scroll position and in-page
// state (filters, selections) are preserved across tab switches.
const TAB_ROUTES = ['/Home', '/OutletHome', '/ApparelHome', '/MarketplaceHome'];
const TAB_PAGES = [
  ['/Home', Home],
  ['/OutletHome', OutletHome],
  ['/ApparelHome', ApparelHome],
  ['/MarketplaceHome', MarketplaceHome],
];
const isTabRoute = (p) => TAB_ROUTES.includes(p);

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const EMPTY_RESULTS = { stories: [], drivers: [], events: [], tracks: [], series: [], teams: [], vehicles: [], media: [], sponsors: [] };
  const [searchResults, setSearchResults] = useState(EMPTY_RESULTS);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = React.useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const location = useLocation();

  // Android WebView: graceful hardware back-button handling.
  useAndroidBackButton();

  // Tab keep-alive: each bottom tab stays mounted (hidden) across switches so
  // in-page state + scroll are preserved, and only resets to root on a
  // double-tap of the active tab (handled in MobileBottomNav).

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  // Sprint 1E: Search entity lists cached with 5min staleTime — no re-fetch on every keystroke
  const searchQueryOpts = { staleTime: SEARCH_STALE_TIME_MS, gcTime: 10 * 60 * 1000, enabled: searchOpen };
  const { data: searchStories } = useQuery({ queryKey: ['searchStories'], queryFn: () => base44.entities.OutletStory.list('-published_date', 200), ...searchQueryOpts });
  const { data: searchRacerProfiles } = useQuery({ queryKey: ['searchRacerProfiles'], queryFn: () => base44.entities.RacerProfile.list('-created_date', 200), ...searchQueryOpts });
  const { data: searchEvents } = useQuery({ queryKey: ['searchEvents'], queryFn: () => base44.entities.Event.list('-event_date', 200), ...searchQueryOpts });
  const { data: searchTracks } = useQuery({ queryKey: ['searchTracks'], queryFn: () => base44.entities.Track.list('-created_date', 200), ...searchQueryOpts });
  const { data: searchSeries } = useQuery({ queryKey: ['searchSeries'], queryFn: () => base44.entities.Series.list('-created_date', 200), ...searchQueryOpts });
  const { data: searchTeams } = useQuery({ queryKey: ['searchTeams'], queryFn: () => base44.entities.Team.list('-created_date', 200), ...searchQueryOpts });
  const { data: searchVehicles } = useQuery({ queryKey: ['searchVehicles'], queryFn: () => base44.entities.Vehicle.list('-created_date', 200), ...searchQueryOpts });
  const { data: searchMediaAssets } = useQuery({ queryKey: ['searchMediaAssets'], queryFn: () => base44.entities.MediaAsset.list('-created_date', 200), ...searchQueryOpts });
  const { data: searchSponsorOrgs } = useQuery({ queryKey: ['searchSponsorOrgs'], queryFn: () => base44.entities.Organization.filter({ type: 'Sponsor' }), ...searchQueryOpts });
  // Sprint 1E: Show loading indicator only when search data is still fetching
  const searchQueriesLoading = searchOpen && !searchStories && !searchRacerProfiles && !searchEvents;

  // Encapsulated keep-alive (mount + per-tab scroll restoration).
  const { mountedTabs } = useTabKeepAlive(TAB_ROUTES, location);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(EMPTY_RESULTS);
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('');
      setSearchResults(EMPTY_RESULTS);
      return;
    }
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  // Sprint 1E: Search now filters cached React Query data — no fetch on every keystroke
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(EMPTY_RESULTS);
      return;
    }
    const timer = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const allStories = searchStories || [];
      const allRacerProfiles = searchRacerProfiles || [];
      const allEvents = searchEvents || [];
      const allTracks = searchTracks || [];
      const allSeries = searchSeries || [];
      const allTeams = searchTeams || [];
      const allVehicles = searchVehicles || [];
      const allMediaAssets = searchMediaAssets || [];
      const allSponsorOrgs = searchSponsorOrgs || [];

      setSearchResults({
        stories: allStories.filter(s =>
          s.status === 'published' &&
          (s.title?.toLowerCase().includes(q) || s.subtitle?.toLowerCase().includes(q) ||
           s.author?.toLowerCase().includes(q) || s.primary_category?.toLowerCase().includes(q) ||
           s.sub_category?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)))
        ).slice(0, 4),
        drivers: allRacerProfiles.filter(rp =>
          rp.visibility === 'live' && !rp.is_archived &&
          (rp.display_name?.toLowerCase().includes(q) ||
           rp.hometown_city?.toLowerCase().includes(q) ||
           rp.nicknames?.some(n => n.toLowerCase().includes(q)))
        ).slice(0, 4),
        events: allEvents.filter(e =>
          e.published_flag &&
          (e.name?.toLowerCase().includes(q) || e.series_name?.toLowerCase().includes(q) ||
           e.location_note?.toLowerCase().includes(q) || e.season?.toLowerCase().includes(q))
        ).slice(0, 4),
        tracks: allTracks.filter(t =>
          t.visibility_status === 'live' &&
          (t.name?.toLowerCase().includes(q) || t.location_city?.toLowerCase().includes(q) ||
           t.location_state?.toLowerCase().includes(q) || t.track_type?.toLowerCase().includes(q))
        ).slice(0, 4),
        series: allSeries.filter(s =>
          s.visibility_status === 'live' &&
          (s.name?.toLowerCase().includes(q) || s.short_name?.toLowerCase().includes(q) ||
           s.description?.toLowerCase().includes(q))
        ).slice(0, 4),
        teams: allTeams.filter(t =>
          t.name?.toLowerCase().includes(q) || t.location_city?.toLowerCase().includes(q) ||
          t.primary_discipline?.toLowerCase().includes(q)
        ).slice(0, 4),
        vehicles: allVehicles.filter(v =>
          v.visibility_status !== 'draft' && !v.is_archived &&
          (v.nickname?.toLowerCase().includes(q) || v.manufacturer?.toLowerCase().includes(q) ||
           v.model?.toLowerCase().includes(q) || v.vehicle_type?.toLowerCase().includes(q) ||
           v.chassis_id?.toLowerCase().includes(q) || v.chassis_builder?.toLowerCase().includes(q) ||
           v.engine_platform?.toLowerCase().includes(q) || v.number_default?.toLowerCase().includes(q))
        ).slice(0, 4),
        media: allMediaAssets.filter(a =>
          a.public_access && a.visibility_scope === 'public' && a.status !== 'archived' && a.rights_status !== 'revoked' &&
          (a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) ||
           a.file_name?.toLowerCase().includes(q) || a.tags?.some(t => t.toLowerCase().includes(q)) ||
           a.asset_type?.toLowerCase().includes(q))
        ).slice(0, 4),
        sponsors: allSponsorOrgs.filter(o =>
          o.visibility_status === 'live' && !o.is_archived &&
          (o.name?.toLowerCase().includes(q) || o.normalized_name?.toLowerCase().includes(q) ||
           o.description?.toLowerCase().includes(q) || o.tagline?.toLowerCase().includes(q) ||
           o.industry?.toLowerCase().includes(q) || o.website_url?.toLowerCase().includes(q))
        ).slice(0, 4),
      });
      setSearchLoading(false);
    }, 200); // Sprint 1E: Reduced debounce from 300ms to 200ms — data is cached, filtering is instant
    return () => clearTimeout(timer);
  }, [searchQuery, searchStories, searchRacerProfiles, searchEvents, searchTracks, searchSeries, searchTeams, searchVehicles, searchMediaAssets, searchSponsorOrgs]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isActive = (page) => currentPageName === page;
  const launchMode = getLaunchModeConfig();

  // Root path redirect — always send / to the public homepage
  if (location.pathname === '/' || location.pathname === '') {
    return <Navigate to="/Home" replace />;
  }

  const activeSubItems = hoveredItem ? navItems.find(i => i.name === hoveredItem)?.sub : null;

  return (
    <GoogleMapsInitializer>
      <div className="flex flex-col min-h-screen relative hijinx-canvas-bg">
        <div className="sticky top-0 z-50 relative" style={{ background: 'hsl(var(--canvas))', paddingTop: 'env(safe-area-inset-top)' }}>
          {/* Mobile/tablet static top bar — logo + cart only */}
          <div className="lg:hidden flex items-center justify-between px-4 h-14" style={{ borderBottom: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface) / 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            <HijinxLogo to={createPageUrl('Home')} iconClassName="h-5 w-auto" wordmarkClassName="h-7 w-auto" className="gap-2" />
            <CartIcon style={{ color: 'hsl(var(--foreground-secondary))' }} />
          </div>
          {/* Desktop chrome — hidden on mobile/tablet */}
          <div className="hidden lg:block">
          <AnnouncementBar />
          {/* Floating glass header */}
          <div className="px-3 py-2">
            <header
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => { setIsHeaderHovered(false); setHoveredItem(null); if (!searchQuery && !searchLoading) setSearchOpen(false); }}
              className="transition-all duration-300 rounded-[20px]"
              style={{
                background: isHeaderHovered
                  ? 'hsl(var(--surface-elevated) / 0.82)'
                  : scrolled
                    ? 'hsl(var(--canvas) / 0.55)'
                    : 'hsl(var(--canvas) / 0.25)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: isHeaderHovered
                  ? '1.5px solid hsl(var(--motion) / 0.25)'
                  : '1.5px solid hsl(var(--divider))',
                boxShadow: isHeaderHovered
                  ? '0 0 48px hsl(var(--motion) / 0.15), 0 16px 64px hsl(0 0% 0% / 0.7), inset 0 1px 0 hsl(var(--foreground) / 0.08)'
                  : '0 0 32px hsl(var(--foreground) / 0.08), 0 8px 40px hsl(0 0% 0% / 0.35), inset 0 1px 0 hsl(var(--foreground) / 0.12)',
              }}
            >
              {/* Top row — logo + nav + actions */}
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full gap-8">
                {/* Logo */}
                <HijinxLogo to={createPageUrl('Home')} iconClassName="h-5 w-auto" wordmarkClassName="h-8 w-auto" className="gap-2" />

                {/* Desktop nav */}
                <nav className="hidden lg:flex flex-1 items-center justify-center">
                  <ul className="flex items-center gap-0">
                    {navItems.map((item) => (
                      <li
                        key={item.name}
                        className="relative"
                        onMouseEnter={() => setHoveredItem(item.name)}
                      >
                        <Link
                           to={item.href || (item.page ? createPageUrl(item.page) : '#')}
                           className={`flex items-center gap-1 px-3 py-4 text-[13.75px] font-bold tracking-[0.18em] uppercase transition-all duration-200`}
                          style={{
                            color: hoveredItem === item.name
                              ? 'hsl(var(--motion))'
                              : isActive(item.page)
                                ? 'hsl(var(--motion))'
                                : isHeaderHovered
                                  ? 'hsl(var(--foreground-quiet))'
                                  : 'hsl(var(--foreground-secondary))',
                            textShadow: (hoveredItem === item.name || isActive(item.page)) ? '0 0 12px hsl(var(--motion) / 0.4)' : 'none',
                          }}
                        >
                          {item.name}
                          {item.sub && (
                            <ChevronDown
                              className="w-3 h-3 transition-transform duration-200"
                              style={{ transform: hoveredItem === item.name ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setSearchOpen(!searchOpen); setHoveredItem(null); }}
                    className="p-2 rounded-lg transition-colors flex items-center justify-center"
                    style={{ color: searchOpen ? 'hsl(var(--motion))' : isHeaderHovered ? 'hsl(var(--foreground-quiet))' : 'hsl(var(--foreground-quiet))' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--foreground))'}
                    onMouseLeave={e => e.currentTarget.style.color = searchOpen ? 'hsl(var(--motion))' : isHeaderHovered ? 'hsl(var(--foreground-quiet))' : 'hsl(var(--foreground-quiet))'}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  {user?.role === 'admin' && (
                    <Link
                      to={createPageUrl('Management')}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase rounded-lg transition-all hidden lg:block"
                      style={{
                        background: 'hsl(var(--motion) / 0.15)',
                        color: 'hsl(var(--motion))',
                        border: '1px solid hsl(var(--motion) / 0.3)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--motion) / 0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--motion) / 0.15)'; }}
                    >
                      Admin Tools
                    </Link>
                  )}
                  {isAuthenticated ? (
                    <div className="hidden lg:flex items-center gap-1">
                      <UserMenu user={user} />
                    </div>
                  ) : (
                    <button
                      onClick={() => base44.auth.redirectToLogin()}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase rounded-lg transition-all hidden lg:block"
                      style={{
                        background: 'hsl(var(--foreground) / 0.08)',
                        color: 'hsl(var(--foreground-secondary))',
                        border: '1px solid hsl(var(--divider))',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--foreground) / 0.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'hsl(var(--foreground) / 0.08)'; }}
                    >
                      Login
                    </button>
                  )}
                  <CartIcon style={{ color: 'hsl(var(--foreground-secondary))' }} />
                </div>
              </div>

              {/* Inline search panel — shown when search icon is clicked */}
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    key="search-panel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="max-w-7xl mx-auto px-6 pb-4 pt-3" style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)' }}>
                      {/* Search input */}
                      <div className="flex items-center gap-3 mb-3">
                        <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--foreground-quiet))' }} />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search stories, drivers, events, tracks, series, teams, vehicles, media..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-sm font-medium"
                          style={{ color: 'hsl(var(--foreground))', caretColor: 'hsl(var(--motion))' }}
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} style={{ color: 'hsl(var(--foreground-quiet) / 0.6)' }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Results */}
                      {(searchLoading || searchQueriesLoading) && (
                        <p className="font-mono text-[10px] tracking-widest" style={{ color: 'hsl(var(--foreground-quiet) / 0.6)' }}>SEARCHING...</p>
                      )}
                      {!searchLoading && searchQuery.length >= 2 &&
                        Object.values(searchResults).every(arr => arr.length === 0) && (
                        <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet) / 0.6)' }}>No results for "{searchQuery}"</p>
                      )}
                      <SearchResultsGrid results={searchResults} onNavigate={() => setSearchOpen(false)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded sub-nav area — shown when header is hovered and a sub exists */}
              <AnimatePresence>
                {isHeaderHovered && activeSubItems && (
                  <motion.div
                    key={hoveredItem}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div
                      className="max-w-7xl mx-auto px-6 pb-4 pt-1 hidden lg:flex flex-wrap gap-x-1 gap-y-0.5"
                      style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)' }}
                    >
                      {activeSubItems.map((sub) =>
                        sub.disabled ? (
                          <div
                            key={sub.name}
                            className="w-full pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em] first:pt-2"
                            style={{ color: 'hsl(var(--motion) / 0.6)' }}
                          >
                            {sub.name.replace(/^— | —$/g, '')}
                          </div>
                        ) : (
                          <Link
                            key={sub.name}
                            to={sub.href || createPageUrl(sub.page)}
                            className="px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-lg transition-all"
                            style={{ color: 'hsl(var(--foreground))' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--motion))'; e.currentTarget.style.background = 'hsl(var(--motion) / 0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            {sub.name}
                          </Link>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


            </header>
          </div>
          </div>
        </div>

        {/* Mobile/tablet app shell — full-screen search overlay + menu drawer */}
        <MobileSearchOverlay
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          loading={searchLoading || searchQueriesLoading}
        />
        <MobileMenuDrawer
          open={menuOpen}
          onOpenChange={setMenuOpen}
          navItems={navItems}
          user={user}
          isAuthenticated={isAuthenticated}
          currentPageName={currentPageName}
        />

        {/* Page content */}
        <main className="flex-1 relative z-[1] pb-16 lg:pb-0">
          <ErrorBoundary>
            {isTabRoute(location.pathname) ? (
              <div className="relative">
                {TAB_PAGES.map(([route, Page]) => mountedTabs.includes(route) && (
                  <div key={route} style={{ display: location.pathname === route ? 'block' : 'none' }}>
                    <Page />
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            )}
          </ErrorBoundary>
        </main>

        {(!location.pathname.startsWith('/race-core') && !location.pathname.startsWith('/racecore') && !location.pathname.startsWith('/race-control')) && <Footer />}
        <MobileBottomNav
          isAuthenticated={isAuthenticated}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMenu={() => setMenuOpen(true)}
        />
      </div>
    </GoogleMapsInitializer>
  );
}