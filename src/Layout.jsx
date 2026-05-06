import React, { useState, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search, Menu, X, ChevronDown, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SearchBar from '@/components/shared/SearchBar';
import Footer from '@/components/shared/Footer';
import AnnouncementBar from '@/components/shared/AnnouncementBar';
import GoogleMapsInitializer from '@/components/shared/GoogleMapsInitializer';
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
    { name: 'Registration', page: 'Registration' },
    { name: '— Media —', page: null, disabled: true },
    { name: 'Media Home', page: 'MediaHome' },
    { name: 'Creator Directory', href: '/creators' },
    { name: 'Media Outlets', href: '/media-outlets' },
    { name: 'Media Portal', page: 'MediaPortal' },
  ]},
  { name: 'Apparel', page: 'ApparelHome' },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
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
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  return (
    <GoogleMapsInitializer>
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-50">
          <AnnouncementBar />
          {/* Floating glass header */}
          <div className="px-3 pt-2 pb-1">
            <header
              className="transition-all duration-300 rounded-[20px] overflow-hidden"
              style={{
                background: scrolled
                  ? 'rgba(5, 8, 10, 0.88)'
                  : 'rgba(5, 8, 10, 0.72)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(29,161,161,0.06)',
              }}
            >
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full gap-8">
                {/* Logo: icon + wordmark — inverted for dark bg */}
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
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <Link
                          to={item.page ? createPageUrl(item.page) : '#'}
                          className={`flex items-center gap-1 px-3 py-4 text-[11px] font-bold tracking-[0.18em] uppercase transition-all duration-200 ${
                            isActive(item.page)
                              ? 'text-[#1DA1A1]'
                              : 'hover:text-white'
                          }`}
                          style={{
                            color: isActive(item.page) ? '#1DA1A1' : 'rgba(255,255,255,0.78)',
                            textShadow: isActive(item.page) ? '0 0 12px rgba(29,161,161,0.4)' : 'none',
                          }}
                        >
                          {item.name}
                          {item.sub && <ChevronDown className="w-3 h-3" />}
                        </Link>

                        {/* Sub-nav dropdown — dark glass */}
                        {item.sub && hoveredItem === item.name && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full left-0 min-w-[200px] py-2 z-50 rounded-xl overflow-hidden"
                            style={{
                              background: 'rgba(5, 8, 10, 0.92)',
                              backdropFilter: 'blur(24px)',
                              WebkitBackdropFilter: 'blur(24px)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(29,161,161,0.06)',
                            }}
                          >
                            {item.sub.map((sub) => (
                              sub.disabled ? (
                                <div key={sub.name} className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.4em] border-t first:border-t-0" style={{ color: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.06)' }}>
                                  {sub.name.replace(/^— | —$/g, '')}
                                </div>
                              ) : (
                                <Link
                                  key={sub.name}
                                  to={sub.href || createPageUrl(sub.page)}
                                  className="block px-4 py-2 text-xs font-medium transition-colors"
                                  style={{ color: 'rgba(255,255,255,0.65)' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#1DA1A1'; e.currentTarget.style.background = 'rgba(29,161,161,0.06)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                  {sub.name}
                                </Link>
                              )
                            ))}
                          </motion.div>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 rounded-lg transition-colors hidden lg:flex items-center justify-center"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.9)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
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
                      Management
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
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-lg transition-colors lg:hidden"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  </button>
                </div>
              </div>
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
                        to={createPageUrl(item.page)}
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

        {/* Search overlay */}
        <AnimatePresence>
          {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
        </AnimatePresence>

        {/* Page content */}
        <main className="flex-1">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </GoogleMapsInitializer>
  );
}