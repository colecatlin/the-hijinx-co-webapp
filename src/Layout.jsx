import React, { useState, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search, Menu, X, ChevronDown, User } from 'lucide-react';
import CartIcon from '@/components/cart/CartIcon';
import { AnimatePresence, motion } from 'framer-motion';
import Footer from '@/components/shared/Footer';
import AnnouncementBar from '@/components/shared/AnnouncementBar';
import GoogleMapsInitializer from '@/components/shared/GoogleMapsInitializer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import ErrorBoundary from '@/components/system/errorBoundary';
import UserMenu from '@/components/layout/UserMenu';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const EMPTY_RESULTS = { stories: [], drivers: [], events: [], tracks: [], series: [], teams: [], vehicles: [] };
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

  // Encapsulated keep-alive (mount + per-tab scroll restoration).
  const { mountedTabs } = useTabKeepAlive(TAB_ROUTES, location);

  useEffect(() => {
    setMobileOpen(false);
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

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(EMPTY_RESULTS);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const q = searchQuery.toLowerCase();
      const [allStories, allRacerProfiles, allEvents, allTracks, allSeries, allTeams, allVehicles] = await Promise.all([
        base44.entities.OutletStory.list('-published_date', 200),
        base44.entities.RacerProfile.list('-created_date', 200),
        base44.entities.Event.list('-event_date', 200),
        base44.entities.Track.list('-created_date', 200),
        base44.entities.Series.list('-created_date', 200),
        base44.entities.Team.list('-created_date', 200),
        base44.entities.Vehicle.list('-created_date', 200),
      ]);
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
      });
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        {/* ── GLOBAL: Repeating motorsports grid texture overlay ── */}
        <div className="fixed inset-0 z-0 pointer-events-none" style={{
          backgroundImage: `url('https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/f16fb8e35_BGRND46Page.png')`,
          backgroundRepeat: 'repeat',
          backgroundSize: '1024px auto',
          opacity: 0.28,
        }} />
        {/* ── GLOBAL: SVG Film grain / noise overlay ── */}
        <div className="fixed inset-0 z-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E")`,
          opacity: 0.5,
        }} />
        <div className="sticky top-0 z-50 relative" style={{ background: 'hsl(var(--canvas))', paddingTop: 'env(safe-area-inset-top)' }}>
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
                  <ThemeToggle />
                  <button
                    onClick={() => { setSearchOpen(!searchOpen); setHoveredItem(null); }}
                    className="p-2 rounded-lg transition-colors hidden lg:flex items-center justify-center"
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
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-lg transition-colors lg:hidden"
                    style={{ color: 'hsl(var(--foreground-secondary))' }}
                  >
                    {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  </button>
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
                          placeholder="Search stories, drivers, events, tracks, series, teams, vehicles..."
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
                      {searchLoading && (
                        <p className="font-mono text-[10px] tracking-widest" style={{ color: 'hsl(var(--foreground-quiet) / 0.6)' }}>SEARCHING...</p>
                      )}
                      {!searchLoading && searchQuery.length >= 2 &&
                        Object.values(searchResults).every(arr => arr.length === 0) && (
                        <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet) / 0.6)' }}>No results for "{searchQuery}"</p>
                      )}
                      {Object.values(searchResults).some(arr => arr.length > 0) && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                          {searchResults.stories.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>STORIES</p>
                              <div className="space-y-0.5">
                                {searchResults.stories.map(story => (
                                  <Link key={story.id} to={story.slug ? `/story/${story.slug}` : `/OutletStoryPage?id=${story.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {story.title}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.drivers.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>RACERS</p>
                              <div className="space-y-0.5">
                                {searchResults.drivers.map(rp => (
                                  <Link key={rp.id} to={rp.slug ? `/racers/${rp.slug}` : `/Directory?cat=racers`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {rp.display_name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.events.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>EVENTS</p>
                              <div className="space-y-0.5">
                                {searchResults.events.map(event => (
                                  <Link key={event.id} to={event.slug || event.canonical_slug ? `/events/${event.slug || event.canonical_slug}` : `/EventProfile?id=${event.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {event.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.tracks.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>TRACKS</p>
                              <div className="space-y-0.5">
                                {searchResults.tracks.map(track => (
                                  <Link key={track.id} to={track.slug || track.canonical_slug ? `/tracks/${track.slug || track.canonical_slug}` : `/TrackProfile?id=${track.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {track.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.series.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>SERIES</p>
                              <div className="space-y-0.5">
                                {searchResults.series.map(s => (
                                  <Link key={s.id} to={s.slug ? `/series/${s.slug}` : `/SeriesDetail?id=${s.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {s.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.teams.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>TEAMS</p>
                              <div className="space-y-0.5">
                                {searchResults.teams.map(team => (
                                  <Link key={team.id} to={`/TeamProfile?id=${team.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {team.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.vehicles.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: 'hsl(var(--motion))' }}>VEHICLES</p>
                              <div className="space-y-0.5">
                                {searchResults.vehicles.map(vehicle => (
                                  <Link key={vehicle.id} to={vehicle.slug ? `/vehicles/${vehicle.slug}` : `/VehicleProfile?id=${vehicle.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--surface-interactive) / 0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--foreground-secondary) / 0.75)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {vehicle.nickname || `${vehicle.manufacturer || ''} ${vehicle.model || ''}`.trim() || 'Vehicle'}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[55] bg-black/20 lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm z-[56] overflow-y-auto lg:hidden"
                style={{
                  background: 'hsl(var(--surface) / 0.97)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  borderLeft: '1px solid hsl(var(--divider))',
                  boxShadow: '-16px 0 48px hsl(0 0% 0% / 0.6)',
                }}
              >
                <div className="sticky top-0 px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--divider) / 0.8)', background: 'hsl(var(--surface) / 0.9)' }}>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'hsl(var(--foreground-secondary) / 0.75)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: 'hsl(var(--foreground-quiet))' }}>Menu</span>
                </div>
                <nav className="px-6 py-6">
                  {isAuthenticated && (
                    <div className="mb-5 space-y-2">
                      <Link
                        to={createPageUrl('MyDashboard')}
                        className="block py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                        style={{ color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface-interactive) / 0.4)' }}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to={createPageUrl('Profile')}
                        className="block py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                        style={{ color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface-interactive) / 0.4)' }}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => base44.auth.logout(createPageUrl('Home'))}
                        className="w-full text-left py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                        style={{ color: 'hsl(var(--danger) / 0.85)', border: '1px solid hsl(var(--danger) / 0.2)', background: 'hsl(var(--danger) / 0.08)' }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <div className="mb-5">
                      <Link
                        to={createPageUrl('Management')}
                        className="block py-3 px-4 text-sm font-bold rounded-lg transition-colors"
                        style={{ color: 'hsl(var(--motion))', border: '1px solid hsl(var(--motion) / 0.3)', background: 'hsl(var(--motion) / 0.1)' }}
                      >
                        Management
                      </Link>
                    </div>
                  )}
                  {navItems.map((item) => (
                    <div key={item.name} className="mb-1" style={{ borderBottom: '1px solid hsl(var(--divider) / 0.6)' }}>
                      <Link
                        to={item.href || createPageUrl(item.page)}
                        className="block py-3 text-base font-bold tracking-[0.1em] uppercase transition-colors"
                        style={{ color: isActive(item.page) ? 'hsl(var(--motion))' : 'hsl(var(--foreground-secondary))' }}
                      >
                        {item.name}
                      </Link>
                      {item.sub && (
                        <div className="pl-4 mb-2">
                          {item.sub.map((sub) => (
                            sub.disabled ? (
                              <div key={sub.name} className="pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em]" style={{ color: 'hsl(var(--foreground-quiet) / 0.5)' }}>
                                {sub.name.replace(/^— | —$/g, '')}
                              </div>
                            ) : (
                              <Link
                                key={sub.name}
                                to={sub.href || createPageUrl(sub.page)}
                                className="block py-2 text-sm transition-colors"
                                style={{ color: 'hsl(var(--foreground-quiet))' }}
                              >
                                {sub.name}
                              </Link>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
        <MobileBottomNav />
      </div>
    </GoogleMapsInitializer>
  );
}