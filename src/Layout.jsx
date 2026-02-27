import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search, Menu, X, ChevronDown, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SearchBar from '@/components/shared/SearchBar';
import Footer from '@/components/shared/Footer';
import AnnouncementBar from '@/components/shared/AnnouncementBar';
import GoogleMapsInitializer from '@/components/shared/GoogleMapsInitializer';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { name: 'Home', page: 'Home' },
  { name: 'The Outlet', page: 'OutletHome', sub: [
    { name: 'Stories', page: 'OutletHome' },
    { name: 'Submit a Story', page: 'OutletSubmit' },
    { name: 'Advertise', page: 'OutletAdvertising' },
  ]},
  { name: 'Motorsports', page: 'MotorsportsHome', sub: [
    { name: 'Drivers', page: 'DriverDirectory' },
    { name: 'Teams', page: 'TeamDirectory' },
    { name: 'Tracks', page: 'TrackDirectory' },
    { name: 'Series', page: 'SeriesHome' },
    { name: 'Events', page: 'EventDirectory' },
    { name: 'Competition System', page: 'CompetitionSystem' },
  ]},
  { name: 'Apparel', page: 'ApparelHome' },
  { name: 'Creative', page: 'CreativeServices' },
  { name: 'More', page: null, sub: [
    { name: 'Tech', page: 'TechHome' },
    { name: 'Learning', page: 'Learning' },
    { name: 'Hospitality', page: 'Hospitality' },
    { name: 'Food & Bev', page: 'FoodBeverage' },
    { name: 'About', page: 'About' },
    { name: 'Contact', page: 'Contact' },
  ]},
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

  return (
    <GoogleMapsInitializer>
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-50">
        <AnnouncementBar />
        {/* Top bar */}
        <header
          className={`transition-all duration-300 ${
            scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
          }`}
        >
        {/* Upper nav - logo */}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center relative w-full">
          <Link to={createPageUrl('Home')} className="flex items-center">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png" 
              alt="HIJINX" 
              className="h-16"
            />
          </Link>

          <div className="absolute right-6 flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
            >
              <Search className="w-4 h-4" />
            </button>
            {user?.role === 'admin' && (
              <Link
                to={createPageUrl('Management')}
                className="px-3 py-1.5 text-xs font-medium bg-[#232323] text-white rounded-lg hover:bg-[#1A3249] transition-colors hidden lg:block"
              >
                Management
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link
                  to={createPageUrl('MyDashboard')}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors hidden lg:block"
                >
                  My Dashboard
                </Link>
                <Link
                  to={createPageUrl('Profile')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
                >
                  <User className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="px-3 py-1.5 text-xs font-medium bg-[#232323] text-white rounded-lg hover:bg-[#1A3249] transition-colors hidden lg:block"
              >
                Login
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:block border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <ul className="flex items-center justify-center gap-0">
              {navItems.map((item) => (
                <li
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-1 px-3 py-3 text-xs font-medium tracking-wide uppercase transition-colors ${
                      isActive(item.page)
                        ? 'text-[#232323] border-b-2 border-[#232323]'
                        : 'text-gray-600 hover:text-[#232323]'
                    }`}
                  >
                    {item.name}
                    {item.sub && <ChevronDown className="w-3 h-3" />}
                  </Link>

                  {/* Dropdown */}
                  {item.sub && hoveredItem === item.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute top-full left-0 bg-white border border-gray-100 shadow-lg min-w-[180px] py-2 z-50"
                    >
                      {item.sub.map((sub) => (
                        <Link
                          key={sub.name}
                          to={createPageUrl(sub.page)}
                          className="block px-4 py-2 text-xs font-medium text-gray-600 hover:text-[#232323] hover:bg-gray-50 transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </li>
                ))}

            </ul>
          </div>
        </nav>
        </header>
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
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm z-[56] bg-white overflow-y-auto lg:hidden shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-semibold">Menu</span>
              </div>
              <nav className="px-6 py-6">
              {user?.role === 'admin' && (
                <div className="mb-4">
                  <Link
                    to={createPageUrl('Management')}
                    className="block py-3 px-4 text-sm font-semibold bg-[#232323] text-white rounded-lg hover:bg-[#1A3249] transition-colors"
                  >
                    Management
                  </Link>
                </div>
              )}
              {navItems.map((item) => (
                <div key={item.name} className="mb-1">
                  <Link
                    to={createPageUrl(item.page)}
                    className={`block py-3 text-lg font-semibold tracking-tight ${
                      isActive(item.page) ? 'text-[#232323]' : 'text-gray-500'
                    }`}
                  >
                    {item.name}
                  </Link>
                  {item.sub && (
                    <div className="pl-4 mb-2">
                      {item.sub.map((sub) => (
                        <Link
                          key={sub.name}
                          to={createPageUrl(sub.page)}
                          className="block py-2 text-sm text-gray-500 hover:text-[#232323] transition-colors"
                        >
                          {sub.name}
                        </Link>
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
        {children}
      </main>

        <Footer />
      </div>
    </GoogleMapsInitializer>
  );
}