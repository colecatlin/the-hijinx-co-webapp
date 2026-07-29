import React, { useState, useEffect, useRef } from 'react';
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

const navItems = [
  { name: 'Home', page: 'Home' },
  { name: 'The Outlet', page: 'OutletHome', sub: [
    { name: 'Stories', page: 'OutletHome' },
    { name: 'Submit a Story', page: 'OutletSubmit' },
  ]},
  { name: 'INDEX46', page: 'MotorsportsHome', sub: [
    { name: '— Directory —', page: null, disabled: true },
    { name: 'Drivers', page: 'DriverDirectory' },
    { name: 'Teams', page: 'TeamDirectory' },
    { name: 'Tracks', page: 'TrackDirectory' },
    { name: 'Series', page: 'SeriesHome' },
    { name: '— Events —', page: null, disabled: true },
    { name: 'Events', page: 'EventDirectory' },
    { name: '— Registration —', page: null, disabled: true },
    { name: 'Register for Event', page: 'Registration' },
    { name: '— Media —', page: null, disabled: true },
    { name: 'Media Home', page: 'MediaHome' },
    { name: 'Creator Directory', href: '/creators' },
    { name: 'Media Outlets', href: '/media-outlets' },
    { name: 'Media Portal', page: 'MediaPortal' },
  ]},
  { name: 'Apparel', page: 'ApparelHome' },
  { name: 'Marketplace', page: 'MarketplaceHome' },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const EMPTY_RESULTS = { stories: [], drivers: [], events: [], tracks: [], series: [], teams: [] };
  const [searchResults, setSearchResults] = useState(EMPTY_RESULTS);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = React.useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const location = useLocation();

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

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(EMPTY_RESULTS);
    window.scrollTo(0, 0);
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
      const [allStories, allDrivers, allEvents, allTracks, allSeries, allTeams] = await Promise.all([
        base44.entities.OutletStory.list('-published_date', 200),
        base44.entities.Driver.list('-created_date', 200),
        base44.entities.Event.list('-event_date', 200),
        base44.entities.Track.list('-created_date', 200),
        base44.entities.Series.list('-created_date', 200),
        base44.entities.Team.list('-created_date', 200),
      ]);
      setSearchResults({
        stories: allStories.filter(s =>
          s.status === 'published' &&
          (s.title?.toLowerCase().includes(q) || s.subtitle?.toLowerCase().includes(q) ||
           s.author?.toLowerCase().includes(q) || s.primary_category?.toLowerCase().includes(q) ||
           s.sub_category?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)))
        ).slice(0, 4),
        drivers: allDrivers.filter(d =>
          d.visibility_status === 'live' &&
          (`${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
           d.primary_number?.toLowerCase().includes(q) ||
           d.hometown_city?.toLowerCase().includes(q) ||
           d.nicknames?.some(n => n.toLowerCase().includes(q)))
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
      <div className="flex flex-col min-h-screen relative" style={{
          background: '#050A0A',
          backgroundImage: 'url(https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/801616d83_HijinxBackgroundtestimage.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}>
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
        <div className="sticky top-0 z-50 relative" style={{ background: '#050A0A' }}>
          <AnnouncementBar />
          {/* Floating glass header */}
          <div className="px-3 py-2">
            <header
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => { setIsHeaderHovered(false); setHoveredItem(null); if (!searchQuery && !searchLoading) setSearchOpen(false); }}
              className="transition-all duration-300 rounded-[20px]"
              style={{
                background: isHeaderHovered
                  ? 'rgba(8, 12, 14, 0.82)'
                  : scrolled
                    ? 'rgba(5, 10, 10, 0.55)'
                    : 'rgba(5, 10, 10, 0.25)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: isHeaderHovered
                  ? '1.5px solid rgba(29,161,161,0.25)'
                  : '1.5px solid rgba(255,255,255,0.18)',
                boxShadow: isHeaderHovered
                  ? '0 0 48px rgba(29,161,161,0.15), 0 16px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 0 32px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              {/* Top row — logo + nav + actions */}
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full gap-8">
                {/* Logo */}
                <Link to={createPageUrl('Home')} className="flex items-center gap-2.5 flex-shrink-0">
                  <img
                    src="https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/857494da6_Asset444x.png"
                    alt="HIJINX icon"
                    className="h-6 w-auto"
                    style={{ filter: 'brightness(0) invert(1)', opacity: 0.92 }}
                  />
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png"
                    alt="HIJINX"
                    className="h-10 w-auto"
                    style={{ filter: 'brightness(0) invert(1)', opacity: 0.92 }}
                  />
                </Link>

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
                              ? '#1DA1A1'
                              : isActive(item.page)
                                ? '#1DA1A1'
                                : isHeaderHovered
                                  ? 'rgba(255,255,255,0.55)'
                                  : 'rgba(255,255,255,0.78)',
                            textShadow: (hoveredItem === item.name || isActive(item.page)) ? '0 0 12px rgba(29,161,161,0.4)' : 'none',
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
                    className="p-2 rounded-lg transition-colors hidden lg:flex items-center justify-center"
                    style={{ color: searchOpen ? '#1DA1A1' : isHeaderHovered ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
                    onMouseLeave={e => e.currentTarget.style.color = searchOpen ? '#1DA1A1' : isHeaderHovered ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.55)'}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  {user?.role === 'admin' && (
                    <Link
                      to={createPageUrl('Management')}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase rounded-lg transition-all hidden lg:block"
                      style={{
                        background: 'rgba(29,161,161,0.15)',
                        color: '#1DA1A1',
                        border: '1px solid rgba(29,161,161,0.3)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(29,161,161,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(29,161,161,0.15)'; }}
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
                        background: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    >
                      Login
                    </button>
                  )}
                  <CartIcon style={{ color: 'rgba(255,255,255,0.65)' }} />
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-lg transition-colors lg:hidden"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
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
                    <div className="max-w-7xl mx-auto px-6 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {/* Search input */}
                      <div className="flex items-center gap-3 mb-3">
                        <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search stories, drivers, events, tracks, series, teams..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-sm font-medium"
                          style={{ color: 'rgba(255,255,255,0.85)', caretColor: '#1DA1A1' }}
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Results */}
                      {searchLoading && (
                        <p className="font-mono text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>SEARCHING...</p>
                      )}
                      {!searchLoading && searchQuery.length >= 2 &&
                        Object.values(searchResults).every(arr => arr.length === 0) && (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No results for "{searchQuery}"</p>
                      )}
                      {Object.values(searchResults).some(arr => arr.length > 0) && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                          {searchResults.stories.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: '#1DA1A1' }}>STORIES</p>
                              <div className="space-y-0.5">
                                {searchResults.stories.map(story => (
                                  <Link key={story.id} to={story.slug ? `/story/${story.slug}` : `/OutletStoryPage?id=${story.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {story.title}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.drivers.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: '#1DA1A1' }}>DRIVERS</p>
                              <div className="space-y-0.5">
                                {searchResults.drivers.map(driver => (
                                  <Link key={driver.id} to={driver.slug ? `/drivers/${driver.slug}` : `/DriverProfile?id=${driver.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {driver.first_name} {driver.last_name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.events.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: '#1DA1A1' }}>EVENTS</p>
                              <div className="space-y-0.5">
                                {searchResults.events.map(event => (
                                  <Link key={event.id} to={`/EventProfile?id=${event.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {event.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.tracks.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: '#1DA1A1' }}>TRACKS</p>
                              <div className="space-y-0.5">
                                {searchResults.tracks.map(track => (
                                  <Link key={track.id} to={track.slug ? `/TrackProfile?slug=${track.slug}` : `/TrackProfile?id=${track.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {track.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.series.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: '#1DA1A1' }}>SERIES</p>
                              <div className="space-y-0.5">
                                {searchResults.series.map(s => (
                                  <Link key={s.id} to={s.slug ? `/series/${s.slug}` : `/SeriesDetail?id=${s.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {s.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchResults.teams.length > 0 && (
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.35em] mb-2" style={{ color: '#1DA1A1' }}>TEAMS</p>
                              <div className="space-y-0.5">
                                {searchResults.teams.map(team => (
                                  <Link key={team.id} to={`/TeamProfile?id=${team.id}`}
                                    onClick={() => setSearchOpen(false)}
                                    className="block px-2 py-1.5 rounded-lg text-xs transition-all truncate"
                                    style={{ color: 'rgba(255,255,255,0.6)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                                    {team.name}
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
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {activeSubItems.map((sub) =>
                        sub.disabled ? (
                          <div
                            key={sub.name}
                            className="w-full pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em] first:pt-2"
                            style={{ color: 'rgba(29,161,161,0.5)' }}
                          >
                            {sub.name.replace(/^— | —$/g, '')}
                          </div>
                        ) : (
                          <Link
                            key={sub.name}
                            to={sub.href || createPageUrl(sub.page)}
                            className="px-3 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-lg transition-all"
                            style={{ color: 'rgba(255,255,255,0.9)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#1DA1A1'; e.currentTarget.style.background = 'rgba(29,161,161,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.background = 'transparent'; }}
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
                  background: 'rgba(5, 8, 10, 0.97)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '-16px 0 48px rgba(0,0,0,0.6)',
                }}
              >
                <div className="sticky top-0 px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(5,8,10,0.9)' }}>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>Menu</span>
                </div>
                <nav className="px-6 py-6">
                  {isAuthenticated && (
                    <div className="mb-5 space-y-2">
                      <Link
                        to={createPageUrl('MyDashboard')}
                        className="block py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to={createPageUrl('Profile')}
                        className="block py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => base44.auth.logout(createPageUrl('Home'))}
                        className="w-full text-left py-3 px-4 text-sm font-semibold rounded-lg transition-colors"
                        style={{ color: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}
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
                        style={{ color: '#1DA1A1', border: '1px solid rgba(29,161,161,0.3)', background: 'rgba(29,161,161,0.1)' }}
                      >
                        Management
                      </Link>
                    </div>
                  )}
                  {navItems.map((item) => (
                    <div key={item.name} className="mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Link
                        to={item.href || createPageUrl(item.page)}
                        className="block py-3 text-base font-bold tracking-[0.1em] uppercase transition-colors"
                        style={{ color: isActive(item.page) ? '#1DA1A1' : 'rgba(255,255,255,0.75)' }}
                      >
                        {item.name}
                      </Link>
                      {item.sub && (
                        <div className="pl-4 mb-2">
                          {item.sub.map((sub) => (
                            sub.disabled ? (
                              <div key={sub.name} className="pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {sub.name.replace(/^— | —$/g, '')}
                              </div>
                            ) : (
                              <Link
                                key={sub.name}
                                to={sub.href || createPageUrl(sub.page)}
                                className="block py-2 text-sm transition-colors"
                                style={{ color: 'rgba(255,255,255,0.5)' }}
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
            {children}
          </ErrorBoundary>
        </main>

        {(!location.pathname.startsWith('/race-core') && !location.pathname.startsWith('/racecore') && !location.pathname.startsWith('/race-control')) && <Footer />}
        <MobileBottomNav />
      </div>
    </GoogleMapsInitializer>
  );
}